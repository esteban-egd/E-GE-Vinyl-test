import { useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useLyrics } from '../../hooks/useLyrics';
import { Mic2, MicOff, Disc, X, Sparkles, Loader2, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export default function LyricsView({ isOpen, onClose, inline = false }) {
  const { currentTrack, currentTime, duration, seek, isPlaying, togglePlayPause, playPrevious, playNext, isLoading } = useAudio();
  const { currentTheme } = useTheme();
  const containerRef = useRef(null);
  
  const {
    lyricsData,
    loading,
    isRealSynced,
    isInstrumental,
    activeIndex
  } = useLyrics(currentTrack, currentTime, duration);

  const formatTime = (time) => {
    if (isNaN(time) || time === null) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
    <div className={inline ? "flex flex-col h-full w-full p-4 fade-in relative" : "fixed inset-0 z-[999999] bg-[#0a0806]/98 backdrop-blur-3xl flex flex-col p-3 sm:p-6 fade-in overflow-hidden"}>
      {/* Header */}
      {!inline && (
        <div className="flex items-center justify-between pb-3 pt-1 border-b border-white/10 max-w-2xl mx-auto w-full shrink-0 gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="p-2 rounded-xl shrink-0"
              style={{ backgroundColor: `${currentTheme?.primary || '#1ED760'}15`, color: currentTheme?.primary || '#1ED760' }}
            >
              <Mic2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-xs sm:text-base">Paroles Synchronisées</h3>
                {isRealSynced && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 font-semibold uppercase tracking-wider shrink-0">
                    Live Sync
                  </span>
                )}
                {isInstrumental && (
                  <span 
                    className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] border font-semibold uppercase tracking-wider shrink-0"
                    style={{ backgroundColor: `${currentTheme?.primary || '#1ED760'}15`, color: currentTheme?.primary || '#1ED760', borderColor: `${currentTheme?.primary || '#1ED760'}30` }}
                  >
                    Instrumental
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">{currentTrack?.title} • {currentTrack?.artist}</p>
            </div>
          </div>

          {/* Fully visible and responsive Close Button in the header flexbox */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.5)] border border-amber-300 transition-all active:scale-95 cursor-pointer shrink-0"
            title="Fermer les paroles (X)"
          >
            <X size={14} className="stroke-[3]" />
            <span>Fermer</span>
          </button>
        </div>
      )}

      {/* Lyrics Scroller */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-y-auto max-w-2xl mx-auto w-full flex flex-col items-center justify-start space-y-7 text-center hide-scrollbar ${inline ? 'py-4' : 'py-6 sm:py-12'}`}
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
                className={`transition-all duration-500 font-bold ${inline ? 'text-lg md:text-xl' : 'text-xl md:text-3xl'} cursor-pointer leading-relaxed transition-colors ${
                  isActive
                    ? `lyric-line-active scale-110 opacity-100 font-black`
                    : isPassed
                    ? `text-gray-500 hover:text-gray-300 opacity-50`
                    : `text-gray-300 hover:text-white opacity-85`
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

      {/* Footer Controls Bar in Full-Screen Lyrics Mode */}
      {!inline && (
        <div className="max-w-2xl mx-auto w-full pt-2.5 pb-3 border border-[#3b2d1c] flex flex-col gap-2 shrink-0 bg-[#120f0a]/95 rounded-2xl px-4 mb-20 sm:mb-2 shadow-2xl z-30">
          {/* Progress bar */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-[10px] text-gray-400 font-mono min-w-[32px] text-right">{formatTime(currentTime)}</span>
            <input 
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="progress-track flex-1 cursor-pointer h-1.5 rounded-full"
              style={{
                background: `linear-gradient(to right, ${currentTheme?.primary || '#1ED760'} ${(currentTime / (duration || 1)) * 100}%, #333333 ${(currentTime / (duration || 1)) * 100}%)`
              }}
            />
            <span className="text-[10px] text-gray-400 font-mono min-w-[32px]">{formatTime(duration)}</span>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              {currentTrack?.thumbnail && (
                <img src={currentTrack.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentTrack?.title}</p>
                <p className="text-[10px] text-gray-400 truncate">{currentTrack?.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={playPrevious}
                className="p-1.5 text-gray-400 hover:text-white transition-all active:scale-90"
              >
                <SkipBack size={18} />
              </button>

              <button 
                onClick={togglePlayPause}
                disabled={isLoading && !isPlaying}
                className="w-10 h-10 flex items-center justify-center rounded-full text-black hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
                style={{
                  backgroundColor: currentTheme?.primary || '#1ED760',
                  boxShadow: `0 0 12px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.4)'}`
                }}
              >
                {isLoading && !isPlaying ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={18} fill="black" />
                ) : (
                  <Play size={18} fill="black" className="ml-0.5" />
                )}
              </button>

              <button 
                onClick={playNext}
                className="p-1.5 text-gray-400 hover:text-white transition-all active:scale-90"
              >
                <SkipForward size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

