import { useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useLyrics } from '../../hooks/useLyrics';
import { Mic2, MicOff, Disc, X, Sparkles, Loader2 } from 'lucide-react';

export default function LyricsView({ isOpen, onClose, inline = false }) {
  const { currentTrack, currentTime, duration, seek } = useAudio();
  const { currentTheme } = useTheme();
  const containerRef = useRef(null);
  
  const {
    lyricsData,
    loading,
    isRealSynced,
    isInstrumental,
    activeIndex
  } = useLyrics(currentTrack, currentTime, duration);

  // Défilement automatique centré sur la ligne active
  useEffect(() => {
    if (containerRef.current && (isOpen || inline)) {
      const activeEl = containerRef.current.querySelector('.lyric-line-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex, isOpen, inline]);

  if (!isOpen && !inline) return null;

  return (
    <div className={inline ? "flex flex-col h-full w-full p-4 fade-in relative" : "fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col p-6 fade-in safe-top safe-bottom"}>
      {/* Header */}
      {!inline && (
        <div className="flex items-center justify-between pb-6 border-b border-white/10 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl animate-pulse"
              style={{ backgroundColor: `${currentTheme?.primary || '#1ED760'}15`, color: currentTheme?.primary || '#1ED760' }}
            >
              <Mic2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Paroles Synchronisées</h3>
                {isRealSynced && (
                  <span className="px-2 py-0.5 rounded text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 font-semibold uppercase tracking-wider">
                    Live Sync
                  </span>
                )}
                {isInstrumental && (
                  <span 
                    className="px-2 py-0.5 rounded text-[9px] border font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: `${currentTheme?.primary || '#1ED760'}15`, color: currentTheme?.primary || '#1ED760', borderColor: `${currentTheme?.primary || '#1ED760'}30` }}
                  >
                    Instrumental
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate max-w-[200px] sm:max-w-xs">{currentTrack?.title} • {currentTrack?.artist}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full glass hover:bg-white/20 text-white transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Lyrics Scroller */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-y-auto max-w-2xl mx-auto w-full flex flex-col items-center justify-start space-y-7 text-center hide-scrollbar ${inline ? 'py-4' : 'py-20'}`}
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: currentTheme?.primary || '#1ED760' }}>
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium tracking-wide text-gray-300">Recherche des paroles authentiques...</p>
          </div>
        ) : isInstrumental ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 py-12 my-auto">
            <div 
              className="p-4 rounded-full border shadow-lg"
              style={{ 
                color: currentTheme?.primary || '#1ED760', 
                backgroundColor: `${currentTheme?.primary || '#1ED760'}10`,
                borderColor: `${currentTheme?.primary || '#1ED760'}20`,
                shadowColor: `${currentTheme?.primary || '#1ED760'}10`
              }}
            >
              <Disc size={38} className="animate-spin-slow" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xl font-bold text-white">Musique Instrumentale</h4>
              <p className="text-sm text-gray-400 max-w-sm">
                Ce morceau est une version instrumentale sans paroles.
              </p>
            </div>
          </div>
        ) : lyricsData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 py-12 my-auto">
            <div className="p-4 rounded-full bg-white/5 text-gray-400 border border-white/10">
              <MicOff size={36} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xl font-bold text-white">Aucune parole disponible</h4>
              <p className="text-sm text-gray-400 max-w-sm">
                Les paroles de cette chanson n'ont pas encore été trouvées ou synchronisées.
              </p>
            </div>
          </div>
        ) : (
          lyricsData.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPassed = idx < activeIndex;

            return (
              <p
                key={`${idx}-${line.time}`}
                onClick={() => {
                  if (line.time !== null && line.time !== undefined) {
                    seek(line.time);
                  }
                }}
                className={`transition-all duration-500 font-bold ${inline ? 'text-lg md:text-xl' : 'text-xl md:text-3xl'} cursor-pointer leading-relaxed ${
                  isActive
                    ? `lyric-line-active scale-110 opacity-100 font-black`
                    : isPassed
                    ? `text-[var(--color-muted)] opacity-40 hover:opacity-75`
                    : `text-[var(--color-muted)] opacity-60 hover:opacity-100`
                }`}
                style={{
                  color: isActive ? (currentTheme?.primary || '#1ED760') : undefined,
                  textShadow: isActive ? `0 0 20px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.5)'}` : undefined
                }}
              >
                {line.text}
              </p>
            );
          })
        )}
      </div>

      {/* Footer Branding */}
      {!inline && (
        <div className="text-center pt-5 border-t border-white/15 text-[11px] text-gray-500 max-w-2xl mx-auto w-full flex items-center justify-center gap-2">
          <Sparkles size={12} style={{ color: currentTheme?.primary || '#1ED760' }} />
          <span>E-GE Vinyl Studio • Système Karaoké Haute Précision</span>
        </div>
      )}
    </div>
  );
}
