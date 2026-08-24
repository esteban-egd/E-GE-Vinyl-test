import { useAudio } from '../../context/AudioContext';
import { useLikes } from '../../hooks/useLikes';
import { useOfflineCache } from '../../hooks/useOfflineCache';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Shuffle, Repeat, Repeat1, Heart, Download, Check
} from 'lucide-react';

export default function PlayerControls() {
  const { 
    isPlaying, togglePlayPause, playNext, playPrevious,
    currentTime, duration, seek, shuffle, toggleShuffle,
    repeat, toggleRepeat, currentTrack, isLoading
  } = useAudio();

  const { isLiked, toggleLike } = useLikes();
  const { isCached, downloadTrack, downloading } = useOfflineCache();

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const value = parseFloat(e.target.value);
    seek(value);
  };

  if (!currentTrack) return null;

  const trackLiked = isLiked(currentTrack.videoId);
  const trackCached = isCached(currentTrack.videoId);
  const isDownloading = downloading.has(currentTrack.videoId);

  return (
    <div className="w-full max-w-md mx-auto px-6 pt-8 pb-4 flex flex-col gap-6 z-10 glass-strong rounded-3xl mt-8">
      
      {/* Title & Actions */}
      <div className="flex justify-between items-center">
        <div className="flex-1 overflow-hidden pr-4">
          <h2 className="text-xl font-bold text-white truncate text-equinox tracking-widest">{currentTrack.title}</h2>
          <p className="text-sm text-gray-400 truncate">{currentTrack.artist}</p>
        </div>
        
        <div className="flex gap-3 items-center shrink-0">
          <button 
            onClick={() => toggleLike(currentTrack)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Heart 
              size={22} 
              className={trackLiked ? 'text-pink-500 fill-pink-500 neon-purple' : 'text-gray-400'} 
            />
          </button>
          
          <button 
            onClick={() => !trackCached && !isDownloading && downloadTrack(currentTrack)}
            disabled={trackCached || isDownloading}
            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {trackCached ? (
              <Check size={22} className="text-cyan-400" />
            ) : isDownloading ? (
              <div className="w-[22px] h-[22px] rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            ) : (
              <Download size={22} className="text-gray-400 hover:text-cyan-400" />
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-2">
        <input 
          type="range" 
          min="0" 
          max={duration || 100} 
          value={currentTime || 0}
          onChange={handleSeek}
          className="progress-track w-full"
          style={{
            background: `linear-gradient(to right, var(--color-purple) ${(currentTime / duration) * 100}%, var(--color-surface-light) ${(currentTime / duration) * 100}%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-400 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <button 
          onClick={toggleShuffle}
          className={`p-2 rounded-full transition-colors ${shuffle ? 'text-purple-400 bg-purple-500/10' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Shuffle size={20} />
        </button>

        <div className="flex items-center gap-4">
          <button 
            onClick={playPrevious}
            className="p-3 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <SkipBack size={24} fill="currentColor" />
          </button>

          <button 
            onClick={togglePlayPause}
            disabled={isLoading && !isPlaying}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-105 transition-all"
          >
            {isLoading && !isPlaying ? (
              <div className="w-8 h-8 rounded-full border-3 border-white border-t-transparent animate-spin" />
            ) : isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button 
            onClick={playNext}
            className="p-3 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>

        <button 
          onClick={toggleRepeat}
          className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
        </button>
      </div>
    </div>
  );
}
