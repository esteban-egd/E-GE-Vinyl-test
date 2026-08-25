import { useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';

/**
 * YouTubeIframeEngine
 * Moteur YouTube Iframe invisible pour la lecture Web instantanée.
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
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: '100%',
          width: '100%',
          videoId: 'M7lc1UVf-VE',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event) => {
              isInitializingRef.current = false;
              try {
                if (event.target && typeof event.target.getIframe === 'function') {
                  const iframeEl = event.target.getIframe();
                  if (iframeEl) {
                    iframeEl.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
                  }
                }
              } catch (_) {}
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
          }
        });
      } catch (err) {
        isInitializingRef.current = false;
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
          document.body.appendChild(tag);
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
        bottom: 0,
        right: 0,
        width: '200px',
        height: '200px',
        opacity: 0.001,
        pointerEvents: 'none',
        zIndex: -9999,
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '200px', height: '200px' }}>
        <div ref={containerRef} id="yt-hidden-engine" className="w-full h-full" />
      </div>
    </div>
  );
}
