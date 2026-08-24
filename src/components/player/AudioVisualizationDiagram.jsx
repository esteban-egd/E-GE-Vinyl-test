
import React from 'react';

const AudioVisualizationDiagram = ({ isPlaying }) => {
  return (
    <div className="flex items-end justify-center gap-0.5 h-6 w-12 opacity-70">
      {[...Array(6)].map((_, i) => (
        <div 
          key={i}
          className={`w-1.5 rounded-t-sm transition-all duration-300 ${isPlaying ? 'bg-[#c29e5a]' : 'bg-gray-600'}`}
          style={{
            height: isPlaying ? `${10 + Math.random() * 80}%` : '20%',
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizationDiagram;
