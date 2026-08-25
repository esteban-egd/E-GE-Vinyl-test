import { useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';

/**
 * YouTubeIframeEngine
 * Lecteur YouTube invisible, optimisé pour contourner les erreurs cross-origin postMessage sur Vercel.
 */
export default function YouTubeIframe() {
  const { setIframePlayer, onIframeStateChange, onIframeError } = useAudio();
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function initPlayer() {
      if (playerRef.current || isInitializingRef.current) return;
      if (!window.YT || !window.YT.Player) return;
      if (!containerRef.current) return;

      isInitializingRef.current = true;

      try {
        new window.YT.Player(containerRef.current, {
          height: '200',
          width: '200',
          videoId: '',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            // Ne pas forcer 'origin' dans playerVars pour éviter les rejets postMessage cross-origin sur Vercel
          },
          events: {
            onReady: (event) => {
              playerRef.current = event.target;
              isInitializingRef.current = false;
              if (setIframePlayer) {
                setIframePlayer(event.target);
              }
            },
            onStateChange: (event) => {
              if (onIframeStateChange) {
                onIframeStateChange(event.data);
              }
            },
            onError: (event) => {
              console.warn('[YouTubeIframeEngine] Erreur code:', event.data);
              isInitializingRef.current = false;
              if (onIframeError) {
                onIframeError(event.data);
              }
            }
          },
        });
      } catch (err) {
        console.warn('[YouTubeIframeEngine] Erreur initialisation:', err);
        isInitializingRef.current = false;
      }
    }

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const scriptId = 'youtube-iframe-api-script';
      let tag = document.getElementById(scriptId);

      if (!tag) {
        tag = document.createElement('script');
        tag.id = scriptId;
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }

      const existingCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof existingCallback === 'function') {
          existingCallback();
        }
        initPlayer();
      };
    }

    return () => {
      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
          playerRef.current = null;
        }
        isInitializingRef.current = false;
        if (setIframePlayer) {
          setIframePlayer(null);
        }
      } catch (err) {
        console.warn('[YouTubeIframeEngine] Erreur lors du destroy:', err);
      }
    };
  }, [setIframePlayer, onIframeStateChange, onIframeError]);

  return (
    <div
      id="yt-hidden-host"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '200px',
        height: '200px',
        pointerEvents: 'none',
        zIndex: -9999,
        visibility: 'visible',
      }}
    >
      <div ref={containerRef} id="yt-hidden-engine" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export const YouTubeIframeEngine = YouTubeIframe;