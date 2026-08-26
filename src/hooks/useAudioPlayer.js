import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import db from '../lib/db';
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

let vinylAudioContext = null;
let vinylCrackleSource = null;
let vinylHumSource = null;
let vinylGainNode = null;
let analyserNode = null;

function startVinylNoise(volumeValue) {
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
  const isNative = isNativeEnvironment();
  const audioRef = useRef(null);
  const iframePlayerRef = useRef(null);
  const activeEngineRef = useRef('none');
  const pendingTrackRef = useRef(null);
  const syncTimerRef = useRef(null);
  const actionsRef = useRef({ resume: null, pause: null, next: null, prev: null, seek: null });
  const handleTrackEndedRef = useRef(null);
  const playRequestIdRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');
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
        el.preload = 'auto';
        el.crossOrigin = 'anonymous';
        document.body.appendChild(el);
      }
      audioRef.current = el;
    }

    const audio = audioRef.current;

    const onTimeUpdate = () => {
      if (activeEngineRef.current === 'audio') {
        setCurrentTime(audio.currentTime);
      }
    };
    const onDurationChange = () => {
      if (activeEngineRef.current === 'audio' && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onPlay = () => {
      if (activeEngineRef.current === 'audio') {
        setIsPlaying(true);
        setIsLoading(false);
        setError(null);
      }
    };
    const onPause = () => {
      if (activeEngineRef.current === 'audio') {
        setIsPlaying(false);
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
          iframePlayerRef.current.loadVideoById(currentTrack.videoId, 0);
        } else {
          setIsPlaying(false);
          setIsLoading(false);
        }
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
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
      session.setActionHandler('play', () => actionsRef.current.resume?.());
      session.setActionHandler('pause', () => actionsRef.current.pause?.());
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
    if (activeEngineRef.current === 'iframe' && iframePlayerRef.current?.pauseVideo) {
      try { iframePlayerRef.current.pauseVideo(); } catch {}
    } else if (activeEngineRef.current === 'audio' && audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying(true);
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
  }, [currentTrack]);

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
      id: validYtId || rawTrack.id,
      videoId: validYtId || rawTrack.videoId || rawTrack.id,
      thumbnail: getHdArtwork(rawTrack.thumbnail, validYtId || rawTrack.id)
    };

    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try { navigator.audioSession.type = 'playback'; } catch {}
    }

    setError(null);
    setIsLoading(true);
    setCurrentTrack(trackMeta);
    updateMediaSessionMetadata(trackMeta);

    // Stop HTML5 audio element if playing
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch (_) {}
    }

    // Synchronous user-gesture activation on YouTube iframe
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
      // If videoId is missing or invalid (e.g. Deezer ID dz_...), resolve exact YouTube ID asynchronously
      (async () => {
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
            // Score candidates to guarantee picking the official studio audio track (e.g. Cendrillon par Téléphone)
            let bestTrack = searchResults[0];
            let maxScore = -99999;

            for (const item of searchResults) {
              const score = scoreAudioTrack(item, cleanTitle, cleanArtist);
              if (score > maxScore) {
                maxScore = score;
                bestTrack = item;
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

              const currentPlayer = iframePlayerRef.current;
              if (currentPlayer && typeof currentPlayer.loadVideoById === 'function') {
                if (typeof currentPlayer.unMute === 'function') currentPlayer.unMute();
                if (typeof currentPlayer.setVolume === 'function') currentPlayer.setVolume(Math.round(volume * 100));
                currentPlayer.loadVideoById(foundId, 0);
                if (typeof currentPlayer.playVideo === 'function') currentPlayer.playVideo();
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
          
          // Stop the iframe player if it is playing the default video
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
        }
      })();
    }

    // Save history in background
    (async () => {
      try {
        await db.tracks.put({ ...trackMeta, addedAt: Date.now() });
      } catch {}
    })();
  }, [updateMediaSessionMetadata, volume]);

  const playFromQueue = useCallback(async (index) => {
    if (index >= 0 && index < queue.length) {
      setQueueIndex(index);
      await play(queue[index]);
    }
  }, [queue, play]);

  const playNext = useCallback(() => {
    if (!queue.length) return;
    let nextIndex = shuffle
      ? Math.floor(Math.random() * queue.length)
      : queueIndex + 1;

    if (nextIndex >= queue.length) {
      nextIndex = repeat === 'all' ? 0 : -1;
    }

    if (nextIndex !== -1) {
      const nextTrack = queue[nextIndex];
      toast(`Prochain titre: ${nextTrack.title}`, {
        icon: '🎵',
        duration: 3000,
      });
      playFromQueue(nextIndex);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, shuffle, repeat, playFromQueue]);

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      seek(0);
      return;
    }
    if (!queue.length) return;
    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = repeat === 'all' ? queue.length - 1 : 0;
    }
    playFromQueue(prevIndex);
  }, [queue, queueIndex, currentTime, repeat, seek, playFromQueue]);

  const handleTrackEnded = useCallback(() => {
    if (repeat === 'one') {
      seek(0);
      resume();
    } else {
      playNext();
    }
  }, [repeat, seek, resume, playNext]);

  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
    actionsRef.current = { resume, pause, next: playNext, prev: playPrevious, seek };
  }, [handleTrackEnded, resume, pause, playNext, playPrevious, seek]);

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
      const vId = extractYouTubeId(t.videoId || t.id || '');
      return {
        ...t,
        id: vId || t.id,
        videoId: vId,
        thumbnail: getHdArtwork(t.thumbnail, vId)
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
    
    if (track.videoId && currentTrack.videoId && track.videoId === currentTrack.videoId) return true;
    if (track.id && currentTrack.id && track.id === currentTrack.id) return true;
    if (track.id && currentTrack.videoId && track.id === currentTrack.videoId) return true;
    if (track.videoId && currentTrack.id && track.videoId === currentTrack.id) return true;

    if (track.title && currentTrack.title) {
      const t1 = track.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      const t2 = currentTrack.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      if (t1 && t1 === t2) {
        const a1 = getMainArtistName(track.artist || '').toLowerCase();
        const a2 = getMainArtistName(currentTrack.artist || '').toLowerCase();
        if (!a1 || !a2 || a1 === a2 || a1.includes(a2) || a2.includes(a1)) {
          return true;
        }
      }
    }
    return false;
  }, [currentTrack]);

  const toggleShuffle = useCallback(() => setShuffle((prev) => !prev), []);
  const toggleRepeat = useCallback(() => setRepeat((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')), []);

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
