import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Mail, Lock, User, LogIn, Check, Sparkles, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { PRESET_AVATARS } from '../constants/avatars';
import VinylDisc from '../components/player/VinylDisc';
import Tonearm from '../components/player/Tonearm';
import ConstellationBackground from '../components/common/ConstellationBackground';

// Simplified and Elegant Floating Platter Header
const ClassyPlatter = () => (
  <div className="relative w-28 h-28 mx-auto mb-3 flex items-center justify-center overflow-visible z-20 shrink-0 select-none">
    {/* Soft Gold Aura */}
    <div className="absolute -inset-4 rounded-full bg-radial from-[#c29e5a]/8 via-transparent to-transparent blur-xl pointer-events-none" />

    {/* Elegant Micro Outer Ring */}
    <div className="absolute inset-[-4px] rounded-full border border-[#c29e5a]/10 pointer-events-none" />

    {/* Center Core Platter */}
    <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-[#0b0a09] via-[#141210] to-[#040404] p-0.5 shadow-[0_12px_24px_rgba(0,0,0,0.85)] border border-white/[0.03] flex items-center justify-center">
      <div className="absolute inset-1 rounded-full overflow-hidden shadow-inner z-10 aspect-square">
        <VinylDisc 
          thumbnail="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=250&h=250&fit=crop" 
          speed={33} 
          rotationAngle={0}
          isDragging={false}
        />
      </div>
    </div>
    
    {/* Elegant Gold Tonearm */}
    <div className="absolute top-[-10%] right-[-14%] w-[45%] h-[115%] z-[1000] pointer-events-none overflow-visible filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)]">
      <Tonearm />
    </div>
  </div>
);

const LandingPage = ({ onBackToPresentation, onLoginSuccess }) => {
  const { signIn, quickSignIn, signUp, signInAsGuest, updateProfile, savedAccounts, removeSavedAccount } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  // Registration Form Steps: 1 = Credentials, 2 = Profile details
  const [registerStep, setRegisterStep] = useState(1);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].url);
  const [loading, setLoading] = useState(false);

  // When switching tabs, reset the step
  useEffect(() => {
    setRegisterStep(1);
  }, [isLogin]);

  const handleQuickLogin = (acc) => {
    if (acc?.email) {
      setEmail(acc.email);
      setIsLogin(true);
      toast.success(`Compte sélectionné : ${acc.email}. Veuillez entrer votre mot de passe.`);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir l'email et le mot de passe.");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    setRegisterStep(2);
  };

  const handlePrevStep = () => {
    setRegisterStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) {
          throw error;
        }
        toast.success("Heureux de vous revoir sur E-GE Vinyl !");
        if (onLoginSuccess) onLoginSuccess();
      } else {
        const finalFullName = (fullName && fullName.trim()) ? fullName.trim() : ((username && username.trim()) ? username.trim() : email.split('@')[0]);
        const finalUsername = (username && username.trim()) ? username.trim().replace('@', '') : email.split('@')[0];
        const finalAvatar = selectedAvatar || PRESET_AVATARS[0].url;

        const { data, error } = await signUp(email, password, {
          full_name: finalFullName,
          displayName: finalFullName,
          username: finalUsername,
          avatar_url: finalAvatar
        });

        if (error) {
          throw error;
        }

        if (data?.user) {
          try {
            await updateProfile({
              full_name: finalFullName,
              username: finalUsername,
              avatar_url: finalAvatar
            });
          } catch (_) {}
        }

        toast.success("Votre compte a été configuré avec succès ! Bienvenue.");
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (error) {
      toast.error(error.message || "Impossible de se connecter. Vérifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    signInAsGuest();
    toast.success("Bienvenue ! Entrée en mode Invité.");
    if (onLoginSuccess) onLoginSuccess();
  };

  return (
    <div className="h-dvh w-full text-[#f4efe6] font-sans flex items-center justify-center p-4 relative overflow-hidden selection:bg-[#c29e5a] selection:text-[#0d0c0b]">
      {/* Dynamic Portfolio Constellation Background */}
      <ConstellationBackground />

      {/* Classy & Ultra-Clean Glassmorphic Card (Zero Scrollable Guarantee) */}
      <div className="relative w-full max-w-[390px] p-5 sm:p-6 rounded-[26px] bg-[#0c0a09]/85 border border-white/[0.06] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-10 flex flex-col my-auto overflow-hidden">
        
        {onBackToPresentation && (
          <button
            onClick={onBackToPresentation}
            className="absolute top-4 left-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer z-50"
            title="Retour à la vitrine"
          >
            <ArrowLeft size={14} />
          </button>
        )}

        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[1.5px] bg-gradient-to-r from-transparent via-[#c29e5a]/40 to-transparent" />

        {/* Floating Platter */}
        <ClassyPlatter />

        {/* Brand Title */}
        <div className="text-center mb-3 shrink-0">
          <h2 className="text-xl font-black tracking-tight text-white uppercase bg-gradient-to-r from-white via-[#fcfbf9] to-[#c29e5a] bg-clip-text text-transparent">
            E-GE VINYL
          </h2>
          <p className="text-[#f4efe6]/50 text-[10px] mt-0.5 font-medium leading-relaxed max-w-[280px] mx-auto">
            {isLogin 
              ? "Accédez à votre bibliothèque et vos playlists." 
              : registerStep === 1 
                ? "Étape 1 : Créez vos identifiants sécurisés."
                : "Étape 2 : Personnalisez votre profil d'écoute."}
          </p>
        </div>

        {/* Saved Accounts Quick Switcher (If available and on Login Tab) */}
        {isLogin && savedAccounts && savedAccounts.length > 0 && (
          <div className="mb-3.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] shrink-0">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[9px] font-bold text-[#c29e5a] uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={10} />
                <span>Comptes récents</span>
              </span>
              <span className="text-[8px] text-gray-500 font-mono">1-clic pour entrer</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {savedAccounts.slice(0, 3).map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center gap-2 p-1.5 rounded-lg bg-black/40 hover:bg-[#c29e5a]/10 border border-white/5 hover:border-[#c29e5a]/30 transition-all cursor-pointer group flex-1 min-w-[100px] max-w-[160px]"
                  onClick={() => handleQuickLogin(acc)}
                  title={`Se connecter en tant que ${acc.full_name || acc.username}`}
                >
                  <img
                    src={acc.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'}
                    alt={acc.username}
                    className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-white truncate leading-tight group-hover:text-[#c29e5a]">
                      {acc.full_name || acc.username}
                    </p>
                    <p className="text-[8px] text-gray-400 font-mono truncate">
                      @{acc.username || acc.email?.split('@')[0]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSavedAccount(acc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-gray-500 transition-opacity"
                    title="Supprimer de la liste"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Minimal Tab Switcher (Visible only if not in step 2 of registration) */}
        {(!isLogin && registerStep === 2) ? (
          <button
            type="button"
            onClick={handlePrevStep}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#c29e5a] font-bold uppercase tracking-wider mb-3 shrink-0 transition-colors cursor-pointer mr-auto"
          >
            <ArrowLeft size={12} />
            <span>Retour à l'étape 1</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/[0.03] rounded-xl mb-3.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                isLogin 
                  ? 'bg-[#c29e5a] text-[#0d0c0b] shadow-md font-black' 
                  : 'text-gray-400 hover:text-[#f4efe6]'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                !isLogin 
                  ? 'bg-[#c29e5a] text-[#0d0c0b] shadow-md font-black' 
                  : 'text-gray-400 hover:text-[#f4efe6]'
              }`}
            >
              S'inscrire
            </button>
          </div>
        )}

        {/* Form Fields - Fixed Layout, No Scroll */}
        <div className="w-full">
          {isLogin ? (
            /* --- LOGIN FORM (2 fields, zero-scroll) --- */
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Adresse Email</span>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-[#c29e5a] transition-colors" />
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-black/40 border border-white/[0.05] text-white placeholder-gray-600 focus:outline-none focus:border-[#c29e5a] transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Mot de passe</span>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-[#c29e5a] transition-colors" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-black/40 border border-white/[0.05] text-white placeholder-gray-600 focus:outline-none focus:border-[#c29e5a] transition-all font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-[#e1bb72] to-[#c29e5a] text-[#0d0c0b] font-black uppercase tracking-wider text-xs rounded-xl hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#c29e5a]/10 cursor-pointer mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[#0d0c0b]/35 border-t-[#0d0c0b] rounded-full animate-spin" />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <LogIn size={13} className="stroke-[3]" />
                    <span>Se connecter</span>
                  </div>
                )}
              </button>
            </form>
          ) : (
            /* --- SIGN UP MULTI-STEP WIZARD (No Scroll) --- */
            <div className="w-full">
              {registerStep === 1 ? (
                /* --- SIGN UP STEP 1: Email & Password (2 fields) --- */
                <form onSubmit={handleNextStep} className="space-y-3">
                  <div className="space-y-1">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Adresse Email</span>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-[#c29e5a] transition-colors" />
                      <input
                        type="email"
                        placeholder="votre@email.com"
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-black/40 border border-white/[0.05] text-white placeholder-gray-600 focus:outline-none focus:border-[#c29e5a] transition-all font-medium"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Mot de passe</span>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-[#c29e5a] transition-colors" />
                      <input
                        type="password"
                        placeholder="Min. 6 caractères"
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-black/40 border border-white/[0.05] text-white placeholder-gray-600 focus:outline-none focus:border-[#c29e5a] transition-all font-medium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] text-gray-500 font-mono">Étape 1/2</span>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-[#e1bb72] to-[#c29e5a] text-[#0d0c0b] font-black uppercase tracking-wider text-[10px] rounded-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-md cursor-pointer font-black"
                    >
                      <span>Continuer</span>
                      <ArrowRight size={12} className="stroke-[3]" />
                    </button>
                  </div>
                </form>
              ) : (
                /* --- SIGN UP STEP 2: Profile Selection & Identity --- */
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Avatar Picker (compact layout) */}
                  <div className="bg-black/30 p-2 rounded-xl border border-white/[0.02]">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <span className="text-[8px] font-bold text-[#c29e5a] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={8} />
                        <span>Sélectionnez votre avatar</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-1.5">
                      {PRESET_AVATARS.slice(0, 5).map((avatar) => {
                        const isSelected = selectedAvatar === avatar.url;
                        return (
                          <button
                            key={avatar.id}
                            type="button"
                            onClick={() => setSelectedAvatar(avatar.url)}
                            className={`relative rounded-full overflow-hidden aspect-square border transition-all duration-200 cursor-pointer ${
                              isSelected 
                                ? 'border-[#c29e5a] scale-105 shadow-md shadow-[#c29e5a]/15' 
                                : 'border-white/5 opacity-60 hover:opacity-100 hover:border-[#c29e5a]/20'
                            }`}
                          >
                            <img 
                              src={avatar.url} 
                              alt={avatar.name} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = avatar.fallback || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + avatar.id;
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#c29e5a]/10 flex items-center justify-center">
                                <div className="w-4 h-4 rounded-full bg-[#c29e5a] text-[#0d0c0b] flex items-center justify-center shadow-sm">
                                  <Check className="w-2.5 h-2.5 stroke-[4]" />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nom complet / Affichage */}
                  <div className="space-y-1">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Nom d'affichage</span>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-[#c29e5a] transition-colors" />
                      <input
                        type="text"
                        placeholder="Alexandre Martin"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-black/40 border border-white/[0.05] text-white placeholder-gray-600 focus:outline-none focus:border-[#c29e5a] transition-all font-medium"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Username Field */}
                  <div className="space-y-1">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Nom d'utilisateur (@handle)</span>
                    <div className="relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 group-focus-within:text-[#c29e5a] transition-colors">@</span>
                      <input
                        type="text"
                        placeholder="alex_m"
                        required
                        className="w-full pl-7 pr-3 py-2 text-xs rounded-lg bg-black/40 border border-white/[0.05] text-white placeholder-gray-600 focus:outline-none focus:border-[#c29e5a] transition-all font-medium"
                        value={username}
                        onChange={(e) => {
                          const val = e.target.value.replace('@', '');
                          setUsername(val);
                          if (!fullName) setFullName(val);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] text-gray-500 font-mono">Étape 2/2</span>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#e1bb72] to-[#c29e5a] text-[#0d0c0b] font-black uppercase tracking-wider text-[10px] rounded-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-md cursor-pointer font-black"
                    >
                      {loading ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#0d0c0b]/35 border-t-[#0d0c0b] rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Créer mon compte</span>
                          <Check size={12} className="stroke-[3]" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Clean Guest Option */}
        <div className="mt-3.5 pt-2.5 border-t border-white/[0.04] flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full py-1.5 px-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-gray-300 hover:text-white text-[9.5px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#c29e5a]" />
            <span>Tester en Mode Invité / Démo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
