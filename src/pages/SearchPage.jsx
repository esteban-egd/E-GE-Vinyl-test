import { useState, useMemo } from 'react';
import { useSearch } from '../context/SearchContext';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Search, 
  Loader2, 
  X, 
  Play, 
  Pause, 
  Disc, 
  User, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Heart,
  Music2
} from 'lucide-react';
import { useLikes } from '../hooks/useLikes';
import { useNavigate } from 'react-router-dom';
import { FEATURED_ARTISTS, TRENDING_TRACKS, normalizeArtistKey, isArtistMatch, getMainArtistName } from '../services/musicDataService';
import ArtistAvatar from '../components/common/ArtistAvatar';
import TrackImage from '../components/common/TrackImage';

export default function SearchPage() {
  const { 
    query, 
    setQuery, 
    searchImmediately,
    isSearching, 
    results, 
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
  
  const [activeFilter, setActiveFilter] = useState('all');

  const handlePlay = (track) => {
    if (currentTrack?.videoId === track.videoId) {
      togglePlayPause();
    } else {
      play(track);
    }
  };

  const handlePlayArtist = (e, artistName) => {
    e.stopPropagation();
    const artistTracks = results.tracks?.filter(t => 
      isArtistMatch(t.artist, artistName)
    ) || [];
    
    if (artistTracks.length > 0) {
      setQueueAndPlay(artistTracks, 0);
    } else {
      navigate(`/artist/${encodeURIComponent(getMainArtistName(artistName))}`);
    }
  };

  // Liste des artistes pour les bulles en haut (filtrés et dédoublonnés strictement)
  const artistBubbles = useMemo(() => {
    if (query.trim() && results.artists?.length > 0) {
      const seen = new Set();
      const clean = [];
      for (const a of results.artists) {
        const cleanName = getMainArtistName(a.name);
        const key = normalizeArtistKey(cleanName);
        if (key && !seen.has(key)) {
          seen.add(key);
          clean.push({ ...a, name: cleanName });
        }
      }
      return clean.slice(0, 8);
    }
    const seen = new Set();
    const clean = [];
    for (const a of FEATURED_ARTISTS) {
      const cleanName = getMainArtistName(a.name);
      const key = normalizeArtistKey(cleanName);
      if (key && !seen.has(key)) {
        seen.add(key);
        clean.push(a);
      }
    }
    return clean;
  }, [query, results.artists]);

  // Liste des morceaux
  const topTrack = useMemo(() => {
    if (query.trim()) {
      return results.tracks?.[0] || null;
    }
    return TRENDING_TRACKS[0] || null;
  }, [query, results.tracks]);

  const displayTracks = useMemo(() => {
    if (query.trim()) {
      return results.tracks || [];
    }
    return TRENDING_TRACKS;
  }, [query, results.tracks]);

  // Élimine le doublon du "Meilleur résultat" dans la liste des morceaux pour éviter le rendu "en double"
  const displayTracksWithoutTop = useMemo(() => {
    if (!topTrack) return displayTracks;
    return displayTracks.filter(t => t.videoId !== topTrack.videoId && t.id !== topTrack.id);
  }, [displayTracks, topTrack]);

  const isCurrentTrackPlaying = (videoId) => {
    return currentTrack?.videoId === videoId && isPlaying;
  };

  return (
    <div className="w-full p-4 md:p-8 max-w-7xl mx-auto safe-top pb-32">
      {/* Barre de Recherche Épurée et Rapide */}
      <div className="shrink-0 pt-1 pb-3">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) {
              searchImmediately(query.trim());
              // Ferme le clavier virtuel sur mobile pour voir les résultats
              if (document.activeElement) {
                document.activeElement.blur();
              }
            }
          }}
          className="relative group"
        >
          <Search 
            className="absolute left-4.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" 
            size={20} 
            style={{ color: query ? currentTheme.primary : '#94a3b8' }}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher des artistes, titres, albums..."
            autoComplete="off"
            spellCheck="false"
            className="w-full bg-[#120f0a] hover:bg-[#1a160f] border border-white/10 hover:border-white/20 text-white rounded-full h-12 pl-12 pr-12 text-sm font-medium focus:outline-none transition-all shadow-inner"
            style={{
              borderColor: query ? currentTheme.primary : undefined,
              boxShadow: query ? `0 0 16px ${currentTheme.glow}` : undefined
            }}
          />
          {isSearching ? (
            <Loader2 
              className="absolute right-4.5 top-1/2 -translate-y-1/2 animate-spin" 
              size={18} 
              style={{ color: currentTheme.primary }}
            />
          ) : query ? (
            <button
              type="button"
              onClick={resetSearch}
              className="absolute right-4.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Effacer la recherche"
            >
              <X size={16} />
            </button>
          ) : null}
        </form>

        {/* Suggestions & Recherches Récentes */}
        {!query && (
          <div className="mt-3 flex flex-col gap-2.5">
            {recentSearches && recentSearches.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Clock size={11} /> Récents :
                </span>
                {recentSearches.slice(0, 8).map((item) => (
                  <div 
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all shrink-0 cursor-pointer active:scale-95"
                    onClick={() => searchImmediately(item.query)}
                  >
                    <span>{item.query}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(item.id);
                      }}
                      className="text-gray-500 hover:text-red-400 p-0.5"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {recentSearches.length > 3 && (
                  <button
                    onClick={clearRecentSearches}
                    className="text-[11px] text-gray-500 hover:text-gray-300 px-2 py-0.5"
                  >
                    Effacer tout
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Sparkles size={11} style={{ color: currentTheme.primary }} /> Tendances :
              </span>
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => searchImmediately(item)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all whitespace-nowrap active:scale-95 shrink-0"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtres par Catégorie épurés */}
        {query && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
            <FilterChip 
              active={activeFilter === 'all'} 
              onClick={() => setActiveFilter('all')} 
              label="Tous" 
              theme={currentTheme}
            />
            {results.artists?.length > 0 && (
              <FilterChip 
                active={activeFilter === 'artists'} 
                onClick={() => setActiveFilter('artists')} 
                label="Artistes" 
                count={artistBubbles.length} 
                theme={currentTheme}
              />
            )}
            {results.tracks?.length > 0 && (
              <FilterChip 
                active={activeFilter === 'tracks'} 
                onClick={() => setActiveFilter('tracks')} 
                label="Titres" 
                count={results.tracks?.length} 
                theme={currentTheme}
              />
            )}
            {results.albums?.length > 0 && (
              <FilterChip 
                active={activeFilter === 'albums'} 
                onClick={() => setActiveFilter('albums')} 
                label="Albums" 
                count={results.albums?.length} 
                theme={currentTheme}
              />
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🌟 SECTION 1 : LES ARTISTES EN BULLES SUR LE HAUT                         */}
      {/* ========================================================================= */}
      {(activeFilter === 'all' || activeFilter === 'artists') && artistBubbles.length > 0 && (
        <div className="shrink-0 mb-6 pt-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} style={{ color: currentTheme.primary }} />
              {query ? 'Artistes correspondants' : 'Artistes populaires'}
            </h3>
            <span className="text-[11px] text-gray-500">
              {artistBubbles.length} profil{artistBubbles.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Rangée horizontale de bulles d'artistes */}
          <div className="flex items-center gap-4 md:gap-5 overflow-x-auto pb-2 scrollbar-none px-1">
            {artistBubbles.map((artist, idx) => (
              <div
                key={artist.id || artist.name || idx}
                onClick={() => navigate(`/artist/${encodeURIComponent(getMainArtistName(artist.name))}`)}
                className="flex flex-col items-center group cursor-pointer shrink-0 transition-transform active:scale-95"
                style={{ width: '82px' }}
              >
                {/* Bulle d'avatar circulaire avec hover glow */}
                <div className="relative w-18 h-18 md:w-20 md:h-20 rounded-full overflow-hidden shadow-lg p-0.5 border border-white/15 group-hover:border-white/40 transition-all duration-300">
                  <div 
                    className="w-full h-full rounded-full overflow-hidden relative group-hover:scale-105 transition-transform duration-300 bg-[#12182b]"
                  >
                    <ArtistAvatar 
                      artistName={artist.name}
                      fallbackSrc={artist.artwork || artist.avatar} 
                      className="w-full h-full object-cover"
                    />
                    {/* Bouton Play au survol */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handlePlayArtist(e, artist.name)}
                        className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform"
                        style={{ backgroundColor: currentTheme.primary, color: '#000000' }}
                        title={`Écouter ${artist.name}`}
                      >
                        <Play size={14} fill="currentColor" className="ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nom de l'artiste */}
                <p className="mt-2 text-xs font-bold text-white text-center truncate w-full group-hover:underline">
                  {artist.name}
                </p>
                <span className="text-[10px] text-gray-400 font-medium truncate w-full text-center">
                  {artist.genre || 'Artiste'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎵 SECTION 2 : MORCEAUX LES PLUS POPULAIRES & MEILLEUR RÉSULTAT           */}
      {/* ========================================================================= */}
      <div className="mt-2">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-4">
            {error}
          </div>
        )}

        {/* Si aucun résultat trouvé */}
        {query && !isSearching && displayTracks.length === 0 && artistBubbles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Music2 size={48} className="text-gray-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Aucun résultat trouvé pour "{query}"</h3>
            <p className="text-xs text-gray-400 max-w-sm mb-4">
              Vérifiez l'orthographe ou essayez avec un nom d'artiste ou de morceau différent.
            </p>
            <button
              onClick={resetSearch}
              className="px-4 py-2 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Réinitialiser la recherche
            </button>
          </div>
        )}

        <div className="space-y-8 pb-12">
          {/* Grille : Top Result + Liste des Titres */}
          {(activeFilter === 'all' || activeFilter === 'tracks') && displayTracks.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 🏆 Carte Hero : Meilleur Résultat */}
              {topTrack && (
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Disc size={14} style={{ color: currentTheme.primary }} />
                    {query ? 'Meilleur résultat' : 'Titre à la une'}
                  </h3>
                  <div 
                    onClick={() => handlePlay(topTrack)}
                    className="group relative p-5 md:p-6 rounded-2xl bg-[#120f0a] hover:bg-[#1a160f] border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer overflow-hidden shadow-xl flex flex-col justify-between"
                    style={{
                      background: `linear-gradient(135deg, ${currentTheme.bgAccent} 0%, #120f0a 100%)`
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-300">
                        <TrackImage 
                          src={topTrack.thumbnail} 
                          alt={topTrack.title} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                            style={{ backgroundColor: currentTheme.primary, color: '#000000' }}
                          >
                            {isCurrentTrackPlaying(topTrack.videoId) ? (
                              <Pause size={22} fill="currentColor" />
                            ) : (
                              <Play size={22} fill="currentColor" className="ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span 
                          className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border"
                          style={{ 
                            backgroundColor: `${currentTheme.primary}15`, 
                            color: currentTheme.primary,
                            borderColor: `${currentTheme.primary}30` 
                          }}
                        >
                          Titre le plus écouté
                        </span>
                        <h2 className="text-base md:text-xl font-bold text-white leading-snug truncate group-hover:underline">
                          {topTrack.title}
                        </h2>
                        <p 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/artist/${encodeURIComponent(getMainArtistName(topTrack.artist))}`);
                          }}
                          className="text-xs md:text-sm text-gray-400 mt-1 truncate hover:underline hover:text-white cursor-pointer"
                        >
                          Titre • ({getMainArtistName(topTrack.artist)})
                        </p>
                        {topTrack.album && (
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                            {topTrack.album}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-mono">
                          {formatDuration(topTrack.duration)}
                        </span>
                        {topTrack.popularity && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 font-mono">
                            ★ {topTrack.popularity}% popularité
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(topTrack);
                        }}
                        className="text-xs px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 border border-white/10"
                      >
                        <Heart size={14} className={isLiked(topTrack) ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                        <span className={isLiked(topTrack) ? 'text-red-400 font-bold' : ''}>{isLiked(topTrack) ? 'Aimé' : 'Favori'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 📋 Liste des Titres les plus écoutés */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} style={{ color: currentTheme.primary }} />
                    {query ? 'Morceaux les plus populaires' : 'Titres les plus streamés'}
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    {displayTracksWithoutTop.length + (topTrack ? 1 : 0)} titres
                  </span>
                </div>

                <div className="space-y-1.5">
                  {displayTracksWithoutTop.slice(0, 8).map((track, i) => {
                    const isThisActive = isCurrentTrack(track);
                    const isThisPlaying = isThisActive && isPlaying;
                    const isThisLoading = isThisActive && isLoading;
                    const liked = isLiked(track);

                    return (
                      <div
                        key={`${track.videoId || track.id}-${i}`}
                        onClick={() => handlePlay(track)}
                        className={`group flex items-center gap-3.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isThisActive
                            ? 'shadow-md ring-1'
                            : 'bg-[#120f0a] hover:bg-[#1a160f] border-white/5 hover:border-white/10'
                        }`}
                        style={isThisActive ? {
                          backgroundColor: `${currentTheme?.primary || '#1ED760'}1a`,
                          borderColor: `${currentTheme?.primary || '#1ED760'}40`,
                          boxShadow: `0 4px 12px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.15)'}`
                        } : {}}
                      >
                        {/* Numéro ou Icône Play */}
                        <span 
                          className="w-5 text-center text-xs font-mono group-hover:hidden"
                          style={{ color: isThisActive ? (currentTheme?.primary || '#1ED760') : '#6b7280', fontWeight: isThisActive ? 'bold' : 'normal' }}
                        >
                          {i + 1}
                        </span>
                        <div className="w-5 hidden group-hover:flex items-center justify-center">
                          {isThisPlaying ? (
                            <Pause size={14} style={{ color: currentTheme?.primary || '#1ED760' }} fill="currentColor" />
                          ) : (
                            <Play size={14} className="text-white" fill="currentColor" />
                          )}
                        </div>

                        {/* Miniature HD */}
                        <div 
                          className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden border"
                          style={{ borderColor: isThisActive ? `${currentTheme?.primary || '#1ED760'}50` : 'rgba(255,255,255,0.1)' }}
                        >
                          <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                          {isThisLoading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 size={14} className="animate-spin" style={{ color: currentTheme?.primary }} />
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

                        {/* Titre & Artiste */}
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-sm font-semibold truncate group-hover:text-white"
                            style={{ color: isThisActive ? (currentTheme?.primary || '#1ED760') : '#e5e7eb', fontWeight: isThisActive ? 'bold' : '600' }}
                          >
                            {track.title}
                          </p>
                          <p 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/artist/${encodeURIComponent(getMainArtistName(track.artist))}`);
                            }}
                            className="text-xs text-gray-400 truncate hover:underline hover:text-gray-200 cursor-pointer"
                          >
                            Titre • ({getMainArtistName(track.artist)})
                          </p>
                        </div>

                        {/* Durée & Like */}
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(track);
                            }}
                            className={`p-1.5 transition-all ${liked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white'}`}
                            title={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          >
                            <Heart size={16} className={liked ? 'fill-red-500 text-red-500 drop-shadow-sm' : ''} />
                          </button>
                          <span className="text-xs font-mono text-gray-500 pr-2">
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

          {/* 💿 SECTION 3 : LES ALBUMS */}
          {(activeFilter === 'all' || activeFilter === 'albums') && results.albums?.length > 0 && (
            <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Disc size={14} style={{ color: currentTheme.primary }} />
                Albums & Disques
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.albums.map((album) => (
                  <div
                    key={album.id || album.title}
                    onClick={() => navigate(`/artist/${encodeURIComponent(getMainArtistName(album.artist))}?album=${encodeURIComponent(album.title)}`)}
                    className="p-3.5 rounded-2xl bg-[#120f0a] hover:bg-[#1a160f] border border-white/5 hover:border-white/15 transition-all group cursor-pointer"
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 border border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-md">
                      <img src={album.artwork} alt={album.title} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-bold text-white truncate group-hover:underline">{album.title}</p>
                    <p className="text-xs text-gray-400 truncate">{album.artist}</p>
                    {album.year && <p className="text-[10px] text-gray-500 mt-0.5">{album.year}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, count, theme }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 border"
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
