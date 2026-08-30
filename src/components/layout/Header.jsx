import { useState, useEffect } from 'react';
import { Download, User, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ProfileModal from '../profile/ProfileModal';
import GuestRestrictedModal from '../common/GuestRestrictedModal';

export default function Header({ onOpenMobileMenu = () => {} }) {
  const { user, profile } = useAuth();
  const { currentTheme } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

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

  const isGuest = !user || user.is_guest;
  const displayName = isGuest ? 'Invitations E-GE' : (profile?.full_name || user?.email?.split('@')[0] || 'Compte');
  const userSubtext = isGuest ? 'Mode Invité' : (profile?.username ? `@${profile.username.replace('@','')}` : 'Membre');
  const avatarUrl = isGuest ? '' : profile?.avatar_url;

  const handleProfileClick = (e) => {
    if (isGuest) {
      e.preventDefault();
      setShowGuestModal(true);
    }
  };

  return (
    <header 
      className="flex items-center justify-between px-4 sm:px-6 h-16 safe-top z-40 border-b border-white/5 transition-colors duration-300"
      style={{ backgroundColor: currentTheme.bg }}
    >
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition-all cursor-pointer flex items-center justify-center"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu size={20} />
        </button>

        <Link to="/" className="flex items-center gap-1.5 md:hidden hover:opacity-80 transition-opacity">
          <span className="text-display text-2xl font-black tracking-tighter uppercase" style={{ color: currentTheme.primary }}>E</span>
          <span className="text-display text-xl font-light tracking-widest text-white uppercase">GE</span>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
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
          isGuest ? (
            <button
              type="button"
              onClick={handleProfileClick}
              className="flex items-center gap-2.5 p-1.5 pr-3.5 rounded-full border transition-all group max-w-[180px] sm:max-w-none cursor-pointer hover:border-white/30 text-left"
              style={{ backgroundColor: currentTheme.cardBg, borderColor: `${currentTheme.primary}40` }}
            >
              <div 
                className="w-8 h-8 shrink-0 rounded-full overflow-hidden border transition-colors flex items-center justify-center relative shadow-sm"
                style={{ backgroundColor: currentTheme.bg, borderColor: `${currentTheme.primary}60` }}
              >
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User size={16} />
                </div>
              </div>
              <div className="flex flex-col items-start leading-none min-w-0">
                <div className="flex items-center gap-1.5 max-w-[110px] sm:max-w-xs">
                  <span className="text-xs font-black text-white uppercase tracking-tighter truncate">
                    {displayName}
                  </span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#c29e5a]/15 text-[#e1bb72] font-semibold border border-[#c29e5a]/30 shrink-0">
                    Invité
                  </span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5 truncate max-w-[90px] sm:max-w-xs" style={{ color: currentTheme.primary }}>
                  {userSubtext}
                </span>
              </div>
            </button>
          ) : (
            <Link
              to="/profile"
              className="flex items-center gap-2.5 p-1.5 pr-3.5 rounded-full border transition-all group max-w-[180px] sm:max-w-none cursor-pointer hover:border-white/30"
              style={{ backgroundColor: currentTheme.cardBg, borderColor: `${currentTheme.primary}40` }}
            >
              <div 
                className="w-8 h-8 shrink-0 rounded-full overflow-hidden border transition-colors flex items-center justify-center relative shadow-sm"
                style={{ backgroundColor: currentTheme.bg, borderColor: `${currentTheme.primary}60` }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User size={16} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start leading-none min-w-0">
                <div className="flex items-center gap-1.5 max-w-[110px] sm:max-w-xs">
                  <span className="text-xs font-black text-white uppercase tracking-tighter truncate">
                    {displayName}
                  </span>
                  <span className="text-[7.5px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 font-mono shrink-0">
                    PRO
                  </span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5 truncate max-w-[90px] sm:max-w-xs" style={{ color: currentTheme.primary }}>
                  {userSubtext}
                </span>
              </div>
            </Link>
          )
        )}
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      
      <GuestRestrictedModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        title="Profil Privé & Personnalisation"
        description="Le mode Invité est restreint. Connectez-vous ou créez un compte pour accéder à votre profil et personnaliser vos paramètres."
      />
    </header>
  );
}

