import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { Play, Pause, SkipForward } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import TrackImage from '../common/TrackImage';
import DownloadBadge from '../common/DownloadBadge';
import MarqueeTitle from '../common/MarqueeTitle';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlayPause, playNext, isLoading } = useAudio();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentTrack || location.pathname === '/player') return null;

  // Player is displayed on all pages including Accueil

  const handleOpenPlayer = () => {
    navigate('/player');
  };

  return (
    <div className="px-2 mb-2 w-full max-w-lg mx-auto">
      <div 
        onClick={handleOpenPlayer}
        className="glass-strong flex items-center p-2 pr-4 rounded-xl shadow-lg cursor-pointer hover:bg-white/5 transition-colors border border-white/10 relative overflow-hidden"
      >
        {/* Subtle background glow based on currently playing state */}
        <div 
          className={`absolute inset-0 opacity-0 transition-opacity duration-500 ${isPlaying ? 'opacity-100' : ''}`}
          style={{
            background: `linear-gradient(to right, ${currentTheme?.primary || '#1ED760'}15, ${currentTheme?.secondary || '#32EBB0'}05)`
          }}
        />

        {/* Thumbnail */}
        <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden relative z-10">
          {currentTrack.thumbnail ? (
             <TrackImage src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
             <div className="w-full h-full bg-[#222] flex items-center justify-center" />
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0 mx-3 z-10">
          <MarqueeTitle
            text={currentTrack.title}
            isPlaying={isPlaying}
            badge={<DownloadBadge videoId={currentTrack.videoId || currentTrack.id} />}
            className="text-sm font-bold text-white"
          />
          <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={togglePlayPause}
            disabled={isLoading && !isPlaying}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
             {isLoading && !isPlaying ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
             ) : isPlaying ? (
                <Pause size={20} fill="currentColor" />
             ) : (
                <Play size={20} fill="currentColor" className="ml-0.5" />
             )}
          </button>
          
          <button 
            onClick={playNext}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
