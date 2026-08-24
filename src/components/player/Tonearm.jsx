import { useState, useRef, useEffect, useCallback } from 'react';
import { useAudio } from '../../context/AudioContext';

export default function Tonearm() {
  const { isPlaying, currentTime, duration, currentTrack, seek, resume, pause } = useAudio();

  const [isDragging, setIsDragging] = useState(false);
  const [localAngle, setLocalAngle] = useState(8);

  const pivotRef = useRef(null);
  const wasPlayingRef = useRef(false);

  // Helper method to compute and clamp the tonearm rotation from screen coordinates
  const updateAngleFromEvent = useCallback((e) => {
    if (!pivotRef.current) return 8;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = pivotRef.current.getBoundingClientRect();
    const pivotX = rect.left + rect.width / 2;
    const pivotY = rect.top + rect.height / 2;

    const dx = clientX - pivotX;
    const dy = clientY - pivotY;

    // Calculate rotation angle of the arm relative to the vertical line
    const mouseAngle = Math.atan2(dx, dy) * (180 / Math.PI);
    // Correct the default arm offset (6.6 degrees when phi = 0)
    const calculatedRotation = mouseAngle - 6.6;

    // Clamp between 8 deg (resting on support) and 45 deg (inner limit groove)
    const clampedRotation = Math.max(8, Math.min(45, calculatedRotation));
    setLocalAngle(clampedRotation);

    // Live seek during drag for real-time sound scanning feedback!
    if (clampedRotation >= 18 && duration > 0) {
      const progress = (clampedRotation - 18) / (40 - 18);
      const clampedProgress = Math.max(0, Math.min(0.99, progress));
      seek(clampedProgress * duration);
    }

    return clampedRotation;
  }, [duration, seek]);

  const handleDragStart = (e) => {
    if (!currentTrack) return;
    e.preventDefault();
    setIsDragging(true);
    wasPlayingRef.current = isPlaying;
    if (isPlaying) {
      pause();
    }

    // Force initial alignment update
    updateAngleFromEvent(e);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      updateAngleFromEvent(e);
    };

    const handleEnd = () => {
      setIsDragging(false);

      // Playback dropping needle logic
      if (localAngle >= -4) {
        if (wasPlayingRef.current) {
          resume();
        }
      } else {
        // Returned off-groove or on the support rest
        pause();
        seek(0);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, localAngle, resume, pause, seek, updateAngleFromEvent]);

  // Actual physical progress calculation
  const progress = duration > 0 ? currentTime / duration : 0;
  const isActivated = currentTrack && (isPlaying || currentTime > 0);

  const startAngle = 18;
  const endAngle = 40;

  // Final rendering rotation: follow dragging, or follow playback progress, or sit at support rest (8deg)
  const currentRotation = isDragging
    ? localAngle
    : isActivated
      ? startAngle + (progress * (endAngle - startAngle))
      : 8;

  return (
    <div className="w-full h-full z-[500] pointer-events-none drop-shadow-2xl overflow-visible">
      <svg viewBox="0 0 100 300" className="w-full h-full animate-fade-in" style={{ filter: 'drop-shadow(-4px 8px 10px rgba(0,0,0,0.75))', overflow: 'visible' }}>
        <defs>
          <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bf9d57" />
            <stop offset="40%" stopColor="#eddba4" />
            <stop offset="60%" stopColor="#e2c887" />
            <stop offset="100%" stopColor="#96773a" />
          </linearGradient>
          <linearGradient id="metal-dark" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1c1917" />
            <stop offset="50%" stopColor="#44403c" />
            <stop offset="100%" stopColor="#0c0a09" />
          </linearGradient>
        </defs>

        {/* --- STATIONARY ANCHOR (Pivot base) --- */}
        {/* Base bracket - Moved Right */}
        <circle cx="80" cy="45" r="26" fill="#1e1b18" stroke="#0c0a09" strokeWidth="1.5" />
        <circle ref={pivotRef} cx="80" cy="45" r="16" fill="#c5a85c" stroke="#5a4622" strokeWidth="1.5" />
        <circle cx="80" cy="45" r="10" fill="#fef08a" opacity="0.3" />
        <circle cx="80" cy="45" r="6" fill="#1c1917" />

        {/* Support cradle arm (positioned precisely to lock arm at -33 degrees) */}
        <g opacity="0.95">
          {/* Support pillar */}
          <line x1="77" y1="133" x2="77" y2="175" stroke="#2e2a24" strokeWidth="6" strokeLinecap="round" />
          {/* Cradle U-shape */}
          <path d="M 69 126 C 69 136, 85 136, 85 126" fill="none" stroke="#c5a85c" strokeWidth="4.5" strokeLinecap="round" />
          {/* Little locking clip */}
          <rect x="73" y="118" width="8" height="4" rx="1.5" fill="#1c1917" />
        </g>

        {/* --- ROTATING HOVER & INTERACTIVE DRAG GROUP (Pivots at (80, 45)) --- */}
        <g
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className="cursor-grab active:cursor-grabbing pointer-events-auto"
          style={{
            transformOrigin: '80px 45px',
            transform: `rotate(${currentRotation}deg)`,
            // Fluid mechanical transition only when not manually dragging
            transition: isDragging 
              ? 'none' 
              : 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          {/* Weighted balance cylinder at rear */}
          <rect x="73" y="4" width="14" height="28" rx="3.5" fill="#2e2a24" stroke="#0c0a09" strokeWidth="1.5" />
          <rect x="71" y="9" width="18" height="5" fill="#c5a85c" stroke="#5a4622" strokeWidth="0.5" />

          {/* S-shaped tonearm brass pipe - adjusted path with pixel-perfect physical 3D shading */}
          <path 
            d="M 80 45 Q 60 190 44 260" 
            fill="none" 
            stroke="#1c1917" 
            strokeWidth="8.5" 
            strokeLinecap="round" 
          />
          <path 
            d="M 80 45 Q 60 190 44 260" 
            fill="none" 
            stroke="#c5a85c" 
            strokeWidth="6" 
            strokeLinecap="round" 
          />
          <path 
            d="M 80 45 Q 60 190 44 260" 
            fill="none" 
            stroke="#fef08a" 
            strokeWidth="1.8" 
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Headshell, high-end cartridge body and glowing stylus tip indicator */}
          <g transform="translate(42, 255) rotate(-24)">
            {/* Main headshell block */}
            <rect x="-8" y="0" width="16" height="32" rx="3" fill="#111111" stroke="#333333" strokeWidth="1.5" />
            {/* Gold cartridge logo plate */}
            <rect x="-5" y="2" width="10" height="16" rx="1" fill="#c5a85c" stroke="#5a4622" strokeWidth="0.5" />
            {/* Red stylus guide pointer (Needle head) */}
            <rect x="-1" y="27" width="2" height="5" fill={isActivated && !isDragging ? "#ef4444" : "#8a7250"} className={isActivated && !isDragging ? "animate-pulse" : ""} />
            {/* Physical finger-lift handle hook */}
            <path d="M 8 10 Q 18 12 16 4" fill="none" stroke="#c5a85c" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}
