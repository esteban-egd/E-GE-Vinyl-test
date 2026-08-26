import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';

export default function DownloadBadge({ videoId, className = '' }) {
  const { downloadedTrackIds } = useOffline();
  
  if (!videoId || !downloadedTrackIds.has(videoId)) {
    return null;
  }
  
  return (
    <span className={`inline-flex items-center text-green-500 shrink-0 ${className}`} title="Téléchargé en local">
      <CheckCircle size={14} fill="currentColor" className="text-black bg-green-500 rounded-full" />
    </span>
  );
}
