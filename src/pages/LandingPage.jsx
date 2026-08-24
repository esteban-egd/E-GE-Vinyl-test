import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Monitor, Smartphone, Mail, Lock, User, LogIn, Download, ChevronRight, X } from 'lucide-react';

// Vinyl Record Component
const VinylRecord = () => (
  <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
    {/* Background Shadow */}
    <div className="absolute inset-0 bg-black/40 rounded-full blur-2xl transform translate-y-4" />
    
    {/* The Record */}
    <motion.div 
      className="relative w-full h-full bg-[#1a1a1a] rounded-full border-4 border-[#2a2a2a] flex items-center justify-center overflow-hidden shadow-2xl"
      animate={{ rotate: 360 }}
      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
    >
      {/* Grooves */}
      <div className="absolute inset-2 border border-white/5 rounded-full" />
      <div className="absolute inset-4 border border-white/5 rounded-full" />
      <div className="absolute inset-8 border border-white/5 rounded-full" />
      <div className="absolute inset-12 border border-white/5 rounded-full" />
      <div className="absolute inset-16 border border-white/5 rounded-full" />
      <div className="absolute inset-20 border border-white/5 rounded-full" />
      
      {/* Center Label */}
      <div className="w-24 h-24 md:w-32 md:h-32 bg-[#c29e5a] rounded-full flex items-center justify-center border-4 border-[#a38345] shadow-inner">
        <div className="w-4 h-4 md:w-6 md:h-6 bg-[#0d0c0b] rounded-full" />
        <span className="absolute text-[8px] md:text-[10px] font-bold text-[#0d0c0b] mt-10 md:mt-14 tracking-widest uppercase">E-GE VINYL</span>
      </div>
    </motion.div>
    
    {/* Tonearm (Visual only, static) */}
    <div className="absolute -right-4 -top-4 w-12 h-32 md:w-16 md:h-40 pointer-events-none opacity-80">
      <div className="absolute right-6 top-0 w-2 h-2 bg-[#444] rounded-full border border-[#666]" />
      <div className="absolute right-6 top-1 w-1 h-24 md:h-32 bg-gradient-to-b from-[#666] to-[#444] origin-top rotate-[15deg]" />
      <div className="absolute right-12 top-24 md:top-32 w-4 h-6 bg-[#222] rounded-sm rotate-[15deg]" />
    </div>
  </div>
);

const LandingPage = () => {
  const { signIn, signUp } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Bon retour ! Connexion réussie.");
        setShowAuthModal(false);
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast.success("Bienvenue ! Vérifiez votre boîte mail pour confirmer l'inscription.");
        setIsLogin(true);
      }
    } catch (error) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0c0b] text-[#e6dfd5] font-sans selection:bg-[#c29e5a] selection:text-[#0d0c0b]">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: `radial-gradient(#c29e5a 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] uppercase bg-[#c29e5a]/10 border border-[#c29e5a]/20 text-[#c29e5a] rounded-full">
            Nouvelle Expérience Audio
          </span>
          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tight">
            E-GE Vinyl <span className="text-[#c29e5a]">—</span> <br className="hidden md:block" />
            L'Âme du Vinyle, <br className="hidden md:block" />
            La Force du Numérique.
          </h1>
          <p className="text-lg md:text-xl text-[#e6dfd5]/60 max-w-2xl mx-auto leading-relaxed">
            Un lecteur audio hybride qui fusionne la nostalgie visuelle du disque microsillon 
            avec la puissance de votre bibliothèque numérique.
          </p>
        </motion.div>

        {/* Visual & CTAs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full max-w-6xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="order-2 lg:order-1"
          >
            <VinylRecord />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col gap-10 order-1 lg:order-2"
          >
            {/* Main CTA */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-l-4 border-[#c29e5a] pl-4">Commencez l'aventure</h2>
              <button
                onClick={() => setShowAuthModal(true)}
                className="group relative w-full md:w-fit px-8 py-4 bg-[#c29e5a] text-[#0d0c0b] font-bold rounded-xl overflow-hidden shadow-[0_0_20px_rgba(194,158,90,0.3)] hover:shadow-[0_0_30px_rgba(194,158,90,0.5)] transition-all flex items-center justify-center gap-3"
              >
                <LogIn className="w-5 h-5" />
                <span>Se connecter / S'inscrire</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Download Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-l-4 border-[#c29e5a] pl-4">Télécharger l'application</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative group p-4 rounded-2xl bg-[#120f0a] border border-[#3b2d1c] opacity-60">
                  <div className="flex items-center gap-3 mb-2">
                    <Monitor className="w-6 h-6 text-[#c29e5a]" />
                    <span className="font-bold">Windows (PC)</span>
                  </div>
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase bg-[#3b2d1c] text-[#e6dfd5]/40 rounded-md">
                    Bientôt disponible
                  </span>
                </div>
                <div className="relative group p-4 rounded-2xl bg-[#120f0a] border border-[#3b2d1c] opacity-60">
                  <div className="flex items-center gap-3 mb-2">
                    <Smartphone className="w-6 h-6 text-[#c29e5a]" />
                    <span className="font-bold">Android (APK)</span>
                  </div>
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase bg-[#3b2d1c] text-[#e6dfd5]/40 rounded-md">
                    Bientôt disponible
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-[#3b2d1c] bg-[#120f0a]/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#c29e5a] rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#0d0c0b] rounded-full" />
            </div>
            <span className="font-black text-xl tracking-tighter">E-GE VINYL</span>
          </div>
          <p className="text-sm text-[#e6dfd5]/40">
            © {new Date().getFullYear()} E-GE Vinyl. Tous droits réservés.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md p-8 rounded-3xl bg-[#120f0a] border border-[#3b2d1c] shadow-2xl"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute right-6 top-6 p-2 rounded-full hover:bg-[#3b2d1c] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">
                  {isLogin ? "Bon retour parmi nous" : "Créer un compte"}
                </h3>
                <p className="text-[#e6dfd5]/60 text-sm">
                  {isLogin 
                    ? "Connectez-vous pour retrouver votre bibliothèque." 
                    : "Rejoignez l'expérience E-GE Vinyl dès aujourd'hui."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c29e5a]" />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] focus:outline-none focus:border-[#c29e5a] transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {!isLogin && (
                   <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c29e5a]" />
                    <input
                      type="text"
                      placeholder="Nom d'utilisateur"
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] focus:outline-none focus:border-[#c29e5a] transition-colors"
                    />
                  </div>
                )}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c29e5a]" />
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] focus:outline-none focus:border-[#c29e5a] transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-4 bg-[#c29e5a] text-[#0d0c0b] font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#0d0c0b]/30 border-t-[#0d0c0b] rounded-full animate-spin" />
                  ) : (
                    <span>{isLogin ? "Se connecter" : "S'inscrire"}</span>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-[#3b2d1c] text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-[#e6dfd5]/60 hover:text-[#c29e5a] transition-colors"
                >
                  {isLogin ? "Pas encore de compte ? Rejoignez-nous" : "Déjà membre ? Connectez-vous"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
