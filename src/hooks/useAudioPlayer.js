import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import db from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { recordListeningHistory, saveUserQueue, fetchUserQueue } from '../services/userBddService';
import { getTrackAudioUrl, getCachedImageUrl } from '../services/offlineStorageService';
import { getHdArtwork, getMainArtistName, isLiveTrack, isClipTrack, scoreAudioTrack } from '../services/musicDataService';
import { searchLyraMusic, extractYouTubeId } from '../services/lyraAudio';
import { searchLyraTracks } from '../services/lyraSearch';

const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export function isNativeEnvironment() {
  if (typeof window === 'undefined') return false;
  const isElectron = Boolean(window.process?.versions?.electron || window.electron);
  const isCapacitor = Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor);
  const isCordova = Boolean(window.cordova);
  const isTauri = Boolean(window.__TAURI__);
  const isAndroidApp = Boolean(window.Android || window.AndroidBridge);
  const isLocalFile = window.location.protocol === 'file:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isPreviewOrDev = window.location.hostname.includes('run.app') ||
                        window.location.hostname.includes('webcontainer') ||
                        window.location.hostname.includes('stackblitz') ||
                        window.location.hostname.includes('preview');
  return isElectron || isCapacitor || isCordova || isTauri || isAndroidApp || isLocalFile || isLocalhost || isPreviewOrDev;
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || isNativeEnvironment();
}

let vinylAudioContext = null;
let vinylCrackleSource = null;
let vinylHumSource = null;
let vinylGainNode = null;
let analyserNode = null;

function startVinylNoise(volumeValue) {
  if (isMobileDevice()) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!vinylAudioContext) {
      vinylAudioContext = new AudioContextClass();
    }

    if (vinylAudioContext.state === 'suspended') {
      vinylAudioContext.resume();
    }

    stopVinylNoise();

    vinylGainNode = vinylAudioContext.createGain();
    vinylGainNode.gain.value = volumeValue * 0.25;

    const sampleRate = vinylAudioContext.sampleRate;
    const bufferDuration = 3.0;
    const bufferSize = sampleRate * bufferDuration;

    const rumbleBuffer = vinylAudioContext.createBuffer(1, bufferSize, sampleRate);
    const rumbleData = rumbleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      rumbleData[i] = Math.random() * 2 - 1;
    }

    const rumbleFilter = vinylAudioContext.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 65;

    const rumbleNode = vinylAudioContext.createBufferSource();
    rumbleNode.buffer = rumbleBuffer;
    rumbleNode.loop = true;

    const crackleBuffer = vinylAudioContext.createBuffer(1, bufferSize, sampleRate);
    const crackleData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      if (Math.random() < 0.00018) {
        const peakHeight = Math.random() * 0.6 + 0.15;
        for (let j = 0; j < 40 && (i + j) < bufferSize; j++) {
          crackleData[i + j] += peakHeight * Math.exp(-j * 0.12) * (Math.random() * 2 - 1);
        }
      }
    }

    const crackleFilter = vinylAudioContext.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.value = 1500;
    crackleFilter.Q.value = 4.0;

    const crackleNode = vinylAudioContext.createBufferSource();
    crackleNode.buffer = crackleBuffer;
    crackleNode.loop = true;

    rumbleNode.connect(rumbleFilter);
    rumbleFilter.connect(vinylGainNode);

    crackleNode.connect(crackleFilter);
    crackleFilter.connect(vinylGainNode);

    vinylGainNode.connect(vinylAudioContext.destination);

    rumbleNode.start(0);
    crackleNode.start(0);

    vinylCrackleSource = crackleNode;
    vinylHumSource = rumbleNode;
  } catch (err) {
    console.warn('[VinylEngine] Échec synthèse bruit vinyle:', err);
  }
}

function stopVinylNoise() {
  try {
    if (vinylCrackleSource) {
      vinylCrackleSource.stop();
      vinylCrackleSource = null;
    }
    if (vinylHumSource) {
      vinylHumSource.stop();
      vinylHumSource = null;
    }
  } catch (_) {}
}

