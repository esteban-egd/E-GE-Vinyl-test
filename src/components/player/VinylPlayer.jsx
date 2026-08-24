import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useLyrics } from '../../hooks/useLyrics';
import { useLikes } from '../../hooks/useLikes';
import { useOffline } from '../../hooks/useOffline';
import VinylDisc from './VinylDisc';
import Tonearm from './Tonearm';
import LEDRing from './LEDRing';
import AudioVisualizationDiagram from './AudioVisualizationDiagram';
import PlayerControls from './PlayerControls';
import LyricsView from './LyricsView';
import { 
  Disc, Sliders, ToggleLeft, ToggleRight,
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, 
  Heart, Download, Check, Mic2, Loader2, X
} from 'lucide-react';

export default function VinylPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlayPause,
    vinylCrackle, 
    setVinylCrackle, 
    vinylCrackleVolume, 
    setVinylCrackleVolume,
    pitch,
    setPitch,
    currentTime,
    duration,
    seek,
    playNext,
    playPrevious,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
    isLoading
  } = useAudio();

  // Swipe detection refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const { currentTheme } = useTheme();
  const { isLiked, toggleLike } = useLikes();
  const { isDownloaded, downloadTrack, isDownloading, removeTrack } = useOffline();
  
  const [mobileTab, setMobileTab] = useState('platine'); // Keeps PC fallback working
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const canvasRef = useRef(null);
  const [speed, setSpeed] = useState(33); // 33 | 45 RPM

  // --- Platter Dragging / Visual Rotation State ---
  const [isDragging, setIsDragging] = useState(false);
  const [dragRotation, setDragRotation] = useState(0);
  const platterRef = useRef(null);
  const lastAngleRef = useRef(0);
  const cumulatedRotationRef = useRef(0);
  const wasPlayingRef = useRef(false);

  // Hook for centralized synced lyrics fetching & logic
  const {
    lyricsData,
    loading: lyricsLoading,
    isRealSynced,
    isInstrumental,
    currentLineText,
    previewLines
  } = useLyrics(currentTrack, currentTime, duration);

  const formatTime = (time) => {
    if (isNaN(time) || time === null) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const value = parseFloat(e.target.value);
    seek(value);
  };

  // Dynamic Ambilight aura color extraction from album thumbnail
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

  // Platter drag controls for scratching
  const handleStart = (e) => {
    if (!currentTrack || !platterRef.current) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Swipe start
    touchStartX.current = clientX;
    
    const rect = platterRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    lastAngleRef.current = angle;
    setIsDragging(true);
    
    if (isPlaying) {
      togglePlayPause();
      wasPlayingRef.current = true;
    } else {
      wasPlayingRef.current = false;
    }
  };

  const handleMove = (e) => {
    if (!isDragging || !currentTrack || !platterRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Track swipe
    touchEndX.current = clientX;
    
    const rect = platterRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    
    let diff = angle - lastAngleRef.current;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    
    const degDiff = diff * (180 / Math.PI);
    cumulatedRotationRef.current += degDiff;
    setDragRotation(cumulatedRotationRef.current);
    
    // Scratch time alignment: 360 degrees = 15 seconds shift
    const timeStep = (degDiff / 360) * 15;
    const targetDuration = duration || 180;
    const nextTime = Math.max(0, Math.min(targetDuration, currentTime + timeStep));
    
    seek(nextTime);
    lastAngleRef.current = angle;
  };

  const handleEnd = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Process swipe if not enough rotation drag
    // For touchend, get clientX from changedTouches
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
    touchEndX.current = clientX;
    
    const swipeDistance = touchEndX.current - touchStartX.current;
    
    // Increased threshold and removed strict rotation check to make it responsive
    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance > 0) playPrevious();
      else playNext();
    }
    
    if (wasPlayingRef.current) {
      togglePlayPause();
    }
    
    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  useEffect(() => {
    if (!isDragging) {
      // Sync rotation angle smoothly based on current playback speed
      cumulatedRotationRef.current = (currentTime * (speed === 45 ? 270 : 198)) % 360;
      setDragRotation(cumulatedRotationRef.current);
      return;
    }

    const handleWindowMove = (e) => handleMove(e);
    const handleWindowEnd = () => handleEnd();

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowEnd);
    window.addEventListener('touchmove', handleWindowMove, { passive: false });
    window.addEventListener('touchend', handleWindowEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowEnd);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowEnd);
    };
  }, [isDragging, currentTime, duration, speed]);

  if (!currentTrack) return null;

  const trackLiked = isLiked(currentTrack);
  const trackDownloaded = isDownloaded(currentTrack.videoId);
  const trackDownloading = isDownloading.has(currentTrack.videoId);

  return (
    <div className="fixed xl:relative top-16 xl:top-0 bottom-[72px] xl:bottom-0 left-0 right-0 w-full h-auto xl:h-full flex flex-col items-center xl:justify-center p-2 sm:p-4 pb-0 xl:pb-4 overflow-hidden xl:overflow-y-auto z-30 bg-[var(--color-canvas)] xl:bg-transparent">
      {/* Invisible Canvas for Aura extraction */}
      <canvas ref={canvasRef} width="1" height="1" className="hidden" />

      {/* Dynamic Ambilight Backlight Halo */}
      <div
        className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] h-[85vw] max-w-[550px] max-h-[550px] rounded-full blur-[90px] opacity-25 transition-all duration-1000 ${isPlaying ? 'heartbeat-active' : 'heartbeat-idle'}`}
        style={{
          backgroundColor: 'var(--ambilight-color, #c29e5a)',
          zIndex: 0
        }}
      />

      {/* 🖥️ VIEW FOR COMPUTER (PC / TABLET LARGE) */}
      <div className="hidden xl:flex w-full flex-row items-stretch justify-center gap-10 max-w-[1400px] mx-auto z-10">
        
        {/* --- PLATINE VINYLE LUXE SKEUOMORPHIQUE --- */}
        <div className="relative w-full xl:max-w-xl xl:flex-shrink-0 bg-gradient-to-br from-[#3b2110] via-[#2a1408] to-[#1c0d05] rounded-xl p-5 sm:p-7 border-4 border-[#1c0d05] shadow-[0_25px_60px_rgba(40,20,10,0.65)] flex flex-col gap-6 font-sans">
          
          {/* En-tête de la platine avec marquage et afficheur LCD */}
          <div className="flex justify-between items-center border-b border-[#301d12] pb-4">
            <div>
              <h1 className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-[#e6dfd5]/80 font-mono uppercase">
                SALON E-GE VINYL
              </h1>
            </div>

            {/* Écran LCD Digital d'état audio en or/ambre brossé */}
            <div className="bg-[#120f0a] border border-[#3b2d1c] rounded-lg px-3 py-1.5 font-mono text-[9px] sm:text-[10px] text-[var(--color-brass)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] flex items-center gap-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold flex items-center gap-2">
                  <AudioVisualizationDiagram isPlaying={isPlaying} />
                </span>
              </div>
              <div className="h-5 w-[1px] bg-[#301d12]" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] text-[var(--color-sand-dark)] uppercase tracking-widest leading-none">V2.0</span>
                <a href="https://esteban-portfolio-v1.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-white cursor-pointer">
                  E-GE
                </a>
              </div>
            </div>
          </div>

          {/* Châssis principal de la platine (Platter + Interactive Tonearm + Controls) */}
          <div className="relative w-full aspect-[4/3] flex items-center justify-between gap-4">
            
            {/* Côté Gauche : Plateau tournant et stroboscope */}
            <div 
              ref={platterRef}
              onMouseDown={handleStart}
              onTouchStart={handleStart}
              className="relative flex-1 aspect-square max-w-[80%] bg-gradient-to-tr from-[#141210] to-[#1c1815] rounded-full border border-[#302116] shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.6)] flex items-center justify-center p-3 select-none touch-none z-20"
            >
              {/* Marquage stroboscopique sur le pourtour du plateau */}
              <div 
                className="absolute inset-0 rounded-full border-4 border-dashed border-[#544336]/40 opacity-40 animate-[spin_24s_linear_infinite]"
                style={{ 
                  animationPlayState: (isPlaying && !isDragging) ? 'running' : 'paused',
                  transform: isDragging ? `rotate(${dragRotation}deg)` : 'none',
                }}
              />
              
              {/* Témoin lumineux de stroboscope rouge vintage (Technics style) */}
              <div className="absolute bottom-2 left-2 z-20 pointer-events-none flex flex-col items-center">
                <div className={`w-3.5 h-3.5 rounded-full ${isPlaying ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-red-950'} transition-all duration-300`} />
              </div>

              {/* Anneau de rétroéclairage LED néon */}
              <LEDRing />

              {/* Le disque vinyle interactif */}
              <div className="absolute inset-2 rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.85)] z-10 overflow-hidden">
                <VinylDisc 
                  thumbnail={currentTrack?.thumbnail} 
                  speed={speed} 
                  rotationAngle={dragRotation}
                  isDragging={isDragging}
                />
              </div>
            </div>

            {/* Bras de lecture tactile, autonome et interactif (Superposé au-dessus du vinyle à droite) */}
            <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[110%] z-[500] pointer-events-none">
              <Tonearm />
            </div>

            {/* Côté Droit : Pitch Fader mécanique */}
            <div className="w-[18%] h-full relative flex flex-col justify-end items-center py-2 border-l border-[#301d12] pl-2 z-10">
              {/* Pitch Adjustment Calibrated Fader */}
              <div className="flex flex-col items-center gap-1.5 w-full mt-auto relative z-10">
                <span className="text-[7px] text-[#e6dfd5] font-mono uppercase tracking-widest font-bold flex items-center gap-0.5 text-center">
                  <Sliders size={8} /> PITCH
                </span>
                <div className="relative h-24 sm:h-32 w-10 bg-[#120f0a] rounded-lg border border-[#3b2d1c] p-1 flex items-center justify-center">
                  {/* Lignes d'étalonnage */}
                  <div className="absolute left-1.5 inset-y-2 flex flex-col justify-between text-[6px] text-[#8a7250] font-mono font-bold select-none">
                    <span>+8%</span>
                    <span>+4%</span>
                    <span>0%</span>
                    <span>-4%</span>
                    <span>-8%</span>
                  </div>
                  {/* curseur fader */}
                  <input 
                    type="range"
                    min="-8"
                    max="8"
                    step="0.2"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="pitch-fader cursor-row-resize h-full accent-[var(--color-brass)]"
                    style={{
                      writingMode: 'bt-lr',
                      WebkitAppearance: 'slider-vertical'
                    }}
                  />
                </div>
                <button 
                  onClick={() => setPitch(0)}
                  className="text-[7px] font-mono font-bold bg-[#c29e5a] hover:bg-[#b08b47] text-[#1c1917] px-1.5 py-0.5 rounded border border-[#d6be8c] transition-all shadow-sm cursor-pointer"
                  title="Bloquer la vitesse à 0%"
                >
                  VERROU QUARTZ
                </button>
              </div>
            </div>
          </div>

          {/* Console de contrôle mécanique (Boutons Physiques 33/45, Switch d'alimentation, Ambiance) */}
          <div className="grid grid-cols-12 gap-3 items-center border-t border-[#301d12] pt-4">
            
            {/* Bouton d'alimentation rotatif - Look Laiton Doré */}
            <div className="col-span-3 flex flex-col items-center gap-1">
              <span className="text-[7px] text-[#e6dfd5] font-mono font-bold uppercase">ALIMENTATION</span>
              <button
                onClick={togglePlayPause}
                className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#d6be8c] via-[#c29e5a] to-[#9c7b3c] border-2 border-[#5a4622] flex items-center justify-center shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                {/* Encoche rotative noire */}
                <div 
                  className="w-1.5 h-6 bg-[#1c1917] rounded-full transition-transform duration-500" 
                  style={{ transform: `rotate(${isPlaying ? '90deg' : '0deg'})` }}
                />
              </button>
            </div>

            {/* Sélecteurs de vitesse physique (33 / 45 tours) */}
            <div className="col-span-3 flex flex-col items-center gap-1 border-r border-[#301d12] pr-2">
              <span className="text-[7px] text-[#e6dfd5] font-mono font-bold uppercase">VITESSE</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSpeed(33)}
                  className={`w-7 h-7 rounded-md text-[10px] font-mono font-bold flex items-center justify-center border transition-all cursor-pointer ${
                    speed === 33
                      ? 'bg-[var(--color-brass)] text-[#1c1917] border-[#d6be8c] shadow-[0_0_8px_rgba(194,158,90,0.4)] font-bold'
                      : 'bg-[#181714] text-[#a19280] border-[#302820] hover:text-[#e6dfd5]'
                  }`}
                >
                  33
                </button>
                <button
                  onClick={() => setSpeed(45)}
                  className={`w-7 h-7 rounded-md text-[10px] font-mono font-bold flex items-center justify-center border transition-all cursor-pointer ${
                    speed === 45
                      ? 'bg-[var(--color-brass)] text-[#1c1917] border-[#d6be8c] shadow-[0_0_8px_rgba(194,158,90,0.4)] font-bold'
                      : 'bg-[#181714] text-[#a19280] border-[#302820] hover:text-[#e6dfd5]'
                  }`}
                >
                  45
                </button>
              </div>
            </div>

            {/* Module Ambiance retro (Bruit de fond vinyle) */}
            <div className="col-span-6 flex flex-col gap-1.5 pl-2">
              <div className="flex justify-between items-center">
                <span className="text-[7px] text-[#e6dfd5] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                  <Disc size={10} className="text-[var(--color-brass)]" /> CRAQUEMENT
                </span>
                <button
                  onClick={() => setVinylCrackle(!vinylCrackle)}
                  className="text-[8px] font-mono font-bold text-[var(--color-brass)] hover:text-[var(--color-brass-dark)] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {vinylCrackle ? <ToggleRight size={16} className="text-[var(--color-brass)]" /> : <ToggleLeft size={16} className="text-[#a19280]" />}
                  <span>{vinylCrackle ? 'ACTIVE' : 'MUET'}</span>
                </button>
              </div>
              
              {/* Curseur de volume de crachotements */}
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-[#8a7250] font-mono">0%</span>
                <input 
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  disabled={!vinylCrackle}
                  value={vinylCrackleVolume}
                  onChange={(e) => setVinylCrackleVolume(parseFloat(e.target.value))}
                  className="flex-1 accent-[var(--color-brass)] cursor-pointer h-1 rounded-full bg-stone-800 disabled:opacity-30"
                />
                <span className="text-[8px] text-[#8a7250] font-mono">{Math.round(vinylCrackleVolume * 200)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Lyrics & Controls */}
        <div className="flex flex-col w-full xl:max-w-[450px] gap-4 z-20 xl:h-[650px]">
          {/* Lyrics block takes up available space */}
          <div className="flex-1 min-h-[300px] xl:min-h-0 bg-[var(--color-panel)] rounded-xl border border-[var(--color-sand)] shadow-sm overflow-hidden flex flex-col">
            <LyricsView inline={true} />
          </div>

          {/* Player Controls at the bottom */}
          <div className="shrink-0 w-full">
            <PlayerControls />
          </div>
        </div>
      </div>

      {/* 📱 PORTRAIT MOBILE VIEW (TEL OPTIMIZED - COMPACT INTEGRATION FOR ALL SCREEN HEIGHTS) */}
      <div className="flex xl:hidden flex-col w-full max-w-md gap-2 items-center px-2 pt-1 pb-2 z-10 select-none justify-between h-full overflow-hidden">
        
        {/* 📻 CENTERED VINYL & TONEARM FOR MOBILE (GUARANTEED PERFECT 1:1 CIRCLE) */}
        <div className="relative w-[260px] h-[260px] aspect-square mx-auto flex items-center justify-center overflow-visible z-20 mt-1 shrink-0">
          
          {/* Circular Platter / Vinyl */}
          <div 
            ref={platterRef}
            onMouseDown={handleStart}
            onTouchStart={handleStart}
            className="relative w-full h-full aspect-square rounded-full bg-gradient-to-tr from-[#141210] to-[#1c1815] border border-[#302116]/30 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.6)] flex items-center justify-center p-2 select-none touch-none z-20 overflow-visible"
          >
            {/* Marquage stroboscopique */}
            <div 
              className="absolute inset-0 rounded-full border border-dashed border-[#544336]/30 opacity-30 animate-[spin_24s_linear_infinite]"
              style={{ 
                animationPlayState: (isPlaying && !isDragging) ? 'running' : 'paused',
                transform: isDragging ? `rotate(${dragRotation}deg)` : 'none',
              }}
            />
            
            {/* Témoin lumineux rouge */}
            <div className="absolute bottom-2 left-2 z-20 pointer-events-none flex flex-col items-center">
              <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-red-950'} transition-all duration-300`} />
              <span className="text-[5px] text-[#e6dfd5]/60 font-mono mt-0.5 font-bold">STROBO</span>
            </div>

            {/* Dynamic Crackle Indicator */}
            {vinylCrackle && isPlaying && (
              <div className="absolute top-2 right-2 z-20 pointer-events-none flex flex-col items-center">
                <div 
                  className="w-2 h-2 rounded-full bg-amber-400 opacity-60 transition-all duration-75"
                  style={{
                    transform: `scale(${1 + vinylCrackleVolume * 2})`,
                    boxShadow: `0 0 ${vinylCrackleVolume * 20}px #fbbf24`
                  }}
                />
                <span className="text-[5px] text-[#e6dfd5]/60 font-mono mt-0.5 font-bold">CRACKLE</span>
              </div>
            )}

            <LEDRing />

            {/* Vinyl Disc */}
            <div className="absolute inset-1.5 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.85)] z-10 overflow-hidden aspect-square">
              <VinylDisc 
                thumbnail={currentTrack?.thumbnail} 
                speed={speed} 
                rotationAngle={dragRotation}
                isDragging={isDragging}
              />
            </div>
          </div>

          {/* Bras de lecture tactile (Tonearm) - Superposé parfaitement au premier plan au-dessus du vinyle */}
          <div className="absolute top-[-8%] right-[-14%] w-[48%] h-[115%] z-[1000] pointer-events-none overflow-visible">
            <Tonearm />
          </div>
        </div>

        {/* Current sung lyric line centered beautifully between platter and controls */}
        <div className="w-full min-h-[48px] flex items-center justify-center text-center px-4 py-1 z-10">
          {currentLineText ? (
            <p 
              className="text-base sm:text-lg font-black tracking-wide leading-snug drop-shadow-md transition-all duration-300 text-center"
              style={{
                color: currentTheme?.primary || '#1ED760',
                textShadow: `0 0 15px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.4)'}`
              }}
            >
              {currentLineText}
            </p>
          ) : (
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic font-mono">
              {isInstrumental ? "🎵 Musique Instrumentale" : "✨ Paroles en cours..."}
            </p>
          )}
        </div>

        {/* Playback Controls Card */}
        <div className="w-full bg-[#120f0a]/90 border border-[#2d1c12] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative z-10">
          {/* Title, Artist and action buttons */}
          <div className="flex justify-between items-center w-full">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                {currentTrack?.title}
              </h2>
              <p 
                className="text-xs sm:text-sm text-gray-400 truncate mt-1 cursor-pointer hover:text-white transition-colors"
                onClick={() => {
                  if (currentTrack?.artist) {
                    window.location.href = `/artist/${encodeURIComponent(currentTrack.artist)}`;
                  }
                }}
              >
                {currentTrack?.artist}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleLike(currentTrack)}
                className="p-2 rounded-full hover:bg-white/5 transition-all cursor-pointer"
                style={{ color: trackLiked ? (currentTheme?.primary || '#1ED760') : '#9ca3af' }}
              >
                <Heart size={20} fill={trackLiked ? (currentTheme?.primary || '#1ED760') : 'none'} />
              </button>
              <button
                onClick={() => trackDownloaded ? removeTrack(currentTrack.videoId) : downloadTrack(currentTrack)}
                className="p-2 rounded-full hover:bg-white/5 transition-all text-gray-400 cursor-pointer"
                title={trackDownloaded ? 'Retirer du mode hors-ligne' : 'Télécharger'}
              >
                {trackDownloading ? (
                  <Loader2 size={20} className="animate-spin text-amber-500" />
                ) : trackDownloaded ? (
                  <Check size={20} className="text-amber-500" />
                ) : (
                  <Download size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Seek Slider */}
          <div className="flex flex-col gap-1.5 w-full">
            <input 
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="progress-track w-full cursor-pointer h-1.5 rounded-full"
              style={{
                background: `linear-gradient(to right, ${currentTheme?.primary || '#1ED760'} ${(currentTime / (duration || 1)) * 100}%, #262626 ${(currentTime / (duration || 1)) * 100}%)`
              }}
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Action Row Buttons */}
          <div className="flex justify-between items-center px-2">
            <button 
              onClick={toggleShuffle}
              className="p-2 rounded-full transition-colors hover:text-white cursor-pointer"
              style={shuffle ? { color: currentTheme?.primary || '#1ED760', backgroundColor: `${currentTheme?.primary || '#1ED760'}20` } : { color: '#9ca3af' }}
            >
              <Shuffle size={18} />
            </button>

            <button 
              onClick={playPrevious}
              className="p-2 rounded-full text-gray-400 hover:text-white transition-all active:scale-90 cursor-pointer"
            >
              <SkipBack size={22} />
            </button>

            <button 
              onClick={togglePlayPause}
              disabled={isLoading && !isPlaying}
              className="w-14 h-14 flex items-center justify-center rounded-full text-black hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
              style={{
                backgroundColor: currentTheme?.primary || '#1ED760',
                boxShadow: `0 0 20px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.4)'}`
              }}
            >
              {isLoading && !isPlaying ? (
                <Loader2 size={24} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={24} fill="black" />
              ) : (
                <Play size={24} fill="black" className="ml-1" />
              )}
            </button>

            <button 
              onClick={playNext}
              className="p-2 rounded-full text-gray-400 hover:text-white transition-all active:scale-90 cursor-pointer"
            >
              <SkipForward size={22} />
            </button>

            <button 
              onClick={toggleRepeat}
              className="p-2 rounded-full transition-colors hover:text-white cursor-pointer"
              style={repeat !== 'off' ? { color: currentTheme?.primary || '#1ED760', backgroundColor: `${currentTheme?.primary || '#1ED760'}20` } : { color: '#9ca3af' }}
            >
              {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>
        </div>

        {/* Small bottom lyrics preview box showing 2-3 translucent lines of lyrics */}
        <div 
          onClick={() => setIsLyricsModalOpen(true)}
          className="w-full bg-[#120f0a]/50 border border-[#2d1c12]/60 rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-all shadow-lg flex flex-col gap-2 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-gray-400 font-mono border-b border-[#2d1c12]/40 pb-2">
            <span className="flex items-center gap-1">
              <Mic2 size={12} style={{ color: currentTheme?.primary || '#1ED760' }} />
              <span>Paroles</span>
            </span>
            <span className="text-[9px] text-gray-500 group-hover:text-white transition-colors">Plein écran ↗</span>
          </div>
          
          <div className="flex flex-col gap-1.5 py-1 text-center justify-center min-h-[50px]">
            {lyricsLoading ? (
              <p className="text-xs text-gray-500 animate-pulse font-mono">Chargement des paroles...</p>
            ) : isInstrumental ? (
              <p className="text-xs text-gray-400 italic">🎵 Ce titre est une musique instrumentale.</p>
            ) : lyricsData.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Aucune parole disponible.</p>
            ) : (
              previewLines.slice(0, 2).map((line, i) => (
                <p 
                  key={i} 
                  className={`text-xs font-bold leading-normal truncate ${
                    i === 0 
                      ? 'text-white scale-100 opacity-90' 
                      : 'text-gray-400 scale-95 opacity-50'
                  }`}
                >
                  {line}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Synced Karaoke Full-Screen Lyrics Overlay */}
      <LyricsView isOpen={isLyricsModalOpen} onClose={() => setIsLyricsModalOpen(false)} />
    </div>
  );
}
