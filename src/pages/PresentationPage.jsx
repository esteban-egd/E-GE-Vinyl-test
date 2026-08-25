import { motion } from 'motion/react';
import { Download, Play, Music, Radio, Shield, Laptop, Smartphone, ExternalLink } from 'lucide-react';
import ConstellationBackground from '../components/common/ConstellationBackground';

export default function PresentationPage({ onEnterWebPlayer }) {
  // Mock download links (pointing to releases or source downloaders)
  const downloadLinks = {
    windows: 'https://github.com/guillermine/E-GE-Vinyl/releases/latest',
    android: 'https://github.com/guillermine/E-GE-Vinyl/releases/download/v1.0.0/app-release.apk'
  };

  return (
    <div className="min-h-screen w-full text-[#f4efe6] font-sans flex flex-col justify-between relative overflow-y-auto overflow-x-hidden selection:bg-[#c29e5a] selection:text-[#0d0c0b]">
      {/* Interactive Constellation Background */}
      <ConstellationBackground />

      {/* Top Header Branding */}
      <header className="relative w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#c29e5a] flex items-center justify-center shadow-[0_0_15px_rgba(194,158,90,0.35)]">
            <Music size={16} className="text-[#0d0c0b]" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tighter text-white uppercase">E-GE</span>
            <span className="text-lg font-light tracking-widest ml-1 text-gray-500 uppercase">Vinyl</span>
          </div>
        </div>
        
        <button
          onClick={onEnterWebPlayer}
          className="px-4 py-1.5 border border-[#c29e5a]/30 hover:border-[#c29e5a] text-[#c29e5a] text-[10px] uppercase tracking-widest font-black rounded-lg transition-all cursor-pointer"
        >
          Se connecter
        </button>
      </header>

      {/* Main Presentation Body */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-5xl mx-auto w-full z-10 text-center gap-8 md:gap-12">
        
        {/* Pitch Hero Text */}
        <div className="space-y-4 max-w-3xl">
          <span className="text-[#c29e5a] text-[10px] font-black uppercase tracking-[0.3em] bg-[#c29e5a]/5 border border-[#c29e5a]/10 px-3.5 py-1.5 rounded-full inline-block">
            L'Expérience Audiophile Ultime
          </span>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-none">
            La Haute-Fidélité <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-white via-[#fcfbf9] to-[#c29e5a] bg-clip-text text-transparent">
              Dans Son Écrin Digital
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#f4efe6]/65 max-w-2xl mx-auto leading-relaxed font-medium">
            Découvrez une platine numérique haute fidélité dotée d'une simulation de bras de lecture physique, d'un moteur de rendu vinyle 3D fluide, et d'un système de synchronisation hors-ligne sans couture.
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col items-center gap-6 w-full max-w-md shrink-0">
          
          {/* Main Web Access Button */}
          <button
            onClick={onEnterWebPlayer}
            className="w-full py-4 bg-gradient-to-r from-[#e1bb72] to-[#c29e5a] text-[#0d0c0b] font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-[0_15px_30px_rgba(194,158,90,0.2)] cursor-pointer"
          >
            <Play size={15} fill="currentColor" className="stroke-none" />
            <span>Lancer Le Web Player</span>
          </button>

          {/* Native Download Block */}
          <div className="w-full bg-[#0c0a09]/60 border border-white/[0.04] rounded-3xl p-5 backdrop-blur-xl space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Télécharger nos applications Natives
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Windows Application */}
              <a
                href={downloadLinks.windows}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] hover:border-[#c29e5a]/30 transition-all duration-300 flex flex-col items-center justify-center gap-2 group text-center cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#c29e5a] group-hover:bg-[#c29e5a]/10 transition-colors">
                  <Laptop size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white tracking-wide">Pour Windows</p>
                  <span className="text-[8.5px] text-gray-500 font-mono">Format .EXE</span>
                </div>
              </a>

              {/* Android Application */}
              <a
                href={downloadLinks.android}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] hover:border-[#c29e5a]/30 transition-all duration-300 flex flex-col items-center justify-center gap-2 group text-center cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#c29e5a] group-hover:bg-[#c29e5a]/10 transition-colors">
                  <Smartphone size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white tracking-wide">Pour Android</p>
                  <span className="text-[8.5px] text-gray-500 font-mono">Format .APK</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Feature Grid Minimal Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl text-left">
          
          <div className="p-5 rounded-2xl bg-[#0c0a09]/30 border border-white/[0.03] flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Radio size={16} className="text-[#c29e5a]" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Platine Tactile</h3>
              <p className="text-[11px] text-[#f4efe6]/50 mt-1 leading-relaxed">
                Interagissez physiquement avec le disque vinyle, ajustez la vitesse, et posez la tête de lecture.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0a09]/30 border border-white/[0.03] flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Download size={16} className="text-[#c29e5a]" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Mode Hors-ligne</h3>
              <p className="text-[11px] text-[#f4efe6]/50 mt-1 leading-relaxed">
                Restaurez et écoutez vos titres préférés n'importe où, même sans réseau, avec synchronisation cloud.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0a09]/30 border border-white/[0.03] flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Shield size={16} className="text-[#c29e5a]" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Écoute Sécurisée</h3>
              <p className="text-[11px] text-[#f4efe6]/50 mt-1 leading-relaxed">
                Vos favoris et vos données de profil sont synchronisés et cryptés de manière sécurisée.
              </p>
            </div>
          </div>

        </div>

      </main>

      {/* Footer copyright */}
      <footer className="relative w-full py-6 text-center text-[10px] text-gray-600 font-mono tracking-widest z-20 shrink-0">
        © {new Date().getFullYear()} E-GE VINYL STUDIO • TOUS DROITS RÉSERVÉS
      </footer>
    </div>
  );
}
