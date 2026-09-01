import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { useLikes } from '../hooks/useLikes';
import { usePlaylists } from '../hooks/usePlaylists';
import { useFollowedArtists } from '../hooks/useFollowedArtists';
import { useTheme } from '../context/ThemeContext';
import { useDominantColor } from '../hooks/useDominantColor';
import { getArtistFullData, getAlbumTracksDeezer } from '../services/artistService';
import { getMainArtistName, safeDecodeURI, getArtistAvatar } from '../services/musicDataService';
import { formatListeners, parseListenersCount } from '../utils/formatListeners';
import ArtistAvatar from '../components/common/ArtistAvatar';
import TrackImage from '../components/common/TrackImage';
import DownloadBadge from '../components/common/DownloadBadge';
import { 
  Play, Pause, Shuffle, Heart, Plus, ArrowLeft,
  MoreHorizontal, Loader2, Music2, Share2, Disc3,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const PopularityBars = ({ rank }) => {
  // Normalize rank from Deezer (0-1000000) to 1-5 bars
  const score = Math.min(5, Math.max(1, Math.ceil((rank || 0) / 200000)));
  return (
    <div className="flex items-end gap-[2px] h-3 w-4 ml-2" title={`Popularité: ${score}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <div 
          key={i} 
          className={`w-0.5 rounded-sm ${i <= score ? 'bg-white' : 'bg-white/20'}`} 
          style={{ height: `${20 + i * 20}%` }} 
        />
      ))}
    </div>
  );
};

export default function ArtistPage() {
  const { artistName } = useParams();
  const rawArtist = safeDecodeURI(artistName || '');
  const decodedArtistName = getMainArtistName(rawArtist) || rawArtist;
  const navigate = useNavigate();
  const { search } = useLocation();
  const { play, setQueueAndPlay, currentTrack, isCurrentTrack, isPlaying, togglePlayPause } = useAudio();
  const { isLiked, toggleLike } = useLikes();
  const { playlists, addTrackToPlaylist } = usePlaylists();
  const { isFollowing, toggleFollow } = useFollowedArtists();
  const { currentTheme } = useTheme();

  const [artist, setArtist] = useState(null);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showPlaylistModal, setShowPlaylistModal] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [isFetchingAlbumTracks, setIsFetchingAlbumTracks] = useState(false);
  
  const [scrollY, setScrollY] = useState(0);
  const [showAllTopTracks, setShowAllTopTracks] = useState(false);
  const [discoFilter, setDiscoFilter] = useState('albums');
  const [expandedSections, setExpandedSections] = useState({
    albums: false,
    singles: false,
    compilations: false,
    apparitions: false
  });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const relatedCarouselRef = useRef(null);
  const scrollRelatedCarousel = (direction) => {
    if (relatedCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      relatedCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  const mainRef = useRef(null);
  const dominantColor = useDominantColor(artist?.banner || artist?.avatar);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => setActiveDropdown(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (rawArtist && decodedArtistName && rawArtist !== decodedArtistName) {
      navigate(`/artist/${encodeURIComponent(decodedArtistName)}`, { replace: true });
    }
  }, [rawArtist, decodedArtistName, navigate]);

  useEffect(() => {
    let isMounted = true;
    async function loadArtist() {
      if (!decodedArtistName) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setSelectedAlbum(null);
      setIsBioExpanded(false);
      setScrollY(0);
      try {
        const searchParams = new URLSearchParams(search);
        const artistIdParam = searchParams.get('id');
        const queryTarget = artistIdParam || decodedArtistName;

        const data = await getArtistFullData(queryTarget);
        if (isMounted) {
          if (data) {
            setArtist(data);
          } else {
            setArtist({
              name: decodedArtistName,
              genre: 'Artiste',
              avatar: getArtistAvatar(decodedArtistName),
              banner: getArtistAvatar(decodedArtistName),
              monthlyListeners: 0,
              nbFans: 0,
              topTracks: [],
              albums: [],
              relatedArtists: [],
              bio: ''
            });
          }
        }
      } catch (err) {
        console.error('Erreur chargement artiste:', err);
        if (isMounted) {
          setArtist({
            name: decodedArtistName,
            genre: 'Artiste',
            avatar: getArtistAvatar(decodedArtistName),
            banner: getArtistAvatar(decodedArtistName),
            monthlyListeners: 0,
            nbFans: 0,
            topTracks: [],
            albums: [],
            relatedArtists: [],
            bio: ''
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadArtist();
    return () => { isMounted = false; };
  }, [decodedArtistName, search]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePlayAll = (shuffleMode = false) => {
    if (!artist?.topTracks?.length) return;
    const tracksToPlay = shuffleMode 
      ? [...artist.topTracks].sort(() => Math.random() - 0.5)
      : artist.topTracks;
    setQueueAndPlay(tracksToPlay, 0);
  };

  const handlePlayTrack = (track, idx, list) => {
    if (isCurrentTrack(track)) {
      togglePlayPause();
    } else {
      const activeQueue = list || artist?.topTracks || [];
      if (activeQueue.length > 0) {
        setQueueAndPlay(activeQueue, idx);
      } else {
        play(track);
      }
    }
  };

  const handlePlayAlbum = async (album) => {
    setIsFetchingAlbumTracks(true);
    setSelectedAlbum(album);
    setAlbumTracks([]);
    window.scrollTo({ top: 400, behavior: 'smooth' });

    try {
      const fetchedTracks = await getAlbumTracksDeezer(album.deezerId || album.id, artist?.name, album);
      if (fetchedTracks && fetchedTracks.length > 0) {
        setAlbumTracks(fetchedTracks);
      } else {
        const localTracks = artist?.topTracks?.filter(t => 
          t.album?.toLowerCase().includes(album.title.toLowerCase()) ||
          album.title.toLowerCase().includes((t.album || '').toLowerCase())
        ) || [];
        if (localTracks.length > 0) {
          setAlbumTracks(localTracks);
        } else {
          setAlbumTracks([{
            id: `dz_alb_${album.id}`,
            deezerId: album.id,
            videoId: `dz_alb_${album.id}`,
            title: album.title,
            artist: album.artist || artist.name,
            thumbnail: album.artwork || album.cover,
            album: album.title,
            albumId: album.id,
            source: 'deezer'
          }]);
        }
      }
    } catch (err) {
      console.error("Error fetching album tracks:", err);
    } finally {
      setIsFetchingAlbumTracks(false);
    }
  };

  useEffect(() => {
    if (artist) {
      const queryParams = new URLSearchParams(search);
      const albumTitleParam = queryParams.get('album');
      if (albumTitleParam) {
        const matchedAlbum = artist.albums?.find(a => 
          a.title.toLowerCase() === albumTitleParam.toLowerCase() ||
          a.title.toLowerCase().includes(albumTitleParam.toLowerCase())
        );
        if (matchedAlbum) {
          handlePlayAlbum(matchedAlbum);
          navigate(`/artist/${encodeURIComponent(decodedArtistName)}`, { replace: true });
        }
      }
    }
  }, [artist, search, decodedArtistName, navigate]);

  const formatDuration = (seconds) => {
    if (!seconds) return '3:30';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const openDropdown = (e, trackId) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === trackId ? null : trackId);
  };

  const shareTrack = async (track) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${track.title} - ${track.artist}`,
          text: `Écoute ${track.title} de ${track.artist} sur Vynil !`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Partage annulé', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full pb-32 bg-[#121212] animate-pulse">
        {/* Skeleton Hero Header */}
        <div className="relative w-full h-[360px] md:h-[420px] bg-[#181818]">
          <div className="absolute bottom-10 left-4 md:left-8 right-8 z-20 flex flex-col justify-end gap-4">
            <div className="w-32 h-6 bg-white/10 rounded-full"></div>
            <div className="w-2/3 h-16 md:h-24 bg-white/10 rounded-xl"></div>
            <div className="w-48 h-5 bg-white/10 rounded-md"></div>
          </div>
        </div>
        {/* Skeleton Main Content */}
        <div className="px-4 md:px-8 max-w-[1400px] mx-auto w-full relative z-20 mt-8">
          <div className="flex gap-4 mb-8">
            <div className="w-16 h-16 bg-white/10 rounded-full"></div>
            <div className="w-12 h-12 bg-white/10 rounded-full mt-2"></div>
            <div className="w-24 h-12 bg-white/10 rounded-full mt-2"></div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-full overflow-x-hidden box-border">
            <div className="xl:col-span-2">
              <div className="w-48 h-8 bg-white/10 rounded-md mb-6"></div>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex gap-4 items-center mb-4 p-2">
                  <div className="w-12 h-12 bg-white/10 rounded-md shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-1/2 h-5 bg-white/10 rounded-md"></div>
                    <div className="w-1/3 h-4 bg-white/10 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="xl:col-span-1">
              <div className="w-32 h-8 bg-white/10 rounded-md mb-6"></div>
              <div className="w-full aspect-square bg-white/10 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="p-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <p className="text-gray-300 text-lg mb-2">Artiste "{decodedArtistName}" introuvable.</p>
        <p className="text-gray-500 text-sm mb-6">Vérifiez l'orthographe ou tentez une autre recherche.</p>
        <button 
          onClick={() => navigate('/search')} 
          className="px-6 py-2.5 rounded-full text-white font-medium text-sm transition-all"
          style={{ backgroundColor: currentTheme?.primary || '#1ED760', color: '#000000' }}
        >
          Retour à la recherche
        </button>
      </div>
    );
  }

  const headerOpacity = Math.min(scrollY / 300, 1);
  const titleScale = Math.max(1 - scrollY / 1000, 0.7);
  
  const albums = artist.albums?.filter(a => a.recordType === 'album') || [];
  const singles = artist.albums?.filter(a => a.recordType === 'single' || a.recordType === 'ep') || [];
  const compilations = artist.albums?.filter(a => a.recordType === 'compilation') || [];
  const apparitions = artist.albums?.filter(a => a.recordType === 'appears_on' || a.recordType === 'featured') || [];

  const renderDiscoSection = (sectionKey, title, items, IconComponent, defaultRecordType = 'Album') => {
    if (!items || items.length === 0) return null;

    const isExpanded = Boolean(expandedSections[sectionKey]);
    const visibleItems = isExpanded ? items : items.slice(0, 5);
    const hasMoreThan5 = items.length > 5;

    return (
      <div className="space-y-4">
        {/* En-tête de section avec titre et bouton interactif Voir tout / Voir plus */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <IconComponent size={22} style={{ color: currentTheme?.primary || '#1ED760' }} />
            <span>{title}</span>
            <span className="text-xs text-gray-500 font-mono font-medium ml-1">({items.length})</span>
          </h3>

          {hasMoreThan5 && (
            <button
              onClick={() => toggleSection(sectionKey)}
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#1DB954] hover:text-[#1ed760] transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
              title={isExpanded ? "Réduire à 5 éléments" : "Voir toute la liste"}
            >
              <span>{isExpanded ? 'Réduire' : 'Voir plus'}</span>
              <ChevronRight size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>

        {/* Grille responsive : 5 colonnes par défaut, 2 colonnes en mode déplié */}
        <div 
          className={
            isExpanded
              ? "grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
              : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full"
          }
        >
          {visibleItems.map((album, idx) => {
            if (isExpanded) {
              /* 📜 AFFICHAGE DÉPLIÉ EN 2 COLONNES (Vue type liste) */
              return (
                <div
                  key={album.id || `expanded-${sectionKey}-${idx}`}
                  onClick={() => handlePlayAlbum(album)}
                  className="p-3 rounded-xl bg-[#14110c] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-300 group cursor-pointer flex items-center justify-between gap-4 shadow-xl relative"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-md overflow-hidden bg-black/40 border border-white/10 shadow-md">
                      <img 
                        src={album.artwork} 
                        alt={album.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.target.src = artist.banner || artist.avatar; }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                        <div 
                          className="w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all cursor-pointer"
                        >
                          <Play size={18} fill="currentColor" className="ml-0.5 stroke-none" />
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-[#1DB954] transition-colors tracking-tight mb-1">
                        {album.title}
                      </h4>
                      <div className="flex items-center text-xs text-gray-400 font-medium truncate gap-2">
                        <span className="text-white/80">{artist.name}</span>
                        <span className="text-gray-600">•</span>
                        <span>{album.year || '2024'}</span>
                        <span className="text-gray-600">•</span>
                        <span className="uppercase text-[10px] font-mono tracking-wider font-semibold text-[#1DB954]">
                          {album.recordType || defaultRecordType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center pr-2">
                    <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-[#1DB954] text-gray-400 group-hover:text-black flex items-center justify-center transition-all shadow-md">
                      <Play size={16} fill="currentColor" className="ml-0.5 stroke-none" />
                    </div>
                  </div>
                </div>
              );
            }

            /* 🎴 AFFICHAGE INITIAL EN GRILLE DE 5 COLONNES MAX */
            return (
              <div
                key={album.id || `collapsed-${sectionKey}-${idx}`}
                onClick={() => handlePlayAlbum(album)}
                className="p-3.5 rounded-xl bg-[#14110c] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-300 group cursor-pointer flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 relative"
              >
                <div>
                  <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3 bg-black/40 border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                    <img 
                      src={album.artwork} 
                      alt={album.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.target.src = artist.banner || artist.avatar; }}
                    />
                    <div className="absolute right-2 bottom-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
                      <div 
                        className="w-11 h-11 rounded-full bg-[#1DB954] text-black shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        style={{ backgroundColor: currentTheme?.primary || '#1ED760' }}
                      >
                        <Play size={20} fill="currentColor" className="ml-0.5 stroke-none" />
                      </div>
                    </div>
                  </div>

                  <h4 className="font-bold text-white text-sm truncate mb-1 group-hover:underline group-hover:text-[#1DB954] transition-colors tracking-tight">
                    {album.title}
                  </h4>
                  <div className="flex items-center text-xs text-gray-400 font-medium truncate gap-1.5">
                    <span className="capitalize">{album.year || '2024'}</span>
                    <span className="text-gray-600">•</span>
                    <span className="uppercase text-[10px] font-mono tracking-wider font-semibold text-gray-400">
                      {album.recordType || defaultRecordType}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  let currentDiscoList = [];
  let activeFilter = discoFilter;
  
  if (discoFilter === 'albums') {
    if (albums.length > 0) currentDiscoList = albums;
    else if (singles.length > 0) { currentDiscoList = singles; activeFilter = 'singles'; }
    else if (compilations.length > 0) { currentDiscoList = compilations; activeFilter = 'compilations'; }
  } else if (discoFilter === 'singles') {
    if (singles.length > 0) currentDiscoList = singles;
    else if (albums.length > 0) { currentDiscoList = albums; activeFilter = 'albums'; }
  } else if (discoFilter === 'compilations') {
    if (compilations.length > 0) currentDiscoList = compilations;
    else if (albums.length > 0) { currentDiscoList = albums; activeFilter = 'albums'; }
  }
  const topTracksVisible = showAllTopTracks ? artist.topTracks : artist.topTracks?.slice(0, 5);

  return (
    <div className="flex flex-col min-h-full pb-32 bg-[#121212]" ref={mainRef}>
      
      {/* Immersive Gradient Background */}
      <div 
        className="fixed top-0 left-0 right-0 h-[600px] pointer-events-none transition-colors duration-1000 z-0"
        style={{ 
          background: `linear-gradient(to bottom, ${dominantColor || '#222'} 0%, #121212 100%)`,
          opacity: 0.6
        }}
      />

      {/* Sticky Header Nav (Parallax Fade) */}
      <div 
        className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-16 transition-all duration-300 pointer-events-none"
        style={{ 
          backgroundColor: `rgba(18, 18, 18, ${headerOpacity})`,
          boxShadow: headerOpacity > 0.8 ? '0 4px 20px rgba(0,0,0,0.5)' : 'none'
        }}
      >
        <h1 
          className="font-bold text-white text-lg md:text-xl truncate transition-opacity duration-300 pointer-events-auto"
          style={{ opacity: headerOpacity > 0.8 ? 1 : 0 }}
        >
          {artist.name}
        </h1>
        <div 
          className="ml-auto pointer-events-auto transition-opacity duration-300"
          style={{ opacity: headerOpacity > 0.8 ? 1 : 0 }}
        >
          <button
            onClick={() => handlePlayAll(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-lg"
            style={{ backgroundColor: currentTheme?.primary || '#1ED760' }}
          >
            {isPlaying && artist.topTracks?.some(t => isCurrentTrack(t)) ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="artist-banner-container relative w-full h-[350px] md:h-[380px] max-h-[450px] overflow-hidden z-10 bg-black">
        <div 
          className="artist-banner-img absolute inset-0 bg-cover transition-transform duration-75 origin-top"
          style={{ 
            backgroundImage: `url(${artist.banner || artist.avatar})`,
            backgroundPosition: 'center 20%',
            transform: `translateY(${scrollY * 0.4}px) scale(${1 + (scrollY < 0 ? Math.abs(scrollY)/500 : 0)})`,
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,18,18,1) 0%, rgba(18,18,18,0.4) 50%, transparent 100%)' }} />
        
        <div className="absolute bottom-10 left-4 md:left-8 right-8 z-20 artist-banner-content">
          <button 
            onClick={() => navigate(-1)}
            className="banner-back-button"
            title="Retour"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold flex items-center gap-1.5 drop-shadow-md bg-black/20 backdrop-blur-md px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Artiste vérifié
            </span>
          </div>
          <h1 
            className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-2xl mb-2 origin-left"
            style={{ transform: `scale(${titleScale})` }}
          >
            {artist.name}
          </h1>
          {(() => {
            const raw = artist.monthlyListeners !== undefined ? artist.monthlyListeners : artist.listeners;
            const count = parseListenersCount(raw);
            if (count > 0) {
              const formatted = formatListeners(raw, { suffix: ' auditeurs par mois', singularSuffix: ' auditeur par mois' });
              return (
                <p className="text-gray-300 text-sm font-medium drop-shadow-md">
                  <span className="text-white font-bold text-base drop-shadow-md mr-1">{formatted}</span>
                </p>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 md:px-8 max-w-[1400px] mx-auto w-full relative z-20">
        
        {/* Floating Action Bar */}
        <div className="flex items-center gap-6 py-6 mb-4">
          <button
            onClick={() => handlePlayAll(false)}
            className="w-16 h-16 rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-2xl relative"
            style={{ 
              backgroundColor: currentTheme?.primary || '#1ED760',
              boxShadow: `0 8px 24px ${currentTheme?.primary || '#1ED760'}40`
            }}
            title="Lecture"
          >
            {isPlaying && artist.topTracks?.some(t => isCurrentTrack(t)) ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button
            onClick={() => handlePlayAll(true)}
            className="text-gray-300 hover:text-white transition-colors p-2"
            title="Lecture Aléatoire"
          >
            <Shuffle size={32} />
          </button>

          <button
            onClick={() => artist && toggleFollow({ name: artist.name, avatar: artist.avatar, genre: artist.genre })}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-all border ${
              isFollowing(artist?.name) 
                ? 'border-white/30 text-white bg-transparent hover:border-white' 
                : 'border-transparent text-white bg-white/10 hover:bg-white/20'
            }`}
          >
            {isFollowing(artist?.name) ? 'Abonné' : 'Suivre'}
          </button>

          <div className="relative">
            <button 
              onClick={(e) => openDropdown(e, 'artist')}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <MoreHorizontal size={32} />
            </button>
            {activeDropdown === 'artist' && (
              <div className="absolute left-0 mt-2 w-48 bg-[#282828] rounded-md shadow-2xl z-50 py-1 border border-white/5">
                <button onClick={() => shareTrack({title: artist.name, artist: 'Artiste'})} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3">
                  <Share2 size={16} /> Partager
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedAlbum ? (
          /* ALBUM VIEW OVERLAY */
          <div className="fade-in bg-black/40 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/5 mt-4">
            <div className="flex items-end gap-6 mb-8">
              <div className="w-40 h-40 md:w-52 md:h-52 rounded-xl shadow-2xl overflow-hidden shrink-0">
                <img src={selectedAlbum.artwork} alt={selectedAlbum.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">{selectedAlbum.recordType || 'Album'}</span>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">{selectedAlbum.title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <ArtistAvatar artistName={artist.name} fallbackSrc={artist.avatar} className="w-6 h-6 rounded-full" />
                  <span className="font-bold text-white">{artist.name}</span>
                  <span>•</span>
                  <span>{selectedAlbum.year}</span>
                  <span>•</span>
                  <span>{albumTracks.length || selectedAlbum.trackCount} titres</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => albumTracks.length > 0 && setQueueAndPlay(albumTracks, 0)}
                disabled={isFetchingAlbumTracks || albumTracks.length === 0}
                className="w-14 h-14 rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                style={{ backgroundColor: currentTheme?.primary || '#1ED760' }}
              >
                <Play size={24} fill="currentColor" className="ml-1" />
              </button>
              <button
                onClick={() => { setSelectedAlbum(null);
      setIsBioExpanded(false); setAlbumTracks([]); }}
                className="text-sm font-semibold text-gray-400 hover:text-white transition-colors px-4 py-2"
              >
                Fermer l'album
              </button>
            </div>

            {/* Album Tracks */}
            <div className="space-y-1">
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 text-gray-400 text-sm border-b border-white/10 pb-2 mb-4 px-4 uppercase tracking-wider">
                <div className="w-8 text-center">#</div>
                <div>Titre</div>
                <div className="text-right">Durée</div>
              </div>
              {isFetchingAlbumTracks ? (
                <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-white" size={32} /></div>
              ) : (
                albumTracks.map((track, idx) => {
                  const isCurrent = isCurrentTrack(track);
                  const isThisPlaying = isCurrent && isPlaying;
                  const liked = isLiked(track);
                  return (
                    <div 
                      key={idx}
                      onClick={() => handlePlayTrack(track, idx, albumTracks)}
                      className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center p-2 rounded-lg group cursor-pointer hover:bg-white/10 transition-colors ${isCurrent ? 'bg-white/10' : ''}`}
                    >
                      <div className="w-8 flex justify-center relative">
                        {isThisPlaying ? (
                          <div className="flex items-end gap-0.5 h-3">
                            <span className="w-1 animate-bounce rounded-full h-full" style={{ backgroundColor: currentTheme?.primary || '#1ED760' }} />
                            <span className="w-1 animate-bounce rounded-full h-2/3 delay-75" style={{ backgroundColor: currentTheme?.primary || '#1ED760' }} />
                            <span className="w-1 animate-bounce rounded-full h-4/5 delay-150" style={{ backgroundColor: currentTheme?.primary || '#1ED760' }} />
                          </div>
                        ) : (
                          <>
                            <span className="group-hover:hidden text-gray-400" style={{ color: isCurrent ? currentTheme?.primary : undefined }}>{idx + 1}</span>
                            <Play size={16} className="hidden group-hover:block text-white fill-white absolute" />
                          </>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-base truncate font-medium flex items-center gap-2" style={{ color: isCurrent ? currentTheme?.primary || '#1ED760' : 'white' }}>
                          <span className="truncate">{track.title}</span>
                          <DownloadBadge videoId={track.videoId || track.id} />
                        </span>
                        <span className="text-sm text-gray-400 truncate">{track.artist}</span>
                      </div>
                      <div className="flex items-center justify-end gap-4 text-gray-400 text-sm pr-2">
                        <button onClick={(e) => { e.stopPropagation(); toggleLike(track); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Heart size={18} className={liked ? 'text-green-500 fill-green-500' : 'hover:text-white'} style={liked ? {color: currentTheme?.primary || '#1ED760', fill: currentTheme?.primary || '#1ED760'} : {}} />
                        </button>
                        <span className="w-10 text-right">{formatDuration(track.duration)}</span>
                        
                        <div className="relative">
                          <button onClick={(e) => openDropdown(e, track.id || idx)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <MoreHorizontal size={18} className="hover:text-white" />
                          </button>
                          {activeDropdown === (track.id || idx) && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#282828] rounded-md shadow-2xl z-50 py-1 border border-white/5">
                              <button onClick={(e) => { e.stopPropagation(); toggleLike(track); setActiveDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3">
                                <Heart size={16} className={liked ? 'fill-current' : ''} style={liked ? {color: currentTheme?.primary || '#1ED760'} : {}}/> Favori
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(track); setActiveDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3">
                                <Plus size={16} /> Ajouter à une playlist
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); shareTrack(track); setActiveDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3">
                                <Share2 size={16} /> Partager
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: Top Tracks */}
            <div className="xl:col-span-2">
              <h2 className="text-2xl font-bold text-white mb-6">Populaires</h2>
              <div className="flex flex-col gap-1">
                {topTracksVisible?.map((track, idx) => {
                  const isCurrent = isCurrentTrack(track);
                  const isThisPlaying = isCurrent && isPlaying;
                  const liked = isLiked(track);
                  return (
                    <div 
                      key={track.id || idx}
                      onClick={() => handlePlayTrack(track, idx)}
                      className="group grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-4 p-2 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="w-6 text-center text-sm font-medium text-gray-400 relative">
                        {isThisPlaying ? (
                          <div className="flex items-end justify-center gap-[2px] h-4">
                            <span className="w-1 animate-bounce rounded-full h-full" style={{ backgroundColor: currentTheme?.primary || '#1ED760' }} />
                            <span className="w-1 animate-bounce rounded-full h-2/3 delay-75" style={{ backgroundColor: currentTheme?.primary || '#1ED760' }} />
                            <span className="w-1 animate-bounce rounded-full h-4/5 delay-150" style={{ backgroundColor: currentTheme?.primary || '#1ED760' }} />
                          </div>
                        ) : (
                          <>
                            <span className="group-hover:opacity-0" style={{ color: isCurrent ? currentTheme?.primary || '#1ED760' : undefined }}>{idx + 1}</span>
                            <Play size={16} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-white fill-white" />
                          </>
                        )}
                      </div>
                      
                      <div className="w-12 h-12 shrink-0 relative shadow-md rounded">
                        <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover rounded" />
                      </div>
                      
                      <div className="flex flex-col min-w-0 pr-4">
                        <div className="text-base truncate font-bold" style={{ color: isCurrent ? currentTheme?.primary || '#1ED760' : 'white' }}>
                          {track.title}
                        </div>
                        <div className="flex items-center text-sm text-gray-400 group-hover:text-white transition-colors">
                          <span className="truncate">{track.album || artist.name}</span>
                          <PopularityBars rank={track.rank} />
                        </div>
                      </div>
                      
                      <button onClick={(e) => { e.stopPropagation(); toggleLike(track); }} className="opacity-0 group-hover:opacity-100 transition-opacity px-2">
                        <Heart size={18} className={liked ? 'text-green-500 fill-green-500' : 'hover:text-white'} style={liked ? {color: currentTheme?.primary || '#1ED760', fill: currentTheme?.primary || '#1ED760'} : {}} />
                      </button>

                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="w-10 text-right">{formatDuration(track.duration)}</span>
                        
                        <div className="relative">
                          <button onClick={(e) => openDropdown(e, track.id || idx)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2">
                            <MoreHorizontal size={18} className="hover:text-white" />
                          </button>
                          {activeDropdown === (track.id || idx) && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#282828] rounded-md shadow-2xl z-50 py-1 border border-white/5">
                              <button onClick={(e) => { e.stopPropagation(); toggleLike(track); setActiveDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3">
                                <Heart size={16} className={liked ? 'fill-current' : ''} style={liked ? {color: currentTheme?.primary || '#1ED760'} : {}}/> Favori
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(track); setActiveDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3">
                                <Plus size={16} /> Ajouter à une playlist
                              </button>
                              {track.album && (
                                <button onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setActiveDropdown(null);
                                  const alb = artist.albums?.find(a => a.title === track.album);
                                  if (alb) handlePlayAlbum(alb);
                                }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3">
                                  <Disc3 size={16} /> Voir l'album
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {artist.topTracks?.length > 5 && (
                <button 
                  onClick={() => setShowAllTopTracks(!showAllTopTracks)}
                  className="mt-6 text-sm font-bold text-gray-400 hover:text-white transition-colors pl-2 uppercase tracking-widest"
                >
                  {showAllTopTracks ? 'Afficher moins' : 'Voir plus'}
                </button>
              )}
            </div>

            {/* RIGHT COLUMN: About */}
            <div className="xl:col-span-1 flex flex-col max-w-full overflow-x-hidden pr-2 sm:pr-4 box-border">
              <h2 className="text-2xl font-bold text-white mb-6">À Propos</h2>
              <div className="relative rounded-2xl overflow-hidden bg-[var(--color-theme-card-bg)] border border-white/5 flex flex-col w-full max-w-full box-border shadow-lg">
                <div className="relative h-48 sm:h-64 md:h-56 w-full shrink-0 overflow-hidden group bg-black/40">
                  <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />
                  <div className="absolute bottom-4 left-6">
                    <div className="text-white font-bold text-xl drop-shadow-md">
                      {formatListeners(artist.monthlyListeners || artist.listeners, { 
                        suffix: ' auditeurs mensuels', 
                        singularSuffix: ' auditeur mensuel', 
                        fallback: 'Auditeurs en cours de calcul' 
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="px-6 pb-6 pt-2 flex-grow bg-[var(--color-theme-card-bg)]">
                   <div 
                     className={`relative transition-all duration-700 ease-in-out overflow-hidden ${isBioExpanded ? 'max-h-[5000px]' : 'max-h-[72px]'}`}
                   >
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line text-justify">
                        {artist.bio}
                      </p>
                      
                      {/* Gradient for fading out text when collapsed */}
                      {!isBioExpanded && artist.bio?.length > 150 && (
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#181818] to-transparent pointer-events-none" />
                      )}
                   </div>
                   
                   {artist.bio?.length > 150 && (
                     <button 
                       onClick={() => setIsBioExpanded(!isBioExpanded)}
                       className="mt-4 text-sm font-bold text-white hover:text-amber-300 transition-colors w-full text-left focus:outline-none"
                     >
                       {isBioExpanded ? 'Voir moins' : 'En savoir plus'}
                     </button>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DISCOGRAPHY SECTIONS */}
        {!selectedAlbum && (
          <div className="mt-16 space-y-10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954] shadow-[0_0_10px_#1DB954]" />
                <span>Discographie</span>
              </h2>
            </div>
            
            {albums.length === 0 && singles.length === 0 && compilations.length === 0 && apparitions.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun album répertorié pour cet artiste.</p>
            ) : (
              <div className="space-y-12">
                {/* Section Albums */}
                {renderDiscoSection('albums', 'Albums', albums, Disc3, 'Album')}

                {/* Section Singles & EP */}
                {renderDiscoSection('singles', 'Singles & EPs', singles, Music2, 'Single')}

                {/* Section Compilations */}
                {renderDiscoSection('compilations', 'Compilations', compilations, Disc3, 'Compilation')}

                {/* Section Apparitions */}
                {renderDiscoSection('apparitions', 'Apparitions', apparitions, Disc3, 'Apparition')}
              </div>
            )}
          </div>
        )}

        {/* LIVE / CONCERTS SECTION */}
        {(!selectedAlbum && artist.topTracks?.filter(t => t.title.toLowerCase().includes('live')).length > 0) && (
          <div className="mt-16 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">En concert / Live</h2>
            <div className="flex overflow-x-auto gap-4 pb-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {artist.topTracks.filter(t => t.title.toLowerCase().includes('live')).map((track, idx) => (
                <div 
                  key={track.id || idx}
                  onClick={() => play(track)}
                  className="min-w-[200px] max-w-[200px] p-4 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors group cursor-pointer flex flex-col hover:shadow-2xl"
                >
                  <div className="relative aspect-video rounded-md overflow-hidden mb-4 shadow-lg">
                    <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Play size={20} fill="currentColor" className="text-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-sm truncate mb-1 flex items-center gap-1.5">
                    <span className="truncate">{track.title}</span>
                    <DownloadBadge videoId={track.videoId || track.id} />
                  </h3>
                  <p className="text-xs text-gray-400 truncate">{formatDuration(track.duration)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RELATED ARTISTS SECTION */}
        {(!selectedAlbum && artist.relatedArtists && artist.relatedArtists.length > 0) && (
          <div className="mt-16 mb-16 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Les fans aiment aussi</h2>
              <div className="flex items-center gap-2 z-20">
                <button
                  onClick={() => scrollRelatedCarousel('left')}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Précédent"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => scrollRelatedCarousel('right')}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Suivant"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <div 
              ref={relatedCarouselRef} 
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollBehavior: 'smooth',
                gap: '1.5rem',
                width: '100%',
                paddingBottom: '12px',
                WebkitOverflowScrolling: 'touch'
              }}
              className="related-artists-carousel custom-scrollbar"
            >
              {artist.relatedArtists.map((relArtist) => (
                <div 
                  key={relArtist.id}
                  onClick={() => {
                    navigate(`/artist/${encodeURIComponent(relArtist.name)}`);
                    window.scrollTo(0, 0);
                  }}
                  style={{ flex: '0 0 160px', minWidth: '160px' }}
                  className="p-5 rounded-xl bg-[var(--color-theme-card-bg)] hover:bg-[var(--color-theme-card-bg-hover)] transition-all duration-300 group cursor-pointer flex flex-col items-center text-center hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="w-32 h-32 rounded-full overflow-hidden mb-5 shadow-2xl">
                    <img src={relArtist.picture} alt={relArtist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <h3 className="font-bold text-white text-base truncate w-full">{relArtist.name}</h3>
                  <p className="text-sm text-gray-400 mt-1 capitalize font-medium">Artiste</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Modal Playlist */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={() => setShowPlaylistModal(null)}>
          <div className="bg-[#282828] p-6 rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-6">Ajouter à une playlist</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20">
              {playlists.length === 0 ? (
                <p className="text-gray-400 text-center py-4 text-sm">Aucune playlist disponible.</p>
              ) : (
                playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      addTrackToPlaylist(pl.id, showPlaylistModal);
                      setShowPlaylistModal(null);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-white/10 text-white flex justify-between items-center transition-colors group"
                  >
                    <span className="font-medium">{pl.name}</span>
                    <Plus size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                  </button>
                ))
              )}
            </div>
            <button 
              onClick={() => setShowPlaylistModal(null)}
              className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full transition-colors text-sm uppercase tracking-wider"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