export function useAudioPlayer() {
  const { user } = useAuth();
  const isNative = isNativeEnvironment();
  const audioRef = useRef(null);
  const prebufferAudioRef = useRef(null);
  const prebufferedTrackIdRef = useRef(null);
  const iframePlayerRef = useRef(null);
  const activeEngineRef = useRef('none');
  const pendingTrackRef = useRef(null);
  const syncTimerRef = useRef(null);
  const actionsRef = useRef({ resume: null, pause: null, next: null, prev: null, seek: null });
  const handleTrackEndedRef = useRef(null);
  const playRequestIdRef = useRef(0);
  const fadeIntervalRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);

  // Restore queue from BDD when user logs in
  useEffect(() => {
    const userId = user?.id || user?.uid;
    if (!userId) {
      setQueue([]);
      setCurrentTrack(null);
      setQueueIndex(-1);
      return;
    }

    let isSubscribed = true;
    (async () => {
      try {
        const saved = await fetchUserQueue(userId);
        if (isSubscribed && saved && saved.queue && saved.queue.length > 0) {
          setQueue(saved.queue);
          setQueueIndex(saved.queueIndex >= 0 ? saved.queueIndex : 0);
          if (saved.currentTrack) {
            setCurrentTrack(saved.currentTrack);
          }
        }
      } catch (err) {
        console.warn('Error restoring user queue from BDD:', err);
      }
    })();

    return () => {
      isSubscribed = false;
    };
  }, [user?.id, user?.uid]);

  // Auto-save queue to BDD whenever queue or currentTrack changes
  useEffect(() => {
    const userId = user?.id || user?.uid;
    if (!userId) return;

    const timer = setTimeout(() => {
      saveUserQueue(userId, queue, queueIndex, currentTrack);
    }, 1000);

    return () => clearTimeout(timer);
  }, [user?.id, user?.uid, queue, queueIndex, currentTrack]);
  const [shuffle, setShuffle] = useState(() => {
    try {
      return localStorage.getItem('lyra_shuffle') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [repeat, setRepeat] = useState(() => {
    try {
      const saved = localStorage.getItem('lyra_repeat');
      return saved === 'all' || saved === 'one' || saved === 'off' ? saved : 'off';
    } catch (_) {
      return 'off';
    }
  });
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const [hifiMode, setHifiMode] = useState(true);
  const [vinylCrackle, setVinylCrackle] = useState(true);
  const [vinylCrackleVolume, setVinylCrackleVolume] = useState(0.12);
  const [pitch, setPitch] = useState(0);
  const [bassGain, setBassGain] = useState(3.0);
  const [midGain, setMidGain] = useState(1.5);
  const [trebleGain, setTrebleGain] = useState(2.0);
  const [tubeSaturation, setTubeSaturation] = useState(25);

  useEffect(() => {
    if (isPlaying && vinylCrackle) {
      startVinylNoise(vinylCrackleVolume);
    } else {
      stopVinylNoise();
    }
    return () => {
      stopVinylNoise();
    };
  }, [isPlaying, vinylCrackle, vinylCrackleVolume]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        navigator.audioSession.type = 'playback';
      } catch { }
    }

    const unlockAudio = () => {
      const audio = document.getElementById('global-player');
      if (audio && !audio.src) {
        audio.src = SILENT_AUDIO_URI;
        audio.play().then(() => audio.pause()).catch(() => {});
      }
      if (isMobileDevice()) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass && !vinylAudioContext) {
          vinylAudioContext = new AudioContextClass();
        }
        if (vinylAudioContext && vinylAudioContext.state === 'suspended') {
          vinylAudioContext.resume();
        }
      } catch {}
    };

    window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
    window.addEventListener('touchend', unlockAudio, { passive: true, once: true });
    window.addEventListener('click', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('touchend', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
    }

    syncTimerRef.current = setInterval(() => {
      if (activeEngineRef.current === 'iframe' && iframePlayerRef.current) {
        try {
          if (typeof iframePlayerRef.current.getCurrentTime === 'function') {
            const cur = iframePlayerRef.current.getCurrentTime() || 0;
            const dur = iframePlayerRef.current.getDuration() || 0;
            
            if (cur >= 0) {
              setCurrentTime(cur);
            }
            if (dur > 0) {
              setDuration((prev) => (prev !== dur ? dur : prev));
            }

            const state = iframePlayerRef.current.getPlayerState?.();
            // console.log('[DEBUG] getPlayerState:', state);
            if (state === 1) {
              setIsPlaying(true);
              setIsLoading(false);
            } else if (state === 2) {
              setIsPlaying(false);
            } else if (state === 3) {
              setIsLoading(true);
            }
          }
        } catch { }
      } else if (activeEngineRef.current === 'audio' && audioRef.current) {
        const audio = audioRef.current;
        if (!audio.paused) {
          setCurrentTime(audio.currentTime);
          if (audio.duration && !isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
        }
      }
    }, 100);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      let el = document.getElementById('global-player');
      if (!el) {
        el = document.createElement('audio');
        el.id = 'global-player';
        el.style.display = 'none';
        el.crossOrigin = 'anonymous';
        document.body.appendChild(el);
      }
      
      el.preload = 'auto';
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      if ('preservesPitch' in el) {
        el.preservesPitch = true;
      }

      if (!el.__webAudioProcessed && !isMobileDevice()) {
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const source = ctx.createMediaElementSource(el);
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.35; // Pre-amplifier boost (135% for headset clarity & loudness)

            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -20;
            compressor.knee.value = 20;
            compressor.ratio.value = 8;
            compressor.attack.value = 0.002;
            compressor.release.value = 0.2;

            source.connect(gainNode);
            gainNode.connect(compressor);
            compressor.connect(ctx.destination);
            
            el.__webAudioProcessed = true;
            window.__lyraMainAudioCtx = ctx;
          }
        } catch (err) {
          console.warn('[AudioEngine] Web Audio API setup failed:', err);
        }
      }

      audioRef.current = el;
    }

    // Secondary buffer element for Gapless Playback / Pre-buffering
    if (!prebufferAudioRef.current) {
      let pEl = document.getElementById('prebuffer-player');
      if (!pEl) {
        pEl = document.createElement('audio');
        pEl.id = 'prebuffer-player';
        pEl.style.display = 'none';
        pEl.preload = 'auto';
        pEl.playsInline = true;
        pEl.setAttribute('playsinline', '');
        pEl.crossOrigin = 'anonymous';
        document.body.appendChild(pEl);
      }
      prebufferAudioRef.current = pEl;
    }

    const audio = audioRef.current;

    const onTimeUpdate = () => {
      if (activeEngineRef.current === 'audio') {
        setCurrentTime(audio.currentTime);
        try {
          if (window.__lyraMainAudioCtx && window.__lyraMainAudioCtx.state === 'suspended') {
            window.__lyraMainAudioCtx.resume();
          }
        } catch (_) {}
      }
    };
    const onLoadedMetadata = () => {
      if (activeEngineRef.current === 'audio' && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        console.log('[AudioEngine] Real media duration detected onLoadedMetadata:', audio.duration);
        setDuration(audio.duration);
      }
    };
    const onDurationChange = () => {
      if (activeEngineRef.current === 'audio' && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onPlay = () => {
      if (activeEngineRef.current === 'audio') {
        setIsPlaying(true);
        setIsLoading(false);
        setError(null);
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
      }
    };
    const onPause = () => {
      if (activeEngineRef.current === 'audio') {
        setIsPlaying(false);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
      }
    };
    const onWaiting = () => {
      if (activeEngineRef.current === 'audio') {
        setIsLoading(true);
      }
    };
    const onCanPlay = () => {
      if (activeEngineRef.current === 'audio') {
        setIsLoading(false);
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      }
    };
    const onEnded = () => {
      if (activeEngineRef.current === 'audio') {
        handleTrackEndedRef.current?.();
      }
    };
    const onError = () => {
      if (activeEngineRef.current === 'audio') {
        console.warn('[AudioEngine] Erreur audio HTML5, essai YouTube Iframe fallback...');
        if (currentTrack?.videoId && iframePlayerRef.current) {
          activeEngineRef.current = 'iframe';
          if (typeof iframePlayerRef.current.seekTo === 'function') iframePlayerRef.current.seekTo(0, true);
          iframePlayerRef.current.loadVideoById(currentTrack.videoId, 0);
        } else {
          setIsPlaying(false);
          setIsLoading(false);
        }
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [currentTrack]);

  const setIframePlayer = useCallback((player) => {
    iframePlayerRef.current = player;
    
    if (player && pendingTrackRef.current) {
      const track = pendingTrackRef.current;
      pendingTrackRef.current = null;
      activeEngineRef.current = 'iframe';
      const validYtId = extractYouTubeId(track.videoId || track.ytVideoId || track.id);
      try {
        if (typeof player.unMute === 'function') {
          player.unMute();
        }
        if (typeof player.setVolume === 'function') {
          player.setVolume(Math.round(volume * 100));
        }
        if (validYtId && typeof player.loadVideoById === 'function') {
          player.loadVideoById(validYtId, 0);
          if (typeof player.playVideo === 'function') player.playVideo();
        }
      } catch (err) {
        console.warn('[AudioEngine] Pending iframe play error:', err);
      }
      setIsPlaying(true);
      setIsLoading(false);
    }
  }, [volume]);

  const onIframeStateChange = useCallback((state) => {
    if (activeEngineRef.current !== 'iframe') return;

    if (state === 1) {
      setIsPlaying(true);
      setIsLoading(false);
      setError(null);
      if (iframePlayerRef.current?.getDuration) {
        const dur = iframePlayerRef.current.getDuration();
        if (dur > 0) setDuration(dur);
      }
      try {
        if (window.vinylAudioContext && window.vinylAudioContext.state === 'suspended') {
          window.vinylAudioContext.resume();
        }
      } catch (_) {}
    } else if (state === 2) {
      setIsPlaying(false);
    } else if (state === 3) {
      setIsLoading(true);
    } else if (state === 0) {
      handleTrackEndedRef.current?.();
    }
  }, []);

  const onIframeError = useCallback((code) => {
    console.warn('[AudioEngine] Erreur YouTube code:', code);
    setError("Lecture impossible pour ce titre.");
    setIsLoading(false);
    setIsPlaying(false);
  }, []);

  const updateMediaSessionMetadata = useCallback((track) => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !track) return;
    try {
      const artworkList = [];
      if (track.thumbnail) {
        artworkList.push(
          { src: track.thumbnail, sizes: '96x96', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '128x128', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        );
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Piste inconnue',
        artist: track.artist || 'Artiste inconnu',
        album: track.album || 'Salon E-GE',
        artwork: artworkList
      });
    } catch (err) {
      console.warn('[MediaSession] Erreur metadata:', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const session = navigator.mediaSession;
      session.setActionHandler('play', () => {
        if (audioRef.current) audioRef.current.play().catch(() => {});
        actionsRef.current.resume?.();
      });
      session.setActionHandler('pause', () => {
        if (audioRef.current) audioRef.current.pause();
        actionsRef.current.pause?.();
      });
      session.setActionHandler('nexttrack', () => actionsRef.current.next?.());
      session.setActionHandler('previoustrack', () => actionsRef.current.prev?.());
      session.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          actionsRef.current.seek?.(details.seekTime);
        }
      });
    } catch (_) {}
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    
    // Set immediate volume back to normal so next play is clean
    if (iframePlayerRef.current?.setVolume) {
      try { iframePlayerRef.current.setVolume(Math.round(volume * 100)); } catch {}
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }

    if (activeEngineRef.current === 'iframe' && iframePlayerRef.current?.pauseVideo) {
      try { iframePlayerRef.current.pauseVideo(); } catch {}
    } else if (activeEngineRef.current === 'audio' && audioRef.current) {
      try { audioRef.current.pause(); } catch {}
    }
  }, [volume]);

  const resetPlayer = useCallback(() => {
    // 1. Invalidate any in-flight play requests / promises
    playRequestIdRef.current++;
    pendingTrackRef.current = null;
    prebufferedTrackIdRef.current = null;

    // 2. Stop HTML5 audio elements and clear sources
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current.currentTime = 0;
      } catch (_) {}
    }

    if (prebufferAudioRef.current) {
      try {
        prebufferAudioRef.current.pause();
        prebufferAudioRef.current.removeAttribute('src');
        prebufferAudioRef.current.src = '';
        prebufferAudioRef.current.load();
      } catch (_) {}
    }

    // 3. Stop YouTube iframe player
    const currentPlayer = iframePlayerRef.current;
    if (currentPlayer) {
      try {
        if (typeof currentPlayer.stopVideo === 'function') {
          currentPlayer.stopVideo();
        } else if (typeof currentPlayer.pauseVideo === 'function') {
          currentPlayer.pauseVideo();
        }
      } catch (_) {}
    }

    // 4. Stop vinyl noise generator
    stopVinylNoise();

    // 5. Reset player engine & state
    activeEngineRef.current = 'none';
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setQueue([]);
    setQueueIndex(-1);
    setError(null);

    // 6. Clear MediaSession metadata
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch (_) {}
    }
  }, []);

  // Listen for account switch / logout events
  useEffect(() => {
    const handleResetEvent = () => {
      console.log('[AudioEngine] Resetting audio player on account change/logout');
      resetPlayer();
    };
    window.addEventListener('lyra:auth_changed', handleResetEvent);
    window.addEventListener('lyra:reset_player', handleResetEvent);
    return () => {
      window.removeEventListener('lyra:auth_changed', handleResetEvent);
      window.removeEventListener('lyra:reset_player', handleResetEvent);
    };
  }, [resetPlayer]);

  const lastUserIdRef = useRef(user?.id || user?.uid || 'guest');

  useEffect(() => {
    const currentUserId = user?.id || user?.uid || 'guest';
    if (currentUserId !== lastUserIdRef.current) {
      console.log(`[AudioEngine] Session changed: ${lastUserIdRef.current} -> ${currentUserId}. Resetting player...`);
      lastUserIdRef.current = currentUserId;
      resetPlayer();
    }
  }, [user?.id, user?.uid, resetPlayer]);

  const resume = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying(true);
    
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    if (isMobileDevice()) {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
        try { navigator.audioSession.type = 'playback'; } catch {}
      }
      if (activeEngineRef.current === 'audio' && audioRef.current) {
        audioRef.current.volume = 1.0;
        audioRef.current.muted = false;
        audioRef.current.play().catch(() => {});
      } else if (activeEngineRef.current === 'iframe' && iframePlayerRef.current) {
        try {
          if (typeof iframePlayerRef.current.unMute === 'function') iframePlayerRef.current.unMute();
          if (typeof iframePlayerRef.current.setVolume === 'function') iframePlayerRef.current.setVolume(100);
          if (typeof iframePlayerRef.current.playVideo === 'function') iframePlayerRef.current.playVideo();
        } catch {}
      }
      return;
    }
    
    let currentVol = 0;
    if (iframePlayerRef.current?.setVolume) {
      try { iframePlayerRef.current.setVolume(0); } catch {}
    }
    if (audioRef.current) {
      audioRef.current.volume = 0;
    }
    
    if (activeEngineRef.current === 'iframe' && iframePlayerRef.current) {
      try {
        if (typeof iframePlayerRef.current.unMute === 'function') {
          iframePlayerRef.current.unMute();
        }
        if (typeof iframePlayerRef.current.playVideo === 'function') {
          iframePlayerRef.current.playVideo();
        }
      } catch {}
    } else if (activeEngineRef.current === 'audio' && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    
    const fadeSteps = 10;
    const fadeStepTime = 50; // 500ms total
    const stepAmount = volume / fadeSteps;
    
    fadeIntervalRef.current = setInterval(() => {
      currentVol += stepAmount;
      if (currentVol >= volume) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        currentVol = volume;
      }
      if (iframePlayerRef.current?.setVolume) {
        try { iframePlayerRef.current.setVolume(Math.round(currentVol * 100)); } catch {}
      }
      if (audioRef.current) {
        audioRef.current.volume = Math.min(1, currentVol);
      }
    }, fadeStepTime);
  }, [currentTrack, volume]);

  const seek = useCallback((seconds) => {
    const time = Math.max(0, Math.min(seconds, duration || 99999));
    setCurrentTime(time);
    if (activeEngineRef.current === 'iframe' && iframePlayerRef.current?.seekTo) {
      try { iframePlayerRef.current.seekTo(time, true); } catch {}
    } else if (activeEngineRef.current === 'audio' && audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, [duration]);

  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);

    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (iframePlayerRef.current?.setVolume) {
      try {
        iframePlayerRef.current.setVolume(Math.round(clamped * 100));
      } catch {}
    }
  }, []);

  const play = useCallback((rawTrack) => {
    if (!rawTrack) return;

    playRequestIdRef.current++;
    const currentRequestId = playRequestIdRef.current;

    let validYtId = extractYouTubeId(rawTrack.videoId || rawTrack.ytVideoId || rawTrack.id || '');
    if (!/^[a-zA-Z0-9_-]{11}$/.test(validYtId)) {
      validYtId = '';
    }

    const trackMeta = {
      ...rawTrack,
      id: rawTrack.id || (validYtId ? validYtId : rawTrack.videoId),
      deezerId: rawTrack.deezerId || rawTrack.id,
      albumId: rawTrack.albumId || (typeof rawTrack.album === 'object' ? rawTrack.album?.id : undefined),
      album: rawTrack.album || (rawTrack.albumObj ? rawTrack.albumObj.title : undefined),
      videoId: validYtId || rawTrack.videoId || rawTrack.id,
      thumbnail: getHdArtwork(rawTrack.thumbnail, validYtId || rawTrack.id)
    };

    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try { navigator.audioSession.type = 'playback'; } catch {}
    }

    setError(null);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setCurrentTrack(trackMeta);
    updateMediaSessionMetadata(trackMeta);

    // Stop HTML5 audio element if playing
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current.currentTime = 0;
      } catch (_) {}
    }

    // Stop iframe player if playing
    const currentPlayer = iframePlayerRef.current;
    if (currentPlayer) {
      try {
        if (typeof currentPlayer.stopVideo === 'function') currentPlayer.stopVideo();
      } catch (_) {}
    }

    // Check offline / local cache first (with pre-buffered instant swap & Cache API)
    (async () => {
      try {
        const trackId = trackMeta.videoId || trackMeta.video_id || trackMeta.id;

        // Fast path: if this track was already pre-buffered into the secondary audio element, swap in 0ms!
        if (
          prebufferedTrackIdRef.current === trackId &&
          prebufferAudioRef.current &&
          prebufferAudioRef.current.src &&
          audioRef.current
        ) {
          console.log('[GaplessAudio] Instant 0-silence swap with pre-buffered audio track:', trackMeta.title);
          activeEngineRef.current = 'audio';
          audioRef.current.src = prebufferAudioRef.current.src;
          audioRef.current.volume = volume;
          await audioRef.current.play();
          setIsPlaying(true);
          setIsLoading(false);
          setError(null);
          return;
        }

        let offlineBlob = null;
        let offlineThumbnail = null;

        // 1. Try Dexie offlineTracks
        if (trackId) {
          try {
            const localTrack = await db.offlineTracks.get(trackId);
            if (localTrack) {
              if (localTrack.audioBlob) {
                offlineBlob = localTrack.audioBlob;
              }
              if (localTrack.thumbnailBase64) {
                offlineThumbnail = localTrack.thumbnailBase64;
              } else if (localTrack.thumbnailBlob) {
                offlineThumbnail = URL.createObjectURL(localTrack.thumbnailBlob);
              }
            }
          } catch (e) {
            console.warn('[AudioEngine] Dexie offlineTracks lookup failed:', e);
          }
        }

        // 2. Try Dexie audioCache
        if (!offlineBlob && trackId) {
          try {
            const cached = await db.audioCache.get(trackId);
            if (cached && cached.blob) {
              offlineBlob = cached.blob;
            }
          } catch (e) {
            console.warn('[AudioEngine] Dexie audioCache lookup failed:', e);
          }
        }

        // 3. Try Browser Cache API (offline-audio-v1 & ege-vinyl-audio-cache-v1)
        if (!offlineBlob && trackId && typeof caches !== 'undefined') {
          for (const cacheName of ['offline-audio-v1', 'ege-vinyl-audio-cache-v1']) {
            try {
              const cache = await caches.open(cacheName);
              const cachedRes = await cache.match(`/offline-audio/${trackId}`);
              if (cachedRes) {
                offlineBlob = await cachedRes.blob();
              }

              if (!offlineThumbnail) {
                const cachedImg = await cache.match(`/offline-image/${trackId}`);
                if (cachedImg) {
                  offlineThumbnail = await cachedImg.text();
                }
              }
              if (offlineBlob) break;
            } catch (e) {
              console.warn(`[AudioEngine] Cache API (${cacheName}) lookup failed:`, e);
            }
          }
        }

        // If local offline audio exists, play it 100% locally with HTML5 audio
        if (offlineBlob) {
          console.log('[AudioEngine] Local downloaded track found. Playing offline...', trackMeta.title);
          if (audioRef.current) {
            const localUrl = URL.createObjectURL(offlineBlob);
            activeEngineRef.current = 'audio';
            audioRef.current.src = localUrl;
            audioRef.current.volume = volume;

            if (offlineThumbnail) {
              setCurrentTrack(prev => prev ? { ...prev, thumbnail: offlineThumbnail } : prev);
            }

            await audioRef.current.play();
            setIsPlaying(true);
            setIsLoading(false);
            setError(null);
            return;
          }
        }
      } catch (err) {
        console.warn('[AudioEngine] Failed to check or play local offline track:', err);
      }

      // If network is offline and not downloaded, notify user
      const isOfflineMode = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOfflineMode) {
        setError("Hors-ligne : Ce titre n'est pas disponible hors connexion.");
        setIsLoading(false);
        setIsPlaying(false);
        toast.error("Mode Hors-ligne : Veuillez sélectionner un titre téléchargé.", { icon: '✈️' });
        return;
      }

      // --- STANDARD ONLINE STREAMING VIA YOUTUBE IFRAME ---
      activeEngineRef.current = 'iframe';
      const player = iframePlayerRef.current;

      if (player) {
        try {
          if (typeof player.unMute === 'function') player.unMute();
          if (typeof player.setVolume === 'function') player.setVolume(Math.round(volume * 100));
        } catch (_) {}
      } else {
        pendingTrackRef.current = trackMeta;
      }

      if (validYtId) {
        if (player && typeof player.loadVideoById === 'function') {
          try {
            player.loadVideoById(validYtId, 0);
            if (typeof player.playVideo === 'function') player.playVideo();
          } catch (err) {
            console.warn('[AudioEngine] Erreur lecture iframe directe:', err);
          }
        }
        setIsPlaying(true);
        setIsLoading(false);
      } else {
        try {
          let cleanArtist = getMainArtistName(trackMeta.artist);
          let cleanTitle = (trackMeta.title || '')
            .replace(/\b(live|en concert|in concert|live at|live in|live performance|live session|unplugged|en direct|live version|concert|tv show|festival|tour|bootleg|live recording|session live|bbc sessions)\b.*/i, '')
            .replace(/[\(\[\{].*?[\)\]\}]/g, '')
            .trim();

          const query = `${cleanTitle} ${cleanArtist}`.trim();

          let searchResults = await searchLyraMusic(query);

          if ((!searchResults || searchResults.length === 0) && cleanArtist && cleanTitle) {
            searchResults = await searchLyraMusic(`${cleanArtist} ${cleanTitle}`);
          }

          if (!searchResults || searchResults.length === 0) {
            searchResults = await searchLyraTracks(query);
          }

          if (currentRequestId !== playRequestIdRef.current) {
            return;
          }

          if (searchResults && searchResults.length > 0) {
            const getDurationSec = (itm) => {
              if (typeof itm.duration === 'number') return itm.duration;
              if (typeof itm.lengthSeconds === 'number') return itm.lengthSeconds;
              if (typeof itm.lengthSeconds === 'string') {
                const parsed = parseInt(itm.lengthSeconds, 10);
                if (!isNaN(parsed)) return parsed;
              }
              if (typeof itm.duration === 'string') {
                const parts = itm.duration.split(':').map(Number);
                if (parts.length === 2) return parts[0] * 60 + parts[1];
                if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
                const parsed = parseInt(itm.duration, 10);
                if (!isNaN(parsed)) return parsed;
              }
              return 0;
            };

            let bestTrack = null;
            let highestScore = -99999;
            const targetDuration = trackMeta.duration || 0;

            // 1. Chercher des morceaux avec une tolérance stricte de +/- 3s
            for (const item of searchResults) {
              const itemDuration = getDurationSec(item);
              const score = scoreAudioTrack(item, cleanTitle, cleanArtist);
              const diff = targetDuration > 0 && itemDuration > 0 ? Math.abs(itemDuration - targetDuration) : 9999;

              if (targetDuration > 0 && itemDuration > 0 && diff <= 3) {
                const augmentedScore = score + 10000 - diff * 1000;
                if (augmentedScore > highestScore) {
                  highestScore = augmentedScore;
                  bestTrack = item;
                }
              }
            }

            // 2. Repli à +/- 10s si aucun morceau de +/- 3s trouvé
            if (!bestTrack) {
              for (const item of searchResults) {
                const itemDuration = getDurationSec(item);
                const score = scoreAudioTrack(item, cleanTitle, cleanArtist);
                const diff = targetDuration > 0 && itemDuration > 0 ? Math.abs(itemDuration - targetDuration) : 9999;

                if (targetDuration > 0 && itemDuration > 0 && diff <= 10) {
                  const augmentedScore = score + 5000 - diff * 200;
                  if (augmentedScore > highestScore) {
                    highestScore = augmentedScore;
                    bestTrack = item;
                  }
                }
              }
            }

            // 3. Repli général par score original
            if (!bestTrack) {
              bestTrack = searchResults[0];
              for (const item of searchResults) {
                const score = scoreAudioTrack(item, cleanTitle, cleanArtist);
                if (score > highestScore) {
                  highestScore = score;
                  bestTrack = item;
                }
              }
            }

            const foundId = extractYouTubeId(bestTrack.videoId || bestTrack.id);
            if (foundId && foundId.length === 11) {
              trackMeta.videoId = foundId;
              trackMeta.id = foundId;
              if (bestTrack.thumbnail && !trackMeta.thumbnail) {
                trackMeta.thumbnail = bestTrack.thumbnail;
              }
              setCurrentTrack({ ...trackMeta });
              updateMediaSessionMetadata(trackMeta);

              const currentPlayer2 = iframePlayerRef.current;
              if (currentPlayer2 && typeof currentPlayer2.loadVideoById === 'function') {
                if (typeof currentPlayer2.unMute === 'function') currentPlayer2.unMute();
                if (typeof currentPlayer2.setVolume === 'function') currentPlayer2.setVolume(Math.round(volume * 100));
                currentPlayer2.loadVideoById(foundId, 0);
                if (typeof currentPlayer2.playVideo === 'function') currentPlayer2.playVideo();
              } else {
                pendingTrackRef.current = trackMeta;
              }
              setIsPlaying(true);
              setIsLoading(false);
              return;
            }
          }
          throw new Error("Titre introuvable sur YouTube");
        } catch (err) {
          if (currentRequestId !== playRequestIdRef.current) return;
          console.error('[AudioEngine] Erreur recherche YouTube:', err);
          setError("Impossible de trouver ce titre.");
          setIsLoading(false);
          setIsPlaying(false);

          const currentPlayer2 = iframePlayerRef.current;
          if (currentPlayer2) {
            try {
              if (typeof currentPlayer2.stopVideo === 'function') {
                currentPlayer2.stopVideo();
              } else if (typeof currentPlayer2.pauseVideo === 'function') {
                currentPlayer2.pauseVideo();
              }
            } catch (_) {}
          }
        }
      }
    })();

    // Synchroniser la file d'attente avec le titre joué si nécessaire
    setQueue((prevQueue) => {
      if (!prevQueue || prevQueue.length === 0) {
        setQueueIndex(0);
        return [trackMeta];
      }
      const existingIdx = prevQueue.findIndex(
        (t) => (t.videoId && t.videoId === trackMeta.videoId) || (t.id && t.id === trackMeta.id)
      );
      if (existingIdx !== -1) {
        setQueueIndex(existingIdx);
        return prevQueue;
      }
      // Si le titre n'était pas dans la queue, on l'ajoute et on s'y positionne
      const newQueue = [...prevQueue, trackMeta];
      setQueueIndex(newQueue.length - 1);
      return newQueue;
    });

    // Save history in BDD linked to user.id
    (async () => {
      try {
        if (user) {
          await recordListeningHistory(user, trackMeta);
        }
      } catch (err) {
        console.warn('Error recording listening history:', err);
      }
    })();
  }, [updateMediaSessionMetadata, volume, user]);

  // Remote play event listener (from Toast notifications)
  useEffect(() => {
    const handlePlayEvent = (e) => {
      if (e.detail) {
        play(e.detail);
      }
    };
    window.addEventListener('lyra:play_track', handlePlayEvent);
    return () => {
      window.removeEventListener('lyra:play_track', handlePlayEvent);
    };
  }, [play]);

  const playFromQueue = useCallback(async (index) => {
    if (index >= 0 && index < queue.length) {
      setQueueIndex(index);
      await play(queue[index]);
    }
  }, [queue, play]);

  const playNext = useCallback(() => {
    if (!queue.length) {
      if (currentTrack && (repeat === 'all' || repeat === 'one')) {
        seek(0);
        resume();
      }
      return;
    }

    if (repeat === 'one') {
      seek(0);
      resume();
      return;
    }

    let nextIndex = -1;
    if (shuffle) {
      if (queue.length === 1) {
        nextIndex = (repeat === 'all') ? 0 : -1;
      } else {
        let rand = queueIndex;
        let attempts = 0;
        while (rand === queueIndex && attempts < 20) {
          rand = Math.floor(Math.random() * queue.length);
          attempts++;
        }
        nextIndex = rand;
      }
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        nextIndex = repeat === 'all' ? 0 : -1;
      }
    }

    if (nextIndex !== -1 && queue[nextIndex]) {
      const nextTrack = queue[nextIndex];
      toast(`Prochain titre: ${nextTrack.title}`, {
        icon: '🎵',
        duration: 2500,
      });
      playFromQueue(nextIndex);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, shuffle, repeat, currentTrack, seek, resume, playFromQueue]);

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      seek(0);
      return;
    }
    if (!queue.length) {
      seek(0);
      return;
    }

    if (repeat === 'one') {
      seek(0);
      resume();
      return;
    }

    let prevIndex = -1;
    if (shuffle) {
      if (queue.length > 1) {
        let rand = queueIndex;
        let attempts = 0;
        while (rand === queueIndex && attempts < 20) {
          rand = Math.floor(Math.random() * queue.length);
          attempts++;
        }
        prevIndex = rand;
      } else {
        prevIndex = 0;
      }
    } else {
      prevIndex = queueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = repeat === 'all' ? queue.length - 1 : 0;
      }
    }

    if (prevIndex >= 0 && queue[prevIndex]) {
      playFromQueue(prevIndex);
    } else {
      seek(0);
    }
  }, [queue, queueIndex, currentTime, shuffle, repeat, seek, resume, playFromQueue]);

  const handleTrackEnded = useCallback(() => {
    if (repeat === 'one') {
      seek(0);
      if (activeEngineRef.current === 'iframe' && iframePlayerRef.current) {
        try {
          if (typeof iframePlayerRef.current.seekTo === 'function') {
            iframePlayerRef.current.seekTo(0, true);
          }
          if (typeof iframePlayerRef.current.playVideo === 'function') {
            iframePlayerRef.current.playVideo();
          }
        } catch (_) {}
      } else if (activeEngineRef.current === 'audio' && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    } else {
      playNext();
    }
  }, [repeat, seek, playNext]);

  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
    actionsRef.current = { resume, pause, next: playNext, prev: playPrevious, seek };
  }, [handleTrackEnded, resume, pause, playNext, playPrevious, seek]);

  // =========================================================================
  // ⚡ GAPLESS PLAYBACK & PRÉCHARGEMENT AUDIO INTELLIGENT (0 SILENCE)
  // Précharge le prochain morceau de la file d'attente (Blob local ou flux direct)
  // et résout son ID YouTube en avance pour une transition instantanée sans latence.
  // =========================================================================
  useEffect(() => {
    if (!isPlaying || !queue.length || queueIndex < 0) return;

    let nextIndex = shuffle
      ? (queue.length > 1 ? (queueIndex + 1) % queue.length : -1)
      : (queueIndex + 1 < queue.length ? queueIndex + 1 : (repeat === 'all' ? 0 : -1));

    if (nextIndex === -1 || !queue[nextIndex]) return;

    const nextTrack = queue[nextIndex];
    const nextTrackKey = nextTrack.videoId || nextTrack.ytVideoId || nextTrack.id;

    let isSubscribed = true;

    // 1. Précharger le fichier audio local IndexedDB (Dexie) s'il est déjà téléchargé
    db.offlineTracks.get(nextTrackKey).then((localTrack) => {
      if (!isSubscribed) return;
      if (localTrack && localTrack.audioBlob && prebufferAudioRef.current) {
        try {
          const prebufferUrl = URL.createObjectURL(localTrack.audioBlob);
          prebufferAudioRef.current.src = prebufferUrl;
          prebufferAudioRef.current.preload = 'auto';
          prebufferAudioRef.current.load();
          prebufferedTrackIdRef.current = nextTrackKey;
          console.log('[GaplessAudio] Piste locale préchargée en arrière-plan:', nextTrack.title);
        } catch (e) {
          console.warn('[GaplessAudio] Erreur préchargement local:', e);
        }
      }
    }).catch(() => {});

    // 2. Pré-résolution en avance de l'identifiant YouTube s'il n'est pas encore extrait (0ms de latence au clic Suivant)
    const currentYtId = extractYouTubeId(nextTrackKey || '');
    if (!currentYtId || currentYtId.length !== 11) {
      const cleanArtist = getMainArtistName(nextTrack.artist);
      const cleanTitle = (nextTrack.title || '')
        .replace(/\b(live|en concert|in concert|live at|live in|live performance|live session|unplugged|en direct|live version|concert|tv show|festival|tour|bootleg|live recording|session live|bbc sessions)\b.*/i, '')
        .replace(/[\(\[\{].*?[\)\]\}]/g, '')
        .trim();
      const q = `${cleanTitle} ${cleanArtist}`.trim();

      searchLyraMusic(q).then((results) => {
        if (!isSubscribed) return;
        if (results && results.length > 0) {
          const getDurationSec = (itm) => {
            if (typeof itm.duration === 'number') return itm.duration;
            if (typeof itm.lengthSeconds === 'number') return itm.lengthSeconds;
            if (typeof itm.lengthSeconds === 'string') {
              const parsed = parseInt(itm.lengthSeconds, 10);
              if (!isNaN(parsed)) return parsed;
            }
            if (typeof itm.duration === 'string') {
              const parts = itm.duration.split(':').map(Number);
              if (parts.length === 2) return parts[0] * 60 + parts[1];
              if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
              const parsed = parseInt(itm.duration, 10);
              if (!isNaN(parsed)) return parsed;
            }
            return 0;
          };

          let bestTrack = null;
          let highestScore = -99999;
          const targetDuration = nextTrack.duration || 0;

          for (const item of results) {
            const itemDuration = getDurationSec(item);
            const score = scoreAudioTrack(item, cleanTitle, cleanArtist);
            const diff = targetDuration > 0 && itemDuration > 0 ? Math.abs(itemDuration - targetDuration) : 9999;

            if (targetDuration > 0 && itemDuration > 0 && diff <= 3) {
              const augmentedScore = score + 10000 - diff * 1000;
              if (augmentedScore > highestScore) {
                highestScore = augmentedScore;
                bestTrack = item;
              }
            }
          }

          if (!bestTrack) {
            for (const item of results) {
              const itemDuration = getDurationSec(item);
              const score = scoreAudioTrack(item, cleanTitle, cleanArtist);
              const diff = targetDuration > 0 && itemDuration > 0 ? Math.abs(itemDuration - targetDuration) : 9999;

              if (targetDuration > 0 && itemDuration > 0 && diff <= 10) {
                const augmentedScore = score + 5000 - diff * 200;
                if (augmentedScore > highestScore) {
                  highestScore = augmentedScore;
                  bestTrack = item;
                }
              }
            }
          }

          if (!bestTrack) {
            bestTrack = results[0];
            for (const item of results) {
              const score = scoreAudioTrack(item, cleanTitle, cleanArtist);
              if (score > highestScore) {
                highestScore = score;
                bestTrack = item;
              }
            }
          }

          const found = extractYouTubeId(bestTrack.videoId || bestTrack.id);
          if (found && found.length === 11) {
            nextTrack.videoId = found;
            nextTrack.id = found;
            console.log('[GaplessAudio] Identifiant flux pré-résolu pour le morceau suivant (avec filtrage par durée):', nextTrack.title, found);
          }
        }
      }).catch(() => {});
    }

    return () => {
      isSubscribed = false;
    };
  }, [isPlaying, queue, queueIndex, shuffle, repeat]);

  const addToQueue = useCallback((track) => {
    const vId = extractYouTubeId(track.videoId || track.id || '');
    const formatted = {
      ...track,
      id: vId || track.id,
      videoId: vId,
      thumbnail: getHdArtwork(track.thumbnail, vId)
    };
    setQueue((prev) => [...prev, formatted]);
  }, []);

  const removeFromQueue = useCallback((index) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  const setQueueAndPlay = useCallback((tracks, startIndex = 0) => {
    const formattedTracks = tracks.map(t => {
      let vId = extractYouTubeId(t.videoId || t.ytVideoId || t.id || '');
      if (!/^[a-zA-Z0-9_-]{11}$/.test(vId)) {
        vId = '';
      }
      return {
        ...t,
        id: t.id || (vId ? vId : t.videoId),
        deezerId: t.deezerId || t.id,
        albumId: t.albumId || (typeof t.album === 'object' ? t.album?.id : undefined),
        album: t.album || (t.albumObj ? t.albumObj.title : undefined),
        videoId: vId || t.videoId || t.id,
        thumbnail: getHdArtwork(t.thumbnail, vId || t.id)
      };
    });
    setQueue(formattedTracks);
    setQueueIndex(startIndex);
    if (formattedTracks[startIndex]) {
      play(formattedTracks[startIndex]);
    }
  }, [play]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const isCurrentTrack = useCallback((track) => {
    if (!currentTrack || !track) return false;
    
    // Strict comparison by unique track ID / Deezer ID / YouTube videoId
    const cId = currentTrack.id != null ? String(currentTrack.id) : null;
    const tId = track.id != null ? String(track.id) : null;
    const cDzId = currentTrack.deezerId != null ? String(currentTrack.deezerId) : null;
    const tDzId = track.deezerId != null ? String(track.deezerId) : null;
    const cVid = currentTrack.videoId ? String(currentTrack.videoId) : null;
    const tVid = track.videoId ? String(track.videoId) : null;

    // Direct match on primary unique IDs
    if (tId && cId && tId === cId) return true;
    if (tDzId && cDzId && tDzId === cDzId) return true;
    if (tVid && cVid && tVid === cVid) return true;

    // Cross-check id with videoId / deezerId (e.g., '123' vs 'dz_123')
    if (tId && cVid && tId === cVid) return true;
    if (tVid && cId && tVid === cId) return true;
    if (tId && cDzId && (tId === cDzId || tId === `dz_${cDzId}`)) return true;
    if (cId && tDzId && (cId === tDzId || cId === `dz_${tDzId}`)) return true;
    if (tVid && cDzId && (tVid === cDzId || tVid === `dz_${cDzId}`)) return true;
    if (cVid && tDzId && (cVid === tDzId || cVid === `dz_${tDzId}`)) return true;

    // STRICT: Do NOT check by title or artist alone (to prevent false matches across remixes, live, acoustic versions)
    return false;
  }, [currentTrack]);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lyra_shuffle', JSON.stringify(next));
      } catch (_) {}
      toast(next ? 'Lecture aléatoire activée' : 'Lecture aléatoire désactivée', {
        icon: next ? '🔀' : '➡️',
        duration: 2000,
      });
      return next;
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      try {
        localStorage.setItem('lyra_repeat', next);
      } catch (_) {}
      const label =
        next === 'all'
          ? 'Répéter : Toute la file'
          : next === 'one'
          ? 'Répéter : Ce titre en boucle'
          : 'Répétition désactivée';
      const icon = next === 'all' ? '🔁' : next === 'one' ? '🔂' : '➡️';
      toast(label, { icon, duration: 2000 });
      return next;
    });
  }, []);

  const getAnalyserData = useCallback(() => {
    if (!analyserNode) return null;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }, []);

  return {
    // Fonctions et états essentiels du lecteur
    play,
    pause,
    resume,
    resetPlayer,
    reset: resetPlayer,
    stopAndReset: resetPlayer,
    seekTo: seek,
    seek,
    currentTime,
    duration,
    isPlaying,
    isLoading,
    currentTrack,
    volume,
    setVolume,
    togglePlayPause,
    isCurrentTrack,
    isNative,

    // Gestion de file d'attente et navigation
    queue,
    queueIndex,
    shuffle,
    repeat,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setQueueAndPlay,
    toggleShuffle,
    toggleRepeat,

    // États et options audio vintage
    error,
    isOffline,
    isPlayerModalOpen,
    setIsPlayerModalOpen,
    audioRef,
    hifiMode,
    setHifiMode,
    vinylCrackle,
    setVinylCrackle,
    vinylCrackleVolume,
    setVinylCrackleVolume,
    pitch,
    setPitch,
    bassGain,
    setBassGain,
    midGain,
    setMidGain,
    trebleGain,
    setTrebleGain,
    tubeSaturation,
    setTubeSaturation,
    getAnalyserData,
    setIframePlayer,
    onIframeStateChange,
    onIframeError,
  };
}
