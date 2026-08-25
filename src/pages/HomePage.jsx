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
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c29e5a] shadow-[0_0_8px_#c29e5a]" />
                <span>Nouveautés & Sorties Récentes</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5 uppercase tracking-wider">
                Sabrina Carpenter, Billie Eilish, Kendrick Lamar, Lady Gaga...
              </p>
            </div>
            <button
              onClick={() => setQueueAndPlay(FRESH_NEW_RELEASES.slice(0, 4), 0)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c29e5a] hover:opacity-90 active:scale-95 text-[#0d0c0b] text-[10px] uppercase tracking-widest font-black transition-all shadow-md cursor-pointer"
            >
              <Play size={11} fill="currentColor" />
              <span>Tout lire</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FRESH_NEW_RELEASES.slice(0, 4).map((track) => (
              <div
                key={`fresh-${track.videoId}`}
                onClick={() => play(track)}
                className="bg-white/[0.01] hover:bg-white/[0.04] border border-white/[0.04] hover:border-[#c29e5a]/30 rounded-2xl p-3.5 cursor-pointer group transition-all duration-300 flex flex-col justify-between shadow-lg backdrop-blur-md relative"
              >
                <div>
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-3 bg-black/40 border border-white/[0.02]">
                    <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-black/80 text-[#c29e5a] shadow-md border border-[#c29e5a]/20 font-mono">
                        {track.year || '2024'}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                      <div className="w-9 h-9 rounded-full bg-[#c29e5a] text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-xs truncate group-hover:text-[#c29e5a] transition-colors uppercase tracking-tight">
                    {track.title}
                  </h3>
                  <p 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArtistClick(track.artist);
                    }}
                    className="text-[11px] text-gray-500 truncate hover:text-[#c29e5a] mt-1 font-semibold transition-colors"
                  >
                    {track.artist}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.03] text-[10px] text-gray-500">
                  <span className="font-mono uppercase tracking-wider text-[9px]">{track.genre}</span>
                  <div className="flex items-center gap-1.5">
                    {user && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track);
                        }}
                        className="p-1 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                        title={isLiked(track) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Heart size={14} className={isLiked(track) ? 'text-red-500 fill-red-500' : 'text-gray-500 hover:text-white'} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrackForPlaylist(track);
                      }}
                      className="p-1 text-gray-500 hover:text-[#c29e5a] rounded transition-all hover:scale-110 cursor-pointer"
                      title="Ajouter à une playlist"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2 : PLAYLISTS PAR ÉPOQUE & DÉCENNIES */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c29e5a] shadow-[0_0_8px_#c29e5a]" />
                <span>Playlists par Époque & Décennies</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5 uppercase tracking-wider">
                Voyagez dans le temps avec les plus grands hymnes des années 70 à nos jours
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DECADE_PLAYLISTS.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => handlePlayPlaylist(playlist)}
                className="bg-white/[0.01] hover:bg-white/[0.04] border border-white/[0.04] hover:border-[#c29e5a]/30 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col justify-between shadow-lg backdrop-blur-md"
              >
                <div className="relative h-36 w-full overflow-hidden bg-black/30 border-b border-white/[0.02]">
                  <img src={playlist.cover} alt={playlist.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0c0b]/90 via-[#0d0c0b]/20 to-transparent" />
                  
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-black/80 text-[#c29e5a] shadow-md border border-[#c29e5a]/20 font-mono">
                      {playlist.era}
                    </span>
                    <button className="w-9 h-9 rounded-full bg-[#c29e5a] text-black flex items-center justify-center shadow-lg transform translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <Play size={16} fill="currentColor" className="ml-0.5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-tight group-hover:text-[#c29e5a] transition-colors">
                      {playlist.title}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {playlist.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.03] text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                    <span>{playlist.tracks.length} titres mythiques</span>
                    <span className="text-[#c29e5a] font-bold flex items-center gap-1">
                      <span>Écouter</span>
                      <ChevronRight size={12} />
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
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c29e5a] shadow-[0_0_8px_#c29e5a]" />
                <span>Recommandations selon vos écoutes ({currentTrack ? currentTrack.artist : 'Tendances'})</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {smartRecommendations.slice(0, 6).map((track, idx) => (
              <div
                key={`smart-${track.videoId}-${idx}`}
                onClick={() => play(track)}
                className="bg-white/[0.01] hover:bg-white/[0.04] border border-white/[0.04] hover:border-[#c29e5a]/30 p-3 rounded-2xl cursor-pointer group transition-all duration-300 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-sm bg-black/40 border border-white/[0.02]">
                    <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                      <Play size={14} fill="currentColor" className="text-white ml-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate group-hover:text-[#c29e5a] transition-colors uppercase tracking-tight">
                      {track.title}
                    </p>
                    <p 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArtistClick(track.artist);
                      }}
                      className="text-[11px] text-gray-500 truncate hover:text-[#c29e5a] mt-0.5 font-semibold transition-colors"
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
                      className="p-1 transition-transform hover:scale-110 cursor-pointer"
                      title={isLiked(track) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Heart size={14} className={isLiked(track) ? 'text-red-500 fill-red-500' : 'text-gray-500 hover:text-white'} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrackForPlaylist(track);
                    }}
                    className="p-1 text-gray-500 hover:text-[#c29e5a] rounded transition-transform hover:scale-110 cursor-pointer"
                    title="Ajouter à une playlist"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4 : ARTISTES PHARES */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c29e5a] shadow-[0_0_8px_#c29e5a]" />
                <span>Artistes Phares & Légendes</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5 uppercase tracking-wider">
                Explorez la discographie complète et suivez vos artistes préférés
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {FEATURED_ARTISTS.map((artist) => (
              <div
                key={artist.name}
                onClick={() => handleArtistClick(artist.name)}
                className="bg-white/[0.01] hover:bg-white/[0.04] border border-white/[0.04] hover:border-[#c29e5a]/30 p-4 rounded-2xl cursor-pointer group transition-all duration-300 flex flex-col items-center text-center shadow-lg"
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden mb-3 border border-white/10 group-hover:border-[#c29e5a] transition-all duration-300 shadow-md">
                  <ArtistAvatar 
                    artistName={artist.name} 
                    fallbackSrc={artist.avatar} 
                    className="w-full h-full object-cover"
                  />
                </div>

                <span className="text-[8.5px] uppercase font-black text-[#c29e5a] font-mono tracking-widest truncate w-full">
                  {artist.genre}
                </span>
                <h3 className="text-xs font-bold text-white group-hover:text-[#c29e5a] transition-colors mt-1.5 truncate w-full uppercase tracking-tight">
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
