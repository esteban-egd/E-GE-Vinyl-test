import { useState, useEffect } from 'react';
import { useOfflineCache } from '../hooks/useOfflineCache';
import { useTheme } from '../context/ThemeContext';
import { 
  Trash2, 
  HardDrive, 
  ExternalLink,
  Sparkles, 
  Volume2, 
  CheckCircle,
  Palette,
  Check
} from 'lucide-react';

export default function SettingsPage() {
  const { getCacheSize, clearCache } = useOfflineCache();
  const { currentTheme, themeId, setThemeId, themes } = useTheme();
  const [cacheSize, setCacheSize] = useState("0.00");
  const [hdMode, setHdMode] = useState(true);

  useEffect(() => {
    getCacheSize().then(setCacheSize);
  }, [getCacheSize]);

  const handleClearCache = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer tous les morceaux téléchargés ?")) {
      await clearCache();
      setCacheSize("0.00");
    }
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8 max-w-3xl w-full mx-auto fade-in pb-28">
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter flex items-center gap-2.5 uppercase">
          <span>PARAMÈTRES</span>
          <span 
            className="text-[10px] px-3 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold border"
            style={{
              backgroundColor: `${currentTheme.primary}15`,
              color: currentTheme.primary,
              borderColor: `${currentTheme.primary}30`
            }}
          >
            E-GE VINYL v2
          </span>
        </h1>
      </div>
      
      <div className="space-y-6">
        
        {/* Section: Thèmes Visuels */}
        <section className="p-6 rounded-3xl bg-[#120f0a] border border-white/5 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary }}
            >
              <Palette size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Thèmes Visuels</h2>
              <p className="text-xs text-gray-400">Sélectionnez la palette d'accentuation et les lueurs</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.values(themes).map((t) => {
              const isSelected = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center relative group ${
                    isSelected 
                      ? 'bg-white/10 border-white/30 shadow-lg' 
                      : 'bg-white/5 border-white/5 hover:border-white/20'
                  }`}
                  style={{
                    boxShadow: isSelected ? `0 0 15px ${t.glow}` : undefined
                  }}
                >
                  <div className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-inner overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}
                  >
                    {isSelected && <Check size={14} className="text-black font-bold" />}
                  </div>
                  <span className="text-xs font-semibold text-white tracking-tight">{t.name}</span>
                </button>
              );
            })}
          </div>
        </section>
        
        {/* Section: Stockage Hors-ligne */}
        <section className="p-6 rounded-3xl bg-[#120f0a] border border-white/5 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary }}
            >
              <HardDrive size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Stockage Hors-ligne (IndexedDB)</h2>
              <p className="text-xs text-gray-400">Gestion des morceaux mis en cache pour les sessions hors réseau</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white text-sm font-medium">Espace utilisé</p>
              <p className="text-xs text-gray-400">Morceaux décodés et prêts à l'écoute hors réseau</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black font-mono" style={{ color: currentTheme.primary }}>
                {cacheSize}
              </span>
              <span className="text-xs text-gray-400 ml-1">Mo</span>
            </div>
          </div>
          
          <button 
            onClick={handleClearCache}
            disabled={cacheSize === "0.00"}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-red-500/20 text-xs font-bold"
          >
            <Trash2 size={16} />
            <span>Vider le cache hors-ligne</span>
          </button>
        </section>
        
        {/* Section: Signature & Architecture */}
        <section className="p-6 rounded-3xl bg-[#120f0a] border border-white/5 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Salon E-GE Vinyl</h2>
              <p className="text-xs text-gray-400">Application E-GE Vinyl</p>
            </div>
          </div>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400">Concepteur & Développeur</span>
              <a 
                href="https://eguillermin.vercel.app" 
                target="_blank" 
                rel="noreferrer" 
                className="hover:underline font-bold flex items-center gap-1.5 transition-colors"
                style={{ color: currentTheme.primary }}
              >
                <span>Esteban Guillermin Egidio</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
