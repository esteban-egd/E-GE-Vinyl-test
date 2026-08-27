import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, Search, Library, Settings, Disc3, LogOut, User, X, Sparkles, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { currentTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
    } catch {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const navItems = [
    { path: '/', label: 'Accueil', icon: Home },
    { path: '/player', label: 'Lecteur Vinyle', icon: Disc3 },
    { path: '/search', label: 'Recherche Universelle', icon: Search },
    { path: '/library', label: 'Ma Bibliothèque', icon: Library },
    { path: '/settings', label: 'Thèmes & Réglages', icon: Settings },
  ];

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Audiophile';
  const username = profile?.username ? `@${profile.username.replace('@', '')}` : (user?.email ? `@${user.email.split('@')[0]}` : '@audiophile');
  const avatarUrl = profile?.avatar_url;

  const content = (
    <div 
      className="w-[260px] h-full flex flex-col justify-between border-r border-white/10 bg-neutral-900/95 backdrop-blur-md transition-colors duration-300 select-none overflow-hidden"
      style={{
        backgroundColor: `${currentTheme.cardBg}f0`,
        borderColor: 'rgba(255, 255, 255, 0.08)'
      }}
    >
      {/* Top Section : Logo & Profile Widget */}
      <div className="p-4 pb-2 flex flex-col gap-3 shrink-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            onClick={onClose}
            className="flex items-center gap-2.5 group hover:opacity-95 transition-all"
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 shrink-0"
              style={{ 
                background: currentTheme.primary,
                boxShadow: `0 0 16px ${currentTheme.glow || currentTheme.primary}`
              }}
            >
              <Disc3 size={17} className="text-[#0d0c0b] animate-spin-slow" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center leading-none">
                <span className="text-lg font-black tracking-tighter text-white uppercase">E-GE</span>
                <span className="text-lg font-light tracking-widest ml-1 text-neutral-400 uppercase">Vinyl</span>
              </div>
              <span 
                className="text-[8px] uppercase tracking-[0.22em] font-black mt-0.5 transition-colors duration-300"
                style={{ color: currentTheme.primary }}
              >
                Salon Audiophile
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Profil Widget en haut avec Avatar Dynamique */}
        <Link
          to="/profile"
          onClick={onClose}
          className="mt-1 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all duration-300 flex items-center gap-3 group relative overflow-hidden"
          style={{
            borderColor: location.pathname === '/profile' ? `${currentTheme.primary}40` : undefined,
            backgroundColor: location.pathname === '/profile' ? `${currentTheme.primary}12` : undefined
          }}
        >
          {/* Avatar (40x40px) */}
          <div 
            className="w-10 h-10 rounded-full shrink-0 overflow-hidden border-2 transition-transform duration-300 group-hover:scale-105 relative flex items-center justify-center bg-black/40 shadow-md"
            style={{ 
              borderColor: currentTheme.primary,
              boxShadow: `0 0 10px ${currentTheme.glow || `${currentTheme.primary}40`}`
            }}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={displayName} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=CapybaraChill&backgroundColor=1db954';
                }}
              />
            ) : (
              <User size={18} className="text-neutral-400 group-hover:text-white" />
            )}
            <div 
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-neutral-900"
              style={{ backgroundColor: currentTheme.primary }}
            />
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-white truncate group-hover:text-white transition-colors">
                {displayName}
              </p>
              {user?.is_guest && (
                <span className="text-[7.5px] px-1.5 py-0.2 rounded-full bg-[#c29e5a]/20 text-[#e1bb72] font-mono font-bold border border-[#c29e5a]/40 shrink-0">
                  DÉMO
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span 
                className="text-[9.5px] font-semibold tracking-wide truncate max-w-[110px]"
                style={{ color: currentTheme.primary }}
              >
                {user?.is_guest ? 'Mode Invité' : username}
              </span>
              <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-white/5 border border-white/10 text-neutral-400 font-mono">
                {user?.is_guest ? 'GUEST' : 'PRO'}
              </span>
            </div>
          </div>

          <ChevronRight size={14} className="text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </div>

      {/* 3. Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 py-1.5">
          <p className="text-[9px] font-bold tracking-widest text-neutral-500 uppercase">
            Menu Principal
          </p>
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-semibold relative overflow-hidden group ${
                isActive
                  ? 'bg-white/[0.08] font-bold border shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`
            }
            style={({ isActive }) => (isActive ? { 
              color: currentTheme.primary,
              backgroundColor: `${currentTheme.primary}15`,
              borderColor: `${currentTheme.primary}30`
            } : {})}
          >
            {({ isActive }) => (
              <>
                {/* Active vertical indicator bar */}
                {isActive && (
                  <span 
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-300"
                    style={{ 
                      backgroundColor: currentTheme.primary, 
                      boxShadow: `0 0 10px ${currentTheme.primary}` 
                    }} 
                  />
                )}

                <item.icon 
                  size={18} 
                  className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? '' : 'text-neutral-400 group-hover:text-white'
                  }`}
                  style={{ 
                    color: isActive ? currentTheme.primary : undefined,
                    filter: isActive ? `drop-shadow(0 0 6px ${currentTheme.glow || currentTheme.primary})` : undefined
                  }}
                />

                <span 
                  className={`tracking-wide text-[11px] truncate transition-colors duration-200 ${
                    isActive ? 'font-black' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>

                {isActive && (
                  <Sparkles size={11} className="ml-auto opacity-70 animate-pulse shrink-0" style={{ color: currentTheme.primary }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 4. Section Basse : Widget Thème Actif & Déconnexion */}
      <div className="p-3.5 space-y-2.5 shrink-0 border-t border-white/5 bg-black/20">
        {/* Thème Actif Widget */}
        <Link
          to="/settings"
          onClick={onClose}
          className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all duration-300 flex items-center justify-between group cursor-pointer block"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-white/10"
              style={{ backgroundColor: `${currentTheme.primary}20` }}
            >
              <div 
                className="w-2 h-2 rounded-full animate-pulse transition-all duration-300"
                style={{ 
                  backgroundColor: currentTheme.primary, 
                  boxShadow: `0 0 8px ${currentTheme.primary}` 
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono tracking-wider text-neutral-400 uppercase">
                Thème Actif
              </span>
              <span 
                className="text-[10px] font-bold tracking-wide truncate"
                style={{ color: currentTheme.primary }}
              >
                {currentTheme.name}
              </span>
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 text-neutral-400 group-hover:text-white transition-colors font-mono">
            Changer
          </span>
        </Link>

        {/* Bouton Déconnexion */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-sm active:scale-98"
        >
          <LogOut size={13} />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-[260px] z-50">
        {content}
      </aside>

      {/* 5. Mobile Drawer Overlay & Sliding Sidebar */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Sliding Menu */}
          <div className="relative z-10 h-full animate-slide-right shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

