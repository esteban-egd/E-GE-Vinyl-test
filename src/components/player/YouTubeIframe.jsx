import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { Tv, X, Play, Pause } from 'lucide-react';

export default function YouTubeIframe() {
  const { currentTrack, setIframePlayer, onIframeStateChange, onIframeError, isPlaying, togglePlayPause } = useAudio();
  const playerRef = useRef(null);
  const isInitializedRef = useRef(false);
  const [isPipOpen, setIsPipOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function createYTPlayer() {
      if (playerRef.current || isInitializedRef.current) return;
      if (!window.YT || !window.YT.Player) return;

      isInitializedRef.current = true;
      try {
        const player = new window.YT.Player('yt-player-container', {
          height: '100%',
          width: '100%',
          videoId: 'dQw4w9WgXcQ',
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 1,
            fs: 1,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              console.log('[YouTubeIframe] Moteur de lecture initialisé avec succès.');
              playerRef.current = event.target;
              setIframePlayer(event.target);
            },
            onStateChange: (event) => {
              if (onIframeStateChange) onIframeStateChange(event.data);
            },
            onError: (event) => {
              console.warn('[YouTubeIframe] Erreur YouTube:', event.data);
              if (onIframeError) onIframeError(event.data);
            }
          },
        });
      } catch (err) {
        console.warn('[YouTubeIframe] Erreur initialisation:', err);
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
    <>
      {/* Bouton d'accès rapide au Mini Écran Vidéo Clip (Flottant) */}
      {currentTrack && (
        <button
          onClick={() => setIsPipOpen(!isPipOpen)}
          className="fixed top-3 right-3 md:top-6 md:right-8 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-500/20 text-xs font-semibold shadow-lg transition-all"
          title="Afficher le clip vidéo"
        >
          <Tv size={14} />
          <span className="hidden sm:inline">{isPipOpen ? 'Masquer l\'écran' : 'Voir le clip'}</span>
        </button>
      )}

      {/* Conteneur Réel et Actif pour iOS Safari */}
      <div
        id="yt-player-host"
        className={`fixed transition-all duration-300 ${
          isPipOpen
            ? 'bottom-20 right-4 w-72 h-44 z-50 rounded-xl border-2 border-purple-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.9)] bg-black overflow-hidden'
            : 'bottom-0 right-0 w-[200px] h-[200px] z-[-1] opacity-100 pointer-events-none overflow-hidden'
        }`}
      >
        {isPipOpen && (
          <div className="absolute top-1 right-1 z-50">
            <button
              onClick={() => setIsPipOpen(false)}
              className="p-1 rounded-full bg-black/80 hover:bg-black text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div id="yt-player-container" className="w-full h-full"></div>
      </div>
    </>
  );
}
