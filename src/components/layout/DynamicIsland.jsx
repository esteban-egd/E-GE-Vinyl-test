import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useLikes } from '../../hooks/useLikes';
import { Play, Pause, Volume2, VolumeX, Heart } from 'lucide-react';
import TrackImage from '../common/TrackImage';
import MarqueeTitle from '../common/MarqueeTitle';

export default function DynamicIsland() {
  const { currentTrack, isPlaying, togglePlayPause, audioRef } = useAudio();
  const { isLiked, toggleLike } = useLikes();
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(1);
  const islandRef = useRef(null);

  useEffect(() => {
    if (audioRef?.current) {
      setVolume(audioRef.current.volume);
    }
  }, [audioRef]);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef?.current) {
      audioRef.current.volume = val;
    }
  };

  if (!currentTrack) return null;
  const liked = isLiked(currentTrack);

  return (
    <div 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col justify-center overflow-hidden
        ${expanded ? 'w-[320px] h-[120px] rounded-3xl rounded-[32px] px-6 py-4' : 'w-[180px] h-[40px] rounded-[24px] px-2 hover:scale-105 cursor-pointer'}`}
      style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => { if(!expanded) setExpanded(true); }}
    >
      {/* Collapsed Mode */}
      <div className={`flex items-center justify-between h-full w-full absolute top-0 left-0 px-3 transition-opacity duration-300 ${expanded ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-100'}`}>
        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 shadow-md">
          <TrackImage 
            src={currentTrack.thumbnail} 
            alt="cover" 
            className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
          />
        </div>
        <div className="flex-1 overflow-hidden mx-2 whitespace-nowrap mask-image-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
           <div className={`text-[10px] font-semibold text-[var(--color-charcoal)] inline-block ${isPlaying ? 'animate-[marquee_6s_linear_infinite]' : ''}`}>
             {currentTrack.title} • {currentTrack.artist}
           </div>
        </div>
        <div className="flex items-center gap-[2px] h-3 w-4 shrink-0">
          <div className={`w-[2px] bg-[var(--color-brass)] rounded-full transition-all ${isPlaying ? 'h-full animate-[wave_1s_ease-in-out_infinite]' : 'h-[2px]'}`} />
          <div className={`w-[2px] bg-[var(--color-brass)] rounded-full transition-all ${isPlaying ? 'h-2 animate-[wave_1.2s_ease-in-out_infinite_0.2s]' : 'h-[2px]'}`} />
          <div className={`w-[2px] bg-[var(--color-brass)] rounded-full transition-all ${isPlaying ? 'h-full animate-[wave_0.8s_ease-in-out_infinite_0.4s]' : 'h-[2px]'}`} />
        </div>
      </div>

      {/* Expanded Mode */}
      <div className={`flex flex-col h-full w-full transition-opacity duration-300 ${expanded ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none absolute'}`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg border-2 border-white/20">
            <TrackImage 
              src={currentTrack.thumbnail} 
              alt="cover" 
              className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
            />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-center">
            <MarqueeTitle
              text={currentTrack.title}
              isPlaying={isPlaying}
              className="text-sm font-bold text-[var(--color-charcoal)]"
            />
            <p className="text-xs text-[var(--color-muted)] truncate">{currentTrack.artist}</p>
          </div>
          <button onClick={() => toggleLike(currentTrack)} className="p-2 transition-transform active:scale-90">
            <Heart size={20} className={liked ? 'fill-pink-500 text-pink-500' : 'text-[var(--color-charcoal)]'} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 px-2">
          <button onClick={togglePlayPause} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-charcoal)] text-white hover:bg-black transition-transform hover:scale-105">
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          </button>
          <div className="flex items-center gap-2 text-[var(--color-charcoal)] flex-1 px-4">
            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={volume} 
              onChange={handleVolumeChange}
              className="w-full h-1 bg-black/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--color-brass)] [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
