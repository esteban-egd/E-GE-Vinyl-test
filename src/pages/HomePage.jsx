import { useState, useEffect, useMemo } from 'react';
import { useAudio } from '../context/AudioContext';
import { 
  FEATURED_ARTISTS, 
  getMainArtistName,
  normalizeArtistKey
} from '../services/musicDataService';
import { 
  getDeezerChartAlbums, 
  getDeezerChartTracks, 
  getDeezerChartArtists 
} from '../services/discoveryService';
import { getAlbumTracksDeezer } from '../services/artistService';
import { useNavigate } from 'react-router-dom';
import ArtistAvatar from '../components/common/ArtistAvatar';
import AddToPlaylistModal from '../components/common/AddToPlaylistModal';
import PlaylistDetailModal from '../components/common/PlaylistDetailModal';
import db from '../lib/db';
import { 
  Search, 
  Play, 
  Pause,
  Heart,
  Sparkles,
  Flame,
  Radio,
  UserCheck
} from 'lucide-react';
import { useLikes } from '../hooks/useLikes';
import { useAuth } from '../context/AuthContext';

const DEFAULT_HD_COVER = 'https://e-cdns-images.dzcdn.net/images/cover/03f273295988e0b6732f7a942512f5a0/500x500-000000-80-0-0.jpg';

