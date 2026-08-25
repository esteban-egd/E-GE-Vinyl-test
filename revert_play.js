const fs = require('fs');

let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

const playStart = content.indexOf('const play = useCallback((rawTrack) => {');
const playEnd = content.indexOf('  }, [isNative, updateMediaSessionMetadata, volume]);') + 53;

if (playStart !== -1 && playEnd !== -1) {
    const oldPlay = `  const play = useCallback(async (rawTrack) => {
    if (!rawTrack) return;

    const initialVideoId = extractYouTubeId(rawTrack.videoId || rawTrack.id || '');

    const trackMeta = {
      ...rawTrack,
      id: initialVideoId || rawTrack.id,
      videoId: initialVideoId,
      thumbnail: getHdArtwork(rawTrack.thumbnail, initialVideoId)
    };

    // 1. Déblocage audio immédiat
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try { navigator.audioSession.type = 'playback'; } catch {}
    }

    setError(null);
    setIsLoading(true);
    setCurrentTrack(trackMeta);
    updateMediaSessionMetadata(trackMeta);

    // Arrêter l'autre lecteur pour éviter la double lecture
    if (audioRef.current && !audioRef.current.paused) {
      try { audioRef.current.pause(); } catch {}
    }

    // 2. Vérifier si morceau stocké hors-ligne en IndexedDB
    try {
      const cached = await db.offlineTracks?.get(trackMeta.videoId);
      if (cached?.audioBlob) {
        const blobUrl = URL.createObjectURL(cached.audioBlob);
        if (audioRef.current) {
          activeEngineRef.current = 'audio';
          if (iframePlayerRef.current?.pauseVideo) {
            try { iframePlayerRef.current.pauseVideo(); } catch {}
          }
          audioRef.current.src = blobUrl;
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          setIsPlaying(true);
          setIsLoading(false);
          return;
        }
      }
    } catch {}

    // 3. Résolution et Garantie de la version Audio Studio Officielle (100% Studio, 0 Live, 0 Clip)
    const isNonYoutubeId = !trackMeta.videoId || trackMeta.videoId.startsWith('dz_') || trackMeta.videoId.length !== 11;
    const userWantsLive = isLiveTrack(trackMeta.title);
    const isClip = isClipTrack(trackMeta.title);

    if (isNonYoutubeId || userWantsLive || isClip) {
      try {
        const cleanArtist = getMainArtistName(trackMeta.artist);
        const cleanTitle = (trackMeta.title || '')
          .replace(/\\b(live|en concert|in concert|live at|live in|live performance|live session|unplugged|en direct|live version|concert|tv show|festival|tour|bootleg|live recording|session live|bbc sessions)\\b.*/i, '')
          .replace(/[\\(\\[\\{].*?[\\)\\]\\}]/g, '')
          .trim();

        const searchQueries = [
          \`\${cleanTitle} \${cleanArtist} official audio\`,
          \`\${cleanTitle} \${cleanArtist} audio\`,
          \`\${cleanTitle} \${cleanArtist} topic\`
        ];

        let bestMatch = null;
        let bestScore = -99999;

        for (const query of searchQueries) {
          const searchResults = await searchLyraTracks(query);
          if (searchResults && searchResults.length > 0) {
            for (const t of searchResults) {
              const score = scoreAudioTrack(t, cleanTitle, cleanArtist);
              if (score > bestScore) {
                bestScore = score;
                bestMatch = t;
              }
            }
          }
          if (bestScore > 1000) break;
        }

        if (bestMatch && bestMatch.videoId && bestScore > -2000) {
          const matchedId = extractYouTubeId(bestMatch.videoId);
          trackMeta.videoId = matchedId;
          trackMeta.id = matchedId;
          if (cleanTitle) {
            trackMeta.title = cleanTitle;
          }
          if (bestMatch.thumbnail && !trackMeta.thumbnail) {
            trackMeta.thumbnail = bestMatch.thumbnail;
          }
        }
      } catch (err) {
        console.warn('[AudioEngine] Erreur résolution audio studio:', err);
      }
    }

    // Sécurisation finale du videoId avant transmission aux moteurs
    trackMeta.videoId = extractYouTubeId(trackMeta.videoId);

    // 4. Distinction Environnement Native (.exe / .apk) vs Web (Vercel)
    if (isNative) {
      // En mode Native (.exe / .apk) : extraction directe haute fidélité via lyraAudio.js
      try {
        const streamUrl = await getLyraAudioStream(trackMeta.videoId, trackMeta.title, trackMeta.artist);
        if (streamUrl && audioRef.current) {
          activeEngineRef.current = 'audio';
          if (iframePlayerRef.current?.pauseVideo) {
            try { iframePlayerRef.current.pauseVideo(); } catch {}
          }
          audioRef.current.src = streamUrl.startsWith('http://') ? streamUrl.replace('http://', 'https://') : streamUrl;
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          setIsPlaying(true);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('[AudioEngine Native] Échec flux direct, fallback YouTube Iframe:', err);
      }
    }

    // En mode Web (Vercel) : Utilisation immédiate de YouTube Iframe API pour zéro latence et contournement CORS/Cloud IP
    if (trackMeta.videoId && trackMeta.videoId.length === 11) {
      activeEngineRef.current = 'iframe';
      if (iframePlayerRef.current && typeof iframePlayerRef.current.loadVideoById === 'function') {
        try {
          if (typeof iframePlayerRef.current.setVolume === 'function') {
            iframePlayerRef.current.setVolume(Math.round(volume * 100));
          }
          iframePlayerRef.current.loadVideoById(trackMeta.videoId, 0);
          
          if (typeof iframePlayerRef.current.playVideo === 'function') {
            const playPromise = iframePlayerRef.current.playVideo();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch((err) => {
                console.warn('[AudioEngine] Autoplay bloqué par le navigateur:', err);
              });
            }
          }
          setIsPlaying(true);
          setIsLoading(false);
        } catch (err) {
          console.warn('[AudioEngine] Erreur lancement YT Iframe:', err);
          pendingTrackRef.current = trackMeta;
        }
      } else {
        console.log('[AudioEngine] Iframe en cours de chargement, mise en attente...');
        pendingTrackRef.current = trackMeta;
      }
    }

    // 5. Enregistrement asynchrone dans l'historique
    try {
      await db.tracks.put({ ...trackMeta, addedAt: Date.now() });
    } catch {}
  }, [isNative, updateMediaSessionMetadata, volume]);`;

    content = content.slice(0, playStart) + oldPlay + content.slice(playEnd);
    fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
    console.log("Successfully reverted play function");
} else {
    console.log("Could not find boundaries");
}
