import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Sparkles, LogIn, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function GuestRestrictedModal({ 
  isOpen, 
  onClose, 
  title = "Accès Réservé aux Membres", 
  description = "Connectez-vous ou créez un compte pour accéder à votre profil, personnaliser votre identité et gérer vos préférences." 
}) {
  const { signOut } = useAuth();
  const { currentTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'auto';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div 
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)'
      }}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm bg-[#141210] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col items-center text-center text-white my-auto overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow backdrop */}
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentTheme.primary }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>

        {/* Icon Lock */}
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-inner border border-[#c29e5a]/30 relative"
          style={{ 
            backgroundColor: `${currentTheme.primary}18`,
            color: currentTheme.primary,
            boxShadow: `0 0 20px ${currentTheme.glow || `${currentTheme.primary}25`}`
          }}
        >
          <Lock size={30} />
          <div 
            className="absolute -bottom-1 -right-1 p-1 rounded-full bg-neutral-900 border border-white/10"
            style={{ color: currentTheme.primary }}
          >
            <Sparkles size={11} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">
          {title}
        </h2>

        {/* Description */}
        <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed mb-6">
          {description}
        </p>

        {/* Actions */}
        <div className="w-full space-y-2.5">
          <button
            onClick={() => signOut()}
            className="w-full py-3 px-4 text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            style={{ 
              backgroundColor: currentTheme.primary,
              boxShadow: `0 0 16px ${currentTheme.glow || `${currentTheme.primary}40`}`
            }}
          >
            <LogIn size={15} />
            <span>Se connecter / S'inscrire</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Continuer en mode Invité
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
