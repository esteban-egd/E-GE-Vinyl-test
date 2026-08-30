import React, { useRef, useState, useEffect } from 'react';

/**
 * MarqueeTitle Component
 * Automatically scrolls song titles horizontally when they overflow their container width.
 *
 * Props:
 * - text: Title string
 * - isPlaying: Audio playback state (when true, auto-scrolling is active)
 * - className: Additional typography/styling for the title text
 * - containerClassName: Additional container styles
 * - badge: Optional inline React element (e.g. DownloadBadge)
 */
export default function MarqueeTitle({
  text = '',
  isPlaying = false,
  className = '',
  containerClassName = '',
  badge = null
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [animDuration, setAnimDuration] = useState(8);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;

        if (textWidth > containerWidth) {
          setIsOverflowing(true);
          const overflow = textWidth - containerWidth + 12;
          setScrollDistance(overflow);
          // Calculate smooth duration based on overflow distance (6s to 14s)
          const duration = Math.max(6, Math.min(14, overflow / 22 + 4));
          setAnimDuration(duration);
        } else {
          setIsOverflowing(false);
          setScrollDistance(0);
        }
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    const timer = setTimeout(checkOverflow, 120);

    return () => {
      window.removeEventListener('resize', checkOverflow);
      clearTimeout(timer);
    };
  }, [text]);

  return (
    <div 
      ref={containerRef} 
      className={`overflow-hidden whitespace-nowrap w-full relative group ${containerClassName}`}
    >
      <div
        ref={textRef}
        className={`inline-flex items-center gap-2 whitespace-nowrap transition-transform duration-300 ${
          isOverflowing ? 'title-scroll' : 'truncate max-w-full'
        } ${className}`}
        style={
          isOverflowing
            ? {
                '--scroll-dist': `-${scrollDistance}px`,
                animationDuration: `${animDuration}s`,
                animationPlayState: isPlaying ? 'running' : 'running'
              }
            : {}
        }
      >
        <span>{text}</span>
        {badge}
      </div>
    </div>
  );
}
