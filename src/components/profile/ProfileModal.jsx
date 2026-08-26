import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Camera, Save, LogOut, Loader2, Globe, Check, Disc, Sparkles, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { PRESET_AVATARS } from '../../constants/avatars';

const ProfileModal = ({ isOpen, onClose }) => {
  const { profile, updateProfile, signOut } = useAuth();
  const { currentTheme } = useTheme();
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
    } else {
      setFormData({
        full_name: 'Invité E-GE',
        username: 'guest',
        avatar_url: PRESET_AVATARS[0].url
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

      // Try local FileReader Data URL first for zero-friction instant preview & local persistence
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        setFormData(prev => ({ ...prev, avatar_url: dataUrl }));
        toast.success('Image importée avec succès !');
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error("Erreur lors de la lecture du fichier.");
        setUploading(false);
      };
      reader.readAsDataURL(file);

    } catch (error) {
      toast.error(error.message || "Erreur d'importation");
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
      toast.success('Profil et Avatar mis à jour !');
      onClose();
    } catch (error) {
      toast.error(error.message || "Erreur de mise à jour");
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
          className="relative w-full max-w-xl border rounded-3xl overflow-hidden shadow-2xl z-10 my-auto"
          style={{ backgroundColor: currentTheme.cardBg, borderColor: `${currentTheme.primary}40` }}
        >
          {/* Top Primary Color Bar */}
          <div className="h-1.5 w-full" style={{ backgroundColor: currentTheme.primary }} />

          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-white/5 to-transparent">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${currentTheme.primary}15`, borderColor: `${currentTheme.primary}30`, color: currentTheme.primary }}
              >
                <Disc className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white uppercase">Sélecteur d'Avatar</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: currentTheme.primary }}>
                  Personnages Mignons Audiophiles
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-6">
            
            {/* Live Preview Card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-4 relative overflow-hidden shadow-inner">
              <div className="relative shrink-0">
                <div 
                  className="w-20 h-20 rounded-full overflow-hidden border-2 shadow-xl relative group"
                  style={{ borderColor: currentTheme.primary, boxShadow: `0 0 20px ${currentTheme.glow}` }}
                >
                  <img 
                    src={currentAvatar} 
                    alt="Avatar Preview" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = PRESET_AVATARS[0].fallback;
                    }}
                  />
                </div>
                <div 
                  className="absolute -bottom-1 -right-1 p-1 rounded-full shadow-md text-black"
                  style={{ backgroundColor: currentTheme.primary }}
                >
                  <Sparkles size={12} />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white truncate">
                    {formData.full_name || 'Membre Audiophile'}
                  </span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border shrink-0"
                    style={{ backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary, borderColor: `${currentTheme.primary}40` }}
                  >
                    Membre Audiophile
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-400 truncate">
                  {formData.username ? `@${formData.username.replace('@', '')}` : '@audiophile'}
                </p>
                <p className="text-[10px] text-gray-400 italic">
                  Avatar actif sur Header, Sidebar et votre profil.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Preset Avatars Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                    <User size={14} />
                    <span>Collection d'Avatars Illustrés</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">5 Personnages</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_AVATARS.map((avatar) => {
                    const isSelected = formData.avatar_url === avatar.url || formData.avatar_url === avatar.fallback;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => handleSelectPreset(avatar.url)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left cursor-pointer relative overflow-hidden ${
                          isSelected 
                            ? 'bg-white/10 ring-2 scale-[1.02] shadow-xl' 
                            : 'bg-black/30 border-white/10 hover:border-white/30 hover:bg-white/5'
                        }`}
                        style={{
                          borderColor: isSelected ? currentTheme.primary : undefined,
                          ringColor: isSelected ? currentTheme.primary : undefined
                        }}
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-black/50 relative">
                          <img 
                            src={avatar.url} 
                            alt={avatar.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = avatar.fallback;
                            }}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full text-black flex items-center justify-center shadow-md" style={{ backgroundColor: currentTheme.primary }}>
                                <Check size={14} strokeWidth={3} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-extrabold text-white truncate">{avatar.name}</h4>
                            <span 
                              className="text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0"
                              style={{ backgroundColor: `${currentTheme.primary}15`, color: currentTheme.primary }}
                            >
                              {avatar.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{avatar.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Import Own Photo Option */}
                <div className="pt-2">
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 shrink-0">
                        <Upload size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase">Importer sa propre photo</h4>
                        <p className="text-[10px] text-gray-400">Téléversez un fichier image (JPG, PNG, WebP)</p>
                      </div>
                    </div>

                    <label 
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-105 active:scale-95 shrink-0"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      <Camera size={14} />
                      <span>{uploading ? "Chargement..." : "Parcourir..."}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                    </label>
                  </div>

                  {/* Toggle Custom URL */}
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setShowCustomUrl(!showCustomUrl)}
                      className="text-[10px] font-bold hover:underline transition-colors inline-flex items-center gap-1 cursor-pointer"
                      style={{ color: currentTheme.primary }}
                    >
                      <Globe size={11} />
                      <span>{showCustomUrl ? "Masquer URL personnalisée" : "Entrer une URL d'image"}</span>
                    </button>

                    {showCustomUrl && (
                      <div className="mt-2">
                        <input
                          type="text"
                          name="avatar_url"
                          value={formData.avatar_url}
                          onChange={handleChange}
                          placeholder="https://domaine.com/mon-avatar.jpg"
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 focus:border-white/30 text-white outline-none transition-all text-xs font-medium"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Identity Fields */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Informations d'identité</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                      Nom complet / Pseudo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="Ex: Alexander Vinyl"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none transition-all text-xs font-medium focus:border-white/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                      Identifiant (@handle)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">@</span>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Ex: alex_audiophile"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none transition-all text-xs font-medium focus:border-white/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="w-full sm:flex-1 py-3 text-black font-black uppercase tracking-wider text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  style={{ backgroundColor: currentTheme.primary }}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Appliquer & Enregistrer</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full sm:w-auto px-4 py-3 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <LogOut size={15} />
                  <span>Déconnexion</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProfileModal;
