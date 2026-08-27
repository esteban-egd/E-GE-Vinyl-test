import { Link } from 'react-router-dom';
import { Disc3, ArrowLeft, Home, Search, Library } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function NotFoundPage() {
  const { currentTheme } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center select-none py-12">
      {/* Vinyl Disc Icon */}
      <div 
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl relative border border-white/10"
        style={{ 
          backgroundColor: `${currentTheme.primary}15`,
          boxShadow: `0 0 30px ${currentTheme.glow || `${currentTheme.primary}30`}`
        }}
      >
        <Disc3 size={48} className="text-[#c29e5a] animate-spin-slow" style={{ color: currentTheme.primary }} />
        <span className="absolute text-xs font-black text-white">404</span>
      </div>

      <span className="text-[11px] font-mono font-bold tracking-[0.3em] uppercase text-neutral-400 mb-2">
        Sillon Introuvable
      </span>
      
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mb-3">
        Page Non Trouvée
      </h1>

      <p className="text-sm text-neutral-400 max-w-md mb-8 leading-relaxed">
        La tête de lecture a glissé en dehors du disque. Le morceau ou la section demandée n'existe pas ou a été déplacée.
      </p>

      {/* Navigation Quick Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-200 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
          style={{ 
            backgroundColor: currentTheme.primary, 
            color: '#0d0c0b' 
          }}
        >
          <Home size={15} />
          <span>Retour à l'Accueil</span>
        </Link>

        <Link
          to="/search"
          className="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Search size={15} />
          <span>Recherche Universelle</span>
        </Link>
      </div>
    </div>
  );
}
