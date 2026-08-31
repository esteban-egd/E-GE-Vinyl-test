
import { useState } from 'react';
import { X, Link as LinkIcon, Download, Loader2, Music } from 'lucide-react';
import { fetchPlaylistMetadata, resolveTracks } from '../../services/playlistImportService';
import { toast } from 'react-hot-toast';
import { usePlaylists } from '../../hooks/usePlaylists';

export default function ImportPlaylistModal({ isOpen, onClose, primaryColor }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'resolving'
  const [progress, setProgress] = useState(0);
  const { createPlaylist, addTrackToPlaylist, fetchPlaylists } = usePlaylists();

  if (!isOpen) return null;

  const handleImport = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      // 1. Fetch metadata
      const metadata = await fetchPlaylistMetadata(url.trim());
      
      setStep('resolving');
      
      // 2. Resolve tracks to YouTube IDs
      const resolvedTracks = (metadata.tracks && metadata.tracks.length > 0) 
        ? await resolveTracks(metadata.tracks, (p) => setProgress(p))
        : [];

      // 3. Create playlist in DB
      const playlistId = await createPlaylist(metadata.title, metadata.cover);
      
      if (!playlistId) {
        throw new Error('Erreur lors de la création de la playlist en base de données.');
      }

      // 4. Add tracks to playlist if any
      if (resolvedTracks.length > 0) {
        for (const track of resolvedTracks) {
          await addTrackToPlaylist(playlistId, track);
        }
      }

      toast.success('Playlist importée avec succès !');
      
      // Force a manual refresh just to be absolutely sure
      if (typeof fetchPlaylists === 'function') {
        await fetchPlaylists();
      }
      
      onClose();
      // Reset state
      setUrl('');
      setStep('input');
      setProgress(0);
    } catch (err) {
      console.error("ERREUR SUPABASE/IMPORT:", err);
      alert("Erreur détaillée : " + err.message);
      toast.error(err.message || "Erreur lors de l'importation");
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#181818] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1DB954]/10 flex items-center justify-center text-[#1DB954]">
              <Download size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Importer une playlist</h3>
              <p className="text-xs text-gray-400">Spotify ou Deezer</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 'input' ? (
            <form onSubmit={handleImport} className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Lien de la playlist</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#1DB954] transition-colors">
                    <LinkIcon size={18} />
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/..."
                    className="w-full bg-black/40 border border-white/10 focus:border-[#1DB954] rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600 shadow-inner"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-gray-500 italic ml-1">
                  * Assurez-vous que la playlist est publique pour permettre l'importation.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="w-full py-4 bg-[#1DB954] hover:bg-[#1ed760] disabled:bg-gray-800 disabled:text-gray-500 text-black font-black rounded-2xl text-sm uppercase tracking-widest transition-all shadow-lg shadow-[#1DB954]/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Lancer l'importation</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4 grayscale opacity-40">
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg" alt="Spotify" className="h-6" />
                <div className="w-px h-4 bg-white/20" />
                <span className="text-white font-black tracking-tighter text-lg">DEEZER</span>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-8 py-4">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-white/5 border-t-[#1DB954] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-[#1DB954]">
                  <Music size={32} />
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-xl font-bold text-white">Conversion en cours...</h4>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                  Nous recherchons les meilleures correspondances audio pour votre playlist.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-[#1DB954] to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(29,185,84,0.5)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-tighter text-gray-500">
                  <span>Traitement des titres</span>
                  <span className="text-[#1DB954]">{progress}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="bg-black/20 p-4 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1.5 uppercase tracking-widest font-bold">
            <Music size={12} /> Service d'importation
          </p>
        </div>
      </div>
    </div>
  );
}
