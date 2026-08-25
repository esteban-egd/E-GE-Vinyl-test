import { useState, useMemo } from 'react';
import { useAudio } from '../context/AudioContext';
import { 
  FEATURED_ARTISTS, 
  FRESH_NEW_RELEASES, 
  DECADE_PLAYLISTS, 
  TRENDING_TRACKS, 
  getMainArtistName 
} from '../services/musicDataService';
import { useNavigate } from 'react-router-dom';
import ArtistAvatar from '../components/common/ArtistAvatar';
import AddToPlaylistModal from '../components/common/AddToPlaylistModal';
import TrackImage from '../components/common/TrackImage';
import { 
  Disc, 
  Sparkles, 
  Search, 
  Play, 
  User, 
  ChevronRight, 
  ListMusic,
  Compass,
  Calendar,
  Plus,
  Flame,
  Heart
} from 'lucide-react';
import { useLikes } from '../hooks/useLikes';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const { play, setQueueAndPlay, isPlaying, currentTrack } = useAudio();
  const { isLiked, toggleLike } = useLikes();
  const navigate = useNavigate();

  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);

  // Recommendation dynamique basée sur l'écoute courante ou les nouveautés
  const smartRecommendations = useMemo(() => {
    if (!currentTrack) {
      return FRESH_NEW_RELEASES;
    }
    const matched = TRENDING_TRACKS.filter(t => 
      t.artist.toLowerCase().includes(currentTrack.artist?.toLowerCase() || '') ||
      t.genre === currentTrack.genre
    );
    if (matched.length >= 3) return matched;
    return TRENDING_TRACKS.filter(t => t.videoId !== currentTrack.videoId).slice(0, 6);
  }, [currentTrack]);

  const handleArtistClick = (artistName) => {
    const main = getMainArtistName(artistName);
    navigate(`/artist/${encodeURIComponent(main)}`);
  };

  const handlePlayPlaylist = (playlist) => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      setQueueAndPlay(playlist.tracks, 0);
    }
  };

  return (
    <div className="flex flex-col h-full fade-in pb-32 max-w-7xl mx-auto w-full px-4 md:px-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-6 border-b border-white/10 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-[var(--color-theme-accent)] border border-[var(--color-sand)] flex items-center justify-center text-[var(--color-brass)] shadow-lg">
            <Disc size={22} className={isPlaying ? "animate-spin-slow" : ""} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none uppercase">
              Le Salon E-GE
            </h1>
            <span className="text-[10px] text-[var(--color-muted)] font-bold block mt-1 uppercase tracking-widest">
              Nouveautés 2024-2026 & Sélection Vinyle
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/search')}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
          >
            <Search size={14} className="text-amber-400" />
            <span>Recherche globale...</span>
          </button>
        </div>
      </div>

      <div className="space-y-12 py-6">

        {/* SECTION 1 : VRAIES NOUVEAUTÉS & SORTIES RÉCENTES (2024-2026) */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-white text-equinox tracking-wider flex items-center gap-2.5">
                <Flame size={20} className="text-amber-500" />
                <span>Nouveautés & Sorties Récentes (2024-2026)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Sabrina Carpenter, Billie Eilish, Kendrick Lamar, Charli xcx, Lady Gaga...
              </p>
            </div>
            <button
              onClick={() => setQueueAndPlay(FRESH_NEW_RELEASES.slice(0, 4), 0)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-brass)] hover:opacity-90 text-[#0d0c0b] text-xs font-bold transition-all shadow-lg"
            >
              <Play size={13} fill="currentColor" />
              <span>Tout lire</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FRESH_NEW_RELEASES.slice(0, 4).map((track) => (
              <div
                key={`fresh-${track.videoId}`}
                onClick={() => play(track)}
                className="bg-[#120f0a] border border-white/10 rounded-2xl p-3.5 hover:border-[var(--color-brass)]/50 hover:bg-white/[0.04] cursor-pointer group transition-all flex flex-col justify-between shadow-sm relative"
              >
                <div>
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-3 bg-[#222]">
                    <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-black shadow-sm font-mono">
                        {track.year || '2024'}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg">
                        <Play size={18} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-sm truncate group-hover:text-amber-400 transition-colors">
                    {track.title}
                  </h3>
                  <p 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArtistClick(track.artist);
                    }}
                    className="text-xs text-gray-400 truncate hover:text-amber-400 mt-0.5 font-medium"
                  >
                    {track.artist}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-[11px] text-gray-500">
                  <span className="font-mono">{track.genre}</span>
                  <div className="flex items-center gap-1">
                    {user && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track);
                        }}
                        className="p-1.5 transition-colors"
                        title={isLiked(track) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Heart size={16} className={isLiked(track) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-white'} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrackForPlaylist(track);
                      }}
                      className="p-1.5 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-white/10 transition-colors"
                      title="Ajouter à une playlist"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2 : PLAYLISTS PAR ÉPOQUE & DÉCENNIES (70s, 80s, 90s, 2000s, 2010s, 2020s) */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-white text-equinox tracking-wider flex items-center gap-2.5">
                <Calendar size={20} className="text-cyan-400" />
                <span>Playlists par Époque & Décennies</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Voyagez dans le temps avec les plus grands hymnes des années 70 à nos jours
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DECADE_PLAYLISTS.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => handlePlayPlaylist(playlist)}
                className="bg-[#120f0a] border border-white/10 rounded-2xl overflow-hidden hover:border-cyan-400/50 cursor-pointer group transition-all flex flex-col justify-between shadow-sm hover:shadow-lg"
              >
                <div className="relative h-40 w-full overflow-hidden bg-[#222]">
                  <img src={playlist.cover} alt={playlist.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-cyan-500 text-black shadow-md font-mono">
                      {playlist.era}
                    </span>
                    <button className="w-10 h-10 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg transform translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors">
                      {playlist.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {playlist.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-gray-400">
                    <span>{playlist.tracks.length} titres emblématiques</span>
                    <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>Écouter</span>
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3 : RECOMMANDATIONS INTELLIGENTES */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-white text-equinox tracking-wider flex items-center gap-2.5">
                <Sparkles size={20} className="text-amber-400" />
                <span>Recommandations selon vos écoutes ({currentTrack ? currentTrack.artist : 'Tendances'})</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {smartRecommendations.slice(0, 6).map((track, idx) => (
              <div
                key={`smart-${track.videoId}-${idx}`}
                onClick={() => play(track)}
                className="bg-[#120f0a] p-3 rounded-2xl border border-white/10 hover:border-[var(--color-brass)]/50 cursor-pointer group transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm bg-[#222]">
                    <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play size={16} fill="currentColor" className="text-white ml-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate group-hover:text-amber-400">
                      {track.title}
                    </p>
                    <p 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArtistClick(track.artist);
                      }}
                      className="text-[11px] text-gray-400 truncate hover:text-amber-400 mt-0.5"
                    >
                      {track.artist}
                    </p>
                  </div>
                </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {user && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track);
                        }}
                        className="p-1.5 transition-colors"
                        title={isLiked(track) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Heart size={16} className={isLiked(track) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-white'} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrackForPlaylist(track);
                      }}
                      className="p-1.5 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-white/10 shrink-0"
                      title="Ajouter à une playlist"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4 : ARTISTES PHARES & LÉGENDES */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-white text-equinox tracking-wider flex items-center gap-2.5">
                <User size={20} className="text-amber-400" />
                <span>Artistes Phares & Légendes</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Explorez la discographie complète et suivez vos artistes préférés
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {FEATURED_ARTISTS.map((artist) => (
              <div
                key={artist.name}
                onClick={() => handleArtistClick(artist.name)}
                className="bg-[#120f0a] p-4 rounded-2xl border border-white/10 hover:border-[var(--color-brass)]/50 cursor-pointer group transition-all flex flex-col items-center text-center shadow-sm"
              >
                <div className="relative w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-amber-500/30 group-hover:border-amber-400 transition-all shadow-md">
                  <ArtistAvatar 
                    artistName={artist.name} 
                    fallbackSrc={artist.avatar} 
                    className="w-full h-full object-cover"
                  />
                </div>

                <span className="text-[9px] uppercase font-bold text-amber-400 font-mono tracking-wider truncate w-full">
                  {artist.genre}
                </span>
                <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors mt-1 truncate w-full">
                  {artist.name}
                </h3>
              </div>
            ))}
          </div>
        </div>

      </div>

      <AddToPlaylistModal
        track={selectedTrackForPlaylist}
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
      />

    </div>
  );
}
