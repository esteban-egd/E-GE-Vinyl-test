import { motion, AnimatePresence } from 'motion/react';
import { useOffline } from '../../hooks/useOffline';
import { RefreshCw, Disc, ChevronRight } from 'lucide-react';

export default function OfflineSyncBar() {
  const { syncState } = useOffline();

  if (!syncState || !syncState.isSyncing || syncState.total === 0) return null;

  const percentage = Math.min(100, Math.round((syncState.current / syncState.total) * 100));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="fixed bottom-24 left-4 right-4 md:bottom-28 md:right-8 md:left-auto md:w-[360px] p-4 rounded-2xl bg-[#0c0a09]/95 border border-[#c29e5a]/25 shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-[999] flex flex-col gap-3 select-none"
      >
        {/* Soft Golden Accent Background Glow */}
        <div className="absolute -inset-2 rounded-2xl bg-[#c29e5a]/3 blur-xl pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#c29e5a]/10 border border-[#c29e5a]/20 flex items-center justify-center shrink-0">
              <RefreshCw size={14} className="text-[#c29e5a] animate-spin" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <span>Restauration Cloud</span>
                <ChevronRight size={10} className="text-gray-500" />
                <span className="text-[#c29e5a]">{percentage}%</span>
              </p>
              <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                {syncState.currentTitle || 'Téléchargement...'}
              </p>
            </div>
          </div>
          
          <div className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/[0.03]">
            {syncState.current} / {syncState.total}
          </div>
        </div>

        {/* Real-time Progress Bar */}
        <div className="relative w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/[0.02]">
          <motion.div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#e1bb72] to-[#c29e5a] rounded-full shadow-[0_0_8px_rgba(194,158,90,0.4)]"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          />
        </div>

        {/* Subtle detail caption */}
        <p className="text-[9px] text-[#c29e5a]/50 text-right uppercase tracking-wider font-semibold">
          Vos morceaux hors-ligne reviennent automatiquement
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
