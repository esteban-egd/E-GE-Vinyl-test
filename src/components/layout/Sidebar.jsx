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
    <aside className="w-64 h-full bg-[#0d0c0b] border-r border-white/[0.04] flex flex-col z-50 transition-all duration-300">
      <div className="p-6 flex flex-col gap-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300"
            style={{ 
              background: '#c29e5a',
              boxShadow: '0 0 15px rgba(194, 158, 90, 0.25)'
            }}
          >
            <Disc3 size={16} className="text-[#0d0c0b] animate-spin-slow" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tighter text-white uppercase">E-GE</span>
            <span className="text-lg font-light tracking-widest ml-1 text-gray-500 uppercase">Vinyl</span>
          </div>
        </div>
        <span className="text-[9px] uppercase tracking-[0.25em] text-[#c29e5a] font-black mt-2">
          Salon Audiophile
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1.5 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 text-xs font-semibold relative overflow-hidden group ${
                isActive
                  ? 'bg-white/[0.03] text-[#c29e5a] font-black border border-white/[0.04]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active vertical bar indicator inside */}
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-[#c29e5a] rounded-full shadow-[0_0_8px_#c29e5a]" />
                )}
                <item.icon size={16} className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-[#c29e5a]' : 'text-gray-500'}`} />
                <span className="tracking-widest uppercase text-[10px]">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 space-y-3 shrink-0">
        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.03] text-center shadow-inner">
          <p className="text-[8px] font-mono tracking-widest text-gray-500 uppercase mb-2">Thème Actif : {currentTheme.name}</p>
          <div className="flex justify-center items-center h-7 w-7 mx-auto rounded-full bg-white/[0.02] border border-white/[0.04]">
            <div 
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: '#c29e5a', boxShadow: '0 0 10px #c29e5a' }}
            />
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-500/60 hover:text-red-500 border border-red-500/10 hover:border-red-500/20 transition-all duration-300 text-[9px] font-black uppercase tracking-widest cursor-pointer"
        >
          <LogOut size={12} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
