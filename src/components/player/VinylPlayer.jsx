import { useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import VinylDisc from './VinylDisc';
import Tonearm from './Tonearm';
import LEDRing from './LEDRing';
import PlayerControls from './PlayerControls';
import { Play } from 'lucide-react';

export default function VinylPlayer() {
  const { currentTrack, isPlaying, isLoading, resume, togglePlayPause } = useAudio();
  const canvasRef = useRef(null);

  // Ambilight effect extraction
  useEffect(() => {
    if (!currentTrack?.thumbnail || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = currentTrack.thumbnail;

    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      document.documentElement.style.setProperty('--ambilight-color', `rgb(${r}, ${g}, ${b})`);
    };
  }, [currentTrack?.thumbnail]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
      {/* Hidden canvas for color extraction */}
      <canvas ref={canvasRef} width="1" height="1" className="hidden" />

      {/* Ambilight Background Glow */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] rounded-full blur-[80px] opacity-30 transition-all duration-1000 ${isPlaying ? 'heartbeat-active' : 'heartbeat-idle'}`}
        style={{
          backgroundColor: 'var(--ambilight-color, var(--color-purple))',
          zIndex: 0
        }}
      />

      {/* Main Turntable Display Area */}
      <div className="relative w-full max-w-[320px] aspect-square mx-auto z-10 my-4 flex items-center justify-center">
        {/* Neon LED Ring */}
        <LEDRing />

        {/* Record Platter */}
        <div 
          className="absolute inset-0 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-10 cursor-pointer"
          onClick={togglePlayPause}
          title="Cliquer pour démarrer / mettre en pause"
        >
          <VinylDisc thumbnail={currentTrack?.thumbnail} />
        </div>

        {/* Tonearm */}
        <Tonearm />
      </div>

      {/* Bouton de déblocage audio immédiat pour iPhone */}
      {currentTrack && !isPlaying && !isLoading && (
        <button
          onClick={resume}
          className="z-30 mb-2 flex items-center gap-2 px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.7)] transition-all transform hover:scale-105 active:scale-95"
        >
          <Play size={15} fill="currentColor" />
          <span>Appuyer pour lancer l'écoute</span>
        </button>
      )}

      {/* Controls */}
      <div className="w-full z-20 mt-2 pb-8">
        <PlayerControls />
      </div>
    </div>
  );
}
