import fs from 'fs';
let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

const playStart = content.indexOf('const play = useCallback(async (rawTrack) => {');
const playEnd = content.indexOf('  }, [isNative, updateMediaSessionMetadata, volume]);') + 53;

const trueOldPlay = `  const play = useCallback((rawTrack) => {
    if (!rawTrack) return;

    const initialVideoId = extractYouTubeId(rawTrack.videoId || rawTrack.id || '');

    const trackMeta = {
      ...rawTrack,
      id: initialVideoId || rawTrack.id,
      videoId: initialVideoId,
      thumbnail: getHdArtwork(rawTrack.thumbnail, initialVideoId)
    };

    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try { navigator.audioSession.type = 'playback'; } catch {}
    }

    setError(null);
    setIsLoading(true);
    setCurrentTrack(trackMeta);
    updateMediaSessionMetadata(trackMeta);

    if (audioRef.current && !audioRef.current.paused) {
      try { audioRef.current.pause(); } catch {}
    }

    // 1. Déclenchement SYNCHRONE de l'Iframe YouTube dans le geste utilisateur
    if (!isNative && trackMeta.videoId && trackMeta.videoId.length === 11) {
      activeEngineRef.current = 'iframe';
      if (iframePlayerRef.current && typeof iframePlayerRef.current.loadVideoById === 'function') {
        try {
          if (typeof iframePlayerRef.current.unMute === 'function') {
            iframePlayerRef.current.unMute();
          }
          if (typeof iframePlayerRef.current.setVolume === 'function') {
            iframePlayerRef.current.setVolume(Math.round(volume * 100));
          }
          iframePlayerRef.current.loadVideoById(trackMeta.videoId, 0);
          if (typeof iframePlayerRef.current.playVideo === 'function') {
            iframePlayerRef.current.playVideo();
          }
          setIsPlaying(true);
        } catch (err) {
          console.warn('[AudioEngine] Erreur lancement synchrone YT Iframe:', err);
          pendingTrackRef.current = trackMeta;
        }
      } else {
        pendingTrackRef.current = trackMeta;
      }
    }

    // 2. Mode natif (.exe, .apk)
    if (isNative) {
      (async () => {
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
          }
        } catch (err) {
          console.warn('[AudioEngine Native] Échec flux direct, fallback YouTube Iframe:', err);
          if (trackMeta.videoId && iframePlayerRef.current?.loadVideoById) {
            activeEngineRef.current = 'iframe';
            iframePlayerRef.current.loadVideoById(trackMeta.videoId, 0);
            iframePlayerRef.current.playVideo?.();
          }
        }
      })();
    }

    // 3. Résolution asynchrone si l'ID YouTube n'est pas encore présent ou s'il s'agit d'un clip/live non désiré
    const isNonYoutubeId = !trackMeta.videoId || trackMeta.videoId.startsWith('dz_') || trackMeta.videoId.length !== 11;
    const userWantsLive = isLiveTrack(trackMeta.title);
    const isClip = isClipTrack(trackMeta.title);

    if (isNonYoutubeId || userWantsLive || isClip) {
      (async () => {
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
            const resolvedId = extractYouTubeId(bestMatch.videoId);
            trackMeta.videoId = resolvedId;
            trackMeta.id = resolvedId;
            if (cleanTitle) {
              trackMeta.title = cleanTitle;
            }
            if (bestMatch.thumbnail && !trackMeta.thumbnail) {
              trackMeta.thumbnail = bestMatch.thumbnail;
            }
            
            if (activeEngineRef.current === 'iframe' && iframePlayerRef.current?.loadVideoById) {
              iframePlayerRef.current.loadVideoById(resolvedId, 0);
              iframePlayerRef.current.playVideo?.();
            } else if (!isNative) {
               // En mode Web, on balance sur IFrame si on n'y était pas
               activeEngineRef.current = 'iframe';
               iframePlayerRef.current?.loadVideoById(resolvedId, 0);
               iframePlayerRef.current?.playVideo?.();
            } else {
              const streamUrl = await getLyraAudioStream(resolvedId, trackMeta.title, trackMeta.artist);
              if (streamUrl && audioRef.current) {
                activeEngineRef.current = 'audio';
                audioRef.current.src = streamUrl.startsWith('http://') ? streamUrl.replace('http://', 'https://') : streamUrl;
                audioRef.current.currentTime = 0;
                await audioRef.current.play();
                setIsPlaying(true);
                setIsLoading(false);
              }
            }
          }
        } catch (err) {
          console.error('[AudioEngine] Échec résolution titre inconnu:', err);
        }
      })();
    }

    // 4. Vérification du cache IndexedDB et stockage historique en arrière-plan (non-bloquant)
    (async () => {
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
          }
        }
      } catch {}

      try {
        await db.tracks.put({ ...trackMeta, addedAt: Date.now() });
      } catch {}
    })();
  }, [isNative, updateMediaSessionMetadata, volume]);`;

content = content.slice(0, playStart) + trueOldPlay + content.slice(playEnd);
fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
