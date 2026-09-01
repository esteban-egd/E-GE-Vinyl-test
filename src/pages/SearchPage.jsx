import React, { useState, useMemo } from 'react';
import { useSearch } from '../context/SearchContext';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'motion/react';
import { 
  Search, 
  X, 
  Play, 
  Pause, 
  Disc, 
  User, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Heart, 
  Music2, 
  WifiOff, 
  CheckCircle2, 
  Mic2,
  ChevronRight,
  Flame,
  Globe
} from 'lucide-react';
import { useLikes } from '../hooks/useLikes';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FEATURED_ARTISTS, 
  SPOTIFY_TOP_50_GLOBAL, 
  SPOTIFY_TOP_50_FRANCE, 
  normalizeArtistKey, 
  isArtistMatch, 
  getMainArtistName,
  isJunkArtist,
  searchUnified,
  areArtistsSame,
  mergeArtistData
} from '../services/musicDataService';
import { formatListeners, formatListenersShort, formatPlayCount, parseListenersCount } from '../utils/formatListeners';
import ArtistAvatar from '../components/common/ArtistAvatar';
import TrackImage from '../components/common/TrackImage';
import DownloadBadge from '../components/common/DownloadBadge';
import { SearchSkeleton } from '../components/search/SearchSkeleton';
import PlaylistDetailModal from '../components/common/PlaylistDetailModal';

const GENRES = [
  { id: 'pop', name: 'Pop Hits', color: 'from-[#ec4899] to-[#be185d]', query: 'Pop', icon: Sparkles },
  { id: 'hiphop', name: 'Hip-Hop', color: 'from-[#f97316] to-[#c2410c]', query: 'Hip Hop', icon: Mic2 },
  { id: 'rock', name: 'Rock Anthems', color: 'from-[#ef4444] to-[#b91c1c]', query: 'Rock', icon: Flame },
  { id: 'electro', name: 'Électro & Dance', color: 'from-[#8b5cf6] to-[#6d28d9]', query: 'Electro', icon: Disc },
  { id: 'rap', name: 'Rap Français', color: 'from-[#3b82f6] to-[#1d4ed8]', query: 'Rap Francais', icon: TrendingUp },
  { id: 'ambiance', name: 'Ambiance & Chill', color: 'from-[#10b981] to-[#047857]', query: 'Lofi Chill', icon: Heart },
  { id: 'monde', name: 'Musique du Monde', color: 'from-[#06b6d4] to-[#0891b2]', query: 'World music', icon: Globe },
  { id: 'classique', name: 'Classique & Jazz', color: 'from-[#eab308] to-[#a16207]', query: 'Classique', icon: Music2 }
];

