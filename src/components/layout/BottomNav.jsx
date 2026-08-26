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
    <div 
      className="fixed bottom-0 w-full backdrop-blur-2xl border-t border-white/[0.04] safe-bottom pb-2 z-50 transition-colors duration-300"
      style={{ backgroundColor: `${currentTheme.cardBg}eb` }}
    >
      <nav className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-all duration-300 relative ${
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div 
                  className={`relative flex items-center justify-center w-9 h-9 rounded-full mb-0.5 transition-all duration-300 ${
                    isActive ? 'shadow-lg' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? currentTheme.bgAccent : 'transparent',
                    color: isActive ? currentTheme.primary : undefined,
                    borderColor: isActive ? `${currentTheme.primary}40` : 'transparent',
                    borderWidth: isActive ? '1px' : '0px',
                    boxShadow: isActive ? `0 0 15px ${currentTheme.glow}` : 'none'
                  }}
                >
                  <item.icon size={17} strokeWidth={isActive ? 2.5 : 1.75} />
                </div>
                <span 
                  className="text-[8.5px] uppercase tracking-widest font-semibold transition-colors duration-300"
                  style={{ color: isActive ? currentTheme.primary : undefined, fontWeight: isActive ? 900 : 600 }}
                >
                  {item.label}
                </span>
                
                {/* Micro Dot indicator under active icon */}
                {isActive && (
                  <span 
                    className="absolute bottom-1 w-1 h-1 rounded-full transition-all duration-300" 
                    style={{ backgroundColor: currentTheme.primary, boxShadow: `0 0 8px ${currentTheme.primary}` }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
