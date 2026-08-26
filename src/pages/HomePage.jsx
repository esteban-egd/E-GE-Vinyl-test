import { useState, useEffect, useMemo } from 'react';
import { useAudio } from '../context/AudioContext';
import { 
  FEATURED_ARTISTS, 
  FRESH_NEW_RELEASES, 
  DECADE_PLAYLISTS, 
  GENRE_PLAYLISTS,
  TRENDING_TRACKS, 
  getMainArtistName,
  isArtistMatch 
} from '../services/musicDataService';
import { useNavigate } from 'react-router-dom';
import ArtistAvatar from '../components/common/ArtistAvatar';
import AddToPlaylistModal from '../components/common/AddToPlaylistModal';
import PlaylistDetailModal from '../components/common/PlaylistDetailModal';
import TrackImage from '../components/common/TrackImage';
import db from '../lib/db';
import { 
  Disc, 
  Search, 
  Play, 
  Pause,
  ChevronRight, 
  Plus,
  Heart,
  Flame,
  Clock,
  Music2,
  Sparkles,
  Layers,
  RefreshCw
} from 'lucide-react';
import { useLikes } from '../hooks/useLikes';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function HomePage() {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const { play, setQueueAndPlay, isPlaying, currentTrack, togglePlayPause } = useAudio();
  const { isLiked, toggleLike } = useLikes();
  const navigate = useNavigate();

  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [recentPlayedTracks, setRecentPlayedTracks] = useState([]);
  const [lastPlayedArtist, setLastPlayedArtist] = useState(null);

  // Dynamic Spotify New Releases state
  const [newReleases, setNewReleases] = useState(FRESH_NEW_RELEASES);
  const [isLoadingReleases, setIsLoadingReleases] = useState(false);

  // Fetch real dynamic weekly Spotify new releases with fallback to curated releases
  useEffect(() => {
    let active = true;
    async function fetchLiveReleases() {
      setIsLoadingReleases(true);
      try {
        const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://api.deezer.com/editorial/0/releases'));
        if (response.ok) {
          const data = await response.json();
          if (data && data.data && data.data.length > 0) {
            const formatted = data.data.slice(0, 8).map(item => ({
              videoId: `dz_${item.id}`,
              title: item.title,
              mainTrackTitle: item.title,
              artist: item.artist?.name || 'Artiste Spotify',
              album: item.title,
              thumbnail: item.cover_xl || item.cover_big || item.cover_medium,
              duration: 210,
              source: 'spotify',
              year: item.release_date ? new Date(item.release_date).getFullYear().toString() : '2024',
              type: item.record_type === 'single' ? 'Single' : 'Album',
              genre: 'Sortie Officielle',
              tracks: [
                {
                  videoId: `dz_${item.id}`,
                  title: item.title,
                  artist: item.artist?.name || 'Artiste Spotify',
                  album: item.title,
                  thumbnail: item.cover_xl || item.cover_big || item.cover_medium,
                  duration: 210
                }
              ]
            }));
            if (active && formatted.length >= 4) {
              setNewReleases(formatted);
            }
          }
        }
      } catch (e) {
        console.warn('Live releases API fallback to curated releases:', e);
      } finally {
        if (active) setIsLoadingReleases(false);
      }
    }
    fetchLiveReleases();
    return () => { active = false; };
  }, []);

  // Load listening history from Dexie DB
  useEffect(() => {
    let isMounted = true;
    async function loadUserHistory() {
      try {
        const history = await db.tracks.orderBy('addedAt').reverse().limit(12).toArray();
        if (isMounted && history && history.length > 0) {
          setRecentPlayedTracks(history);
          setLastPlayedArtist(history[0].artist);
        }
      } catch (err) {
        console.warn('Error loading listening history:', err);
      }
    }
    loadUserHistory();
    return () => { isMounted = false; };
  }, [currentTrack]);

  // Daily Mix compilation based on history or trending
  const dailyMixPlaylist = useMemo(() => {
    const baseTracks = recentPlayedTracks.length >= 4 
      ? recentPlayedTracks 
      : TRENDING_TRACKS.slice(0, 10);
    return {
      id: 'daily-mix-1',
      title: 'Mix Quotidien #1',
      description: 'Compilation personnalisée basée sur vos écoutes récentes et préférences musicales',
      cover: baseTracks[0]?.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      era: 'Sur mesure',
      tracks: baseTracks
    };
  }, [recentPlayedTracks]);

  // Dynamic recommendations ("Pour vous")
  const smartRecommendations = useMemo(() => {
    const seedArtist = currentTrack?.artist || lastPlayedArtist;
    if (!seedArtist) {
      return newReleases.slice(0, 6);
    }
    const matched = TRENDING_TRACKS.filter(t => 
      t.artist.toLowerCase().includes(seedArtist.toLowerCase() || '') ||
      t.genre === currentTrack?.genre
    );
    if (matched.length >= 4) return matched.slice(0, 6);
    return TRENDING_TRACKS.slice(0, 6);
  }, [currentTrack, lastPlayedArtist, newReleases]);

  const handleArtistClick = (artistArg) => {
    const artistName = typeof artistArg === 'string' ? artistArg : artistArg.name;
    const main = getMainArtistName(artistName);
    const artistObj = FEATURED_ARTISTS.find(a => a.name.toLowerCase() === main.toLowerCase()) || {
      name: main,
      avatar: '',
      genre: 'Artiste'
    };
    const artistTracks = TRENDING_TRACKS.filter(t => isArtistMatch(t.artist, main)).length > 0
      ? TRENDING_TRACKS.filter(t => isArtistMatch(t.artist, main))
      : FRESH_NEW_RELEASES.slice(0, 6);

    setSelectedPlaylist({
      title: artistObj.name,
      cover: artistObj.avatar || artistTracks[0]?.thumbnail || '',
      description: `Discographie et plus grands succès de ${artistObj.name} (${artistObj.genre || 'Musique'})`,
      era: artistObj.genre || 'Sélection',
      tracks: artistTracks
    });
  };

  const handleOpenItemAsPlaylist = (item, type) => {
    const itemTracks = (item.tracks && item.tracks.length > 0)
      ? item.tracks
      : [item, ...TRENDING_TRACKS.filter(t => t.videoId !== item.videoId && (t.artist === item.artist || t.genre === item.genre)).slice(0, 8)];

    setSelectedPlaylist({
      title: item.title,
      cover: item.thumbnail,
      description: `${type || item.type || 'Nouveauté'} • ${item.artist || 'Artiste'} (${item.year || '2024'})`,
      era: item.year || item.genre || 'Sélection',
      tracks: itemTracks
    });
  };

  const handlePlayRelease = (release) => {
    if (release.tracks && release.tracks.length > 0) {
      if (currentTrack?.videoId === release.tracks[0].videoId) {
        togglePlayPause();
      } else {
        setQueueAndPlay(release.tracks, 0);
      }
    } else {
      if (currentTrack?.videoId === release.videoId) {
        togglePlayPause();
      } else {
        play(release);
      }
    }
  };

  const handleOpenPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-4 flex flex-col gap-10 box-border pb-32 fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 border-b border-white/10 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-[var(--color-theme-accent)] border border-[var(--color-sand)] flex items-center justify-center text-[var(--color-brass)] shadow-lg">
            <Disc size={22} className={isPlaying ? "animate-spin-slow" : ""} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none uppercase">
              Le Salon E-GE
            </h1>
            <span className="text-[10px] text-gray-400 font-bold block mt-1 uppercase tracking-widest">
              Recommandations Personnalisées, Platine 3D & Playlists
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/search')}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            <Search size={14} style={{ color: currentTheme.primary }} />
            <span>Recherche globale & Top 50...</span>
          </button>
        </div>
      </div>

      {/* 3D VINYL PLAYER BANNER */}
      <div 
        onClick={() => navigate('/player')}
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-white/20 transition-all duration-300 cursor-pointer shadow-[0_20px_40px_rgba(0,0,0,0.6)] group"
        style={{ backgroundColor: currentTheme.cardBg }}
      >
        <div 
          className="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl transition-all duration-500" 
          style={{ backgroundColor: `${currentTheme.primary}20` }}
        />
        
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left z-10">
          <div 
            className="w-16 h-16 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500 shrink-0 relative overflow-hidden"
            style={{ color: currentTheme.primary }}
          >
            <Disc size={34} className="animate-spin-slow relative z-10" style={{ color: currentTheme.primary }} />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-60" />
          </div>
          
          <div className="space-y-1">
            <span 
              className="text-[9px] font-black uppercase tracking-[0.25em] border px-3 py-1 rounded-full inline-block font-mono"
              style={{ backgroundColor: currentTheme.bgAccent, color: currentTheme.primary, borderColor: `${currentTheme.primary}40` }}
            >
              Expérience Audiophile
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
              Platine Vinyle Interactive 3D
            </h2>
            <p className="text-xs text-gray-400 max-w-md leading-relaxed font-medium">
              Manipulez physiquement le saphir, ajustez le pitch et ressentez le grain des plus grands classiques.
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/player');
          }}
          className="px-6 py-3.5 text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-2 shadow-lg shrink-0 cursor-pointer z-10"
          style={{ backgroundColor: currentTheme.primary }}
        >
          <Play size={12} fill="currentColor" className="stroke-none" />
          <span>Ouvrir la Platine</span>
        </button>
      </div>

      {/* SECTION : RECOMMANDATIONS DYNAMIQUES D'ÉCOUTE & MIX QUOTIDIEN */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
              <Sparkles size={20} style={{ color: currentTheme.primary }} />
              <span>Pour vous & Mix Quotidien</span>
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Généré automatiquement selon vos écoutes et votre profil musical
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mix Quotidien Card */}
          <div 
            onClick={() => handleOpenPlaylist(dailyMixPlaylist)}
            className="lg:col-span-1 bg-gradient-to-br from-[#1DB954]/20 via-[#121110] to-black border border-[#1DB954]/30 rounded-3xl p-6 flex flex-col justify-between shadow-2xl hover:border-[#1DB954] transition-all duration-300 cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1DB954]/10 rounded-full blur-2xl group-hover:bg-[#1DB954]/20 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#1DB954] text-black font-mono shadow-md">
                  Recommandé aujourd'hui
                </span>
                <Sparkles size={18} className="text-[#1DB954]" />
              </div>

              <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4 border border-white/10 bg-black/40">
                <img src={dailyMixPlaylist.cover} alt="Mix Quotidien" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQueueAndPlay(dailyMixPlaylist.tracks, 0);
                  }}
                  className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Play size={20} fill="currentColor" className="ml-0.5 stroke-none" />
                </button>
              </div>

              <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-[#1DB954] transition-colors">
                {dailyMixPlaylist.title}
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {dailyMixPlaylist.description}
              </p>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs text-gray-400 font-mono">
              <span>{dailyMixPlaylist.tracks.length} titres recommandés</span>
              <span className="text-[#1DB954] font-bold flex items-center gap-1">
                <span>Écouter</span>
                <ChevronRight size={14} />
              </span>
            </div>
          </div>

          {/* Grid "Inspiré par vos écoutes" */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
              <Clock size={14} className="text-[#1DB954]" />
              <span>Inspiré par vos écoutes ({smartRecommendations.length} morceaux)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {smartRecommendations.map((track, idx) => (
                <div
                  key={`smart-${track.videoId}-${idx}`}
                  onClick={() => handleOpenItemAsPlaylist(track, 'Recommandation')}
                  className="bg-[#121110] hover:bg-white/[0.06] border border-white/10 p-3 rounded-2xl cursor-pointer group transition-all duration-200 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm bg-black/40 border border-white/10">
                      <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <Play size={14} fill="currentColor" className="text-white ml-0.5" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-[#1DB954] transition-colors uppercase tracking-tight">
                        {track.title}
                      </p>
                      <p 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArtistClick(track.artist);
                        }}
                        className="text-[11px] text-gray-400 truncate hover:text-[#1DB954] mt-0.5 font-medium transition-colors"
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
                        className="p-1.5 transition-transform hover:scale-110 cursor-pointer"
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
                      className="p-1.5 text-gray-400 hover:text-[#1DB954] rounded transition-transform hover:scale-110 cursor-pointer"
                      title="Ajouter à une playlist"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION : NOUVEAUTÉS & SORTIES RÉCENTES (VRAIES SORTIES SPOTIFY HD) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-white/10 gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954] shadow-[0_0_10px_#1DB954]" />
              <Flame size={20} className="text-[#1DB954]" />
              <span>Nouveautés & Sorties Récentes</span>
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Les derniers albums et singles officiels sortis cette semaine sur Spotify
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isLoadingReleases && (
              <span className="text-xs text-gray-400 font-mono flex items-center gap-1.5 animate-pulse">
                <RefreshCw size={12} className="animate-spin text-[#1DB954]" />
                Mise à jour...
              </span>
            )}
            <button
              onClick={() => {
                const allTracks = newReleases.flatMap(r => r.tracks || [r]);
                setQueueAndPlay(allTracks, 0);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 text-black text-xs uppercase tracking-wider font-black transition-all shadow-md cursor-pointer"
            >
              <Play size={12} fill="currentColor" className="stroke-none" />
              <span>Tout lire</span>
            </button>
          </div>
        </div>

        {/* CARTES ET VISUELS HD STYLE SPOTIFY */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {newReleases.map((item, idx) => {
            const isThisPlaying = (currentTrack?.videoId === item.videoId || (item.tracks && item.tracks.some(t => t.videoId === currentTrack?.videoId))) && isPlaying;

            return (
              <div
                key={`new-release-${item.videoId || idx}`}
                onClick={() => handleOpenItemAsPlaylist(item, item.type || 'Album')}
                className="bg-[#121110] hover:bg-white/[0.08] border border-white/10 rounded-xl p-3.5 cursor-pointer group transition-all duration-300 flex flex-col justify-between shadow-xl relative"
              >
                <div>
                  {/* Image carrée avec coins légèrement arrondis (rounded-md) */}
                  <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3 bg-black/40 border border-white/10 shadow-md">
                    <TrackImage 
                      src={item.thumbnail} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />

                    {/* Badge type de sortie (Album / Single) */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md bg-black/85 text-[#1DB954] shadow-md border border-[#1DB954]/30 font-mono uppercase">
                        {item.type || 'Album'}
                      </span>
                    </div>

                    {/* Bouton "Play" vert/cyan néon en superposition au survol */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayRelease(item);
                        }}
                        className="w-12 h-12 rounded-full bg-[#1DB954] text-black shadow-2xl flex items-center justify-center transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                        title={`Écouter ${item.title}`}
                      >
                        {isThisPlaying ? (
                          <Pause size={20} fill="currentColor" className="stroke-none" />
                        ) : (
                          <Play size={20} fill="currentColor" className="ml-0.5 stroke-none" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Titre du projet / Morceau en gras */}
                  <h3 className="text-white font-bold text-xs sm:text-sm truncate group-hover:text-[#1DB954] transition-colors tracking-tight">
                    {item.title}
                  </h3>

                  {/* Nom de l'artiste + mention "Album" ou "Single" */}
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 font-medium truncate">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArtistClick(item.artist);
                      }}
                      className="hover:text-[#1DB954] transition-colors truncate"
                    >
                      {item.artist}
                    </span>
                    <span className="text-gray-600 font-bold">•</span>
                    <span className="text-[10px] text-gray-400 font-mono font-semibold uppercase shrink-0">
                      {item.type || 'Album'}
                    </span>
                  </div>
                </div>

                {/* Information de bas de carte : Genre / Actions favoris & playlist */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 text-xs text-gray-500">
                  <span className="font-mono text-[10px] uppercase text-[#1DB954] font-semibold truncate max-w-[100px]">
                    {item.genre || 'Nouveauté'}
                  </span>
                  <div className="flex items-center gap-1">
                    {user && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(item);
                        }}
                        className="p-1.5 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                        title={isLiked(item) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Heart size={14} className={isLiked(item) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-white'} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrackForPlaylist(item);
                      }}
                      className="p-1.5 text-gray-400 hover:text-[#1DB954] rounded transition-all hover:scale-110 cursor-pointer"
                      title="Ajouter à une playlist"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION : PAR GENRES & AMBIANCE (SPOTIFY COLORFUL CARDS) */}
      <div className="space-y-4">
        <div className="pb-2 border-b border-white/10">
          <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954]" />
            <Layers size={20} className="text-[#1DB954]" />
            <span>Par Genres & Ambiances</span>
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Explorez la musique par style, de la Pop au Rap en passant par l'Electro et le Rock
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {GENRE_PLAYLISTS.map((genre) => (
            <div
              key={genre.id}
              onClick={() => handleOpenPlaylist(genre)}
              className={`bg-gradient-to-br ${genre.color} rounded-2xl p-4 h-36 flex flex-col justify-between cursor-pointer group transition-all duration-300 hover:scale-[1.03] shadow-xl relative overflow-hidden border border-white/10`}
            >
              <div className="z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 font-mono">
                  Genre
                </span>
                <h3 className="text-sm font-black text-white uppercase tracking-tight mt-0.5">
                  {genre.title}
                </h3>
              </div>

              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-white/90 font-bold">
                <span>{genre.tracks.length} titres</span>
                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                  <Play size={12} fill="currentColor" className="ml-0.5" />
                </div>
              </div>

              {/* Decorative graphic background */}
              <img 
                src={genre.cover} 
                alt={genre.title} 
                className="absolute -right-4 -bottom-4 w-24 h-24 rounded-xl object-cover opacity-40 rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 pointer-events-none shadow-2xl" 
              />
            </div>
          ))}
        </div>
      </div>

      {/* SECTION : PLAYLISTS PAR ÉPOQUE & DÉCENNIES */}
      <div className="space-y-4">
        <div className="pb-2 border-b border-white/10">
          <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954]" />
            <Music2 size={20} className="text-[#1DB954]" />
            <span>Playlists par Époque & Décennies</span>
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Revivez les grandes époques de la musique des années 70 à 2020
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DECADE_PLAYLISTS.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => handleOpenPlaylist(playlist)}
              className="bg-[#121110] hover:bg-white/[0.06] border border-white/10 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col justify-between shadow-xl"
            >
              <div className="relative h-44 w-full overflow-hidden bg-black/40 border-b border-white/10">
                <img src={playlist.cover} alt={playlist.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121110] via-black/20 to-transparent" />
                
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded bg-black/80 text-[#1DB954] shadow-md border border-[#1DB954]/30 font-mono">
                    Époque {playlist.era}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setQueueAndPlay(playlist.tracks, 0);
                    }}
                    className="w-11 h-11 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl transform translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 cursor-pointer hover:scale-110"
                    title="Lecture rapide"
                  >
                    <Play size={18} fill="currentColor" className="ml-0.5 stroke-none" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm uppercase tracking-tight group-hover:text-[#1DB954] transition-colors">
                    {playlist.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {playlist.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs font-mono text-gray-500 uppercase tracking-wider">
                  <span>{playlist.tracks.length} morceaux culte</span>
                  <span className="text-[#1DB954] font-bold flex items-center gap-1">
                    <span>Ouvrir</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION : ARTISTES PHARES & LÉGENDES */}
      <div className="space-y-4">
        <div className="pb-2 border-b border-white/10">
          <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954]" />
            <span>Artistes Phares & Légendes</span>
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Accédez aux discographies complètes et titres incontournables
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {FEATURED_ARTISTS.map((artist) => (
            <div
              key={artist.name}
              onClick={() => handleArtistClick(artist)}
              className="bg-[#121110] hover:bg-white/[0.06] border border-white/10 p-4 rounded-2xl cursor-pointer group transition-all duration-300 flex flex-col items-center text-center shadow-lg"
            >
              <div className="relative w-18 h-18 rounded-full overflow-hidden mb-3 border-2 border-white/10 group-hover:border-[#1DB954] transition-all duration-300 shadow-md">
                <ArtistAvatar 
                  artistName={artist.name} 
                  fallbackSrc={artist.avatar} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>

              <span className="text-[9px] uppercase font-black text-[#1DB954] font-mono tracking-widest truncate w-full">
                {artist.genre}
              </span>
              <h3 className="text-xs font-bold text-white group-hover:text-[#1DB954] transition-colors mt-1 truncate w-full uppercase tracking-tight">
                {artist.name}
              </h3>
            </div>
          ))}
        </div>
      </div>

      <AddToPlaylistModal
        track={selectedTrackForPlaylist}
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
      />

      <PlaylistDetailModal
        playlist={selectedPlaylist}
        isOpen={!!selectedPlaylist}
        onClose={() => setSelectedPlaylist(null)}
      />

    </div>
  );
}
