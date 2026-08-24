import { useState, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { Search, Loader2, Play, Plus, Check } from 'lucide-react';
import { usePlaylists } from '../hooks/usePlaylists';

export default function SearchPage() {
  const { search, play, currentTrack } = useAudio();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  
  const searchTimeoutRef = useRef(null);

  // For adding to playlist flow
  const { playlists, addTrackToPlaylist } = usePlaylists();
  const [showPlaylistModal, setShowPlaylistModal] = useState(null); // track to add

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    setError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await search(query);
        setResults(data);
      } catch (err) {
        setError('Erreur lors de la recherche');
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(searchTimeoutRef.current);
  }, [query, search]);

  const handlePlay = (track) => {
    if (currentTrack?.videoId !== track.videoId) {
      play(track);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8 max-w-4xl mx-auto w-full fade-in">
      <div className="sticky top-0 z-20 pt-4 pb-4 bg-[#000000]">
        <h1 className="text-2xl font-bold text-white mb-4 text-equinox tracking-widest">RECHERCHE</h1>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un titre, un artiste..."
            className="w-full bg-[#111111] border border-[#2a2a2a] text-white rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
          {isSearching && (
             <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 animate-spin" size={20} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-4 pb-20">
        {error && <p className="text-red-400 text-center py-8">{error}</p>}
        
        {!query.trim() && !isSearching && (
          <div className="text-center py-20 text-gray-500">
            <Search className="mx-auto mb-4 opacity-50" size={48} />
            <p>Commencez à taper pour rechercher de la musique.</p>
          </div>
        )}

        <div className="space-y-2">
          {results.map((track) => {
            const isPlaying = currentTrack?.videoId === track.videoId;
            return (
              <div 
                key={track.videoId}
                className={`flex items-center gap-4 p-2 rounded-xl transition-colors group hover:bg-white/5 ${isPlaying ? 'bg-white/10' : ''}`}
              >
                {/* Thumbnail / Play Button */}
                <div 
                  className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                  onClick={() => handlePlay(track)}
                >
                  <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isPlaying ? (
                      <div className="w-4 h-4 rounded-full bg-purple-500 animate-pulse neon-purple" />
                    ) : (
                      <Play size={24} className="text-white fill-white" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handlePlay(track)}
                >
                  <p className={`font-semibold truncate ${isPlaying ? 'text-purple-400' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-sm text-gray-400 truncate flex items-center gap-2">
                    {track.artist} • {formatDuration(track.duration)}
                  </p>
                </div>

                {/* Actions */}
                <button 
                  onClick={() => setShowPlaylistModal(track)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Ajouter à une playlist"
                >
                  <Plus size={20} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={() => setShowPlaylistModal(null)}>
          <div className="glass-strong p-6 rounded-2xl w-full max-w-sm border border-[#2a2a2a]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Ajouter à...</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {playlists.length === 0 ? (
                <p className="text-gray-400 text-center py-4 text-sm">Aucune playlist. Créez-en une dans la bibliothèque.</p>
              ) : (
                playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      addTrackToPlaylist(pl.id, showPlaylistModal);
                      setShowPlaylistModal(null);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-white/10 text-white flex justify-between items-center transition-colors"
                  >
                    <span>{pl.name}</span>
                    <Plus size={16} className="text-gray-400" />
                  </button>
                ))
              )}
            </div>
            <button 
              onClick={() => setShowPlaylistModal(null)}
              className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
