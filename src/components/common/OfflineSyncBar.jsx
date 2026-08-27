import { motion, AnimatePresence } from 'motion/react';
import { useOffline } from '../../hooks/useOffline';
import { Download, Check, ArrowDown } from 'lucide-react';

export default function OfflineSyncBar() {
  const { syncState } = useOffline();

  if (!syncState || !syncState.isSyncing || syncState.total === 0) return null;

  const percentage = Math.min(100, Math.max(0, syncState.percentage || Math.round((syncState.current / syncState.total) * 100)));
  const isComplete = syncState.current >= syncState.total && percentage >= 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="fixed bottom-24 left-4 right-4 md:bottom-28 md:right-8 md:left-auto md:w-[380px] p-4 rounded-2xl bg-[#0c0a09]/95 border border-emerald-500/30 shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-[999] flex flex-col gap-3 select-none"
      >
        {/* Soft Emerald Ambient Glow */}
        <div className="absolute -inset-2 rounded-2xl bg-emerald-500/5 blur-xl pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isComplete ? 'bg-emerald-500 text-black' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            }`}>
              {isComplete ? (
                <Check size={16} strokeWidth={3} />
              ) : (
                <Download size={14} className="animate-bounce" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <span>Stockage Hors-Ligne</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {syncState.current}/{syncState.total} ({percentage}%)
                </span>
              </p>
              <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                {syncState.currentTitle || 'Préparation des pistes...'}
              </p>
            </div>
          </div>
          
          <div className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            {percentage}%
          </div>
        </div>

        {/* Real-time Progress Bar */}
        <div className="relative w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/[0.05]">
          <motion.div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ ease: "easeOut", duration: 0.2 }}
          />
        </div>

        {/* Status caption */}
        <div className="flex items-center justify-between text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
          <span className="flex items-center gap-1 text-emerald-400/80">
            <ArrowDown size={10} /> Mode Avion prêt
          </span>
          <span>Disponible 100% sans connexion</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
