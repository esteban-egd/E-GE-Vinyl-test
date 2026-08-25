import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Camera, Save, LogOut, Loader2, Globe, Check, Disc, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { PRESET_AVATARS } from '../../constants/avatars';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        avatar_url: profile.avatar_url || PRESET_AVATARS[0].url
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectPreset = (url) => {
    setFormData(prev => ({ ...prev, avatar_url: url }));
  };

  const handleUpload = async (e) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Vous devez sélectionner une image.');
      }

      const file = e.target.files[0];

      // Tenter le chargement via Supabase si le stockage est configuré
      let publicUrl = null;
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id || 'guest'}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (!uploadError) {
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          publicUrl = data?.publicUrl;
        }
      } catch (_) {
        // Ignorer l'erreur Supabase storage et utiliser le mode local FileReader
      }

      if (publicUrl) {
        setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        toast.success('Image téléchargée avec succès !');
        setUploading(false);
      } else {
        // Mode local instantané FileReader Data URL (sans erreur de Bucket)
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({ ...prev, avatar_url: event.target.result }));
          toast.success('Image de profil enregistrée avec succès !');
          setUploading(false);
        };
        reader.onerror = () => {
          toast.error("Erreur lors de la lecture de l'image.");
          setUploading(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      toast.error(error.message || "Erreur de téléchargement");
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        full_name: formData.full_name,
        username: formData.username,
        avatar_url: formData.avatar_url
      });
      toast.success('Profil mis à jour !');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      onClose();
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  if (!isOpen) return null;

  const currentAvatar = formData.avatar_url || PRESET_AVATARS[0].url;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#120f0a] border border-[#3b2d1c] rounded-3xl overflow-hidden shadow-2xl z-10 my-auto"
        >
          {/* Top Gold Accent Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-[#c29e5a] to-amber-600" />

          {/* Header */}
          <div className="px-6 py-5 border-b border-[#2d2114] flex items-center justify-between bg-gradient-to-r from-[#c29e5a]/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#c29e5a]/15 border border-[#c29e5a]/30 flex items-center justify-center text-[#c29e5a]">
                <Disc className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white uppercase">Mon Compte</h2>
                <p className="text-[#8a7250] text-[10px] font-bold uppercase tracking-widest">E-GE Vinyl Studio • Édition Profil</p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-3 sm:p-5 overflow-y-auto max-h-[70vh] sm:max-h-[80vh] space-y-4 pb-20 sm:pb-6">
            
            {/* Live Member Card Preview */}
            <div className="p-3 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] flex items-center gap-3 relative overflow-hidden shadow-inner">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#18140f] border-2 border-[#c29e5a] shadow-md">
                  <img 
                    src={currentAvatar} 
                    alt="Avatar Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://api.dicebear.com/7.x/big-ears-neutral/svg?seed=PandaVinyl';
                    }}
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 bg-[#c29e5a] text-[#0d0c0b] p-0.5 rounded-full shadow-md">
                  <Sparkles size={8} className="fill-[#0d0c0b]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-white truncate">
                    {formData.full_name || 'Artiste E-GE'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    {user?.is_guest ? 'Invité' : 'Membre'}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-[#8a7250] truncate mt-0.5">
                  {formData.username ? `@${formData.username}` : '@membre'}
                </p>
              </div>
            </div>

            {user?.is_guest ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#c29e5a]/10 border border-[#c29e5a]/20 flex items-center justify-center text-[#c29e5a]">
                  <Lock size={32} />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">Profil Invité Limité</h3>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  Le mode Invité est restreint. Pour personnaliser votre avatar, modifier votre nom et sauvegarder votre historique, veuillez créer un compte unique.
                </p>
                
                <div className="flex flex-col gap-2.5 w-full pt-4 border-t border-[#2d2114]">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      signOut();
                    }}
                    className="w-full py-2.5 bg-[#c29e5a] text-[#0d0c0b] font-black uppercase tracking-wider text-xs rounded-xl hover:bg-[#d6b068] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#c29e5a]/10 cursor-pointer"
                  >
                    <User size={14} />
                    <span>Créer mon compte / Se connecter</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full py-2 border border-red-500/20 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-[11px] rounded-xl hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Quitter le mode Invité</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Preset Avatars Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-extrabold text-[#c29e5a] uppercase tracking-wider flex items-center gap-1">
                      <User size={12} />
                      <span>Choisir un Avatar (Personnages Mignons)</span>
                    </label>
                    <span className="text-[9px] text-gray-500 font-mono">4 choix</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_AVATARS.map((avatar) => {
                      const isSelected = formData.avatar_url === avatar.url;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => handleSelectPreset(avatar.url)}
                          className={`relative rounded-full overflow-hidden aspect-square border-2 transition-all cursor-pointer group ${
                            isSelected 
                              ? 'border-[#c29e5a] ring-2 ring-[#c29e5a]/40 scale-105 shadow-xl' 
                              : 'border-[#3b2d1c] opacity-75 hover:opacity-100 hover:border-[#8a7250]'
                          }`}
                        >
                          <img 
                            src={avatar.url} 
                            alt={avatar.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = avatar.fallback || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + avatar.id;
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/85 text-[7px] font-bold text-center py-0.5 text-amber-300 truncate px-0.5">
                            {avatar.name}
                          </div>
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#c29e5a]/25 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-[#c29e5a] text-[#0d0c0b] flex items-center justify-center shadow-lg">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Optional Custom Upload / URL toggle */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px]">
                    <button
                      type="button"
                      onClick={() => setShowCustomUrl(!showCustomUrl)}
                      className="text-[#8a7250] hover:text-[#c29e5a] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Globe size={11} />
                      <span>{showCustomUrl ? "Masquer URL" : "+ Lien image ou photo"}</span>
                    </button>

                    <label className="text-[#8a7250] hover:text-[#c29e5a] font-bold transition-colors flex items-center gap-1 cursor-pointer">
                      <Camera size={11} />
                      <span>{uploading ? "Chargement..." : "Téléverser"}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                    </label>
                  </div>

                  {showCustomUrl && (
                    <div className="mt-2">
                      <input
                        type="text"
                        name="avatar_url"
                        value={formData.avatar_url}
                        onChange={handleChange}
                        placeholder="https://example.com/ma-photo.jpg"
                        className="w-full px-3 py-2 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] focus:border-[#c29e5a] text-white outline-none transition-all text-xs font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Editable Fields */}
                <div className="space-y-3 pt-0.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                      Nom d'affichage
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c29e5a]" size={14} />
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="Votre nom"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] focus:border-[#c29e5a] text-white outline-none transition-all text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                      Nom d'utilisateur (@handle)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c29e5a] font-bold text-xs">@</span>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="username"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] focus:border-[#c29e5a] text-white outline-none transition-all text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Save & Logout Actions */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-[#2d2114]">
                  <button
                    type="submit"
                    disabled={loading || uploading}
                    className="w-full py-2.5 bg-[#c29e5a] text-[#0d0c0b] font-black uppercase tracking-wider text-xs rounded-xl hover:bg-[#d6b068] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#c29e5a]/20 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>Enregistrer les modifications</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full py-2 border border-red-500/20 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-[11px] rounded-xl hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProfileModal;
