import { useState, useEffect } from 'react';
import { Download, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ProfileModal from '../profile/ProfileModal';

export default function Header() {
  const { user, profile } = useAuth();
  const { currentTheme } = useTheme();
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
    <header 
      className="flex items-center justify-between px-6 h-16 safe-top z-40 border-b border-white/5 transition-colors duration-300"
      style={{ backgroundColor: currentTheme.bg }}
    >
      <Link to="/" className="flex items-center gap-1.5 md:hidden hover:opacity-80 transition-opacity">
        <span className="text-display text-2xl font-black tracking-tighter uppercase" style={{ color: currentTheme.primary }}>E</span>
        <span className="text-display text-xl font-light tracking-widest text-white uppercase">GE</span>
      </Link>

      <div className="flex items-center gap-4">
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all text-[11px] font-bold tracking-wider uppercase border border-white/5 cursor-pointer"
            style={{ backgroundColor: currentTheme.bgAccent, color: currentTheme.primary }}
          >
            <Download size={13} />
            <span>Installer l'App</span>
          </button>
        )}

        {user && (
          <Link
            to="/profile"
            className="flex items-center gap-2.5 p-1.5 pr-3.5 rounded-full border transition-all group max-w-[200px] sm:max-w-none cursor-pointer hover:border-white/30"
            style={{ backgroundColor: currentTheme.cardBg, borderColor: `${currentTheme.primary}40` }}
          >
            <div 
              className="w-8 h-8 shrink-0 rounded-full overflow-hidden border transition-colors flex items-center justify-center relative shadow-sm"
              style={{ backgroundColor: currentTheme.bg, borderColor: `${currentTheme.primary}60` }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User size={16} />
                </div>
              )}
            </div>
            <div className="flex flex-col items-start leading-none min-w-0">
              <span className="text-xs font-black text-white uppercase tracking-tighter truncate max-w-[110px] sm:max-w-xs">
                {profile?.full_name || user.email?.split('@')[0] || 'Compte'}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5 truncate max-w-[110px] sm:max-w-xs" style={{ color: currentTheme.primary }}>
                {profile?.username ? `@${profile.username.replace('@','')}` : 'Membre'}
              </span>
            </div>
          </Link>
        )}
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </header>
  );
}
