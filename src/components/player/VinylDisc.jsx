import { useAudio } from '../../context/AudioContext';

export default function VinylDisc({ thumbnail, speed = 33, rotationAngle = 0, isDragging = false }) {
  const { isPlaying, isLoading } = useAudio();

  const animationClass = isPlaying 
    ? 'vinyl-spinning' 
    : isLoading 
      ? 'vinyl-idle' 
      : 'vinyl-paused';

  const animationDuration = speed === 45 ? '1.1s' : '1.7s';

  // Sheen rotation logic: when dragging, follow rotationAngle; when playing, spin via CSS animation
  const sheenStyle = {
    transform: isDragging ? `rotate(${rotationAngle}deg)` : undefined,
    animationDuration: animationDuration,
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      {/* 1. DISQUE VINYLE PHYSIQUE - CHÂSSIS DE BASE */}
      <div 
        className="w-full h-full rounded-full bg-[#0d0c0b] shadow-[0_15px_40px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_0_6px_#141312] flex items-center justify-center relative overflow-hidden transition-colors duration-1000"
      >
        {/* 2. LES SILLONS MICROGRAVÉS */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
          <defs>
            <radialGradient id="vinyl-base" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a1816" />
              <stop offset="60%" stopColor="#0d0c0b" />
              <stop offset="100%" stopColor="#040404" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="198" fill="url(#vinyl-base)" />
          
          {/* Track bands remain mostly black but very subtly tint based on color variable */}
          <circle cx="200" cy="200" r="190" stroke="color-mix(in srgb, var(--ambilight-color, transparent), rgba(255,255,255, 0.03) 95%)" strokeWidth="0.5" fill="none" />
          <circle cx="200" cy="200" r="186" stroke="color-mix(in srgb, var(--ambilight-color, transparent), rgba(255,255,255, 0.02) 95%)" strokeWidth="0.5" fill="none" />
          <circle cx="200" cy="200" r="182" stroke="color-mix(in srgb, var(--ambilight-color, transparent), rgba(255,255,255, 0.03) 95%)" strokeWidth="0.5" fill="none" />
          <circle cx="200" cy="200" r="178" stroke="color-mix(in srgb, var(--ambilight-color, transparent), rgba(255,255,255, 0.02) 95%)" strokeWidth="0.5" fill="none" />
          <circle cx="200" cy="200" r="174" stroke="color-mix(in srgb, var(--ambilight-color, transparent), rgba(255,255,255, 0.03) 95%)" strokeWidth="0.5" fill="none" />
          <circle cx="200" cy="200" r="170" stroke="color-mix(in srgb, var(--ambilight-color, transparent), rgba(255,255,255, 0.02) 95%)" strokeWidth="0.5" fill="none" />
          
          {/* SILENT GAPs */}
          <circle cx="200" cy="200" r="166" stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" fill="none" />
          <circle cx="200" cy="200" r="138" stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" fill="none" />
          <circle cx="200" cy="200" r="114" stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" fill="none" />
          <circle cx="200" cy="200" r="90" stroke="rgba(0,0,0,0.95)" strokeWidth="3" fill="none" />
        </svg>

        {/* 3. REFLETS CHANDELLES LUMINEUX (Conic sheer reflections that rotate dynamically) */}
        <div 
          className={`absolute inset-0 rounded-full mix-blend-screen pointer-events-none ${isDragging ? '' : animationClass}`}
          style={{
            ...sheenStyle,
            background: `conic-gradient(
              from 0deg,
              transparent 0deg,
              rgba(255,255,255,0.07) 20deg,
              rgba(255,255,255,0.11) 35deg,
              rgba(255,255,255,0.07) 50deg,
              transparent 75deg,
              transparent 180deg,
              rgba(255,255,255,0.07) 200deg,
              rgba(255,255,255,0.11) 215deg,
              rgba(255,255,255,0.07) 230deg,
              transparent 255deg,
              transparent 360deg
            )`
          }}
        />

        {/* 4. MACARON CENTRAL EN PAPIER (Retro vintage center record label) */}
        <div 
          className={`absolute w-[44%] h-[44%] rounded-full bg-stone-900 border-4 border-black shadow-[0_5px_15px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden relative z-10 ${isDragging ? '' : animationClass}`}
          style={{
            transform: isDragging ? `rotate(${rotationAngle}deg)` : undefined,
            animationDuration: animationDuration,
          }}
        >
          {/* Pochette de l'album en fond avec floutage chic */}
          {thumbnail ? (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${thumbnail})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-stone-950 opacity-40" />
          )}

          {/* Décorations circulaires dorées rétro du macaron */}
          <div className="absolute inset-2 rounded-full border border-[#c29e5a]/30 flex flex-col items-center justify-between p-2 select-none">
            {/* Texte du haut */}
            <span className="text-[6px] tracking-[0.2em] font-mono text-[#e6dfd5]/80 font-bold leading-none mt-1 uppercase">
              HIGH FIDELITY
            </span>

            {/* Texte du bas */}
            <span className="text-[6.5px] tracking-[0.15em] font-mono text-[#c29e5a] font-bold leading-none mb-1">
              {speed} RPM • STEREO
            </span>
          </div>

          {/* 5. CŒUR DU DISQUE (Center spindle hole area with brass ring) */}
          <div className="w-[28%] h-[28%] rounded-full bg-stone-950 border-2 border-[#8a7250] flex items-center justify-center shadow-[inset_0_2px_5px_rgba(0,0,0,0.9),0_2px_4px_rgba(0,0,0,0.5)] z-20">
            {/* Trou central pour l'axe */}
            <div className="w-[25%] h-[25%] rounded-full bg-stone-900 shadow-[inset_0_1px_2px_black]" />
          </div>
        </div>
      </div>
    </div>
  );
}
