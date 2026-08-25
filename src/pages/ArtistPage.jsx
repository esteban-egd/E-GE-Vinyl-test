import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { useLikes } from '../hooks/useLikes';
import { usePlaylists } from '../hooks/usePlaylists';
import { useFollowedArtists } from '../hooks/useFollowedArtists';
import { useTheme } from '../context/ThemeContext';
import { getArtistDetails, getMainArtistName, getAlbumTracks } from '../services/musicDataService';
import ArtistAvatar from '../components/common/ArtistAvatar';
import AddToPlaylistModal from '../components/common/AddToPlaylistModal';
import TrackImage from '../components/common/TrackImage';
import { 
  Play, 
  Pause,
  Shuffle, 
  Heart, 
  Plus, 
  ArrowLeft, 
  Radio, 
  Sparkles, 
  Users, 
  UserCheck,
  Info,
  Loader2
} from 'lucide-react';

export default function ArtistPage() {
  const { artistName } = useParams();
  const rawArtist = decodeURIComponent(artistName || '');
  const decodedArtistName = getMainArtistName(rawArtist);
  const navigate = useNavigate();
  const { search } = useLocation();
  const { play, setQueueAndPlay, currentTrack, isCurrentTrack, isPlaying, togglePlayPause } = useAudio();
  const { isLiked, toggleLike } = useLikes();
  const { playlists, addTrackToPlaylist } = usePlaylists();
  const { isFollowing, toggleFollow } = useFollowedArtists();
  const { currentTheme } = useTheme();

  const [artist, setArtist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('top'); // 'top', 'albums', 'about'
  const [showPlaylistModal, setShowPlaylistModal] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState(null);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [isFetchingAlbumTracks, setIsFetchingAlbumTracks] = useState(false);

  useEffect(() => {
    if (rawArtist && rawArtist !== decodedArtistName) {
      navigate(`/artist/${encodeURIComponent(decodedArtistName)}`, { replace: true });
    }
  }, [rawArtist, decodedArtistName, navigate]);

  useEffect(() => {
    let isMounted = true;
    async function loadArtist() {
      setIsLoading(true);
      try {
        const data = await getArtistDetails(decodedArtistName);
        if (isMounted) {
          setArtist(data);
        }
      } catch (err) {
        console.error('Erreur chargement artiste:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadArtist();
    return () => { isMounted = false; };
  }, [decodedArtistName]);

  const handlePlayAll = (shuffleMode = false) => {
    if (!artist?.topTracks?.length) return;
    const tracksToPlay = shuffleMode 
      ? [...artist.topTracks].sort(() => Math.random() - 0.5)
      : artist.topTracks;
    setQueueAndPlay(tracksToPlay, 0);
  };

  const handlePlayTrack = (track, idx) => {
    if (currentTrack?.videoId === track.videoId || currentTrack?.title === track.title) {
      togglePlayPause();
    } else {
      const activeQueue = selectedAlbumFilter && albumTracks.length > 0 ? albumTracks : (artist?.topTracks || []);
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
    setSelectedAlbumFilter(album.title);
    setActiveTab('albums'); // Reste sur l'onglet album pour voir la liste des titres !
    setAlbumTracks([]);

    try {
      const fetchedTracks = await getAlbumTracks(album, artist?.name);
      if (fetchedTracks && fetchedTracks.length > 0) {
        setAlbumTracks(fetchedTracks);
        setQueueAndPlay(fetchedTracks, 0);
      } else {
        // Repli sur les morceaux locaux si l'API échoue
        const localTracks = artist?.topTracks?.filter(t => 
          t.album?.toLowerCase().includes(album.title.toLowerCase()) ||
          album.title.toLowerCase().includes((t.album || '').toLowerCase())
        ) || [];
        if (localTracks.length > 0) {
          setAlbumTracks(localTracks);
          setQueueAndPlay(localTracks, 0);
        } else {
          const singleStub = {
            title: album.title,
            artist: album.artist || artist.name,
            thumbnail: album.artwork,
            album: album.title,
            source: 'deezer'
          };
          setAlbumTracks([singleStub]);
          play(singleStub);
        }
      }
    } catch (err) {
      console.error("Error fetching album tracks:", err);
    } finally {
      setIsFetchingAlbumTracks(false);
    }
  };

  // Détecter l'album passé en paramètre URL (ex: ?album=Discovery)
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
          // Nettoyer l'URL sans recharger la page
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

  const displayedTracks = selectedAlbumFilter
    ? (albumTracks.length > 0 ? albumTracks : (artist?.topTracks?.filter(t => t.album?.toLowerCase().includes(selectedAlbumFilter.toLowerCase())) || []))
    : artist?.topTracks;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div 
          className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mb-4"
          style={{ borderColor: `${currentTheme?.primary || '#f59e0b'}30`, borderTopColor: currentTheme?.primary || '#f59e0b' }}
        />
        <p className="text-gray-400 text-sm tracking-wider uppercase">Chargement de la discographie de {decodedArtistName}...</p>
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
          style={{ backgroundColor: currentTheme?.primary || '#f59e0b', color: '#000000' }}
        >
          Retour à la recherche
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-28 fade-in">
      {/* Hero Header avec Bannière 4K & Parallax Glow */}
      <div className="relative w-full h-72 md:h-96 overflow-hidden">
        {/* Background Image avec blur & gradient overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 filter blur-[2px] opacity-40 transition-transform duration-700 hover:scale-110"
          style={{ backgroundImage: `url(${artist.banner || artist.avatar})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-transparent to-[#000000]/40" />

        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-30 p-2.5 rounded-full glass hover:bg-white/20 text-white transition-all transform active:scale-90"
          title="Retour"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Artist Profile Info Overlay */}
        <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col md:flex-row md:items-end gap-5">
          {/* Avatar 4K Circulaire avec Ring */}
          <div 
            className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 shadow-2xl shrink-0"
            style={{ borderColor: currentTheme?.primary || '#f59e0b' }}
          >
            <ArtistAvatar 
              artistName={artist.name} 
              fallbackSrc={artist.avatar} 
              className="w-full h-full object-cover" 
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span 
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 border"
                style={{ 
                  backgroundColor: `${currentTheme?.primary || '#f59e0b'}20`, 
                  color: currentTheme?.primary || '#f59e0b',
                  borderColor: `${currentTheme?.primary || '#f59e0b'}40` 
                }}
              >
                <Sparkles size={11} /> Artiste Officiel
              </span>
              <span className="text-xs text-gray-300 font-medium px-2 py-0.5 rounded-full bg-white/10">{artist.genre}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md truncate">
              {artist.name}
            </h1>

            <p className="text-xs md:text-sm text-gray-300 mt-1 flex items-center gap-2 flex-wrap">
              <Users size={14} className="text-cyan-400" />
              <span>{artist.monthlyListeners}</span>
              <span className="text-gray-600">•</span>
              <span>{artist.topTracks?.length || 0} titres vérifiés</span>
              <span className="text-gray-600">•</span>
              <span>{artist.albums?.length || 0} albums</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 md:px-8 max-w-6xl mx-auto w-full mt-4">
        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 py-4 border-b border-white/5">
          <button
            onClick={() => handlePlayAll(false)}
            className="flex items-center gap-2 text-black px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95 text-sm"
            style={{ 
              backgroundColor: currentTheme?.primary || '#f59e0b',
              color: '#000000'
            }}
          >
            <Play size={18} fill="currentColor" />
            <span>Tout écouter</span>
          </button>

          <button
            onClick={() => handlePlayAll(true)}
            className="flex items-center gap-2 glass hover:bg-white/10 text-white px-5 py-3 rounded-full font-medium transition-all text-sm active:scale-95"
            title="Lecture Aléatoire"
          >
            <Shuffle size={16} />
            <span className="hidden sm:inline">Aléatoire</span>
          </button>

          <button
            onClick={() => artist && toggleFollow({ name: artist.name, avatar: artist.avatar, genre: artist.genre })}
            className={`flex items-center gap-1.5 px-5 py-3 rounded-full font-bold text-sm transition-all border shadow-sm ${
              isFollowing(artist?.name) 
                ? 'text-black' 
                : 'glass border-white/20 text-white hover:text-white'
            }`}
            style={{
              backgroundColor: isFollowing(artist?.name) ? (currentTheme?.primary || '#1ED760') : undefined,
              borderColor: isFollowing(artist?.name) ? (currentTheme?.primary || '#1ED760') : (activeTab === 'about' ? 'rgba(255,255,255,0.2)' : 'transparent'),
              boxShadow: isFollowing(artist?.name) ? `0 4px 12px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.4)'}` : undefined
            }}
          >
            {isFollowing(artist?.name) ? (
              <>
                <UserCheck size={16} />
                <span>Abonné</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Suivre</span>
              </>
            )}
          </button>

          <button
            onClick={() => handlePlayAll(true)}
            className="p-3 rounded-full glass hover:bg-white/10 text-cyan-400 transition-all ml-auto"
            title="Lancer la Radio Artiste"
          >
            <Radio size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 my-6 bg-[#111111] p-1.5 rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => { setActiveTab('top'); setSelectedAlbumFilter(null); setSelectedAlbum(null); setAlbumTracks([]); }}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              activeTab === 'top' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
            style={{
              backgroundColor: activeTab === 'top' ? `${currentTheme?.primary || '#f59e0b'}25` : undefined,
              color: activeTab === 'top' ? (currentTheme?.primary || '#f59e0b') : undefined
            }}
          >
            Top Titres ({artist.topTracks?.length || 0})
          </button>
          <button
            onClick={() => { setActiveTab('albums'); setSelectedAlbumFilter(null); setSelectedAlbum(null); setAlbumTracks([]); }}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              activeTab === 'albums' ? 'bg-[#111111] text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
            style={{
              backgroundColor: activeTab === 'albums' ? `${currentTheme?.primary || '#f59e0b'}25` : undefined,
              color: activeTab === 'albums' ? (currentTheme?.primary || '#f59e0b') : undefined
            }}
          >
            Discographie & Albums ({artist.albums?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              activeTab === 'about' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
            style={{
              backgroundColor: activeTab === 'about' ? `${currentTheme?.primary || '#f59e0b'}25` : undefined,
              color: activeTab === 'about' ? (currentTheme?.primary || '#f59e0b') : undefined
            }}
          >
            À Propos
          </button>
        </div>

        {/* TAB 1: TOP TRACKS */}
        {activeTab === 'top' && (
          <div className="space-y-1">
            {selectedAlbumFilter && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
                <span className="text-xs text-gray-300 flex items-center gap-2">
                  {isFetchingAlbumTracks && <Loader2 size={14} className="animate-spin" style={{ color: currentTheme?.primary }} />}
                  <span>Filtre actif par album : <strong className="text-white">{selectedAlbumFilter}</strong></span>
                </span>
                <button 
                  onClick={() => { setSelectedAlbumFilter(null); setAlbumTracks([]); }}
                  className="text-xs text-red-400 hover:underline"
                >
                  Effacer le filtre
                </button>
              </div>
            )}

            {isFetchingAlbumTracks ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 size={32} className="animate-spin mb-2" style={{ color: currentTheme?.primary }} />
                <p className="text-xs">Chargement des titres de l'album dans l'ordre de lecture...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 text-xs text-gray-500 uppercase px-4 py-2 font-semibold font-mono">
                  <span className="col-span-1">#</span>
                  <span className="col-span-7 md:col-span-6">Titre</span>
                  <span className="hidden md:block col-span-3">Album</span>
                  <span className="col-span-4 md:col-span-2 text-right">Durée</span>
                </div>

                {displayedTracks?.map((track, idx) => {
                  const isCurrent = isCurrentTrack(track);
                  const isThisPlaying = isCurrent && isPlaying;
                  const liked = isLiked(track);

                  return (
                    <div
                      key={`${track.id || 'track'}-${idx}`}
                      onClick={() => handlePlayTrack(track, idx)}
                      className={`grid grid-cols-12 items-center p-3 rounded-xl transition-all cursor-pointer group border ${
                        isCurrent 
                          ? 'shadow-md ring-1' 
                          : 'hover:bg-white/5 border-transparent'
                      }`}
                      style={isCurrent ? {
                        backgroundColor: `${currentTheme?.primary || '#1ED760'}1a`,
                        borderColor: `${currentTheme?.primary || '#1ED760'}40`,
                        boxShadow: `0 4px 12px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.15)'}`
                      } : {}}
                    >
                      {/* Rank / Play Icon */}
                      <div className="col-span-1 flex items-center text-sm font-bold">
                        {isThisPlaying ? (
                          <div className="flex items-end gap-0.5 h-3.5">
                            <span className="w-1 animate-bounce rounded-full h-full" style={{ backgroundColor: currentTheme?.primary }} />
                            <span className="w-1 animate-bounce rounded-full h-2/3 delay-75" style={{ backgroundColor: currentTheme?.primary }} />
                            <span className="w-1 animate-bounce rounded-full h-4/5 delay-150" style={{ backgroundColor: currentTheme?.primary }} />
                          </div>
                        ) : (
                          <>
                            <span className="group-hover:hidden" style={{ color: isCurrent ? currentTheme?.primary : '#9ca3af' }}>{idx + 1}</span>
                            <Play size={16} className="hidden group-hover:block text-white fill-white" />
                          </>
                        )}
                      </div>

                      {/* Title & Cover */}
                      <div className="col-span-7 md:col-span-6 flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-sm border" style={{ borderColor: isCurrent ? `${currentTheme?.primary || '#1ED760'}50` : 'rgba(255,255,255,0.05)' }}>
                          <TrackImage 
                            src={track.thumbnail} 
                            alt={track.title} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-white" style={{ color: isCurrent ? currentTheme?.primary : '#f3f4f6' }}>
                            {track.title}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      {/* Album */}
                      <div className="hidden md:block col-span-3 text-xs text-gray-400 truncate pr-2">
                        {track.album || 'Single'}
                      </div>

                      {/* Duration & Actions */}
                      <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-2 text-xs text-gray-400">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track);
                          }}
                          className="p-1.5 transition-colors"
                          title={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <Heart size={16} className={liked ? 'text-red-500 fill-red-500 drop-shadow-sm' : 'text-gray-400 hover:text-white'} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPlaylistModal(track);
                          }}
                          className="p-1.5 hover:text-white transition-colors"
                          title="Ajouter à une playlist"
                        >
                          <Plus size={16} />
                        </button>

                        <span className="font-mono text-gray-400 w-10 text-right">
                          {formatDuration(track.duration)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* TAB 2: ALBUMS & DISCOGRAPHY */}
        {activeTab === 'albums' && (
          selectedAlbum ? (
            <div className="space-y-6 fade-in">
              {/* Bouton retour et entête de l'album */}
              <div className="flex flex-col md:flex-row gap-6 p-6 rounded-3xl bg-[#0a0a0a]/80 border border-white/5 relative">
                <button
                  onClick={() => { setSelectedAlbum(null); setSelectedAlbumFilter(null); setAlbumTracks([]); }}
                  className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all flex items-center gap-1.5 border border-white/5 shadow-sm active:scale-95"
                >
                  <ArrowLeft size={13} /> Retour aux albums
                </button>

                {/* Pochette de l'Album */}
                <div className="w-40 h-40 md:w-44 md:h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 mx-auto md:mx-0">
                  <img
                    src={selectedAlbum.artwork}
                    alt={selectedAlbum.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = artist.banner || artist.avatar;
                    }}
                  />
                </div>

                {/* Métadonnées de l'Album */}
                <div className="flex flex-col justify-end text-center md:text-left">
                  <span 
                    className="text-[10px] uppercase tracking-widest font-bold mb-1.5 w-fit px-2 py-0.5 rounded mx-auto md:mx-0 border"
                    style={{ 
                      color: currentTheme?.primary || '#1ED760', 
                      backgroundColor: `${currentTheme?.primary || '#1ED760'}15`,
                      borderColor: `${currentTheme?.primary || '#1ED760'}30` 
                    }}
                  >
                    Album Officiel
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">
                    {selectedAlbum.title}
                  </h2>
                  <p className="text-sm text-gray-300">
                    Par <strong className="text-white hover:underline cursor-pointer" onClick={() => { setSelectedAlbum(null); setAlbumTracks([]); }}>{selectedAlbum.artist || artist.name}</strong>
                  </p>
                  <p className="text-xs text-gray-400 mt-1 font-medium">
                    {selectedAlbum.year ? `${selectedAlbum.year} • ` : ''}
                    {selectedAlbum.genre ? `${selectedAlbum.genre} • ` : 'Album • '}
                    {albumTracks.length || selectedAlbum.trackCount || 0} titres
                  </p>

                  <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
                    <button
                      onClick={() => albumTracks.length > 0 && setQueueAndPlay(albumTracks, 0)}
                      disabled={isFetchingAlbumTracks || albumTracks.length === 0}
                      className="flex items-center gap-2 text-black px-5 py-2.5 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95 text-xs disabled:opacity-40 disabled:scale-100"
                      style={{ 
                        backgroundColor: currentTheme?.primary || '#f59e0b',
                        color: '#000000'
                      }}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Tout écouter dans l'ordre</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Liste des Morceaux de l'Album */}
              <div className="space-y-1">
                <div className="grid grid-cols-12 text-xs text-gray-500 uppercase px-4 py-2 font-semibold font-mono">
                  <span className="col-span-1">#</span>
                  <span className="col-span-7 md:col-span-8">Titre</span>
                  <span className="col-span-4 md:col-span-3 text-right">Durée & Favoris</span>
                </div>

                {isFetchingAlbumTracks ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-[#0a0a0a]/40 rounded-2xl border border-white/5">
                    <Loader2 size={36} className="animate-spin mb-3" style={{ color: currentTheme?.primary }} />
                    <p className="text-sm font-semibold text-white">Récupération des pistes de l'album...</p>
                    <p className="text-xs text-gray-500 mt-1">Séquençage audio haute fidélité en cours</p>
                  </div>
                ) : albumTracks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm bg-[#0a0a0a]/40 rounded-2xl border border-white/5">
                    Aucune piste disponible pour cet album.
                  </div>
                ) : (
                  albumTracks.map((track, idx) => {
                    const isCurrent = isCurrentTrack(track);
                    const isThisPlaying = isCurrent && isPlaying;
                    const liked = isLiked(track);

                    return (
                      <div
                        key={`${track.id || 'album-track'}-${idx}`}
                        onClick={() => handlePlayTrack(track, idx)}
                        className={`grid grid-cols-12 items-center p-3 rounded-xl transition-all cursor-pointer group border ${
                          isCurrent
                            ? 'shadow-md ring-1'
                            : 'hover:bg-white/5 border-transparent'
                        }`}
                        style={isCurrent ? {
                          backgroundColor: `${currentTheme?.primary || '#1ED760'}1a`,
                          borderColor: `${currentTheme?.primary || '#1ED760'}40`,
                          boxShadow: `0 4px 12px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.15)'}`
                        } : {}}
                      >
                        {/* Numéro ou Play icon */}
                        <div className="col-span-1 flex items-center text-sm font-bold font-mono">
                          {isThisPlaying ? (
                            <div className="flex items-end gap-0.5 h-3.5">
                              <span className="w-1 animate-bounce rounded-full h-full" style={{ backgroundColor: currentTheme?.primary }} />
                              <span className="w-1 animate-bounce rounded-full h-2/3 delay-75" style={{ backgroundColor: currentTheme?.primary }} />
                              <span className="w-1 animate-bounce rounded-full h-4/5 delay-150" style={{ backgroundColor: currentTheme?.primary }} />
                            </div>
                          ) : (
                            <>
                              <span className="group-hover:hidden" style={{ color: isCurrent ? currentTheme?.primary : '#9ca3af' }}>
                                {idx + 1}
                              </span>
                              <Play size={15} className="hidden group-hover:block text-white fill-white" />
                            </>
                          )}
                        </div>

                        {/* Titre et artiste */}
                        <div className="col-span-7 md:col-span-8 flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-sm border" style={{ borderColor: isCurrent ? `${currentTheme?.primary || '#1ED760'}50` : 'rgba(255,255,255,0.05)' }}>
                            <TrackImage
                              src={track.thumbnail || selectedAlbum.artwork}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate group-hover:text-white" style={{ color: isCurrent ? currentTheme?.primary : '#f3f4f6' }}>
                              {track.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                          </div>
                        </div>

                        {/* Actions & Durée */}
                        <div className="col-span-4 md:col-span-3 flex items-center justify-end gap-2.5 text-xs text-gray-400">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(track);
                            }}
                            className="p-1.5 transition-colors"
                            title={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          >
                            <Heart size={16} className={liked ? 'text-red-500 fill-red-500 drop-shadow-sm' : 'text-gray-400 hover:text-white'} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPlaylistModal(track);
                            }}
                            className="p-1.5 hover:text-white transition-colors"
                            title="Ajouter à une playlist"
                          >
                            <Plus size={16} />
                          </button>

                          <span className="font-mono text-gray-400 w-10 text-right">
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {artist.albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => handlePlayAlbum(album)}
                  className="glass p-3.5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group cursor-pointer hover:bg-white/5 flex flex-col"
                >
                  {/* 4K Album Artwork */}
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-md border border-white/5">
                    <img 
                      src={album.artwork} 
                      alt={album.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = artist.banner || artist.avatar;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div 
                        className="w-11 h-11 rounded-full flex items-center justify-center text-black shadow-lg"
                        style={{ backgroundColor: currentTheme?.primary || '#f59e0b' }}
                      >
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <p className="font-bold text-sm text-white truncate group-hover:underline">
                    {album.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {album.year ? `${album.year} • ` : ''}{album.trackCount ? `${album.trackCount} titres` : 'Album'}
                  </p>
                </div>
              ))}
            </div>
          )
        )}

        {/* TAB 3: ABOUT ARTIST */}
        {activeTab === 'about' && (
          <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="p-3 rounded-2xl"
                style={{ backgroundColor: `${currentTheme?.primary || '#f59e0b'}20`, color: currentTheme?.primary || '#f59e0b' }}
              >
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{artist.name}</h3>
                <p className="text-xs text-gray-400">Genre : {artist.genre}</p>
              </div>
            </div>

            <div className="text-sm text-gray-300 leading-relaxed mb-6 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20">
              <div className="whitespace-pre-line font-light text-justify text-gray-300">
                {artist.bio}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-gray-500 uppercase block font-semibold mb-1">Auditeurs</span>
                <span className="text-white font-bold text-base">{artist.monthlyListeners}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-gray-500 uppercase block font-semibold mb-1">Discographie</span>
                <span className="text-white font-bold text-base">{artist.albums?.length || 0} albums studio</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2 md:col-span-1">
                <span className="text-gray-500 uppercase block font-semibold mb-1">Traitement DSP</span>
                <span className="text-cyan-400 font-bold text-base">Lossless 24-bit/96kHz</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Playlist */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={() => setShowPlaylistModal(null)}>
          <div className="glass-strong p-6 rounded-2xl w-full max-w-sm border border-[#2a2a2a]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Ajouter à une playlist</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
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
              className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
