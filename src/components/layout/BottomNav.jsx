import { NavLink } from 'react-router-dom';
import { Home, Search, Library, Settings } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/library', label: 'Library', icon: Library },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 w-full glass-strong border-t border-[#2a2a2a] safe-bottom pb-2">
      <nav className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-all ${isActive ? 'bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : ''}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : ''}`}>
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
