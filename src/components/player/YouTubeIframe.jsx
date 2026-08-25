import { useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';

/**
 * YouTubeIframeEngine
 * Moteur YouTube Iframe invisible pour la lecture Web instantanée sans blocage réseau.
 */
export default function YouTubeIframe() {
  const { setIframePlayer, onIframeStateChange, onIframeError } = useAudio();
  const playerRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function initPlayer() {
      if (playerRef.current || isInitializedRef.current) return;
      if (!window.YT || !window.YT.Player) return;

      const container = document.getElementById('yt-hidden-engine');
      if (!container) return;

      isInitializedRef.current = true;
      try {
        new window.YT.Player('yt-hidden-engine', {
          height: '100%',
          width: '100%',
          videoId: '',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            rel: 0,
            iv_load_policy: 3,
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
  }, [setIframePlayer, onIframeStateChange, onIframeError]);

  return (
    <div
      id="yt-hidden-host"
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: '0',
        right: '0',
        width: '1px',
        height: '1px',
        opacity: '0.001',
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden',
      }}
    >
      <div id="yt-hidden-engine" className="w-full h-full" />
    </div>
  );
}

export const YouTubeIframeEngine = YouTubeIframe;
