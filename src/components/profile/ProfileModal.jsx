import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Camera, Save, LogOut, Loader2, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpload = async (e) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Vous devez sélectionner une image pour la télécharger.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Image téléchargée avec succès !');
    } catch (error) {
      toast.error(error.message);
    } finally {
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-[#120f0a] border border-[#3b2d1c] rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-[#3b2d1c] flex items-center justify-between bg-gradient-to-r from-[#c29e5a]/10 to-transparent">
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Mon Profil</h2>
              <p className="text-[#8a7250] text-xs font-bold uppercase tracking-widest mt-1">E-GE Vinyl Studio</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/5 text-[#8a7250] hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto max-h-[70vh]">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-[#0d0c0b] border-4 border-[#3b2d1c] group-hover:border-[#c29e5a] transition-colors shadow-2xl">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#3b2d1c]">
                        <User size={64} />
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#c29e5a] animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-1 right-1 p-2.5 bg-[#c29e5a] text-[#0d0c0b] rounded-full cursor-pointer shadow-xl hover:scale-110 transition-transform">
                    <Camera size={18} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>
                <div className="w-full">
                  <label className="block text-xs font-bold text-[#8a7250] uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                    <Globe size={12} />
                    URL de l'image (Optionnel)
                  </label>
                  <input
                    type="text"
                    name="avatar_url"
                    value={formData.avatar_url}
                    onChange={handleChange}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-5 py-3.5 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] focus:border-[#c29e5a] text-white outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#8a7250] uppercase tracking-widest mb-2 px-1">Nom d'affichage</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b2d1c]" size={18} />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Votre nom"
                      className="w-full pl-12 pr-5 py-3.5 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] focus:border-[#c29e5a] text-white outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8a7250] uppercase tracking-widest mb-2 px-1">Nom d'utilisateur (@username)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b2d1c] font-bold">@</span>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="username"
                      className="w-full pl-10 pr-5 py-3.5 rounded-xl bg-[#0d0c0b] border border-[#3b2d1c] focus:border-[#c29e5a] text-white outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8a7250] uppercase tracking-widest mb-2 px-1">Adresse Email (Privé)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b2d1c]" size={18} />
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-12 pr-5 py-3.5 rounded-xl bg-[#0d0c0b]/50 border border-[#3b2d1c] text-[#8a7250] cursor-not-allowed text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="w-full py-4 bg-[#c29e5a] text-[#0d0c0b] font-black uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-[#c29e5a]/10"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  <span>Enregistrer les modifications</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-4 border border-red-500/20 text-red-500 font-black uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-all flex items-center justify-center gap-3"
                >
                  <LogOut size={20} />
                  <span>Se déconnecter</span>
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
