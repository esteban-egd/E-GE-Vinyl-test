import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Disc } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      toast.error("Mode Hors-Ligne : Seuls vos morceaux téléchargés sont disponibles.", {
        icon: '⚡',
        duration: 4000
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Connexion rétablie ! Accès à la recherche en ligne.", {
        icon: '📶',
        duration: 3000
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-600/90 via-yellow-600/90 to-amber-600/90 text-black px-4 py-1.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md z-[500] sticky top-0 animate-pulse">
      <WifiOff size={14} className="stroke-[3]" />
      <span>Mode Hors-Ligne Actif — Titres enregistrés & Platine locale</span>
      <Disc size={14} className="animate-spin-slow ml-1" />
    </div>
  );
}
