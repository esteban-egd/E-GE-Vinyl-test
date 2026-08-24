import { useAudio } from '../../context/AudioContext';

export default function LEDRing() {
  const { isPlaying } = useAudio();

  return (
    <div className="absolute inset-[-4%] pointer-events-none z-0">
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">
        <defs>
          <linearGradient id="neon-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-purple)" />
            <stop offset="100%" stopColor="var(--color-cyan)" />
          </linearGradient>
        </defs>
        <circle 
          cx="50" 
          cy="50" 
          r="49" 
          fill="none" 
          stroke="url(#neon-ring-gradient)" 
          strokeWidth="0.5" 
          className={isPlaying ? 'led-ring-active' : 'led-ring-idle'}
          style={{ transition: 'all 1s ease' }}
        />
      </svg>
    </div>
  );
}
