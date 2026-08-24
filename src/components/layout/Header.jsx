import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function Header() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <header className="flex items-center justify-between px-6 h-16 safe-top glass z-40 border-b border-[#2a2a2a]">
      <div className="text-equinox text-xl font-bold tracking-[0.1em] flex items-center">
        <span>E</span>
        <span className="ml-1 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-400">GE</span>
      </div>

      {isInstallable && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-1.5 rounded-full border border-purple-500/30 transition-all text-xs font-medium"
        >
          <Download size={14} />
          <span>Installer</span>
        </button>
      )}
    </header>
  );
}
