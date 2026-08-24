import { useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';

export default function YouTubeIframe() {
  const { setIframePlayer, onIframeStateChange, onIframeError } = useAudio();
  const playerRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function createYTPlayer() {
      if (playerRef.current || isInitializedRef.current) return;
      if (!window.YT || !window.YT.Player) return;

      const container = document.getElementById('yt-player-container');
      if (!container) return;

      isInitializedRef.current = true;
      try {
        new window.YT.Player('yt-player-container', {
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
              console.log('[YouTubeIframe] Moteur YouTube Iframe Player prêt.');
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
              console.warn('[YouTubeIframe] Erreur YouTube Player:', event.data);
              if (onIframeError) {
                onIframeError(event.data);
              }
            }
          },
        });
      } catch (err) {
        console.warn('[YouTubeIframe] Erreur création YT Player:', err);
      }
    }

    if (window.YT && window.YT.Player) {
      createYTPlayer();
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

      window.onYouTubeIframeAPIReady = () => {
        createYTPlayer();
      };
    }
  }, [setIframePlayer, onIframeStateChange, onIframeError]);

  return (
    <div
      id="yt-player-host"
      style={{
        position: 'fixed',
        bottom: '0px',
        right: '0px',
        width: '200px',
        height: '200px',
        opacity: '0.001',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <div id="yt-player-container" className="w-full h-full" />
    </div>
  );
}