export default function SearchPage() {
  const { 
    query, 
    setQuery, 
    searchImmediately,
    isSearching, 
    isOffline,
    results, 
    activeFilter,
    setActiveFilter,
    audioMode,
    setAudioMode,
    error, 
    suggestions, 
    recentSearches, 
    removeRecentSearch, 
    clearRecentSearches,
    resetSearch 
  } = useSearch();

  const { currentTrack, isCurrentTrack, play, togglePlayPause, isPlaying, isLoading, setQueueAndPlay } = useAudio();
  const { isLiked, toggleLike } = useLikes();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [spotifyRegion, setSpotifyRegion] = useState('global'); // 'global' | 'france'
  const [isGenreLoading, setIsGenreLoading] = useState(false);

  const handleGenreClick = async (genre) => {
    if (isGenreLoading) return;
    setIsGenreLoading(true);
    const toastId = toast.loading(`Recherche des meilleurs titres ${genre.name}...`, {
      style: {
        background: '#121110',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)'
      }
    });

    try {
      const data = await searchUnified(genre.query, audioMode);
      if (data && data.tracks && data.tracks.length > 0) {
        toast.success(`Voici la sélection ${genre.name} !`, { id: toastId });
        setSelectedPlaylist({
          title: genre.name,
          description: `Les titres les plus écoutés du genre ${genre.name}.`,
          cover: data.tracks[0].thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
          era: 'Sélection Spéciale',
          tracks: data.tracks
        });
      } else {
        toast.error(`Aucun titre trouvé pour le genre ${genre.name}`, { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la récupération des titres du genre.", { id: toastId });
    } finally {
      setIsGenreLoading(false);
    }
  };

  // Top 50 Spotify dynamique (si aucune recherche active)
  const spotifyTop50Tracks = useMemo(() => {
    return spotifyRegion === 'france' ? SPOTIFY_TOP_50_FRANCE : SPOTIFY_TOP_50_GLOBAL;
  }, [spotifyRegion]);

  const handlePlay = (track, list = null, idx = -1) => {
    if (isCurrentTrack(track)) {
      togglePlayPause();
    } else {
      if (list && list.length > 0) {
        const foundIdx = idx >= 0 ? idx : list.findIndex(t => (t.id != null && track.id != null && String(t.id) === String(track.id)) || (t.videoId && t.videoId === track.videoId));
        setQueueAndPlay(list, foundIdx >= 0 ? foundIdx : 0);
      } else if (results.tracks && results.tracks.length > 0) {
        const foundIdx = results.tracks.findIndex(t => (t.id != null && track.id != null && String(t.id) === String(track.id)) || (t.videoId && t.videoId === track.videoId));
        setQueueAndPlay(results.tracks, foundIdx >= 0 ? foundIdx : 0);
      } else {
        play(track);
      }
    }
  };

  const handlePlayTracklist = (tracklist, idx) => {
    const track = tracklist[idx];
    if (isCurrentTrack(track)) {
      togglePlayPause();
    } else {
      setQueueAndPlay(tracklist, idx);
    }
  };

  const handlePlayArtist = (e, artistName) => {
    if (e) e.stopPropagation();
    const cleanName = getMainArtistName(artistName);
    const artistTracks = (results.tracks || []).filter(t => 
      isArtistMatch(t.artist, cleanName)
    );
    
    if (artistTracks.length > 0) {
      setQueueAndPlay(artistTracks, 0);
    } else {
      navigate(`/artist/${encodeURIComponent(cleanName)}`);
    }
  };

  // 1. Artistes filtrés et dédoublonnés avec tri par pertinence & popularité
  const artistList = useMemo(() => {
    if (!query.trim()) {
      return FEATURED_ARTISTS;
    }
    return results.artists || [];
  }, [query, results.artists]);

  // 2. Détection du "Top Match" (Meilleur Résultat : Titre ou Artiste selon arbitrage de notoriété)
  const topMatch = useMemo(() => {
    if (!query.trim()) return null;
    if (results.bestMatch) {
      return results.bestMatch;
    }
    if (results.bestArtist) {
      return { type: 'artist', data: results.bestArtist };
    }
    if (results.tracks && results.tracks.length > 0) {
      return { type: 'track', data: results.tracks[0] };
    }
    return null;
  }, [query, results.bestMatch, results.bestArtist, results.tracks]);

  // 3. Titres recommandés à côté du Top Match ("Top Titres")
  const topMatchTracks = useMemo(() => {
    if (!query.trim()) return [];
    if (topMatch?.type === 'artist' && results.bestArtistTracks && results.bestArtistTracks.length > 0) {
      return results.bestArtistTracks.slice(0, 5);
    }
    if (results.tracks && results.tracks.length > 0) {
      return results.tracks.slice(0, 5);
    }
    return [];
  }, [query, topMatch, results.bestArtistTracks, results.tracks]);

  // Morceaux restants pour l'onglet "Tous"
  const remainingTracks = useMemo(() => {
    if (!results.tracks) return [];
    const usedIds = new Set(topMatchTracks.map(t => t.videoId || t.id));
    if (topMatch?.type === 'track' && topMatch.data) {
      usedIds.add(topMatch.data.videoId || topMatch.data.id);
    }
    return results.tracks.filter(t => !usedIds.has(t.videoId || t.id));
  }, [results.tracks, topMatchTracks, topMatch]);

  // Live tracks pour la section dédiée
  const liveTracks = useMemo(() => {
    if (audioMode === 'live' || !results.tracks) return [];
    return results.tracks.filter(t => t.isLive || t.category === 'LIVE');
  }, [results.tracks, audioMode]);

  const isCurrentTrackPlaying = (videoId) => {
    return currentTrack?.videoId === videoId && isPlaying;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-6 box-border">
      
      {/* ========================================================================= */}
      {/* 🔍 BARRE DE RECHERCHE & FILTRES INTELLIGENTS                              */}
      {/* ========================================================================= */}
      <div className="w-full flex flex-col items-center gap-4 mb-2">
        
        {/* Champ de recherche avec debounce réactif */}
        <div className="w-full max-w-3xl">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                searchImmediately(query.trim());
                if (document.activeElement) {
                  document.activeElement.blur();
                }
              }
            }}
            className="relative group w-full"
          >
            <Search 
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" 
              size={20} 
              style={{ color: '#00e5ff' }}
            />
            <input
              id="search-input-main"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher des artistes, titres, albums, concerts..."
              autoComplete="off"
              spellCheck="false"
              className="w-full bg-[#14110c]/90 text-white rounded-full h-12 md:h-13 pl-12 pr-12 text-sm md:text-base font-medium focus:outline-none transition-all shadow-inner"
              style={{
                borderColor: '#00e5ff',
                boxShadow: '0 0 12px rgba(0, 229, 255, 0.45)'
              }}
            />
            {query ? (
              <button
                id="search-clear-btn"
                type="button"
                onClick={resetSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Effacer la recherche"
              >
                <X size={18} />
              </button>
            ) : null}
          </form>
        </div>

        {/* Onglets de filtres ("Tous", "Artistes", "Titres", "Albums") + Mode Studio/Live */}
        <div className="w-full max-w-3xl flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            <FilterChip 
              active={activeFilter === 'all'} 
              onClick={() => setActiveFilter('all')} 
              label="Tous" 
              theme={currentTheme}
            />
            <FilterChip 
              active={activeFilter === 'artists'} 
              onClick={() => setActiveFilter('artists')} 
              label="Artistes" 
              count={artistList.length > 0 && query ? artistList.length : 0} 
              theme={currentTheme}
            />
            <FilterChip 
              active={activeFilter === 'tracks'} 
              onClick={() => setActiveFilter('tracks')} 
              label="Titres" 
              count={results.tracks?.length || 0} 
              theme={currentTheme}
            />
            <FilterChip 
              active={activeFilter === 'albums'} 
              onClick={() => setActiveFilter('albums')} 
              label="Albums" 
              count={results.albums?.length || 0} 
              theme={currentTheme}
            />
          </div>

          {/* Sélecteur Mode Audio Studio / Live */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/50 border border-white/10 shrink-0">
            <button
              id="search-mode-studio-btn"
              type="button"
              onClick={() => setAudioMode('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                audioMode === 'studio'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
              title="Privilégier les versions Audio / Studio officielles"
            >
              <Disc size={14} className={audioMode === 'studio' ? 'text-emerald-400 animate-spin-slow' : 'text-gray-400'} />
              <span>Studio</span>
            </button>
            <button
              id="search-mode-live-btn"
              type="button"
              onClick={() => setAudioMode('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                audioMode === 'live'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
              title="Privilégier les versions Live & Concerts"
            >
              <Mic2 size={14} className={audioMode === 'live' ? 'text-amber-400' : 'text-gray-400'} />
              <span>Live</span>
            </button>
          </div>
        </div>

        {/* Tags d'historique et de suggestions */}
        {!query && (
          <div className="w-full max-w-3xl flex flex-col gap-2.5">
            {recentSearches && recentSearches.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Clock size={12} /> Récents :
                </span>
                {recentSearches.slice(0, 8).map((item) => (
                  <div 
                    key={item.id}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                    onClick={() => searchImmediately(item.query)}
                  >
                    <span>{item.query}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(item.id);
                      }}
                      className="text-gray-400 hover:text-red-400 hover:bg-red-500/15 p-1 rounded-full flex items-center justify-center transition-all"
                      title="Supprimer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {recentSearches.length > 3 && (
                  <button
                    onClick={clearRecentSearches}
                    className="shrink-0 text-[11px] text-gray-500 hover:text-gray-300 px-2 py-1 transition-colors"
                  >
                    Effacer tout
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Sparkles size={12} style={{ color: currentTheme.primary }} /> Tendances :
              </span>
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => searchImmediately(item)}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all hover:scale-105 active:scale-95"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notifications Hors-ligne / Erreurs */}
      <div className="w-full">
        {(typeof navigator !== 'undefined' && !navigator.onLine && (isOffline || results.isOffline)) && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium mb-4 flex items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                <WifiOff size={18} />
              </div>
              <div>
                <p className="font-bold text-amber-200 text-sm">Mode Hors-ligne Actif</p>
                <p className="text-[11px] text-amber-300/80">Recherche locale instantanée dans vos titres téléchargés et favoris (Dexie)</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-4">
            {error}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ⏳ SKELETON LOADER OU RESULTATS                                           */}
      {/* ========================================================================= */}
      {isSearching ? (
        <div className="mt-4">
          <SearchSkeleton currentTheme={currentTheme} />
        </div>
      ) : (
        <div className="mt-2 space-y-10">

          {/* Aucun résultat trouvé */}
          {query && results.tracks?.length === 0 && artistList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                <Music2 size={32} className="text-gray-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Aucun résultat trouvé pour "{query}"</h3>
              <p className="text-xs text-gray-400 max-w-sm mb-5">
                Vérifiez l'orthographe ou essayez avec un nom d'artiste, de titre ou d'album différent.
              </p>
              <button
                onClick={resetSearch}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 flex items-center gap-2"
              >
                <X size={14} />
                <span>Réinitialiser la recherche</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 👥 1. ONGLET DÉDIÉ "ARTISTES" (AFFICHE UNIQUEMENT LA GRILLE D'ARTISTES)  */}
          {/* ========================================================================= */}
          {activeFilter === 'artists' && (
            <section aria-label="Artistes" className="w-full space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                    <User size={15} style={{ color: currentTheme.primary }} />
                  </div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    {query ? 'Artistes correspondants' : 'Artistes populaires'}
                  </h2>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {artistList.length} artiste{artistList.length > 1 ? 's' : ''}
                </span>
              </div>

              {artistList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500 text-xs border border-dashed border-white/10 rounded-2xl">
                  <User size={32} className="mb-2 opacity-50" />
                  <p>Aucun artiste trouvé pour "{query}".</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {artistList.map((artist, idx) => (
                    <div
                      key={`artist-grid-tab-${artist.id || idx}`}
                      onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}${artist.id ? `?id=${artist.id}` : ''}`)}
                      className="p-4 rounded-2xl bg-[#14110c] hover:bg-[#1c1812] border border-white/5 hover:border-white/15 transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-xl flex flex-col items-center text-center"
                    >
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 border border-white/15 group-hover:border-[#1DB954]/50 transition-all duration-300 shadow-xl mb-3">
                        <div className="w-full h-full rounded-full overflow-hidden relative bg-[#12182b]">
                          <ArtistAvatar 
                            artistName={artist.name}
                            fallbackSrc={artist.artwork} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={(e) => handlePlayArtist(e, artist.name)}
                              className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform active:scale-90"
                              style={{ backgroundColor: currentTheme.primary, color: '#000000' }}
                              title={`Écouter ${artist.name}`}
                            >
                              <Play size={18} fill="currentColor" className="ml-0.5 stroke-none" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 max-w-full">
                        <p className="text-sm font-bold text-white truncate group-hover:text-[#1DB954] transition-colors">
                          {artist.name}
                        </p>
                        {artist.isVerified && (
                          <CheckCircle2 size={13} className="text-[#1DB954] shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-medium truncate mt-0.5">
                        {artist.genre || 'Artiste'} {artist.nbFans ? `• ${formatListenersShort(artist.nbFans)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ========================================================================= */}
          {/* 🌟 PAGES INITIALE : GENRES & CATÉGORIES                                   */}
          {/* ========================================================================= */}
          {!query && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Grille de Genres & Catégories style Spotify Premium */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-white/5">
                  <h2 className="text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <Sparkles size={18} style={{ color: currentTheme.primary }} />
                    <span>Parcourir tout</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                  {GENRES.map((genre) => {
                    const GenreIcon = genre.icon;
                    return (
                      <div
                        key={genre.id}
                        onClick={() => handleGenreClick(genre)}
                        className={`relative overflow-hidden rounded-2xl h-28 md:h-32 bg-gradient-to-br ${genre.color} p-4 cursor-pointer hover:scale-[1.03] active:scale-95 hover:shadow-lg transition-all duration-300 group shadow-md border border-white/5`}
                      >
                        <div className="flex flex-col h-full justify-between">
                          <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                            {genre.name}
                          </h3>
                          <div className="flex justify-between items-end">
                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md">
                              <Play size={12} fill="currentColor" className="text-white ml-0.5" />
                            </div>
                            <GenreIcon className="w-12 h-12 text-white/20 absolute -right-2 -bottom-2 transform rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 👑 ONGLET "TOUS" : 1. BARRE ARTISTES EN HAUT, PUIS TOP MATCH + TOP TITRES */}
          {/* ========================================================================= */}
          {query && activeFilter === 'all' && (
            <div className="space-y-8">
              
              {/* 👥 1. BARRE ARTISTES HORIZONTALE EN HAUT */}
              {artistList.length > 0 && (
                <section aria-label="Artistes" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                        <User size={15} style={{ color: currentTheme.primary }} />
                      </div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                        Artistes
                      </h2>
                    </div>
                    <button
                      onClick={() => setActiveFilter('artists')}
                      className="text-xs text-[#1DB954] hover:underline font-bold"
                    >
                      Tout voir ({artistList.length})
                    </button>
                  </div>

                  {/* Carrousel horizontal de bulles d'artistes */}
                  <div className="flex items-center gap-4 md:gap-6 overflow-x-auto pb-3 scrollbar-none px-1">
                    {artistList.map((artist, idx) => (
                      <div
                        key={`artist-top-bar-${artist.id || idx}`}
                        onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}${artist.id ? `?id=${artist.id}` : ''}`)}
                        className="flex flex-col items-center group cursor-pointer shrink-0 transition-all duration-300 hover:-translate-y-1 active:scale-95"
                        style={{ width: '100px' }}
                      >
                        <div className="relative w-20 h-20 md:w-22 md:h-22 rounded-full p-0.5 border border-white/10 group-hover:border-[#1DB954]/50 transition-all duration-300 shadow-xl group-hover:shadow-[0_0_15px_rgba(29,185,84,0.35)]">
                          <div className="w-full h-full rounded-full overflow-hidden relative bg-[#12182b]">
                            <ArtistAvatar 
                              artistName={artist.name}
                              fallbackSrc={artist.artwork} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={(e) => handlePlayArtist(e, artist.name)}
                                className="w-10 h-10 rounded-full flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform active:scale-90"
                                style={{ backgroundColor: '#1DB954', color: '#000000' }}
                                title={`Écouter ${artist.name}`}
                              >
                                <Play size={16} fill="currentColor" className="ml-0.5 stroke-none" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <p className="mt-2 text-xs font-bold text-white text-center truncate w-full group-hover:text-[#1DB954] transition-colors">
                          {artist.name}
                        </p>
                        <span className="text-[10px] text-gray-400 font-medium truncate w-full text-center">
                          {artist.genre || 'Artiste'} {artist.nbFans ? `• ${formatListenersShort(artist.nbFans)}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 👑 2. TOP MATCH INTELLIGENT + TOP 5 TITRES (GRILLE 12 COLS COMME AVANT) */}
              {topMatch && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* CARTE HERO (MEILLEUR RÉSULTAT : CARTE ARTISTE OU CARTE TITRE) */}
                  <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                        <Flame size={15} style={{ color: currentTheme.primary }} />
                      </div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                        Meilleur résultat
                      </h2>
                    </div>

                    {topMatch.type === 'artist' ? (
                      /* 👤 CARTE HERO ARTISTE */
                      <div 
                        id="search-hero-artist-card"
                        onClick={() => navigate(`/artist/${encodeURIComponent(topMatch.data.name)}${topMatch.data.id ? `?id=${topMatch.data.id}` : ''}`)}
                        className="group relative p-6 rounded-3xl bg-[#14110c] hover:bg-[#1a160f] border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer overflow-hidden shadow-2xl flex flex-col justify-between hover:shadow-black/60 hover:-translate-y-0.5 active:scale-[0.99] min-h-[260px]"
                        style={{
                          background: `linear-gradient(145deg, ${currentTheme.bgAccent} 0%, #14110c 100%)`
                        }}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="relative w-28 h-28 shrink-0 rounded-full overflow-hidden shadow-2xl border-2 border-white/20 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(29,185,84,0.4)] transition-all duration-500 bg-[#12182b]">
                            <ArtistAvatar 
                              artistName={topMatch.data.name} 
                              fallbackSrc={topMatch.data.artwork} 
                              className="w-full h-full object-cover" 
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20"
                              >
                                <User size={11} />
                                <span>Artiste</span>
                              </span>

                              {topMatch.data.isVerified && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded-full border border-[#1DB954]/30 font-bold">
                                  <CheckCircle2 size={12} /> Officiel
                                </span>
                              )}
                            </div>

                            <h3 className="text-2xl md:text-3xl font-black text-white leading-tight truncate group-hover:text-[#1DB954] transition-colors tracking-tight">
                              {topMatch.data.name}
                            </h3>

                            <p className="text-xs text-gray-400 mt-1 truncate font-medium">
                              {topMatch.data.genre || 'Artiste'} {topMatch.data.nbFans ? `• ${formatListenersShort(topMatch.data.nbFans)} auditeurs` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                          <span className="text-xs text-gray-400 font-mono">
                            Voir le profil complet
                          </span>

                          <button
                            onClick={(e) => handlePlayArtist(e, topMatch.data.name)}
                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-[#1DB954] text-black shadow-lg hover:shadow-[0_0_15px_rgba(29,185,84,0.5)] cursor-pointer"
                            title={`Écouter ${topMatch.data.name}`}
                          >
                            <Play size={24} fill="currentColor" className="ml-1 stroke-none" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* 🎵 CARTE HERO TITRE */
                      <div 
                        id="search-hero-track-card"
                        onClick={() => handlePlay(topMatch.data, results.tracks)}
                        className="group relative p-6 rounded-3xl bg-[#14110c] hover:bg-[#1a160f] border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer overflow-hidden shadow-2xl flex flex-col justify-between hover:shadow-black/60 hover:-translate-y-0.5 active:scale-[0.99] min-h-[260px]"
                        style={{
                          background: `linear-gradient(145deg, ${currentTheme.bgAccent} 0%, #14110c 100%)`
                        }}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-300">
                            <TrackImage 
                              src={topMatch.data.thumbnail} 
                              alt={topMatch.data.title} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-90 bg-[#1DB954] text-black"
                              >
                                {isCurrentTrack(topMatch.data) && isPlaying ? (
                                  <Pause size={22} fill="currentColor" />
                                ) : (
                                  <Play size={22} fill="currentColor" className="ml-1" />
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span 
                                className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20"
                              >
                                Titre • Meilleur résultat
                              </span>
                            </div>

                            <h3 className="text-xl md:text-2xl font-black text-white leading-snug truncate group-hover:text-[#1DB954] transition-colors">
                              {topMatch.data.cleanTitle || topMatch.data.title}
                            </h3>

                            <p 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/artist/${encodeURIComponent(getMainArtistName(topMatch.data.artist))}`);
                              }}
                              className="text-xs md:text-sm text-gray-300 mt-1 truncate hover:underline hover:text-white cursor-pointer font-medium"
                            >
                              Par <span className="font-bold text-white hover:text-[#1DB954] transition-colors">{getMainArtistName(topMatch.data.artist)}</span>
                            </p>

                            {topMatch.data.album && (
                              <p className="text-[11px] text-gray-400 mt-1 truncate font-medium">
                                Album : {topMatch.data.album}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
                          <span className="text-xs text-gray-400 font-mono">
                            {formatDuration(topMatch.data.duration)}
                          </span>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(topMatch.data);
                              }}
                              className="px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 border border-white/10 active:scale-95 cursor-pointer"
                            >
                              <Heart size={15} className={isLiked(topMatch.data) ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                              <span className={isLiked(topMatch.data) ? 'text-red-400 font-bold text-xs' : 'text-xs font-medium'}>
                                {isLiked(topMatch.data) ? 'Aimé' : 'Favori'}
                              </span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlay(topMatch.data, results.tracks);
                              }}
                              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 bg-[#1DB954] text-black hover:shadow-[0_0_15px_rgba(29,185,84,0.5)] cursor-pointer"
                              title={`Écouter ${topMatch.data.cleanTitle || topMatch.data.title}`}
                            >
                              {isCurrentTrack(topMatch.data) && isPlaying ? (
                                <Pause size={24} fill="currentColor" />
                              ) : (
                                <Play size={24} fill="currentColor" className="ml-1 stroke-none" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TOP 5 TITRES ADAPTÉS À CÔTÉ DU HERO MATCH */}
                  <div className="lg:col-span-7 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                          <TrendingUp size={15} style={{ color: currentTheme.primary }} />
                        </div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                          {topMatch.type === 'artist' ? `Titres de ${topMatch.data.name}` : 'Titres'}
                        </h2>
                      </div>
                      <button
                        onClick={() => setActiveFilter('tracks')}
                        className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Voir tous les titres ({results.tracks?.length || 0})
                      </button>
                    </div>

                    <div className="space-y-2">
                      {topMatchTracks.map((track, i) => {
                        const isThisActive = isCurrentTrack(track);
                        const isThisPlaying = isThisActive && isPlaying;
                        const isThisLoading = isThisActive && isLoading;
                        const liked = isLiked(track);

                        return (
                          <div
                            key={`top-track-${track.videoId || track.id}-${i}`}
                            onClick={() => handlePlay(track, topMatchTracks, i)}
                            className={`group flex items-center gap-3.5 p-2.5 md:p-3 rounded-2xl border transition-all duration-200 cursor-pointer min-h-[56px] ${
                              isThisActive
                                ? 'shadow-md ring-1'
                                : 'bg-[#14110c] hover:bg-[#1c1812] border-white/5 hover:border-white/15 hover:-translate-y-0.5'
                            }`}
                            style={isThisActive ? {
                              backgroundColor: `${currentTheme?.primary || '#1ED760'}18`,
                              borderColor: `${currentTheme?.primary || '#1ED760'}45`,
                              boxShadow: `0 4px 14px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.15)'}`
                            } : {}}
                          >
                            <div className="w-6 flex items-center justify-center shrink-0">
                              <span 
                                className="text-xs font-mono font-bold group-hover:hidden"
                                style={{ color: isThisActive ? (currentTheme?.primary || '#1ED760') : '#6b7280' }}
                              >
                                {i + 1}
                              </span>
                              <div className="hidden group-hover:flex items-center justify-center">
                                {isThisPlaying ? (
                                  <Pause size={15} style={{ color: currentTheme?.primary || '#1ED760' }} fill="currentColor" />
                                ) : (
                                  <Play size={15} className="text-white" fill="currentColor" />
                                )}
                              </div>
                            </div>

                            <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-sm">
                              <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                              {isThisLoading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                                </div>
                              )}
                              {isThisPlaying && !isThisLoading && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <div className="flex items-end gap-0.5 h-3">
                                    <span className="w-1 animate-bounce rounded-full h-full" style={{ backgroundColor: currentTheme?.primary }} />
                                    <span className="w-1 animate-bounce rounded-full h-2/3 delay-75" style={{ backgroundColor: currentTheme?.primary }} />
                                    <span className="w-1 animate-bounce rounded-full h-4/5 delay-150" style={{ backgroundColor: currentTheme?.primary }} />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p 
                                  className="text-sm font-semibold truncate group-hover:text-white"
                                  style={{ color: isThisActive ? (currentTheme?.primary || '#1ED760') : '#f1f5f9', fontWeight: isThisActive ? 'bold' : '600' }}
                                >
                                  {track.cleanTitle || track.title}
                                </p>
                                <DownloadBadge videoId={track.videoId || track.id} />
                              </div>
                              <p 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/artist/${encodeURIComponent(getMainArtistName(track.artist))}`);
                                }}
                                className="text-xs text-gray-400 truncate hover:underline hover:text-gray-200 cursor-pointer mt-0.5"
                              >
                                {getMainArtistName(track.artist)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLike(track);
                                }}
                                className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 transition-all ${liked ? 'opacity-100' : 'opacity-80 md:opacity-0 md:group-hover:opacity-100 text-gray-400 hover:text-white'}`}
                                title={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                              >
                                <Heart size={16} className={liked ? 'fill-red-500 text-red-500' : ''} />
                              </button>
                              <span className="text-xs font-mono text-gray-500 pr-1">
                                {formatDuration(track.duration)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* 🎵 ONGLET DÉDIÉ "TITRES" (LISTE COMPLÈTE STYLE SPOTIFY)                     */}
          {/* ========================================================================= */}
          {query && activeFilter === 'tracks' && results.tracks?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                    <TrendingUp size={15} style={{ color: currentTheme.primary }} />
                  </div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Tous les morceaux trouvés
                  </h2>
                </div>
                <button
                  onClick={() => setQueueAndPlay(results.tracks, 0)}
                  className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Play size={13} fill="currentColor" className="stroke-none" />
                  <span>Tout Lire</span>
                </button>
              </div>

              <div className="bg-[#121110]/80 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-2xl">
                {results.tracks.map((track, idx) => {
                  const isPlayingThis = currentTrack?.videoId === track.videoId && isPlaying;
                  const isCurrentActive = isCurrentTrack(track);

                  return (
                    <div
                      key={`full-track-${track.videoId}-${idx}`}
                      onClick={() => handlePlayTracklist(results.tracks, idx)}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer group ${
                        isCurrentActive ? 'bg-[#1DB954]/15 border-l-4 border-l-[#1DB954]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span className="w-7 text-center font-mono font-bold text-xs shrink-0 text-gray-500">
                          #{idx + 1}
                        </span>

                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-black/40 border border-white/10 shrink-0 shadow-md">
                          <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                            <div className="w-8 h-8 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                              {isPlayingThis ? (
                                <Pause size={14} fill="currentColor" className="stroke-none" />
                              ) : (
                                <Play size={14} fill="currentColor" className="ml-0.5 stroke-none" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={`text-xs md:text-sm font-bold truncate tracking-tight ${
                              isCurrentActive ? 'text-[#1DB954]' : 'text-white group-hover:text-[#1DB954]'
                            }`}>
                              {track.cleanTitle || track.title}
                            </p>
                            <DownloadBadge videoId={track.videoId || track.id} />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 font-medium truncate">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/artist/${encodeURIComponent(getMainArtistName(track.artist))}`);
                              }}
                              className="hover:text-[#1DB954] transition-colors truncate"
                            >
                              {getMainArtistName(track.artist)}
                            </span>
                            {track.album && (
                              <>
                                <span className="hidden sm:inline text-gray-600">•</span>
                                <span className="hidden sm:inline text-gray-500 truncate">{track.album}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono text-gray-400 shrink-0">
                        <span className="w-12 text-right">{formatDuration(track.duration)}</span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track);
                          }}
                          className="p-1.5 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          title={isLiked(track) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <Heart size={16} className={isLiked(track) ? 'text-red-500 fill-red-500' : 'text-gray-500 hover:text-white'} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 💿 SECTION ALBUMS & EPS (ONGLET TOUS OU ONGLET DÉDIÉ ALBUMS)               */}
          {/* ========================================================================= */}
          {(activeFilter === 'all' || activeFilter === 'albums') && results.albums?.length > 0 && (
            <section aria-label="Albums et EPs" className={activeFilter === 'all' ? 'pt-4 border-t border-white/5' : ''}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                    <Disc size={15} style={{ color: currentTheme.primary }} />
                  </div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Albums & EPs
                  </h2>
                </div>
                <span className="text-xs text-gray-500">
                  {results.albums.length} album{results.albums.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.albums.map((album, idx) => (
                  <div
                    key={`album-${album.id || idx}`}
                    onClick={() => navigate(`/artist/${encodeURIComponent(getMainArtistName(album.artist))}?album=${encodeURIComponent(album.title)}`)}
                    className="p-3.5 rounded-2xl bg-[#14110c] hover:bg-[#1c1812] border border-white/5 hover:border-white/15 transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-95 flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 border border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-md relative bg-black/40">
                        <img src={album.artwork} alt={album.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: currentTheme.primary, color: '#000000' }}
                          >
                            <Play size={16} fill="currentColor" className="ml-0.5 stroke-none" />
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-white truncate group-hover:text-[#1DB954] transition-colors">{album.title}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{album.artist}</p>
                    </div>
                    {album.year && <p className="text-[10px] text-gray-500 mt-2 font-mono">{album.year}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 🎤 SECTION VERSIONS LIVE & CONCERTS                                       */}
          {/* ========================================================================= */}
          {activeFilter === 'all' && audioMode !== 'live' && liveTracks.length > 0 && (
            <section aria-label="Versions Live & Concerts" className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Mic2 size={15} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Versions Live & Concerts
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setAudioMode('live')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 min-h-[44px] px-2"
                >
                  <span>Passer en mode Live</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveTracks.slice(0, 6).map((track, i) => {
                  const isThisActive = isCurrentTrack(track);
                  const isThisPlaying = isThisActive && isPlaying;

                  return (
                    <div
                      key={`live-${track.videoId || track.id}-${i}`}
                      onClick={() => handlePlay(track)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-pointer min-h-[56px] ${
                        isThisActive
                          ? 'bg-amber-500/15 border-amber-500/40 shadow-lg'
                          : 'bg-[#14110c] hover:bg-[#1c1812] border-white/5 hover:border-amber-500/30 hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden border border-white/10">
                        <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          {isThisPlaying ? (
                            <Pause size={14} className="text-amber-400" fill="currentColor" />
                          ) : (
                            <Play size={14} className="text-white" fill="currentColor" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-white truncate">
                            {track.cleanTitle || track.title}
                          </p>
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            LIVE
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {getMainArtistName(track.artist)}
                        </p>
                      </div>

                      <span className="text-[11px] font-mono text-gray-500 shrink-0">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 📜 AUTRES TITRES POUR L'ONGLET "TOUS"                                     */}
          {/* ========================================================================= */}
          {activeFilter === 'all' && remainingTracks.length > 0 && (
            <section aria-label="Autres Titres" className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Autres résultats ({remainingTracks.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {remainingTracks.slice(0, 10).map((track, i) => {
                  const isThisActive = isCurrentTrack(track);
                  const liked = isLiked(track);

                  return (
                    <div
                      key={`remaining-${track.videoId || track.id}-${i}`}
                      onClick={() => handlePlay(track)}
                      className={`group flex items-center gap-3 p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer min-h-[50px] ${
                        isThisActive
                          ? 'shadow-md ring-1'
                          : 'bg-[#14110c]/80 hover:bg-[#1c1812] border-white/5 hover:border-white/15'
                      }`}
                      style={isThisActive ? {
                        backgroundColor: `${currentTheme?.primary || '#1ED760'}18`,
                        borderColor: `${currentTheme?.primary || '#1ED760'}45`
                      } : {}}
                    >
                      <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-white/10">
                        <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-xs font-semibold truncate group-hover:text-white"
                          style={{ color: isThisActive ? (currentTheme?.primary || '#1ED760') : '#e2e8f0' }}
                        >
                          {track.cleanTitle || track.title}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {getMainArtistName(track.artist)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track);
                          }}
                          className={`p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 ${liked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 text-gray-400'}`}
                        >
                          <Heart size={14} className={liked ? 'fill-red-500 text-red-500' : ''} />
                        </button>
                        <span className="text-[11px] font-mono text-gray-500">
                          {formatDuration(track.duration)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      )}

      <PlaylistDetailModal
        playlist={selectedPlaylist}
        isOpen={!!selectedPlaylist}
        onClose={() => setSelectedPlaylist(null)}
      />
    </div>
  );
}

function FilterChip({ active, onClick, label, count, theme }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 min-h-[44px] rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 border active:scale-95 cursor-pointer"
      style={{
        backgroundColor: active ? theme.primary : 'rgba(255, 255, 255, 0.05)',
        color: active ? '#000000' : '#94a3b8',
        borderColor: active ? theme.primary : 'rgba(255, 255, 255, 0.1)',
        boxShadow: active ? `0 0 12px ${theme.glow}` : 'none'
      }}
    >
      <span>{label}</span>
      {count > 0 && <span className="opacity-80 text-[10px]">({count})</span>}
    </button>
  );
}

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
