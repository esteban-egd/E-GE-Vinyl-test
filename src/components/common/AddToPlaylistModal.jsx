import { useState } from 'react';
import { usePlaylists } from '../../hooks/usePlaylists';
import { X, Plus, ListMusic, Check, Sparkles, Lock } from 'lucide-react';
import TrackImage from './TrackImage';
import { useAuth } from '../../context/AuthContext';

export default function AddToPlaylistModal({ track, isOpen, onClose }) {
  const { user, signOut } = useAuth();
  const { playlists, createPlaylist, addTrackToPlaylist } = usePlaylists();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addedMap, setAddedMap] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  if (!isOpen || !track) return null;

  if (user?.is_guest) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md fade-in">
        <div 
          className="w-full max-w-sm bg-[#161616] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
            <Lock size={28} />
          </div>
          <h3 className="text-lg font-bold mb-2">Playlists Privées</h3>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Le mode Invité est restreint. Créez un compte ou connectez-vous pour concevoir vos propres playlists personnalisées et y ajouter des titres.
          </p>
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => {
                onClose();
                signOut();
              }}
              className="w-full py-2.5 bg-amber-500 text-black font-black uppercase tracking-wider text-xs rounded-xl hover:bg-amber-400 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-amber-500/10"
            >
              Se connecter / S'inscrire
            </button>
            <button 
              onClick={onClose}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleAddToPlaylist = async (playlist) => {
    await addTrackToPlaylist(playlist.id, track);
    setAddedMap(prev => ({ ...prev, [playlist.id]: true }));
    showToast(`Ajouté à "${playlist.name}"`);
  };

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const name = newPlaylistName.trim();
    // Crée la playlist avec l'image du morceau courant comme couverture par défaut
    const newId = await createPlaylist(name, track.thumbnail);
    if (newId) {
      await addTrackToPlaylist(newId, track);
      setAddedMap(prev => ({ ...prev, [newId]: true }));
      setNewPlaylistName('');
      setShowCreateForm(false);
      showToast(`Playlist "${name}" créée et morceau ajouté !`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md fade-in">
      <div 
        className="w-full max-w-md bg-[#161616] border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col gap-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Notification Notification */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-black px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-bounce">
            <Check size={14} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ListMusic size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold">Ajouter à une playlist</h3>
              <p className="text-xs text-gray-400 truncate max-w-[220px]">{track.title}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected Track Preview */}
        <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5">
          <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
            <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{track.title}</p>
            <p className="text-[11px] text-gray-400 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Content list or empty state */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {playlists.length === 0 && !showCreateForm ? (
            <div className="text-center py-6 px-4 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
              <p className="text-xs text-gray-400 mb-3">Vous n'avez pas encore de playlist créée.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 mx-auto"
              >
                <Plus size={16} />
                <span>Créer votre première playlist</span>
              </button>
            </div>
          ) : (
            playlists.map((pl) => {
              const isAdded = addedMap[pl.id];
              return (
                <div 
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#222] overflow-hidden shrink-0 flex items-center justify-center text-gray-500">
                      {pl.cover ? (
                        <img src={pl.cover} alt={pl.name} className="w-full h-full object-cover" />
                      ) : (
                        <ListMusic size={18} />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white truncate">{pl.name}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToPlaylist(pl);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      isAdded 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                        : 'bg-white/10 text-white group-hover:bg-amber-600 group-hover:text-white'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check size={14} />
                        <span>Ajouté</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Ajouter</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Create new playlist toggle/form */}
        {!showCreateForm && playlists.length > 0 && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-2.5 border border-dashed border-white/20 rounded-xl text-xs font-medium text-amber-400 hover:text-amber-300 hover:border-amber-500/50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={16} />
            <span>Créer une nouvelle playlist</span>
          </button>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateAndAdd} className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              <Sparkles size={12} /> Nom de la nouvelle playlist
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Ex: Mes Tops Rap, Chill 80s..."
                className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Créer & Ajouter
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