export default function HomePage() {
  const { user } = useAuth();
  const { play, setQueueAndPlay, isPlaying, currentTrack, togglePlayPause, isCurrentTrack } = useAudio();
  const { likedTracks } = useLikes();
  const navigate = useNavigate();

  // Modals state
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  // Listening history
  const [recentPlayedTracks, setRecentPlayedTracks] = useState([]);
  
  // Deezer Live Discoveries / Chart Albums
  const [newReleases, setNewReleases] = useState([]);
  const [isLoadingReleases, setIsLoadingReleases] = useState(true);

  // Deezer Live Top Tracks & Artists
  const [chartTracks, setChartTracks] = useState([]);
  const [chartArtists, setChartArtists] = useState([]);

  // Recommendations based on history + chart
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [seedArtistName, setSeedArtistName] = useState('');
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Dynamic greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bonjour";
    if (hour >= 12 && hour < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

  // Load user listening history from Dexie DB
  useEffect(() => {
    let isMounted = true;
    async function loadUserHistory() {
      try {
        const history = await db.tracks.orderBy('addedAt').reverse().limit(16).toArray();
        if (isMounted && history && history.length > 0) {
          setRecentPlayedTracks(history);
          if (history[0]?.artist) {
            setSeedArtistName(getMainArtistName(history[0].artist));
          }
        }
      } catch (err) {
        console.warn('Erreur chargement historique:', err);
      }
    }
    loadUserHistory();
    return () => { isMounted = false; };
  }, [currentTrack]);

  // Fetch Deezer Official Chart (Albums, Tracks, Artists)
  useEffect(() => {
    let active = true;
    async function loadDeezerChartData() {
      setIsLoadingReleases(true);
      try {
        const [albums, tracks, artists] = await Promise.all([
          getDeezerChartAlbums(18),
          getDeezerChartTracks(25),
          getDeezerChartArtists(12)
        ]);

        if (active) {
          if (albums && albums.length > 0) {
            setNewReleases(albums);
          }
          if (tracks && tracks.length > 0) {
            setChartTracks(tracks);
          }
          if (artists && artists.length > 0) {
            setChartArtists(artists);
          }
          setIsLoadingReleases(false);
        }
      } catch (err) {
        console.warn('Erreur chargement chart Deezer:', err);
        if (active) setIsLoadingReleases(false);
      }
    }

    loadDeezerChartData();
    return () => { active = false; };
  }, []);

  // Quick Start cards grid for top header (Spotify style 6-grid)
  const quickStartGrid = useMemo(() => {
    const cards = [];

    // Card 1: Liked Tracks
    if (likedTracks && likedTracks.length > 0) {
      cards.push({
        id: 'liked-tracks-quick',
        title: 'Titres likés',
        subtitle: `${likedTracks.length} morceau${likedTracks.length > 1 ? 's' : ''}`,
        cover: likedTracks[0]?.thumbnail || DEFAULT_HD_COVER,
        isGradientCover: true,
        tracks: likedTracks.map(t => ({
          videoId: t.video_id || t.videoId,
          title: t.title,
          artist: t.artist,
          thumbnail: t.thumbnail || DEFAULT_HD_COVER,
          duration: t.duration || 210
        }))
      });
    }

    // Card 2..6: Most recent played unique items
    const seenIds = new Set();
    recentPlayedTracks.forEach(track => {
      const id = track.videoId || track.id;
      if (id && !seenIds.has(id) && cards.length < 6) {
        seenIds.add(id);
        cards.push({
          id: `quick_${id}`,
          title: track.title,
          subtitle: track.artist,
          cover: track.thumbnail || track.cover || DEFAULT_HD_COVER,
          track: track
        });
      }
    });

    // Fill remaining with Deezer Chart tracks if user has few history items
    if (cards.length < 6 && chartTracks.length > 0) {
      chartTracks.forEach(track => {
        const id = track.videoId || track.id;
        if (cards.length < 6 && !seenIds.has(id)) {
          seenIds.add(id);
          cards.push({
            id: `quick_trend_${id}`,
            title: track.title,
            subtitle: track.artist,
            cover: track.cover_big || track.thumbnail || track.cover || DEFAULT_HD_COVER,
            track: track
          });
        }
      });
    }

    return cards;
  }, [likedTracks, recentPlayedTracks, chartTracks]);

  // Fetch Smart Recommendations ("Sélection Exclusive": 8 morceaux d'artistes DIFFÉRENTS)
  useEffect(() => {
    let active = true;
    async function fetchSmartRecommendations() {
      setIsLoadingRecommendations(true);
      
      const mixed8Tracks = [];
      const usedArtistKeys = new Set();

      // Pool of user history and liked tracks
      const userTrackPool = [
        ...(recentPlayedTracks || []),
        ...(likedTracks || [])
      ];

      // 1. Pick 1 track per artist from user history/likes
      for (const track of userTrackPool) {
        if (!track) continue;
        const artistName = track.artist || track.artists?.[0]?.name;
        const artKey = normalizeArtistKey(artistName);
        if (artKey && !usedArtistKeys.has(artKey)) {
          usedArtistKeys.add(artKey);
          mixed8Tracks.push({
            ...track,
            artist: getMainArtistName(artistName) || 'Artiste',
            thumbnail: track.cover_big || track.cover || track.thumbnail || DEFAULT_HD_COVER
          });
        }
        if (mixed8Tracks.length >= 8) break;
      }

      // 2. If we still need more tracks to reach 8, pick from chartTracks with distinct artists
      const pool = chartTracks.length > 0 ? chartTracks : [];
      for (const track of pool) {
        if (mixed8Tracks.length >= 8) break;
        const artistName = track.artist;
        const artKey = normalizeArtistKey(artistName);
        if (artKey && !usedArtistKeys.has(artKey)) {
          usedArtistKeys.add(artKey);
          mixed8Tracks.push({
            ...track,
            artist: getMainArtistName(artistName) || 'Artiste',
            thumbnail: track.cover_big || track.cover || track.thumbnail || DEFAULT_HD_COVER
          });
        }
      }

      if (active) {
        setRecommendedTracks(mixed8Tracks.slice(0, 8));
        setIsLoadingRecommendations(false);
      }
    }

    fetchSmartRecommendations();
    return () => { active = false; };
  }, [recentPlayedTracks, likedTracks, chartTracks]);

  // Personalized Mixes (Daily Mix 1, Daily Mix 2, Radio Artiste)
  const customMixes = useMemo(() => {
    const topArtist = seedArtistName || (chartArtists[0]?.name || 'Daft Punk');
    const firstCover = recommendedTracks[0]?.thumbnail || chartTracks[0]?.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80';
    const secondCover = recommendedTracks[1]?.thumbnail || chartTracks[1]?.thumbnail || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80';
    const thirdCover = likedTracks?.[0]?.thumbnail || chartTracks[2]?.thumbnail || DEFAULT_HD_COVER;

    return [
      {
        id: 'mix_daily_1',
        title: 'Daily Mix 1',
        description: `Un condensé sur-mesure combinant ${topArtist} et vos artistes récents.`,
        cover: firstCover,
        tracks: recommendedTracks.length > 0 ? recommendedTracks : chartTracks.slice(0, 10)
      },
      {
        id: 'mix_radio_artist',
        title: `Radio ${topArtist}`,
        description: `Découvrez des titres dans l'esprit de ${topArtist}.`,
        cover: secondCover,
        tracks: recommendedTracks.length > 0 ? recommendedTracks.slice().reverse() : chartTracks.slice(10, 20)
      },
      {
        id: 'mix_chill_hits',
        title: 'Mix Coup de Cœur',
        description: 'Morceaux coups de cœur et pépites tendance pour vous.',
        cover: thirdCover,
        tracks: likedTracks && likedTracks.length > 0 ? likedTracks : chartTracks.slice(0, 12)
      }
    ];
  }, [seedArtistName, recommendedTracks, likedTracks, chartTracks, chartArtists]);

  // Click on artist card
  const handleArtistClick = (artistName) => {
    const main = getMainArtistName(artistName);
    navigate(`/artist/${encodeURIComponent(main)}`);
  };

  // Play release / album
  const handlePlayRelease = async (release) => {
    if (release.tracks && release.tracks.length > 0) {
      if (isCurrentTrack(release.tracks[0])) {
        togglePlayPause();
      } else {
        setQueueAndPlay(release.tracks, 0);
      }
      return;
    }

    // Si c'est un album Deezer, récupérer sa tracklist
    if (release.deezerId || release.id) {
      try {
        const albumTracks = await getAlbumTracksDeezer(release.deezerId || release.id, release.artist, release);
        if (albumTracks && albumTracks.length > 0) {
          setQueueAndPlay(albumTracks, 0);
          return;
        }
      } catch (err) {
        console.warn('Erreur lecture tracks album:', err);
      }
    }

    const coverUrl = release.cover_big || release.cover_xl || release.cover_medium || release.cover || DEFAULT_HD_COVER;
    const trackObj = {
      id: `dz_${release.id || release.deezerId}`,
      deezerId: release.id || release.deezerId,
      videoId: `dz_${release.id || release.deezerId}`,
      title: release.title,
      artist: release.artist,
      album: release.title,
      albumId: release.id || release.deezerId,
      thumbnail: coverUrl,
      source: 'deezer'
    };

    if (isCurrentTrack(trackObj)) {
      togglePlayPause();
    } else {
      play(trackObj);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-10 box-border pb-32 fade-in bg-[var(--color-theme-bg)] text-white select-none">
      
      {/* 1. Header Greeting & Quick Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>{greeting}</span>
            {user?.email && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full">
                En ligne
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            Recommandations personnalisées selon vos habitudes d'écoute
          </p>
        </div>

        <button
          onClick={() => navigate('/search')}
          className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
        >
          <Search size={16} className="text-emerald-400" />
          <span>Rechercher un titre ou un artiste</span>
        </button>
      </div>

      {/* 2. Quick Start Grid (Spotify 6-card grid top of home) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickStartGrid.map((item) => {
          const isThisPlaying = ((item.track && isCurrentTrack(item.track)) ||
                                (item.tracks && isCurrentTrack(item.tracks[0]))) && isPlaying;

          const handleQuickPlay = (e) => {
            e.stopPropagation();
            if (item.tracks) {
              setQueueAndPlay(item.tracks, 0);
            } else if (item.track) {
              play(item.track);
            }
          };

          return (
            <div
              key={item.id}
              onClick={() => {
                if (item.tracks) {
                  setSelectedPlaylist({
                    title: item.title,
                    description: item.subtitle,
                    cover: item.cover,
                    tracks: item.tracks
                  });
                } else if (item.track) {
                  play(item.track);
                }
              }}
              className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer group shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {item.isGradientCover ? (
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-emerald-500 flex items-center justify-center shrink-0 shadow-md">
                    <Heart size={24} fill="currentColor" className="text-white" />
                  </div>
                ) : (
                  <img 
                    src={item.cover} 
                    alt={item.title} 
                    className="w-14 h-14 rounded-lg object-cover shrink-0 border border-white/10 shadow-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_HD_COVER;
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              {/* Green Spotify Play Button on Hover */}
              <button
                onClick={handleQuickPlay}
                className={`w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
                  isThisPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                } hover:bg-emerald-400 hover:scale-110 active:scale-95 shrink-0`}
              >
                {isThisPlaying ? (
                  <Pause size={18} fill="currentColor" className="stroke-none" />
                ) : (
                  <Play size={18} fill="currentColor" className="ml-0.5 stroke-none" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Section: "Sélection Exclusive" */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Sparkles size={20} className="text-emerald-400" />
              <span>Sélection Exclusive</span>
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Une sélection mixte de 8 morceaux d'artistes différents issus de vos écoutes et du Top Deezer
            </p>
          </div>
        </div>

        {/* Grid of 8 Recommended Tracks from 8 Different Artists */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          {isLoadingRecommendations ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-3 animate-pulse space-y-3">
                <div className="aspect-square bg-white/10 rounded-xl" />
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))
          ) : (
            recommendedTracks.slice(0, 8).map((track, idx) => {
              const isThisPlaying = isCurrentTrack(track) && isPlaying;
              const coverUrl = track.cover_big || track.cover || track.thumbnail || DEFAULT_HD_COVER;
              return (
                <div
                  key={`rec_track_${track.videoId || track.id || idx}`}
                  onClick={() => play(track)}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 p-3 rounded-2xl cursor-pointer group transition-all duration-300 flex flex-col justify-between shadow-sm relative"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 border border-white/10 shadow-md">
                    <img 
                      src={coverUrl} 
                      alt={track.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_HD_COVER;
                      }}
                    />
                    
                    {/* Play Overlay Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-end p-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          play(track);
                        }}
                        className="w-11 h-11 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl hover:bg-emerald-400 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      >
                        {isThisPlaying ? (
                          <Pause size={20} fill="currentColor" className="stroke-none" />
                        ) : (
                          <Play size={20} fill="currentColor" className="ml-0.5 stroke-none" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                      {track.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">
                      {track.artist}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Section: "Mixes créés pour vous" */}
      <div className="space-y-4 pt-2">
        <div className="pb-2 border-b border-white/5">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Radio size={20} className="text-purple-400" />
            <span>Mixes créés pour vous</span>
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Compilations générées automatiquement selon vos styles préférés
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {customMixes.map((mix) => (
            <div
              key={mix.id}
              onClick={() => setSelectedPlaylist(mix)}
              className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 p-4 rounded-2xl cursor-pointer group transition-all duration-300 flex flex-col justify-between shadow-md"
            >
              <div>
                <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-3.5 border border-white/10 shadow-lg">
                  <img 
                    src={mix.cover} 
                    alt={mix.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_HD_COVER;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setQueueAndPlay(mix.tracks, 0);
                    }}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play size={18} fill="currentColor" className="ml-0.5 stroke-none" />
                  </button>
                </div>

                <h3 className="font-bold text-base text-white group-hover:text-purple-400 transition-colors">
                  {mix.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
                  {mix.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 font-medium">
                <span>{mix.tracks.length} titres</span>
                <span className="text-purple-400 font-bold group-hover:underline">Écouter</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Section: "Découvertes du moment" (Albums & Singles Officiels Deezer Chart) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Flame size={20} className="text-amber-400" />
              <span>Découvertes du moment</span>
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Les albums et singles officiels les plus populaires du moment sur Deezer
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {isLoadingReleases ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-3 animate-pulse space-y-3">
                <div className="aspect-square bg-white/10 rounded-xl" />
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))
          ) : (
            newReleases.map((item, idx) => {
              // Extraction prioritaire de la pochette officielle Deezer HD
              const imageUrl = item?.cover_big || 
                               item?.cover_xl || 
                               item?.cover_medium || 
                               item?.cover || 
                               item?.album?.cover_big || 
                               item?.album?.cover_medium || 
                               DEFAULT_HD_COVER;

              const artistName = item.artist?.name || item.artist || 'Artiste';

              return (
                <div 
                  key={item.deezerId || item.id || idx} 
                  onClick={() => handleArtistClick(artistName)} 
                  className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 p-3 rounded-2xl cursor-pointer group transition-all duration-300 flex flex-col justify-between shadow-sm relative"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3.5 border border-white/10 shadow-md">
                    <img 
                      src={imageUrl} 
                      alt={item.title || 'Album'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_HD_COVER;
                      }}
                    />
                    {item.type && (
                      <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-[9px] font-black uppercase tracking-wider text-amber-300 px-2 py-0.5 rounded-full border border-white/10">
                        {item.type}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-end p-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayRelease(item);
                        }}
                        className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl hover:bg-emerald-400 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        title="Écouter l'album"
                      >
                        <Play size={18} fill="currentColor" className="ml-0.5 stroke-none" />
                      </button>
                    </div>
                  </div>
                  <p className="font-bold text-white truncate group-hover:text-amber-300 transition-colors">{item.title}</p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{artistName}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Section: "Artistes suggérés pour vous" */}
      <div className="space-y-4 pt-2">
        <div className="pb-2 border-b border-white/5">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <UserCheck size={20} className="text-indigo-400" />
            <span>Artistes recommandés selon vos goûts</span>
          </h2>
        </div>

        <div className="flex items-center gap-5 overflow-x-auto pb-4 scrollbar-hide">
          {(chartArtists.length > 0 ? chartArtists : FEATURED_ARTISTS).slice(0, 12).map((artist) => (
            <div
              key={artist.deezerId || artist.name}
              onClick={() => handleArtistClick(artist.name)}
              className="cursor-pointer group flex flex-col items-center text-center shrink-0 w-32 sm:w-36 transition-all duration-200 hover:scale-105"
            >
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-3 border-2 border-white/10 group-hover:border-emerald-400 transition-all duration-300 shadow-xl">
                {artist.avatar || artist.picture_big ? (
                  <img 
                    src={artist.avatar || artist.picture_big} 
                    alt={artist.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_HD_COVER;
                    }}
                  />
                ) : (
                  <ArtistAvatar artistName={artist.name} fallbackSrc={artist.avatar} className="w-full h-full object-cover" />
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 truncate w-full tracking-tight">
                {artist.name}
              </h3>
              <span className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">
                Artiste
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
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


