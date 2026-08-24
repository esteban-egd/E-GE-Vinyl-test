import { useState, useRef, useCallback, useEffect } from 'react';
import db from '../lib/db';
import { getDirectAudioUrl } from '../services/audioStreamService';

// Silence WAV 1ms Base64 pour débloquer l'audio Safari iOS instantanément
const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

const INVIDIOUS_INSTANCES = [
  'https://inv.riverside.rocks',
  'https://invidious.nerdvpn.de',
  'https://invidious.flokinet.to',
  'https://vid.puffyan.us',
  'https://invidious.projectsegfau.lt',
  'https://yewtu.be',
  'https://inv.nadeko.net'
];

export function useAudioPlayer() {
  const audioRef = useRef(null);
  const iframeRef = useRef(null);
  const syncTimerRef = useRef(null);

  const [audioMode, setAudioMode] = useState('direct'); // 'direct' | 'iframe'
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // 'off' | 'all' | 'one'
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const actionsRef = useRef({ resume: null, pause: null, next: null, prev: null, seek: null });
  const handleTrackEndedRef = useRef(null);
  const onIframeStateChangeRef = useRef(null);
  const switchToIframeFallbackRef = useRef(null);

  // --- 1. iOS AudioSession API (Safari 16.4+) & Déverrouillage Global Initial ---
  useEffect(() => {
    // Configurer la session audio iOS en mode playback (musique d'arrière-plan / écran verrouillé)
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        navigator.audioSession.type = 'playback';
      } catch (err) {
        console.warn('[AudioSession] Erreur configuration playback:', err);
      }
    }

    // Débloqueur synchrone au tout premier touch/click utilisateur sur iOS
    const unlockAudioOnFirstInteraction = () => {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
        try {
          navigator.audioSession.type = 'playback';
        } catch { }
      }

      const audio = document.getElementById('global-player');
      if (audio && !audio.src) {
        audio.src = SILENT_AUDIO_URI;
        const p = audio.play();
        if (p !== undefined) {
          p.then(() => {
            audio.pause();
          }).catch(() => { });
        }
      }
    };

    window.addEventListener('touchstart', unlockAudioOnFirstInteraction, { passive: true, once: true });
    window.addEventListener('touchend', unlockAudioOnFirstInteraction, { passive: true, once: true });
    window.addEventListener('click', unlockAudioOnFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('touchstart', unlockAudioOnFirstInteraction);
      window.removeEventListener('touchend', unlockAudioOnFirstInteraction);
      window.removeEventListener('click', unlockAudioOnFirstInteraction);
    };
  }, []);

  // --- Network Online / Offline Detection ---
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Direct Audio Element Setup ---
  useEffect(() => {
    let audio = document.getElementById('global-player');
    if (!audio) {
      audio = new Audio();
      audio.id = 'global-player';
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.setAttribute('playsinline', 'true');
      document.body.appendChild(audio);
    }
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (audioMode === 'direct') {
        setCurrentTime(audio.currentTime);
      }
    };
    const onDurationChange = () => {
      if (audioMode === 'direct') {
        setDuration(audio.duration || 0);
      }
    };
    const onPlay = () => {
      if (audioMode === 'direct') {
        setIsPlaying(true);
        setIsLoading(false);
      }
    };
    const onPause = () => {
      if (audioMode === 'direct') {
        setIsPlaying(false);
      }
    };
    const onWaiting = () => {
      if (audioMode === 'direct') {
        setIsLoading(true);
      }
    };
    const onCanPlay = () => {
      if (audioMode === 'direct') {
        setIsLoading(false);
      }
    };
    const onEnded = () => {
      if (audioMode === 'direct') {
        handleTrackEndedRef.current?.();
      }
    };

    const onError = () => {
      if (audioMode === 'direct') {
        const code = audio.error ? audio.error.code : 'unknown';
        const message = audio.error ? audio.error.message : 'Unknown';
        console.warn(`[AudioEngine] Direct error (${code}, ${message}) - Bascule sur le moteur Iframe.`);
        if (currentTrack) {
          switchToIframeFallbackRef.current?.(currentTrack);
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
  }, [audioMode, currentTrack]);

  // --- Iframe Playback Sync Loop ---
  useEffect(() => {
    if (audioMode === 'iframe' && isPlaying) {
      syncTimerRef.current = setInterval(() => {
        if (iframeRef.current?.getCurrentTime) {
          try {
            const time = iframeRef.current.getCurrentTime() || 0;
            const dur = iframeRef.current.getDuration() || 0;
            setCurrentTime(time);
            if (dur > 0) setDuration(dur);
          } catch {
            // Ignore
          }
        }
      }, 250);
    } else {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    }

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [audioMode, isPlaying]);

  // --- Fallback Iframe Trigger ---
  const switchToIframeFallback = useCallback((track) => {
    if (!track || !track.videoId) return;
    console.log('[AudioEngine] Activation du lecteur YouTube IFrame pour:', track.title);
    setAudioMode('iframe');
    setIsLoading(true);

    const tryLoad = () => {
      if (iframeRef.current && iframeRef.current.loadVideoById) {
        try {
          iframeRef.current.loadVideoById(track.videoId);
          iframeRef.current.setVolume(volume * 100);
          iframeRef.current.playVideo();
          setIsLoading(false);
          setIsPlaying(true);
        } catch (e) {
          console.warn('[AudioEngine] Iframe load error:', e);
        }
      } else {
        setTimeout(tryLoad, 300);
      }
    };

    tryLoad();
  }, [volume]);

  useEffect(() => {
    switchToIframeFallbackRef.current = switchToIframeFallback;
  }, [switchToIframeFallback]);

  // --- Iframe State Listener ---
  useEffect(() => {
    onIframeStateChangeRef.current = (state) => {
      // 1: PLAYING, 2: PAUSED, 3: BUFFERING, 0: ENDED
      if (state === 1) {
        setIsPlaying(true);
        setIsLoading(false);
        const d = iframeRef.current?.getDuration();
        if (d) setDuration(d);
      } else if (state === 2) {
        setIsPlaying(false);
      } else if (state === 3) {
        setIsLoading(true);
      } else if (state === 0) {
        handleTrackEndedRef.current?.();
      }
    };
  });

  const setIframePlayer = useCallback((player) => {
    iframeRef.current = player;
  }, []);

  const onIframeStateChange = useCallback((s) => {
    onIframeStateChangeRef.current?.(s);
  }, []);

  const onIframeError = useCallback((errCode) => {
    console.warn('[AudioEngine] Iframe error event:', errCode);
    setIsLoading(false);
  }, []);

  // --- Media Session Setup & Controls ---
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const session = navigator.mediaSession;
      const handlers = [
        ['play', () => actionsRef.current.resume?.()],
        ['pause', () => actionsRef.current.pause?.()],
        ['previoustrack', () => actionsRef.current.prev?.()],
        ['nexttrack', () => actionsRef.current.next?.()],
        ['seekto', (details) => {
          if (details?.seekTime !== undefined) {
            actionsRef.current.seek?.(details.seekTime);
          }
        }]
      ];

      handlers.forEach(([action, handler]) => {
        try {
          session.setActionHandler(action, handler);
        } catch {
          // Ignorer si non supporté
        }
      });
    } catch (err) {
      console.warn('[MediaSession] Erreur handlers:', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch { }
  }, [isPlaying]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('mediaSession' in navigator) ||
      !('setPositionState' in navigator.mediaSession) ||
      !duration ||
      isNaN(duration) ||
      duration <= 0
    ) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: 1,
        position: Math.min(Math.max(0, currentTime), duration)
      });
    } catch { }
  }, [currentTime, duration]);

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
        album: 'E GE Vinyl',
        artwork: artworkList
      });
    } catch (err) {
      console.warn('[MediaSession] Erreur metadata:', err);
    }
  }, []);

  // --- Contrôles Playback Universels ---
  const pause = useCallback(() => {
    if (audioMode === 'direct') {
      const audio = audioRef.current || document.getElementById('global-player');
      if (audio) audio.pause();
    } else {
      if (iframeRef.current?.pauseVideo) {
        iframeRef.current.pauseVideo();
      }
    }
    setIsPlaying(false);
  }, [audioMode]);

  const resume = useCallback(async () => {
    // 1. Déblocage AudioSession iOS
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        navigator.audioSession.type = 'playback';
      } catch { }
    }

    if (audioMode === 'direct') {
      const audio = audioRef.current || document.getElementById('global-player');
      if (audio && audio.src) {
        try {
          // Déclenchement synchrone du play
          const p = audio.play();
          if (p !== undefined) {
            await p;
          }
          setIsPlaying(true);
        } catch (err) {
          console.error('[AudioEngine] Resume error:', err);
        }
      }
    } else {
      if (iframeRef.current?.playVideo) {
        iframeRef.current.playVideo();
        setIsPlaying(true);
      }
    }
  }, [audioMode]);

  const seek = useCallback((time) => {
    if (audioMode === 'direct') {
      const audio = audioRef.current || document.getElementById('global-player');
      if (audio) {
        const targetTime = Math.max(0, Math.min(time, audio.duration || time));
        audio.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
    } else {
      if (iframeRef.current?.seekTo) {
        iframeRef.current.seekTo(time, true);
        setCurrentTime(time);
      }
    }
  }, [audioMode]);

  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    const audio = audioRef.current || document.getElementById('global-player');
    if (audio) audio.volume = clamped;
    if (iframeRef.current?.setVolume) iframeRef.current.setVolume(clamped * 100);
  }, []);

  // --- Séquence de lecture optimisée iOS Touch Event & Zéro Latence ---
  const play = useCallback(async (trackMeta) => {
    if (!trackMeta || !trackMeta.videoId) return;
    const videoId = trackMeta.videoId;

    // === ÉTAPE 1 : DÉBLOCAGE SYNCHRONE IMMÉDIAT (iOS SAFARI) ===
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try { navigator.audioSession.type = 'playback'; } catch { }
    }

    const audio = document.getElementById('global-player') || audioRef.current;
    if (audio) {
      if (!audio.src) audio.src = SILENT_AUDIO_URI;
      audio.play().catch(() => {});
    }

    // Lancement synchrone de l'Iframe AVANT tout 'await' pour conserver le gesture iOS
    setAudioMode('iframe');
    let iframeLaunched = false;
    
    const launchIframe = () => {
      if (iframeRef.current && iframeRef.current.loadVideoById) {
        try {
          iframeRef.current.loadVideoById({ videoId, startSeconds: 0 });
          iframeRef.current.setVolume(volume * 100);
          iframeRef.current.playVideo();
          iframeLaunched = true;
          return true;
        } catch (err) {
          console.warn('[AudioEngine] Erreur lancement iframe:', err);
          return false;
        }
      }
      return false;
    };
    
    launchIframe();
    
    if (!iframeLaunched) {
      // Si l'API n'est pas encore prête, on retente (gesture potentiellement perdu, mais indispensable)
      const checkReady = setInterval(() => {
        if (launchIframe()) clearInterval(checkReady);
      }, 150);
      setTimeout(() => clearInterval(checkReady), 4000);
    }

    // === ÉTAPE 2 : PRÉPARATION DE L'ÉTAT ET DES METADATA ===
    setError(null);
    setIsLoading(true);
    setCurrentTrack(trackMeta);
    updateMediaSessionMetadata(trackMeta);

    // === ÉTAPE 3 : VÉRIFICATION DU CACHE HORS-LIGNE (ASYNC) ===
    try {
      const cached = await db.audioCache.get(videoId);
      if (cached && cached.blob) {
        const cachedBlobUrl = URL.createObjectURL(cached.blob);
        if (audio) {
          // Pause de l'iframe si on a trouvé un cache local
          if (iframeRef.current?.pauseVideo) {
            try { iframeRef.current.pauseVideo(); } catch { }
          }
          setAudioMode('direct');
          audio.src = cachedBlobUrl;
          audio.load();
          await audio.play();
          setIsPlaying(true);
          setIsLoading(false);
        }
      } else {
        // Pas de cache, on laisse l'iframe jouer et on met à jour l'état
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch { 
      setIsPlaying(true);
      setIsLoading(false);
    }

    // Sauvegarde dans l'historique de lecture
    try {
      await db.tracks.put({ ...trackMeta, addedAt: Date.now() });
    } catch { }
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
    setQueue((prev) => [...prev, track]);
  }, []);

  const setQueueAndPlay = useCallback((tracks, startIndex = 0) => {
    setQueue(tracks);
    setQueueIndex(startIndex);
    if (tracks[startIndex]) {
      play(tracks[startIndex]);
    }
  }, [play]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const toggleShuffle = useCallback(() => setShuffle((prev) => !prev), []);
  const toggleRepeat = useCallback(() => setRepeat((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')), []);

  // Recherche Invidious multi-instances avec Promise.any pour plus de rapidité
  const search = useCallback(async (query) => {
    if (!query || !query.trim()) return [];
    const cleanQuery = query.trim();

    const searchPromises = INVIDIOUS_INSTANCES.map(async (inst) => {
      const url = `${inst}/api/v1/search?q=${encodeURIComponent(cleanQuery)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) throw new Error('Not ok');
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) throw new Error('Empty result');
      
      const formattedItems = items
        .filter((i) => i.type === 'video' || (!i.type && i.videoId))
        .map((i) => ({
          videoId: i.videoId,
          title: i.title || 'Sans titre',
          artist: i.author || i.authorName || 'Artiste inconnu',
          thumbnail: i.videoThumbnails?.[0]?.url || (i.videoId ? `https://i.ytimg.com/vi/${i.videoId}/hqdefault.jpg` : ''),
          duration: i.lengthSeconds || 0
        }));
        
      if (formattedItems.length === 0) throw new Error('No video items');
      return formattedItems;
    });

    try {
      // Retourne les résultats de la première instance qui répond avec succès
      return await Promise.any(searchPromises);
    } catch (error) {
      console.error('[AudioEngine] Toutes les instances de recherche ont échoué');
      return [];
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    currentTrack,
    queue,
    queueIndex,
    shuffle,
    repeat,
    error,
    isOffline,
    audioRef,
    audioMode,
    play,
    pause,
    resume,
    togglePlayPause,
    seek,
    setVolume,
    playNext,
    playPrevious,
    addToQueue,
    setQueueAndPlay,
    toggleShuffle,
    toggleRepeat,
    search,
    setIframePlayer,
    onIframeStateChange,
    onIframeError
  };
}
