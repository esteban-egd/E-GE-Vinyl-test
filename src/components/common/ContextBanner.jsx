import React from 'react';
import { useMessage } from '../../context/MessageContext';

export default function ContextBanner() {
  const { messageData } = useMessage();
  const { text, icon, visible } = messageData;

  return (
    <div
      className={`fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-[99999] transition-all duration-500 ease-out flex items-center justify-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl border border-white/10 bg-[#120f0a]/95 text-[#e6dfd5] text-sm md:text-base font-medium max-w-[90vw] text-center pointer-events-none ${
        visible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 -translate-y-4 scale-95'
      }`}
    >
      {icon && <span className="text-lg md:text-xl drop-shadow-md">{icon}</span>}
      <span className="leading-snug">{text}</span>
    </div>
  );
}
