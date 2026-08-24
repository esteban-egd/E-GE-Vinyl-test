import { useAudio } from '../../context/AudioContext';
import { motion } from 'framer-motion';

export default function Tonearm() {
  const { isPlaying, currentTime, duration } = useAudio();

  // Angle ranges from 0 (edge of record) to 20 (near center)
  const progress = duration > 0 ? currentTime / duration : 0;
  
  // Base rotation is -35deg when idle (lifted and away).
  // When playing, it goes from 0deg to 20deg based on progress.
  const rotation = isPlaying || currentTime > 0 
    ? (isPlaying ? 0 : 0) + (progress * 22) // If paused but started, keep position
    : -35; 

  // If paused and time > 0, we want it to stay on record. 
  // If completely stopped or ended, back to -35.
  const currentRotation = (isPlaying || (currentTime > 0 && currentTime < duration)) 
    ? progress * 20 
    : -35;

  return (
    <motion.div
      className="absolute top-0 right-[-10%] w-[35%] h-[80%] z-20 pointer-events-none drop-shadow-2xl"
      style={{ transformOrigin: '20% 15%' }}
      initial={{ rotate: -35 }}
      animate={{ rotate: currentRotation }}
      transition={{ 
        type: 'spring', 
        stiffness: 40, 
        damping: 15,
        mass: 1.5
      }}
    >
      <svg viewBox="0 0 100 300" className="w-full h-full" style={{ filter: 'drop-shadow(-2px 4px 6px rgba(0,0,0,0.6))' }}>
        <defs>
          <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#888" />
            <stop offset="50%" stopColor="#ddd" />
            <stop offset="100%" stopColor="#666" />
          </linearGradient>
          <linearGradient id="metal-dark" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#222" />
            <stop offset="50%" stopColor="#555" />
            <stop offset="100%" stopColor="#111" />
          </linearGradient>
        </defs>

        {/* Pivot Base */}
        <circle cx="20" cy="45" r="24" fill="url(#metal-dark)" />
        <circle cx="20" cy="45" r="16" fill="url(#metal)" />
        <circle cx="20" cy="45" r="6" fill="#111" />
        
        {/* Counterweight */}
        <rect x="14" y="5" width="12" height="25" rx="3" fill="url(#metal-dark)" />

        {/* Arm Tube */}
        <path 
          d="M 20 45 Q 20 200 45 260" 
          fill="none" 
          stroke="url(#metal)" 
          strokeWidth="6" 
          strokeLinecap="round" 
        />

        {/* Headshell and Cartridge */}
        <g transform="translate(42, 255) rotate(-25)">
          <rect x="-8" y="0" width="16" height="30" rx="2" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          <rect x="-6" y="2" width="12" height="15" rx="1" fill="url(#metal-dark)" />
          {/* Stylus indicator (tiny red dot/line) */}
          <rect x="-1" y="26" width="2" height="4" fill="#ef4444" />
        </g>
      </svg>
    </motion.div>
  );
}
