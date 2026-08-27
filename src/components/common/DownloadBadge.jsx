import React from 'react';
import { ArrowDown } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';

export default function DownloadBadge({ videoId, className = '', showLabel = false }) {
  const { downloadedTrackIds } = useOffline();
  
  if (!videoId || !downloadedTrackIds.has(videoId)) {
    return null;
  }
  
  return (
    <span 
      className={`inline-flex items-center gap-1.5 shrink-0 ${className}`} 
      title="Morceau téléchargé (accessible 100% hors-ligne)"
    >
      <div className="w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-sm">
        <ArrowDown size={10} strokeWidth={3.5} />
      </div>
      {showLabel && (
        <span className="text-[10px] font-bold tracking-wider text-emerald-400">
          Téléchargé
        </span>
      )}
    </span>
  );
}
