import { NavLink } from 'react-router-dom';
import { Home, Search, Library, Settings, Disc3, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function Sidebar() {
  const { currentTheme } = useTheme();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
    } catch (error) {
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

  return (
    <aside className="w-64 h-full bg-[#0d0c0b] border-r border-white/5 flex flex-col z-50 transition-all duration-300">
      <div className="p-6 flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105"
            style={{ 
              background: currentTheme.primary,
              boxShadow: `0 0 15px ${currentTheme.glow}`
            }}
          >
            <Disc3 size={18} className="text-black animate-spin-slow" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tighter text-white font-sans uppercase">E-GE</span>
            <span className="text-xl font-light tracking-wide ml-1 text-gray-400 font-sans uppercase">Vinyl</span>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#c29e5a] font-bold mt-1">
          Salon E-GE Vinyl Studio
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1.5 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-semibold ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
            style={({ isActive }) => ({
              borderLeft: isActive ? `3px solid ${currentTheme.primary}` : undefined
            })}
          >
            <item.icon size={18} className="shrink-0" />
            <span className="tracking-wide uppercase text-[11px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 space-y-3">
        <div className="p-3.5 rounded-2xl bg-[#070a13] border border-white/5 text-center shadow-inner">
          <p className="text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">Thème Actif : {currentTheme.name}</p>
          <div className="flex justify-center items-center h-8 w-8 mx-auto rounded-full bg-white/5 border border-white/10">
            <div 
              className="h-2.5 w-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: currentTheme.primary, boxShadow: `0 0 10px ${currentTheme.primary}` }}
            />
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-500/70 hover:text-red-500 border border-red-500/10 hover:border-red-500/30 transition-all duration-300 text-[10px] font-black uppercase tracking-widest"
        >
          <LogOut size={14} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
