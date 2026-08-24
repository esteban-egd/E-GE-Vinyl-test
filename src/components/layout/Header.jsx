import { useState, useEffect } from 'react';
import { Download, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProfileModal from '../profile/ProfileModal';

export default function Header() {
  const { user, profile } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
    <header className="flex items-center justify-between px-6 h-16 safe-top bg-[#0d0c0b] z-40 border-b border-white/5">
      <div className="flex items-center gap-1.5 md:hidden">
        <span className="text-display text-2xl font-black tracking-tighter text-[var(--color-brass)] uppercase">E</span>
        <span className="text-display text-xl font-light tracking-widest text-white uppercase">GE</span>
      </div>

      <div className="flex items-center gap-4">
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="hidden md:flex items-center gap-2 bg-[#3b2d1c] hover:bg-[#c29e5a] text-white hover:text-[#0d0c0b] px-3.5 py-1.5 rounded-lg transition-all text-[11px] font-bold tracking-wider uppercase border border-white/5"
          >
            <Download size={13} />
            <span>Installer l'App</span>
          </button>
        )}

        {user && (
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-[#120f0a] border border-[#3b2d1c] hover:border-[#c29e5a] transition-all group"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0d0c0b] border border-[#3b2d1c] group-hover:border-[#c29e5a] transition-colors">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#3b2d1c]">
                  <User size={16} />
                </div>
              )}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-none">
              <span className="text-xs font-black text-white uppercase tracking-tighter">
                {profile?.full_name || user.email.split('@')[0]}
              </span>
              <span className="text-[9px] font-bold text-[#8a7250] uppercase tracking-widest mt-0.5">
                {profile?.username ? `@${profile.username}` : 'Artiste'}
              </span>
            </div>
          </button>
        )}
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </header>
  );
}
