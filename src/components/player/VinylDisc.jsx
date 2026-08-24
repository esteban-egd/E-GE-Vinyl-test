import { useAudio } from '../../context/AudioContext';

export default function VinylDisc({ thumbnail }) {
  const { isPlaying, isLoading } = useAudio();

  const animationClass = isPlaying 
    ? 'vinyl-spinning' 
    : isLoading 
      ? 'vinyl-idle' 
      : 'vinyl-paused';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Vinyl Disc Body */}
      <div 
        className={`w-full h-full rounded-full bg-[#111111] shadow-[inset_0_0_0_2px_#222,inset_0_0_0_6px_#0a0a0a,inset_0_0_0_8px_#222] flex items-center justify-center overflow-hidden transition-all duration-1000 ${animationClass}`}
        style={{
          backgroundImage: `
            repeating-radial-gradient(
              #111 0,
              #111 4px,
              #1a1a1a 5px,
              #111 6px
            ),
            conic-gradient(
              from 45deg,
              rgba(255,255,255,0.05) 0deg,
              rgba(255,255,255,0) 45deg,
              rgba(255,255,255,0) 135deg,
              rgba(255,255,255,0.05) 180deg,
              rgba(255,255,255,0) 225deg,
              rgba(255,255,255,0) 315deg,
              rgba(255,255,255,0.05) 360deg
            )
          `,
          backgroundBlendMode: 'overlay'
        }}
      >
        {/* Album Cover Center (Label) */}
        <div 
          className="w-[45%] h-[45%] rounded-full bg-[#222] flex items-center justify-center shadow-[0_0_4px_rgba(0,0,0,0.8)] bg-cover bg-center"
          style={{ backgroundImage: thumbnail ? `url(${thumbnail})` : 'none' }}
        >
          {/* Spindle hole */}
          <div className="w-[12%] h-[12%] rounded-full bg-black shadow-[inset_0_0_2px_rgba(0,0,0,0.8)] relative z-10">
            <div className="absolute inset-1 rounded-full bg-[#333] blur-[1px]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
