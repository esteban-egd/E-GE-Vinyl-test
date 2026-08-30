import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Music, Check, UserCheck, Sparkles } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useTheme } from '../../context/ThemeContext';
import TrackImage from '../common/TrackImage';

const PRESET_MESSAGES = [
  "Écoute ça !",
  "Un pur chef-d'œuvre vinyle 🎵",
  "Gros coup de cœur du moment ! ✨",
  "Rappelle-toi de ce classique 📻",
  "À écouter au casque d'urgence ! 🎧"
];

export default function ShareTrackModal() {
  const { friends, shareModalState, closeShareModal, shareTrackWithFriend } = useSocial();
  const { currentTheme } = useTheme();

  const { isOpen, track } = shareModalState;
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [customMessage, setCustomMessage] = useState(PRESET_MESSAGES[0]);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen || !track) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!selectedFriendId && friends.length > 0) {
      shareTrackWithFriend(friends[0].id, track, customMessage);
    } else if (selectedFriendId) {
      shareTrackWithFriend(selectedFriendId, track, customMessage);
    } else {
      return;
    }
    
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      closeShareModal();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative p-6 space-y-5"
          style={{ backgroundColor: currentTheme?.cardBg || '#181410' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-black font-bold shadow-md"
                style={{ backgroundColor: currentTheme?.primary || '#1ED760' }}
              >
                <Send size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Partager le morceau
                </h3>
                <p className="text-[10px] text-gray-400">Recommander cette pépite à un ami</p>
              </div>
            </div>

            <button
              onClick={closeShareModal}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Track Preview Card */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/5">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-white/10">
              {track.thumbnail ? (
                <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <Music size={20} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-white truncate">{track.title}</h4>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">{track.artist}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSend} className="space-y-4">
            {/* Pick Friend */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                Choisir un destinataire
              </label>

              {friends.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center">
                  Aucun ami ajouté pour l'instant. Ajoutez des amis depuis votre profil !
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {friends.map((friend) => {
                    const isSelected = (selectedFriendId === friend.id) || (!selectedFriendId && friends[0].id === friend.id);
                    return (
                      <div
                        key={friend.id}
                        onClick={() => setSelectedFriendId(friend.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-white/15 border-white/30 text-white shadow-sm' 
                            : 'bg-black/30 border-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                        }`}
                      >
                        <img
                          src={friend.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={friend.full_name}
                          className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'; }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate leading-tight">{friend.full_name || friend.username}</p>
                          <p className="text-[9px] text-gray-500 truncate">@{friend.username}</p>
                        </div>
                        {isSelected && (
                          <Check size={14} style={{ color: currentTheme?.primary || '#1ED760' }} className="shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Presets & Custom Micro-message */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                Micro-message
              </label>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_MESSAGES.map((msg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomMessage(msg)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                      customMessage === msg 
                        ? 'bg-white/15 text-white border-white/30' 
                        : 'bg-black/30 text-gray-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {msg}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Message personnalisé (ex: Écoute cette intro !)..."
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-white/30 font-medium"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={friends.length === 0 || isSent}
              className="w-full py-3 rounded-xl font-black text-black uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: currentTheme?.primary || '#1ED760' }}
            >
              {isSent ? (
                <>
                  <Check size={16} />
                  <span>Envoyé avec succès !</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Envoyer à l'ami</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
