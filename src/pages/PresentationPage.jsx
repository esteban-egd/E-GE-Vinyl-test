import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Disc, 
  Download, 
  Radio, 
  ShieldCheck, 
  Laptop, 
  Smartphone, 
  Sparkles, 
  Sliders, 
  WifiOff, 
  Music, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  Headphones,
  Cpu,
  Volume2,
  Share2
} from 'lucide-react';
import ConstellationBackground from '../components/common/ConstellationBackground';

// Featured demo records to preview on the interactive turntable
const DEMO_VINYLS = [
  {
    id: 1,
    title: 'Random Access Memories',
    artist: 'Daft Punk',
    year: '2013',
    genre: 'French Touch • Nu-Disco',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    rpm: 33,
    color: '#e1bb72'
  },
  {
    id: 2,
    title: 'The Dark Side of the Moon',
    artist: 'Pink Floyd',
    year: '1973',
    genre: 'Progressive Rock',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    rpm: 33,
    color: '#06b6d4'
  },
  {
    id: 3,
    title: 'Midnight City & Rarities',
    artist: 'M83',
    year: '2011',
    genre: 'Synthwave • Dream Pop',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    rpm: 45,
    color: '#ec4899'
  }
];

const FEATURES = [
  {
    icon: Disc,
    title: 'Platine Tactile & Bras Physique',
    badge: 'Physique Réelle',
    description: 'Une platine interactive avec frottement de sillon, bras de lecture articulé et contrôle précis de la vitesse de rotation (33/45 RPM).'
  },
  {
    icon: WifiOff,
    title: 'Mode Hors-Ligne Autonome',
    badge: 'Zero Network',
    description: 'Stockage binaire local dans IndexedDB et Cache API. Profitez de votre musique en avion ou dans le métro sans coupure.'
  },
  {
    icon: Volume2,
    title: 'Simulation Craquement Vinyle',
    badge: 'Grain Analogique',
    description: 'Recréez le charme intemporel du disque microsillon grâce à un générateur de crépitements et de bruits de surface réglable.'
  },
  {
    icon: Layers,
    title: 'Gestion de Bibliothèque & Playlists',
    badge: 'Organisation',
    description: 'Classez vos morceaux favoris, créez des playlists thématiques, suivez vos artistes préférés et recevez des recommandations intelligentes.'
  },
  {
    icon: Sliders,
    title: 'Moteur Audio Haute Définition',
    badge: 'Audiophile',
    description: 'Décodage instantané, synchronisation en tâche de fond, contrôles au clavier et support complet des métadonnées enrichies.'
  },
  {
    icon: Cpu,
    title: 'Architecture Multi-Plateforme',
    badge: 'Desktop & Mobile',
    description: 'Application optimisée sous forme de Progressive Web App (PWA), exécutable Windows natif (.EXE) et package Android (.APK).'
  }
];

const TECH_STACK = [
  { name: 'React 18', role: 'Interface Réactive' },
  { name: 'Vite', role: 'Bundler Haute Performance' },
  { name: 'Electron', role: 'Runtime Desktop Natif' },
  { name: 'Tailwind CSS', role: 'Design Audiophile' },
  { name: 'IndexedDB / Dexie', role: 'Stockage Binaire Local' },
  { name: 'Framer Motion', role: 'Animations Fluides' },
  { name: 'Web Audio API', role: 'Traitement Acoustique' }
];

