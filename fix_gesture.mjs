import fs from 'fs';
let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

const oldCode = `    // 1. Déclenchement SYNCHRONE de l'Iframe YouTube dans le geste utilisateur
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
    }`;

const newCode = `    // 1. Déclenchement SYNCHRONE de l'Iframe YouTube dans le geste utilisateur
    if (!isNative) {
      activeEngineRef.current = 'iframe';
      if (iframePlayerRef.current && typeof iframePlayerRef.current.loadVideoById === 'function') {
        try {
          if (typeof iframePlayerRef.current.unMute === 'function') {
            iframePlayerRef.current.unMute();
          }
          if (typeof iframePlayerRef.current.setVolume === 'function') {
            iframePlayerRef.current.setVolume(Math.round(volume * 100));
          }
          
          if (trackMeta.videoId && trackMeta.videoId.length === 11) {
            iframePlayerRef.current.loadVideoById(trackMeta.videoId, 0);
            if (typeof iframePlayerRef.current.playVideo === 'function') {
              iframePlayerRef.current.playVideo();
            }
            setIsPlaying(true);
          } else {
            // Unlock iframe synchronously even if we don't have the ID yet
            if (typeof iframePlayerRef.current.playVideo === 'function') {
              iframePlayerRef.current.playVideo();
            }
          }
        } catch (err) {
          console.warn('[AudioEngine] Erreur lancement synchrone YT Iframe:', err);
          pendingTrackRef.current = trackMeta;
        }
      } else {
        pendingTrackRef.current = trackMeta;
      }
    }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
