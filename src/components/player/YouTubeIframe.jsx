import { useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';

/**
 * YouTubeIframeEngine
 * Lecteur YouTube invisible mais valide pour l'API YouTube (contourne le blocage 1px/opacity).
 */
export default function YouTubeIframe() {
  const { setIframePlayer, onIframeStateChange, onIframeError } = useAudio();
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function initPlayer() {
      if (playerRef.current) return;
      if (!window.YT || !window.YT.Player) return;
      if (!containerRef.current) return;

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
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              playerRef.current = event.target;
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
              if (onIframeError) {
                onIframeError(event.data);
              }
            }
          },
        });
      } catch (err) {
        console.warn('[YouTubeIframeEngine] Erreur initialisation:', err);
      }
    }

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const scriptId = 'youtube-iframe-api-script';
      if (!document.getElementById(scriptId)) {
        const tag = document.createElement('script');
        tag.id = scriptId;
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }

      const prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevOnReady === 'function') prevOnReady();
        initPlayer();
      };
    }

    return () => {
      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
          playerRef.current = null;
        }
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