export default function PresentationPage({ onEnterWebPlayer, onEnterAsGuest, onOpenLogin }) {
  const [activeRecord, setActiveRecord] = useState(DEMO_VINYLS[0]);
  const [isPlayingDemo, setIsPlayingDemo] = useState(true);
  const [selectedSpeed, setSelectedSpeed] = useState(33);

  const downloadLinks = {
    windows: 'https://github.com/esteban-egd/E-GE-Vinyl-test/releases/download/2.0.0/E-GE-VinylSetup-2.0.exe',
    android: 'https://github.com/esteban-egd/E-GE-Vinyl-test/releases/download/2.0.0/E-GE-Vinyl-2.0.apk'
  };

  return (
    <div id="presentation-page-root" className="min-h-screen w-full text-[#f4efe6] font-sans flex flex-col justify-between relative overflow-y-auto overflow-x-hidden selection:bg-[#c29e5a] selection:text-[#0d0c0b] bg-[#0d0c0b]">
      {/* Dynamic Animated Constellation Layer */}
      <ConstellationBackground />

      {/* 1. TOP HEADER BRANDING */}
      <header id="presentation-header" className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e1bb72] to-[#c29e5a] flex items-center justify-center shadow-[0_0_20px_rgba(194,158,90,0.4)] border border-white/20">
            <Disc size={20} className="text-[#0d0c0b] animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tighter text-white uppercase">E-GE</span>
              <span className="text-xl font-light tracking-widest text-[#c29e5a] uppercase">Vinyl</span>
            </div>
            <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase block -mt-1">
              Platine Numérique Haute-Fidélité
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-demo-header"
            onClick={onEnterAsGuest}
            className="px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs uppercase tracking-wider font-bold rounded-xl transition-all cursor-pointer border border-white/10 flex items-center gap-1.5 active:scale-95"
          >
            <ShieldCheck size={14} className="text-[#c29e5a]" />
            <span>Tester en Démo / Invité</span>
          </button>
          
          <button
            id="btn-login-header"
            onClick={onOpenLogin || onEnterWebPlayer}
            className="px-4 sm:px-5 py-2 bg-[#c29e5a]/10 hover:bg-[#c29e5a]/20 border border-[#c29e5a]/40 hover:border-[#c29e5a] text-[#c29e5a] text-xs uppercase tracking-widest font-black rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(194,158,90,0.15)] active:scale-95"
          >
            Se connecter
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION : VALORISATION DE LA PROPOSITION DE VALEUR */}
      <main className="relative flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 md:py-12 z-10 space-y-16 md:space-y-24">
        
        <section id="hero-section" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center pt-2 md:pt-6">
          
          {/* Left Column : Value Proposition Text & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c29e5a]/10 border border-[#c29e5a]/25 text-[#c29e5a] text-xs font-bold uppercase tracking-widest backdrop-blur-md">
              <Sparkles size={14} className="text-[#e1bb72]" />
              <span>L'Émotion Analogique • La Puissance Digitale</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-[1.1]">
              Redécouvrez Le Son <br />
              <span className="bg-gradient-to-r from-white via-[#fcfbf9] to-[#c29e5a] bg-clip-text text-transparent">
                Sur Disque Vinyle
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#f4efe6]/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              E-GE Vinyl fusionne le rituel tactile du microsillon avec la liberté du streaming moderne. 
              Posez le bras de lecture, écoutez les craquements chaleureux du diamant et profitez de votre musique sur tous vos appareils.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                id="btn-hero-launch-webplayer"
                onClick={onOpenLogin || onEnterWebPlayer}
                className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-[#e1bb72] via-[#c29e5a] to-[#a8823b] text-[#0d0c0b] font-black uppercase tracking-widest text-xs rounded-2xl hover:shadow-[0_15px_35px_rgba(194,158,90,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xl"
              >
                <Play size={16} fill="currentColor" className="stroke-none" />
                <span>Lancer le Web Player</span>
                <ArrowRight size={16} />
              </button>

              <button
                id="btn-hero-guest-mode"
                onClick={onEnterAsGuest}
                className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 hover:border-[#c29e5a]/40"
              >
                <Headphones size={16} className="text-[#c29e5a]" />
                <span>Tester en Démo / Invité</span>
              </button>
            </div>

            {/* Quick Benefits Bullet List */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-gray-400 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#c29e5a]" />
                <span>Sans publicité</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#c29e5a]" />
                <span>Lecture Instantanée</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#c29e5a]" />
                <span>Accessible Partout</span>
              </div>
            </div>
          </div>

          {/* Right Column : Interactive 3D Vinyl Turntable Preview */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-square rounded-3xl p-5 bg-gradient-to-br from-[#1c1a17] via-[#12110f] to-[#0a0a09] border border-white/15 shadow-[0_30px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col justify-between overflow-hidden group">
              
              {/* Ambilight glow behind platter */}
              <div 
                className="absolute -inset-10 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-700"
                style={{ backgroundColor: activeRecord.color }}
              />

              {/* Turntable Top Bar */}
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white">
                    PLATINE EN DIRECT
                  </span>
                </div>
                
                {/* Speed selector 33 / 45 RPM */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-full border border-white/10">
                  <button
                    onClick={() => setSelectedSpeed(33)}
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold transition-all ${
                      selectedSpeed === 33 ? 'bg-[#c29e5a] text-black shadow-md' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    33 RPM
                  </button>
                  <button
                    onClick={() => setSelectedSpeed(45)}
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold transition-all ${
                      selectedSpeed === 45 ? 'bg-[#c29e5a] text-black shadow-md' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    45 RPM
                  </button>
                </div>
              </div>

              {/* Central Vinyl Platter & Tonearm Simulation */}
              <div className="relative my-auto flex items-center justify-center p-4">
                
                {/* Vinyl Disc with Physical Grooves and Conic Sheen */}
                <div 
                  onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                  className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-[#0d0c0b] shadow-[0_15px_40px_rgba(0,0,0,0.95),inset_0_0_0_2px_rgba(255,255,255,0.08),inset_0_0_0_8px_#181716] flex items-center justify-center cursor-pointer transition-transform duration-300 group-hover:scale-105 active:scale-95 select-none"
                >
                  {/* SVG Microgrooves */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
                    <circle cx="200" cy="200" r="190" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" fill="none" />
                    <circle cx="200" cy="200" r="182" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="0.5" fill="none" />
                    <circle cx="200" cy="200" r="174" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" fill="none" />
                    <circle cx="200" cy="200" r="166" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" fill="none" />
                    <circle cx="200" cy="200" r="138" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" fill="none" />
                    <circle cx="200" cy="200" r="114" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" fill="none" />
                  </svg>

                  {/* Conic Sheen Reflection */}
                  <div 
                    className="absolute inset-0 rounded-full mix-blend-screen pointer-events-none"
                    style={{
                      animation: isPlayingDemo ? `spin-vinyl ${selectedSpeed === 45 ? '1.1s' : '1.8s'} linear infinite` : 'none',
                      background: `conic-gradient(
                        from 0deg,
                        transparent 0deg,
                        rgba(255,255,255,0.08) 20deg,
                        rgba(255,255,255,0.14) 35deg,
                        rgba(255,255,255,0.08) 50deg,
                        transparent 75deg,
                        transparent 180deg,
                        rgba(255,255,255,0.08) 200deg,
                        rgba(255,255,255,0.14) 215deg,
                        rgba(255,255,255,0.08) 230deg,
                        transparent 255deg,
                        transparent 360deg
                      )`
                    }}
                  />

                  {/* Center Label (Macaron) */}
                  <div 
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-black shadow-2xl relative overflow-hidden flex items-center justify-center"
                    style={{
                      animation: isPlayingDemo ? `spin-vinyl ${selectedSpeed === 45 ? '1.1s' : '1.8s'} linear infinite` : 'none',
                    }}
                  >
                    <img 
                      src={activeRecord.cover} 
                      alt={activeRecord.title} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                    <div className="absolute inset-1 rounded-full border border-[#c29e5a]/50 flex flex-col items-center justify-between p-1.5 text-center">
                      <span className="text-[6px] font-mono uppercase text-[#e1bb72] font-black tracking-widest">
                        E-GE VINYL
                      </span>
                      <span className="text-[5.5px] font-mono text-white/90 font-bold truncate max-w-[80%]">
                        {activeRecord.title}
                      </span>
                      <span className="text-[5.5px] font-mono text-gray-300">
                        {selectedSpeed} RPM
                      </span>
                    </div>

                    {/* Spindle Center Hole */}
                    <div className="w-5 h-5 rounded-full bg-[#0d0c0b] border-2 border-[#c29e5a] z-20 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1c1a17]" />
                    </div>
                  </div>

                  {/* Interactive Play/Pause Indicator on Center Click */}
                  <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                    <div className="w-10 h-10 rounded-full bg-[#c29e5a] text-black flex items-center justify-center shadow-2xl">
                      {isPlayingDemo ? <Play size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                    </div>
                  </div>
                </div>

                {/* Physical Tonearm Visual */}
                <div 
                  className="absolute right-0 top-2 sm:top-4 w-20 h-44 sm:h-52 pointer-events-none transition-transform duration-700 origin-top-right z-30"
                  style={{
                    transform: isPlayingDemo ? 'rotate(18deg)' : 'rotate(0deg)'
                  }}
                >
                  {/* Tonearm Base */}
                  <div className="absolute top-0 right-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#3d372e] via-[#24211b] to-black border border-[#c29e5a]/40 shadow-xl flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-[#c29e5a] shadow-inner" />
                  </div>
                  
                  {/* Metallic Arm Rod */}
                  <div className="absolute top-6 right-3.5 w-1 h-36 bg-gradient-to-b from-[#e1bb72] via-[#8a7250] to-[#e1bb72] rounded-full shadow-md" />
                  
                  {/* Cartridge Head / Stylus */}
                  <div className="absolute bottom-2 right-1 w-6 h-9 rounded bg-[#1c1a17] border border-[#c29e5a] shadow-2xl flex flex-col items-center justify-between p-1 transform rotate-6">
                    <div className="w-1 h-1 rounded-full bg-amber-400" />
                    <span className="text-[4.5px] font-mono text-[#c29e5a] font-bold">STYLUS</span>
                    <div className="w-0.5 h-1.5 bg-red-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Vinyl Switcher */}
              <div className="relative z-10 bg-black/40 border border-white/10 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 pl-1">
                  <p className="text-xs font-bold text-white truncate">{activeRecord.title}</p>
                  <p className="text-[10px] text-gray-400 truncate">{activeRecord.artist} • {activeRecord.genre}</p>
                </div>

                {/* Mini Vinyl selector thumbnails */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {DEMO_VINYLS.map(v => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setActiveRecord(v);
                        setSelectedSpeed(v.rpm);
                        setIsPlayingDemo(true);
                      }}
                      className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        activeRecord.id === v.id ? 'border-[#c29e5a] scale-110 shadow-lg' : 'border-white/20 opacity-60 hover:opacity-100'
                      }`}
                      title={`${v.title} - ${v.artist}`}
                    >
                      <img src={v.cover} alt={v.title} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </section>

        {/* 3. APPLICATIONS NATIVES (WINDOWS .EXE & ANDROID .APK) — DÉPLACÉ AU-DESSUS DE LA GRILLE DE FONCTIONNALITÉS */}
        <section id="native-apps-section" className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-[#c29e5a] text-[10px] font-black uppercase tracking-[0.3em]">
              Écosystème & Téléchargements
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
              Téléchargez E-GE Vinyl Sur Vos Appareils
            </h2>
            <p className="text-xs text-gray-400">
              Profitez d'un accès direct, de raccourcis multimédia et d'une intégration parfaite avec votre système d'exploitation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Windows Desktop Card */}
            <a
              href={downloadLinks.windows}
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-3xl bg-gradient-to-b from-[#181614] to-[#0d0c0b] border border-white/10 hover:border-[#c29e5a]/50 shadow-xl transition-all duration-300 flex items-center gap-5 group cursor-pointer hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-[#c29e5a] group-hover:text-black transition-colors shrink-0 shadow-lg">
                <Laptop size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white text-base group-hover:text-[#e1bb72] transition-colors truncate">
                    Pour Windows
                  </h3>
                  <span className="text-[10px] font-mono text-[#c29e5a] font-bold">.EXE (64-bit)</span>
                </div>
                <p className="text-xs text-gray-400">Exécutable autonome optimisé pour PC & Laptop</p>
                <div className="flex items-center gap-1.5 text-[11px] text-[#c29e5a] font-bold mt-2">
                  <Download size={14} />
                  <span>Télécharger l'installateur</span>
                </div>
              </div>
            </a>

            {/* Android Mobile Card */}
            <a
              href={downloadLinks.android}
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-3xl bg-gradient-to-b from-[#181614] to-[#0d0c0b] border border-white/10 hover:border-[#c29e5a]/50 shadow-xl transition-all duration-300 flex items-center gap-5 group cursor-pointer hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-[#c29e5a] group-hover:text-black transition-colors shrink-0 shadow-lg">
                <Smartphone size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white text-base group-hover:text-[#e1bb72] transition-colors truncate">
                    Pour Android
                  </h3>
                  <span className="text-[10px] font-mono text-[#c29e5a] font-bold">.APK Mobile</span>
                </div>
                <p className="text-xs text-gray-400">Application mobile avec widget et lecture écran éteint</p>
                <div className="flex items-center gap-1.5 text-[11px] text-[#c29e5a] font-bold mt-2">
                  <Download size={14} />
                  <span>Télécharger le package APK</span>
                </div>
              </div>
            </a>
          </div>
        </section>

        {/* 4. BLOC DES FONCTIONNALITÉS CLÉS (GRID) */}
        <section id="features-grid" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[#c29e5a] text-[10px] font-black uppercase tracking-[0.3em]">
              Fonctionnalités Clés
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
              Conçu Pour Les Passionnés De Musique
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Chaque détail a été pensé pour reproduire l'authenticité de l'écoute analogique sans les contraintes matérielles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#161412] to-[#0c0b0a] border border-white/10 hover:border-[#c29e5a]/40 shadow-xl transition-all duration-300 group flex flex-col justify-between hover:-translate-y-1"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#c29e5a]/10 border border-[#c29e5a]/20 flex items-center justify-center text-[#c29e5a] group-hover:bg-[#c29e5a] group-hover:text-black transition-colors duration-300 shadow-lg">
                        <Icon size={24} />
                      </div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
                        {feat.badge}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-[#e1bb72] transition-colors">
                      {feat.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal">
                      {feat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. SECTION GENÈSE DU PROJET & L'ART DU VINYLE */}
        <section id="story-section" className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#181614] via-[#12100e] to-[#0a0a09] border border-white/15 overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 w-96 h-96 rounded-full bg-[#c29e5a]/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <Music size={16} className="text-[#c29e5a]" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#c29e5a]">
                  GENÈSE & PHILOSOPHIE DU PROJET
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Ressusciter la Matérialité de la Musique à l'Ère Numérique
              </h2>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                À une époque où la musique est devenue invisible et consommée à la chaîne, <strong>E-GE Vinyl</strong> est né d'une volonté simple : réintroduire le rituel, le temps long et la beauté graphique du disque microsillon dans nos appareils quotidiens.
              </p>

              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Ce projet allie un moteur physique de simulation de sillon ultra-fluide avec une architecture autonome capable d'exécuter vos albums favoris, que vous soyez sur navigateur web, PC Windows ou mobile Android.
              </p>

              <div className="pt-2 flex items-center gap-4 text-xs font-mono text-[#c29e5a]">
                <span>• CONÇU AVEC PASSION</span>
                <span>• ARCHITECTURE OUVERTE</span>
                <span>• EXPÉRIENCE IMMERSIVE</span>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-black/40 rounded-2xl border border-white/10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#c29e5a]/10 border border-[#c29e5a]/30 flex items-center justify-center text-[#c29e5a] shadow-inner">
                <Headphones size={32} />
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Écoute Ininterrompue</h4>
              <p className="text-xs text-gray-400">
                Découvrez la sérénité d'un lecteur conçu pour honorer l'œuvre de l'artiste dans son intégralité.
              </p>
            </div>
          </div>
        </section>

        {/* 6. BADGES TECHNIQUES & ARCHITECTURE MODERNE */}
        <section id="tech-stack-section" className="pt-6 border-t border-white/10 space-y-6">
          <div className="text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
              STACK TECHNIQUE & STANDARDS MODERNES
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto">
            {TECH_STACK.map((tech, idx) => (
              <div
                key={idx}
                className="px-4 py-2 rounded-2xl bg-[#141210] border border-white/10 flex items-center gap-2 hover:border-[#c29e5a]/30 transition-colors shadow-sm"
              >
                <span className="text-xs font-bold text-white">{tech.name}</span>
                <span className="text-[10px] text-gray-500 font-mono">• {tech.role}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 7. POINT D'ENTRÉE & APPEL À L'ACTION FLUIDE (CTA) */}
        <section id="bottom-cta-section" className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#181614] to-[#0c0b0a] border border-[#c29e5a]/30 text-center space-y-6 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-radial from-[#c29e5a]/10 via-transparent to-transparent pointer-events-none" />

          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#e1bb72] to-[#c29e5a] mx-auto flex items-center justify-center text-black shadow-[0_0_30px_rgba(194,158,90,0.4)]">
            <Play size={24} fill="currentColor" className="ml-1 stroke-none" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto relative z-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
              Prêt à Vivre L'Expérience ?
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Lancez le Web Player instantanément ou testez toutes les fonctionnalités en mode invité sans aucune création de compte requise.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 relative z-10">
            <button
              id="btn-bottom-launch-webplayer"
              onClick={onOpenLogin || onEnterWebPlayer}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#e1bb72] via-[#c29e5a] to-[#a8823b] text-[#0d0c0b] font-black uppercase tracking-widest text-xs rounded-2xl hover:shadow-[0_12px_30px_rgba(194,158,90,0.35)] hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Play size={15} fill="currentColor" className="stroke-none" />
              <span>Accéder au Web Player</span>
              <ArrowRight size={15} />
            </button>

            <button
              id="btn-bottom-guest-mode"
              onClick={onEnterAsGuest}
              className="w-full sm:w-auto px-7 py-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold uppercase tracking-wider text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:border-[#c29e5a]/40 active:scale-95"
            >
              <ShieldCheck size={16} className="text-[#c29e5a]" />
              <span>Tester en Démo / Invité</span>
            </button>
          </div>
        </section>

      </main>

      {/* 8. FOOTER AUDIOPHILE */}
      <footer className="relative w-full py-8 border-t border-white/10 text-center text-xs text-gray-500 font-mono tracking-widest z-20 shrink-0 bg-[#0a0908]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c29e5a]" />
            <span className="text-gray-400 font-bold uppercase tracking-wider">E-GE VINYL STUDIO</span>
          </div>
          <p className="text-[11px] text-gray-600">
            © {new Date().getFullYear()} • HAUTE-FIDÉLITÉ & ÉCOUTE IMMERSIVE
          </p>
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span>PWA READY</span>
            <span>OFFLINE READY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
