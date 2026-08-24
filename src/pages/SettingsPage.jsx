import { useState, useEffect } from 'react';
import { useOfflineCache } from '../hooks/useOfflineCache';
import { Database, Trash2, Smartphone, HardDrive, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const { getCacheSize, clearCache } = useOfflineCache();
  const [cacheSize, setCacheSize] = useState("0.00");

  useEffect(() => {
    // Update cache size on mount
    getCacheSize().then(setCacheSize);
  }, [getCacheSize]);

  const handleClearCache = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer tous les morceaux téléchargés ?")) {
      await clearCache();
      setCacheSize("0.00");
    }
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8 max-w-2xl w-full mx-auto fade-in pb-24">
      <h1 className="text-2xl font-bold text-white mb-8 text-equinox tracking-widest pt-4">PARAMÈTRES</h1>
      
      <div className="space-y-8">
        
        {/* Section: Stockage */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <HardDrive className="text-purple-400" size={24} />
            <h2 className="text-lg font-bold text-white">Stockage Hors-ligne</h2>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-medium">Cache Audio (IndexedDB)</p>
              <p className="text-sm text-gray-400">Morceaux téléchargés pour l'écoute sans réseau.</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-cyan-400">{cacheSize}</span>
              <span className="text-sm text-gray-400 ml-1">Mo</span>
            </div>
          </div>
          
          <button 
            onClick={handleClearCache}
            disabled={cacheSize === "0.00"}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-500/20"
          >
            <Trash2 size={18} />
            <span className="font-medium">Vider le cache hors-ligne</span>
          </button>
        </section>
        
        {/* Section: App Info */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Smartphone className="text-cyan-400" size={24} />
            <h2 className="text-lg font-bold text-white">À propos</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
              <span className="text-gray-400">Version</span>
              <span className="text-white font-medium">1.0.0 (PWA)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
              <span className="text-gray-400">Audio Source</span>
              <span className="text-white font-medium flex items-center gap-2">
                <Database size={16} />
                Piped API
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400">Auteur</span>
              <a href="https://eguillermin.vercel.app" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition-colors">
                Esteban Guillermin <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
