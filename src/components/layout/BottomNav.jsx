import { NavLink } from 'react-router-dom';
import { Home, Disc, Search, Library, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function BottomNav() {
  const { currentTheme } = useTheme();

  const navItems = [
    { path: '/', label: 'Accueil', icon: Home },
    { path: '/player', label: 'Lecteur', icon: Disc },
    { path: '/search', label: 'Recherche', icon: Search },
    { path: '/library', label: 'Bibliothèque', icon: Library },
    { path: '/settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 w-full bg-[#0a0e1a]/95 backdrop-blur-xl border-t border-white/10 safe-bottom pb-2 z-50">
      <nav className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div 
                  className={`relative flex items-center justify-center w-9 h-9 rounded-full mb-0.5 transition-all ${
                    isActive ? 'border border-white/20 shadow-md' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? `${currentTheme.primary}25` : 'transparent',
                    color: isActive ? currentTheme.primary : undefined,
                    boxShadow: isActive ? `0 0 12px ${currentTheme.glow}` : 'none'
                  }}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span 
                  className={`text-[9px] uppercase tracking-wider font-semibold transition-colors ${
                    isActive ? 'text-white font-bold' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
