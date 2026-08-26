import { useState, useEffect } from 'react';
import { useOfflineCache } from '../hooks/useOfflineCache';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { 
  Palette, 
  Volume2, 
  HardDrive, 
  Sparkles, 
  Check, 
  Trash2, 
  ExternalLink,
  Sliders,
  Monitor,
  Radio,
  Zap,
  Disc,
  RotateCcw,
  Play,
  Moon,
  ShieldCheck,
  Music,
  SlidersHorizontal,
  Flame
} from 'lucide-react';

function ToggleSwitch({ checked, onChange, label, description, icon: Icon, currentTheme }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center gap-3.5 pr-4">
        {Icon && (
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              backgroundColor: checked ? `${currentTheme.primary}25` : 'rgba(255,255,255,0.05)',
              color: checked ? currentTheme.primary : '#9ca3af'
            }}
          >
            <Icon size={18} />
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-white leading-snug">{label}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-[#1DB954]' : 'bg-white/20'
        }`}
        style={checked ? { backgroundColor: currentTheme.primary } : {}}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { getCacheSize, clearCache } = useOfflineCache();
  const { currentTheme, themeId, setThemeId, themes, glowEnabled, setGlowEnabled } = useTheme();
  
  const [cacheSize, setCacheSize] = useState("0.00");

  // Local settings with localStorage persistence
  const [audioQuality, setAudioQuality] = useState(() => {
    try {
      return localStorage.getItem('lyra_audio_quality') || 'high';
    } catch {
      return 'high';
    }
  });

  const [normalizeAudio, setNormalizeAudio] = useState(() => {
    try {
      const val = localStorage.getItem('lyra_normalize_audio');
      return val !== null ? JSON.parse(val) : true;
    } catch {
      return true;
    }
  });

  const [crossfadeSeconds, setCrossfadeSeconds] = useState(() => {
    try {
      return localStorage.getItem('lyra_crossfade') || '3';
    } catch {
      return '3';
    }
  });

  const [vinylMode, setVinylMode] = useState(() => {
    try {
      const val = localStorage.getItem('lyra_vinyl_mode');
      return val !== null ? JSON.parse(val) : true;
    } catch {
      return true;
    }
  });

  const [hdCovers, setHdCovers] = useState(() => {
    try {
      const val = localStorage.getItem('lyra_hd_covers');
      return val !== null ? JSON.parse(val) : true;
    } catch {
      return true;
    }
  });

  const [reduceAnimations, setReduceAnimations] = useState(() => {
    try {
      const val = localStorage.getItem('lyra_reduce_animations');
      return val !== null ? JSON.parse(val) : false;
    } catch {
      return false;
    }
  });

  const [dynamicIsland, setDynamicIsland] = useState(() => {
    try {
      const val = localStorage.getItem('lyra_dynamic_island');
      return val !== null ? JSON.parse(val) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    getCacheSize().then(setCacheSize);
  }, [getCacheSize]);

  // Handlers with toast feedback
  const handleThemeChange = (id) => {
    setThemeId(id);
    const selected = themes[id];
    if (selected) {
      toast.success(`Thème ${selected.name} appliqué !`, {
        icon: '🎨',
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          border: `1px solid ${selected.primary}60`
        }
      });
    }
  };

  const handleGlowToggle = (val) => {
    setGlowEnabled(val);
    toast.success(val ? "Effets Néon & Glow activés !" : "Effets Néon désactivés", {
      icon: val ? '✨' : '🌙'
    });
  };

  const handleAudioQualityChange = (val) => {
    setAudioQuality(val);
    try { localStorage.setItem('lyra_audio_quality', val); } catch {}
    toast.success(val === 'high' ? "Qualité Haute (320 kbps) activée" : "Qualité Standard (160 kbps) activée", {
      icon: '🎧'
    });
  };

  const handleNormalizeAudioToggle = (val) => {
    setNormalizeAudio(val);
    try { localStorage.setItem('lyra_normalize_audio', JSON.stringify(val)); } catch {}
    toast.success(val ? "Normalisation audio activée" : "Normalisation audio désactivée");
  };

  const handleCrossfadeChange = (val) => {
    setCrossfadeSeconds(val);
    try { localStorage.setItem('lyra_crossfade', val); } catch {}
    toast.success(`Fondu enchaîné réglé à ${val}s`);
  };

  const handleVinylModeToggle = (val) => {
    setVinylMode(val);
    try { localStorage.setItem('lyra_vinyl_mode', JSON.stringify(val)); } catch {}
    toast.success(val ? "Mode Platine Vinyle activé" : "Mode Lecteur Standard activé", { icon: '🪩' });
  };

  const handleHdCoversToggle = (val) => {
    setHdCovers(val);
    try { localStorage.setItem('lyra_hd_covers', JSON.stringify(val)); } catch {}
    toast.success(val ? "Affichage pochettes HD activé" : "Pochettes optimisées activées");
  };

  const handleReduceAnimationsToggle = (val) => {
    setReduceAnimations(val);
    try { localStorage.setItem('lyra_reduce_animations', JSON.stringify(val)); } catch {}
    toast.success(val ? "Mode animations réduites activé" : "Animations fluides activées");
  };

  const handleDynamicIslandToggle = (val) => {
    setDynamicIsland(val);
    try { localStorage.setItem('lyra_dynamic_island', JSON.stringify(val)); } catch {}
    toast.success(val ? "Îlot dynamique activé" : "Îlot dynamique masqué");
  };

  const handleClearCache = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer tous les morceaux téléchargés ?")) {
      await clearCache();
      setCacheSize("0.00");
      toast.success("Cache hors-ligne vidé avec succès !", { icon: '🗑️' });
    }
  };

  const handleResetSettings = () => {
    if (window.confirm("Réinitialiser tous les paramètres aux valeurs par défaut ?")) {
      setThemeId('vinyl');
      setGlowEnabled(true);
      setAudioQuality('high');
      setNormalizeAudio(true);
      setCrossfadeSeconds('3');
      setVinylMode(true);
      setHdCovers(true);
      setReduceAnimations(false);
      setDynamicIsland(true);
      try {
        localStorage.removeItem('lyra_theme');
        localStorage.removeItem('lyra_glow_enabled');
        localStorage.removeItem('lyra_audio_quality');
        localStorage.removeItem('lyra_normalize_audio');
        localStorage.removeItem('lyra_crossfade');
        localStorage.removeItem('lyra_vinyl_mode');
        localStorage.removeItem('lyra_hd_covers');
        localStorage.removeItem('lyra_reduce_animations');
        localStorage.removeItem('lyra_dynamic_island');
      } catch {}
      toast.success("Réglages réinitialisés aux valeurs par défaut", { icon: '🔄' });
    }
  };

  // Quick preset accents
  const quickAccents = [
    { id: 'glacier', name: 'Cyan Glacier', color: '#41CAF0' },
    { id: 'default', name: 'Vert Spotify', color: '#1ED760' },
    { id: 'cyberpunk', name: 'Néon Violet', color: '#FF007F' },
    { id: 'vinyl', name: 'Or Vintage', color: '#c29e5a' }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col gap-8 box-border fade-in pb-32">
      
      {/* 👑 Titre & Header de la Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Thèmes & Réglages
            </h1>
            <span 
              className="text-[10px] px-3 py-1 rounded-full font-mono uppercase tracking-wider font-extrabold border shadow-sm"
              style={{
                backgroundColor: `${currentTheme.primary}20`,
                color: currentTheme.primary,
                borderColor: `${currentTheme.primary}40`
              }}
            >
              E-GE VINYL v2.4
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Personnalisez l'ambiance visuelle Cyberpunk / Spotify et vos préférences d'écoute globale
          </p>
        </div>

        <button
          onClick={handleResetSettings}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          title="Réinitialiser les paramètres"
        >
          <RotateCcw size={14} />
          <span>Réinitialiser</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SECTON APPARENCE & THÈMES (CYBERPUNK / SPOTIFY DESIGN) */}
      {/* ========================================================================= */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#120f0a]/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-2xl shadow-inner"
              style={{ backgroundColor: `${currentTheme.primary}25`, color: currentTheme.primary }}
            >
              <Palette size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Apparence & Thèmes Visuels</span>
                <span className="text-xs text-gray-400 font-normal">({Object.keys(themes).length} thèmes)</span>
              </h2>
              <p className="text-xs text-gray-400">Changement de thème instantané appliqué à toute l'application</p>
            </div>
          </div>

          {/* Presets rapides de couleur */}
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-gray-400 px-2 font-mono">Accents:</span>
            {quickAccents.map((acc) => (
              <button
                key={acc.id}
                onClick={() => handleThemeChange(acc.id)}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer relative ${themeId === acc.id ? 'scale-125 ring-2 ring-white shadow-lg' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                style={{ backgroundColor: acc.color }}
                title={`Thème ${acc.name}`}
              />
            ))}
          </div>
        </div>

        {/* 🎨 Grille des Cartes de Thèmes Interactive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(themes).map((t) => {
            const isSelected = themeId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-white/10 border-white/40 shadow-2xl ring-1' 
                    : 'bg-black/30 border-white/10 hover:border-white/25 hover:bg-white/5 hover:-translate-y-1'
                }`}
                style={{
                  boxShadow: isSelected && glowEnabled ? `0 0 20px ${t.glow}` : undefined,
                  borderColor: isSelected ? t.primary : undefined
                }}
              >
                {/* Visual Header / Color Swatches */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border"
                      style={{ 
                        backgroundColor: `${t.primary}15`, 
                        color: t.primary,
                        borderColor: `${t.primary}30` 
                      }}
                    >
                      {t.category || 'Preset'}
                    </span>

                    {isSelected && (
                      <span 
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-black font-mono shadow-md"
                        style={{ backgroundColor: t.primary }}
                      >
                        <Check size={12} strokeWidth={3} /> Actif
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors">
                    {t.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-snug min-h-[32px]">
                    {t.desc || 'Thème personnalisé high-tech'}
                  </p>
                </div>

                {/* 🎵 Aperçu miniature du Lecteur (Mini Preview Card) */}
                <div className="mt-4 p-3 rounded-xl border border-white/10 bg-black/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-black shadow-md"
                        style={{ backgroundColor: t.primary }}
                      >
                        <Play size={12} fill="currentColor" className="ml-0.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="w-16 h-2 rounded bg-white/40 mb-1"></div>
                        <div className="w-10 h-1.5 rounded bg-white/20"></div>
                      </div>
                    </div>

                    {/* Palette Swatch */}
                    <div className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: t.primary }} title="Primary Accent" />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: t.secondary }} title="Secondary Color" />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: t.tertiary }} title="Tertiary Color" />
                    </div>
                  </div>

                  {/* Progressive Wave/Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                    <div className="h-full rounded-full" style={{ width: isSelected ? '70%' : '40%', backgroundColor: t.primary }} />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* ⚙️ Personnalisation fine (Effets Néon & Glow) */}
        <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch 
            label="Effets Néon & Glow Lumineux"
            description="Active le halo néon et les ombres lumineuses dynamiques autour des lecteurs et cartes"
            checked={glowEnabled}
            onChange={handleGlowToggle}
            icon={Zap}
            currentTheme={currentTheme}
          />

          <ToggleSwitch 
            label="Mode Sombre Profond Cyberpunk"
            description="Fond OLED noir profond pour un contraste maximal des éléments colorés"
            checked={true}
            onChange={() => toast.success("Le mode sombre OLED est actif par défaut")}
            icon={Moon}
            currentTheme={currentTheme}
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SECTION LECTEUR & AUDIO */}
      {/* ========================================================================= */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#120f0a]/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div 
            className="p-2.5 rounded-2xl shadow-inner"
            style={{ backgroundColor: `${currentTheme.primary}25`, color: currentTheme.primary }}
          >
            <Volume2 size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Lecteur & Qualité Audio</h2>
            <p className="text-xs text-gray-400">Réglez le moteur de rendu sonore et le style du lecteur vinyle</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Qualité Audio */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio size={18} style={{ color: currentTheme.primary }} />
                <span className="text-sm font-bold text-white">Qualité du flux audio</span>
              </div>
              <span className="text-[11px] font-mono text-gray-400 font-bold uppercase">
                {audioQuality === 'high' ? '320 kbps (HD)' : '160 kbps (Std)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
              <button
                onClick={() => handleAudioQualityChange('high')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${audioQuality === 'high' ? 'bg-white/20 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                style={audioQuality === 'high' ? { backgroundColor: `${currentTheme.primary}30`, color: '#ffffff' } : {}}
              >
                Haute (320 kbps)
              </button>
              <button
                onClick={() => handleAudioQualityChange('standard')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${audioQuality === 'standard' ? 'bg-white/20 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                style={audioQuality === 'standard' ? { backgroundColor: `${currentTheme.primary}30`, color: '#ffffff' } : {}}
              >
                Standard (160 kbps)
              </button>
            </div>
          </div>

          {/* Fondu Enchaîné (Crossfade) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} style={{ color: currentTheme.primary }} />
                <span className="text-sm font-bold text-white">Fondu enchaîné (Crossfade)</span>
              </div>
              <span className="text-[11px] font-mono font-bold" style={{ color: currentTheme.primary }}>
                {crossfadeSeconds === '0' ? 'Désactivé' : `${crossfadeSeconds} secondes`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
              {['0', '3', '6', '12'].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleCrossfadeChange(sec)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${crossfadeSeconds === sec ? 'text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  style={crossfadeSeconds === sec ? { backgroundColor: `${currentTheme.primary}40`, color: '#ffffff' } : {}}
                >
                  {sec === '0' ? 'Off' : `${sec}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Platine Vinyle */}
          <ToggleSwitch 
            label="Mode Platine Vinyle Animée"
            description="Affiche le disque vinyle tournant et la réponse tactile du bras de lecture"
            checked={vinylMode}
            onChange={handleVinylModeToggle}
            icon={Disc}
            currentTheme={currentTheme}
          />

          {/* Normalisation Audio */}
          <ToggleSwitch 
            label="Normalisation du Volume"
            description="Équilibre automatiquement le volume sonore entre les différents morceaux"
            checked={normalizeAudio}
            onChange={handleNormalizeAudioToggle}
            icon={Sliders}
            currentTheme={currentTheme}
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SECTION INTERFACE & NAVIGATION */}
      {/* ========================================================================= */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#120f0a]/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div 
            className="p-2.5 rounded-2xl shadow-inner"
            style={{ backgroundColor: `${currentTheme.primary}25`, color: currentTheme.primary }}
          >
            <Monitor size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Interface & Fluidité Visuelle</h2>
            <p className="text-xs text-gray-400">Optimisez l'affichage des Pochettes et les performances d'animation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleSwitch 
            label="Pochettes HD Grand Format"
            description="Charge les visuels d'albums en très haute définition lorsque disponible"
            checked={hdCovers}
            onChange={handleHdCoversToggle}
            icon={Sparkles}
            currentTheme={currentTheme}
          />

          <ToggleSwitch 
            label="Mode Performance (Animations Réduites)"
            description="Désactive les effets de transition complexes pour économiser la batterie"
            checked={reduceAnimations}
            onChange={handleReduceAnimationsToggle}
            icon={Flame}
            currentTheme={currentTheme}
          />

          <ToggleSwitch 
            label="Îlot Dynamique (Dynamic Island)"
            description="Affiche le mini-lecteur flottant interactif lors de la navigation"
            checked={dynamicIsland}
            onChange={handleDynamicIslandToggle}
            icon={Music}
            currentTheme={currentTheme}
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SECTION STOCKAGE & CACHE */}
      {/* ========================================================================= */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#120f0a]/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div 
            className="p-2.5 rounded-2xl shadow-inner"
            style={{ backgroundColor: `${currentTheme.primary}25`, color: currentTheme.primary }}
          >
            <HardDrive size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Stockage Hors-ligne & Cache (IndexedDB)</h2>
            <p className="text-xs text-gray-400">Gestion des morceaux décodés et des données locales de l'application</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 gap-4">
          <div>
            <p className="text-white text-sm font-bold">Espace de stockage utilisé</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Morceaux audios enregistrés pour une lecture fluide sans connexion internet
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-2xl font-black font-mono tracking-tight" style={{ color: currentTheme.primary }}>
              {cacheSize}
            </span>
            <span className="text-xs text-gray-400 font-bold">Mo</span>
          </div>
        </div>

        <button 
          onClick={handleClearCache}
          disabled={cacheSize === "0.00"}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          <Trash2 size={16} />
          <span>Vider le cache des morceaux hors-ligne</span>
        </button>
      </section>

      {/* ========================================================================= */}
      {/* 5. SIGNATURE & INFORMATIONS */}
      {/* ========================================================================= */}
      <section className="p-6 rounded-3xl bg-[#120f0a]/80 backdrop-blur-xl border border-white/10 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <ShieldCheck size={16} style={{ color: currentTheme.primary }} />
            <span>Salon E-GE Vinyl • Application Web Haute Fidélité</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Développé par</span>
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
  );
}
