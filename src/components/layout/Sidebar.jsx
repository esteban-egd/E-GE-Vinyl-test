import { NavLink } from 'react-router-dom';
import { Home, Search, Library, Settings } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { path: '/', label: 'Lecteur', icon: Home },
    { path: '/search', label: 'Recherche', icon: Search },
    { path: '/library', label: 'Bibliothèque', icon: Library },
    { path: '/settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <aside className="w-64 h-full glass-strong border-r border-[#2a2a2a] flex flex-col z-50 transition-all duration-300">
      <div className="p-8 flex items-center gap-3">
        <div className="text-equinox text-2xl font-bold tracking-[0.15em] flex items-center">
          <span>E</span>
          <span className="text-xl ml-1 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-400">GE</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 text-white neon-purple'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={22} className="shrink-0" />
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
          <p className="text-xs text-gray-400 text-center mb-2">E GE Vinyl PWA</p>
          <div className="flex justify-center items-center h-8 w-8 mx-auto rounded-full bg-purple-500/20 border border-purple-500/30">
            <div className="h-3 w-3 rounded-full bg-cyan-400 led-ring-active" />
          </div>
        </div>
      </div>
    </aside>
  );
}
