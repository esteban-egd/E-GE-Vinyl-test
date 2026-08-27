import { useState, useMemo, useEffect } from 'react';
import { useLikes } from '../hooks/useLikes';
import { usePlaylists, usePlaylistTracks } from '../hooks/usePlaylists';
import { useFollowedArtists } from '../hooks/useFollowedArtists';
import { useOffline } from '../hooks/useOffline';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import ArtistAvatar from '../components/common/ArtistAvatar';
import AddToPlaylistModal from '../components/common/AddToPlaylistModal';
import TrackImage from '../components/common/TrackImage';
import DownloadBadge from '../components/common/DownloadBadge';
import { getDownloadedTracks } from '../services/offlineStorageService';
import { 
  SPOTIFY_TOP_50_GLOBAL, 
  SPOTIFY_TOP_50_FRANCE, 
  TRENDING_TRACKS,
  getMainArtistName
} from '../services/musicDataService';
import { 
  Play, 
  Shuffle, 
  Heart, 
  Trash2, 
  ListMusic, 
  Plus, 
  UserCheck, 
  Edit2,
  Sparkles,
  Lock,
  Search,
  Grid,
  List,
  ArrowUpDown,
  Clock,
  Share2,
  Download,
  X,
  ShieldCheck,
  ArrowLeft,
  ArrowDownCircle,
  Loader2,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '3:30';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatTotalDuration(tracks) {
  if (!tracks || !tracks.length) return '0 min';
  const totalSecs = tracks.reduce((acc, t) => acc + (t.duration || 210), 0);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  if (hours > 0) {
    return `${hours} h ${mins} min`;
  }
  return `${mins} min`;
}

function formatDateAdded(dateStr) {
  if (!dateStr) return 'Récemment';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return 'Récemment';
  }
}

export default function LibraryPage() {
  const { user, signOut } = useAuth();
  const { currentTheme } = useTheme();
  const { likedTracks } = useLikes();
  const { playlists, createPlaylist } = usePlaylists();
  const { followedArtists } = useFollowedArtists();
  const { downloadedTrackIds } = useOffline();

  // Navigation and Filter States
  const [activePill, setActivePill] = useState('LIKES'); // Default directly to 'LIKES'
  const [viewMode, setViewMode] = useState('list'); // Default to list view ('list' | 'grid')
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'alphabetical' | 'creator'

  // Detailed View State (Default to liked tracks view inline)
  const [selectedPlaylistDetail, setSelectedPlaylistDetail] = useState({ type: 'likes' });
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [downloadedTracksList, setDownloadedTracksList] = useState([]);

  // Load offline tracks from Dexie whenever downloadedTrackIds change
  useEffect(() => {
    let isMounted = true;
    getDownloadedTracks().then(tracks => {
      if (isMounted) setDownloadedTracksList(tracks);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [downloadedTrackIds]);

  // Primary Theme Accent Color (Defaulting to Spotify Green #1DB954)
  const primaryColor = currentTheme?.primary || '#1DB954';

  if (!user || user.is_guest) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 box-border fade-in pb-28 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6 shadow-2xl">
          <Lock size={40} />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter mb-3">
          Bibliothèque Privée
        </h1>
        <p className="text-gray-400 max-w-md text-sm mb-8 leading-relaxed">
          Le mode Invité est restreint. Connectez-vous ou créez un compte pour concevoir vos favoris, playlists sur mesure et suivre vos artistes.
        </p>
        <button
          onClick={() => signOut()}
          className="px-6 py-3.5 bg-[#1DB954] hover:bg-[#1ed760] text-black font-black rounded-full text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-[#1DB954]/20 active:scale-95"
        >
          Se connecter / Créer un compte
        </button>
      </div>
    );
  }

  const handleCreatePlaylistSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreatePlaylistModal(false);
      toast.success('Playlist créée !');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 box-border fade-in pb-28 space-y-8">
      {/* 1. EN-TÊTE MODERNE PROFILE & STATISTIQUES (STYLE SPOTIFY / CYBERPUNK) */}
      <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-r from-[#181818] via-[#121212] to-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden">
        <div 
          className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-5 text-center md:text-left">
            {/* User Avatar */}
            <div 
              className="w-20 h-20 md:w-24 md:h-24 rounded-full p-1 border-2 shadow-2xl shrink-0 relative flex items-center justify-center bg-black/50"
              style={{ borderColor: primaryColor }}
            >
              <span className="text-2xl md:text-3xl font-black text-white uppercase font-mono">
                {user.email ? user.email[0] : 'U'}
              </span>
              <div 
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-black"
                style={{ backgroundColor: primaryColor }}
              />
            </div>

            {/* Profile Info */}
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-[#1DB954]" /> PROFIL CYBERPUNK
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                Ma Bibliothèque
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-medium">
                {user.email || 'Melodify User'}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-3 sm:gap-6 bg-black/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10 w-full md:w-auto justify-around">
            <div className="text-center px-2">
              <div className="text-lg sm:text-2xl font-black text-white flex items-center justify-center gap-1">
                <Heart size={16} className="text-red-500 fill-red-500" />
                <span>{likedTracks.length}</span>
              </div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Titres Likés</span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="text-center px-2">
              <div className="text-lg sm:text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
                <ArrowDownCircle size={16} className="text-emerald-400" />
                <span>{downloadedTracksList.length}</span>
              </div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Téléchargés</span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="text-center px-2">
              <div className="text-lg sm:text-2xl font-black text-white flex items-center justify-center gap-1">
                <ListMusic size={16} style={{ color: primaryColor }} />
                <span>{playlists.length}</span>
              </div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Playlists</span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="text-center px-2">
              <div className="text-lg sm:text-2xl font-black text-white flex items-center justify-center gap-1">
                <UserCheck size={16} className="text-cyan-400" />
                <span>{followedArtists.length}</span>
              </div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Artistes</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTRES RAPIDES EN PILULES + RECHERCHE & SORT & VIEW MODES */}
      <div className="space-y-4">
        {/* Pills Bar */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            <PillButton 
              active={activePill === 'ALL'} 
              onClick={() => {
                setActivePill('ALL');
                setSelectedPlaylistDetail(null);
              }} 
              label="Tout" 
              primaryColor={primaryColor} 
            />
            <PillButton 
              active={activePill === 'LIKES'} 
              onClick={() => {
                setActivePill('LIKES');
                setSelectedPlaylistDetail({ type: 'likes' });
              }} 
              label="Titres Likés" 
              count={likedTracks.length}
              primaryColor={primaryColor} 
              icon={Heart}
            />
            <PillButton 
              active={activePill === 'DOWNLOADED'} 
              onClick={() => {
                setActivePill('DOWNLOADED');
                setSelectedPlaylistDetail({ type: 'downloaded' });
              }} 
              label="Téléchargés" 
              count={downloadedTracksList.length}
              primaryColor="#10B981" 
              icon={ArrowDownCircle}
              isDownloadedPill
            />
            <PillButton 
              active={activePill === 'PLAYLISTS'} 
              onClick={() => {
                setActivePill('PLAYLISTS');
                setSelectedPlaylistDetail(null);
              }} 
              label="Playlists" 
              count={playlists.length}
              primaryColor={primaryColor} 
            />
            <PillButton 
              active={activePill === 'ARTISTS'} 
              onClick={() => {
                setActivePill('ARTISTS');
                setSelectedPlaylistDetail(null);
              }} 
              label="Artistes" 
              count={followedArtists.length}
              primaryColor={primaryColor} 
            />
          </div>

          <button
            onClick={() => setShowCreatePlaylistModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all active:scale-95 border border-white/15 shrink-0"
          >
            <Plus size={16} style={{ color: primaryColor }} />
            <span className="hidden sm:inline">Créer une playlist</span>
          </button>
        </div>

        {/* Search, Sort and View Switcher Controls */}
        {!selectedPlaylistDetail && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
            {/* Inner Search Box */}
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans la bibliothèque..."
                className="w-full bg-[#181818] border border-white/10 focus:border-[#1DB954] rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#181818] px-3 py-1.5 rounded-full border border-white/10">
                <ArrowUpDown size={14} className="text-gray-400 shrink-0" />
                <span className="hidden sm:inline">Trié par:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="recent" className="bg-[#181818]">Récent</option>
                  <option value="alphabetical" className="bg-[#181818]">Alphabétique</option>
                  <option value="creator" className="bg-[#181818]">Créateur</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-[#181818] p-1 rounded-full border border-white/10">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Vue Grille"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Vue Liste"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. AFFICHAGE DE LA BIBLIOTHÈQUE : VUE DÉTAILLÉE INLINE OU LISTE GLOBALE */}
      {selectedPlaylistDetail ? (
        <SpotifyPlaylistInlineDetail
          detailObj={selectedPlaylistDetail}
          onClose={() => {
            setSelectedPlaylistDetail(null);
            setActivePill('ALL');
          }}
          primaryColor={primaryColor}
        />
      ) : (
        <MainLibraryContent 
          activePill={activePill}
          viewMode={viewMode}
          searchQuery={searchQuery}
          sortBy={sortBy}
          likedTracks={likedTracks}
          downloadedTracks={downloadedTracksList}
          playlists={playlists}
          followedArtists={followedArtists}
          onSelectLikes={() => {
            setActivePill('LIKES');
            setSelectedPlaylistDetail({ type: 'likes' });
          }}
          onSelectDownloaded={() => {
            setActivePill('DOWNLOADED');
            setSelectedPlaylistDetail({ type: 'downloaded' });
          }}
          onSelectPlaylist={(pl) => setSelectedPlaylistDetail({ type: 'playlist', data: pl })}
          primaryColor={primaryColor}
        />
      )}

      {/* 4. SECTION DES RECOMMANDATIONS BASÉES SUR L'HISTORIQUE */}
      <RecommendationsSection 
        likedTracks={likedTracks}
        followedArtists={followedArtists}
        primaryColor={primaryColor}
      />

      {/* MODAL CRÉER UNE PLAYLIST */}
      {showCreatePlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form 
            onSubmit={handleCreatePlaylistSubmit}
            className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus size={20} style={{ color: primaryColor }} />
                <span>Créer une playlist</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCreatePlaylistModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400">Donnez un titre percutant à votre nouvelle création musicale.</p>

            <input
              type="text"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Ex: French Touch 2026, Gym Synthwave..."
              className="w-full bg-black/50 border border-white/15 focus:border-[#1DB954] rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreatePlaylistModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-[#1DB954] hover:bg-[#1ed760] transition-colors"
              >
                Créer la playlist
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// --- PILL BUTTON COMPONENT ---
function PillButton({ active, onClick, label, count, icon: Icon, isDownloadedPill }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap border ${
        active 
          ? (isDownloadedPill ? 'bg-emerald-400 text-black border-emerald-400 shadow-lg' : 'bg-white text-black border-white shadow-lg')
          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
      }`}
    >
      {Icon && (
        <Icon 
          size={14} 
          className={
            active 
              ? 'text-black fill-black' 
              : isDownloadedPill 
                ? 'text-emerald-400' 
                : 'text-red-500 fill-red-500'
          } 
        />
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${active ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-400'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// --- MAIN LIBRARY CONTENT (GRID VS LIST) ---
function MainLibraryContent({ 
  activePill, 
  viewMode, 
  searchQuery, 
  sortBy, 
  likedTracks, 
  downloadedTracks,
  playlists, 
  followedArtists, 
  onSelectLikes, 
  onSelectDownloaded,
  onSelectPlaylist,
  primaryColor
}) {
  const navigate = useNavigate();

  // Combine & filter items
  const filteredItems = useMemo(() => {
    let items = [];

    // 1. Liked Tracks Card
    if (activePill === 'ALL' || activePill === 'LIKES') {
      items.push({
        id: 'liked-tracks-pinned',
        isLikes: true,
        name: 'Titres likés',
        subtitle: `Playlist • ${likedTracks.length} titres`,
        cover: null,
        count: likedTracks.length,
        creator: 'Vous'
      });
    }

    // 2. Downloaded Tracks Card
    if (activePill === 'ALL' || activePill === 'DOWNLOADED') {
      items.push({
        id: 'downloaded-tracks-pinned',
        isDownloaded: true,
        name: 'Titres téléchargés',
        subtitle: `Stockage local • ${downloadedTracks.length} titres`,
        cover: null,
        count: downloadedTracks.length,
        creator: 'Hors-ligne'
      });
    }

    // 3. Playlists
    if (activePill === 'ALL' || activePill === 'PLAYLISTS') {
      playlists.forEach(pl => {
        items.push({
          id: pl.id,
          isPlaylist: true,
          name: pl.name,
          subtitle: `Playlist • Par Vous`,
          cover: pl.cover,
          data: pl,
          creator: 'Vous'
        });
      });
    }

    // 4. Followed Artists
    if (activePill === 'ALL' || activePill === 'ARTISTS') {
      followedArtists.forEach(art => {
        items.push({
          id: `artist-${art.name}`,
          isArtist: true,
          name: art.name,
          subtitle: `Artiste • ${art.genre || 'Suivi'}`,
          cover: art.avatar,
          data: art,
          creator: art.name
        });
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(it => it.name.toLowerCase().includes(q) || it.subtitle.toLowerCase().includes(q));
    }

    // Sort items
    if (sortBy === 'alphabetical') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'creator') {
      items.sort((a, b) => (a.creator || '').localeCompare(b.creator || ''));
    }

    return items;
  }, [activePill, searchQuery, sortBy, likedTracks, downloadedTracks, playlists, followedArtists]);

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-3xl p-8">
        <ListMusic size={40} className="text-gray-600 mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Aucun élément trouvé</h3>
        <p className="text-xs text-gray-400">Aucun résultat ne correspond à votre filtre actuel ou votre recherche.</p>
      </div>
    );
  }

  // --- GRID VIEW ---
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredItems.map(item => {
          if (item.isLikes) {
            return (
              <div
                key={item.id}
                onClick={onSelectLikes}
                className="relative aspect-square rounded-2xl p-4 bg-gradient-to-br from-indigo-700 via-purple-700 to-black hover:from-indigo-600 hover:to-purple-900 cursor-pointer border border-white/15 hover:border-white/30 transition-all duration-300 group flex flex-col justify-between shadow-xl hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg">
                  <Heart size={24} className="fill-white" />
                </div>

                <div>
                  <h3 className="font-extrabold text-white text-base md:text-lg tracking-tight mb-1 group-hover:text-amber-300 transition-colors">
                    Titres likés
                  </h3>
                  <p className="text-xs text-white/80 font-medium">
                    {likedTracks.length} titres sauvegardés
                  </p>
                </div>

                {/* Hover Play Button */}
                <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  <div 
                    className="w-11 h-11 rounded-full text-black flex items-center justify-center shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Play size={20} fill="currentColor" className="ml-0.5 stroke-none" />
                  </div>
                </div>
              </div>
            );
          }

          if (item.isDownloaded) {
            return (
              <div
                key={item.id}
                onClick={onSelectDownloaded}
                className="relative aspect-square rounded-2xl p-4 bg-gradient-to-br from-emerald-800 via-teal-900 to-black hover:from-emerald-700 hover:to-teal-800 cursor-pointer border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 group flex flex-col justify-between shadow-xl hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 backdrop-blur-md flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-lg">
                  <ArrowDownCircle size={24} />
                </div>

                <div>
                  <h3 className="font-extrabold text-white text-base md:text-lg tracking-tight mb-1 group-hover:text-emerald-300 transition-colors">
                    Téléchargés
                  </h3>
                  <p className="text-xs text-emerald-200/80 font-medium">
                    {downloadedTracks.length} titres hors-ligne
                  </p>
                </div>

                {/* Hover Play Button */}
                <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  <div 
                    className="w-11 h-11 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Play size={20} fill="currentColor" className="ml-0.5 stroke-none" />
                  </div>
                </div>
              </div>
            );
          }

          if (item.isArtist) {
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/artist/${encodeURIComponent(item.name)}`)}
                className="bg-[#141414] hover:bg-white/[0.08] border border-white/10 rounded-2xl p-4 cursor-pointer transition-all duration-300 group flex flex-col items-center text-center shadow-lg hover:-translate-y-1"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#1DB954] shadow-xl mb-3 relative">
                  <ArtistAvatar artistName={item.name} fallbackSrc={item.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <h3 className="font-bold text-white text-sm truncate w-full">{item.name}</h3>
                <span className="text-[11px] text-gray-400 block mt-0.5">Artiste</span>
              </div>
            );
          }

          // Custom Playlists
          return (
            <div
              key={item.id}
              onClick={() => onSelectPlaylist(item.data)}
              className="bg-[#141414] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-2xl p-3.5 cursor-pointer transition-all duration-300 group flex flex-col justify-between shadow-lg hover:-translate-y-1 relative"
            >
              <div>
                <div className="relative aspect-square w-full bg-black/40 rounded-xl mb-3 overflow-hidden border border-white/10 shadow-md">
                  {item.cover ? (
                    <img src={item.cover} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <ListMusic size={40} />
                    </div>
                  )}

                  <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-10">
                    <div 
                      className="w-10 h-10 rounded-full text-black flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Play size={18} fill="currentColor" className="ml-0.5 stroke-none" />
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-white text-sm truncate group-hover:text-[#1DB954] transition-colors">{item.name}</h3>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // --- LIST VIEW (COMPACT) ---
  return (
    <div className="space-y-2">
      {filteredItems.map(item => {
        if (item.isLikes) {
          return (
            <div
              key={item.id}
              onClick={onSelectLikes}
              className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-[#141414] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Heart size={20} className="fill-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-sm truncate group-hover:text-amber-300 transition-colors">
                    Titres likés
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    Playlist • {likedTracks.length} titres
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-[#1DB954] group-hover:text-black text-white flex items-center justify-center transition-all shadow-md"
                >
                  <Play size={16} fill="currentColor" className="ml-0.5 stroke-none" />
                </button>
              </div>
            </div>
          );
        }

        if (item.isDownloaded) {
          return (
            <div
              key={item.id}
              onClick={onSelectDownloaded}
              className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-teal-900/30 to-[#141414] border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-black shrink-0 shadow-md">
                  <ArrowDownCircle size={22} className="text-black" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-sm truncate group-hover:text-emerald-300 transition-colors">
                    Titres téléchargés
                  </h4>
                  <p className="text-xs text-emerald-400/80 font-medium">
                    Stockage local 100% hors-ligne • {downloadedTracks.length} titres
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  className="w-9 h-9 rounded-full bg-emerald-500/20 group-hover:bg-emerald-400 group-hover:text-black text-emerald-400 flex items-center justify-center transition-all shadow-md"
                >
                  <Play size={16} fill="currentColor" className="ml-0.5 stroke-none" />
                </button>
              </div>
            </div>
          );
        }

        if (item.isArtist) {
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/artist/${encodeURIComponent(item.name)}`)}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#141414] hover:bg-white/[0.06] border border-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-white/10">
                  <ArtistAvatar artistName={item.name} fallbackSrc={item.cover} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-sm truncate group-hover:text-[#1DB954] transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-xs text-gray-400">{item.subtitle}</p>
                </div>
              </div>

              <span className="text-xs text-gray-500 font-mono">Artiste</span>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            onClick={() => onSelectPlaylist(item.data)}
            className="flex items-center justify-between p-3 rounded-2xl bg-[#141414] hover:bg-white/[0.06] border border-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10 flex items-center justify-center text-gray-500">
                {item.cover ? (
                  <img src={item.cover} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ListMusic size={24} />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm truncate group-hover:text-[#1DB954] transition-colors">
                  {item.name}
                </h4>
                <p className="text-xs text-gray-400">{item.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-[#1DB954] group-hover:text-black text-white flex items-center justify-center transition-all shadow-md"
              >
                <Play size={16} fill="currentColor" className="ml-0.5 stroke-none" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- RECOMMENDATIONS SECTION BASED ON HISTORY ---
function RecommendationsSection({ likedTracks, followedArtists, primaryColor }) {
  const { play } = useAudio();
  const navigate = useNavigate();

  const recommendedCards = useMemo(() => {
    // Generate intelligent recommendations based on user's saved tracks / followed artists
    const pool = [...SPOTIFY_TOP_50_GLOBAL, ...SPOTIFY_TOP_50_FRANCE, ...TRENDING_TRACKS];
    const userArtistNames = new Set([
      ...followedArtists.map(a => getMainArtistName(a.name).toLowerCase()),
      ...likedTracks.map(t => getMainArtistName(t.artist).toLowerCase())
    ]);

    let recommended = [];

    if (userArtistNames.size > 0) {
      recommended = pool.filter(t => userArtistNames.has(getMainArtistName(t.artist).toLowerCase()));
    }

    if (recommended.length < 5) {
      // Top off with trending / featured items
      const existingIds = new Set(recommended.map(r => r.videoId));
      for (const t of pool) {
        if (!existingIds.has(t.videoId)) {
          recommended.push(t);
          existingIds.add(t.videoId);
        }
        if (recommended.length >= 6) break;
      }
    }

    return recommended.slice(0, 5);
  }, [likedTracks, followedArtists]);

  if (recommendedCards.length === 0) return null;

  return (
    <div className="pt-8 border-t border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
            <Sparkles size={22} style={{ color: primaryColor }} />
            <span>Recommandé pour votre bibliothèque</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Inspiré de vos titres likés et des artistes que vous suivez.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {recommendedCards.map((track, idx) => (
          <div
            key={`rec-${track.videoId || idx}`}
            onClick={() => play(track)}
            className="p-3.5 rounded-2xl bg-[#141414] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-300 group cursor-pointer flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 relative"
          >
            <div>
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-black/40 border border-white/10 shadow-md">
                <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute right-2 bottom-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  <div 
                    className="w-10 h-10 rounded-full text-black shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Play size={18} fill="currentColor" className="ml-0.5 stroke-none" />
                  </div>
                </div>
              </div>

              <h4 className="font-bold text-white text-sm truncate mb-1 group-hover:text-[#1DB954] transition-colors">
                {track.title}
              </h4>
              <p 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/artist/${encodeURIComponent(getMainArtistName(track.artist))}`);
                }}
                className="text-xs text-gray-400 truncate hover:underline hover:text-white"
              >
                {track.artist}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SPOTIFY-STYLE DETAILED PLAYLIST INLINE VIEW ---
function SpotifyPlaylistInlineDetail({ detailObj, onClose, primaryColor }) {
  const isLikes = detailObj.type === 'likes';
  const isDownloaded = detailObj.type === 'downloaded';
  const customPlaylist = detailObj.type === 'playlist' ? detailObj.data : null;

  const { likedTracks, toggleLike, isLiked } = useLikes();
  const playlistTracks = usePlaylistTracks(customPlaylist?.id);
  const { setQueueAndPlay, currentTrack, isPlaying, togglePlayPause } = useAudio();
  const { 
    downloadedTrackIds, 
    downloadTrack, 
    downloadAllTracks,
    removeTrack: removeDownloadedTrack, 
    isDownloading, 
    toggleSync 
  } = useOffline();
  const { removeTrackFromPlaylist, updatePlaylistName } = usePlaylists();
  const { user } = useAuth();

  const [innerSearch, setInnerSearch] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(customPlaylist?.name || '');
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);
  const [offlineTracksList, setOfflineTracksList] = useState([]);

  // Load offline tracks from Dexie if in downloaded view
  useEffect(() => {
    let isMounted = true;
    getDownloadedTracks().then(tracks => {
      if (isMounted) setOfflineTracksList(tracks);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [downloadedTrackIds]);

  // Get current tracks
  const rawTracks = useMemo(() => {
    if (isDownloaded) return offlineTracksList;
    if (isLikes) return likedTracks;
    return playlistTracks || [];
  }, [isDownloaded, isLikes, offlineTracksList, likedTracks, playlistTracks]);

  const formattedTracks = useMemo(() => {
    return rawTracks.map(t => ({
      ...t,
      videoId: t.videoId || t.video_id || t.id,
      title: t.title || 'Titre inconnu',
      artist: t.artist || 'Artiste inconnu',
      thumbnail: t.thumbnailBase64 || t.thumbnail || t.artwork || '',
      album: t.album || (isDownloaded ? 'Stockage Hors-Ligne' : isLikes ? 'Titres likés' : customPlaylist?.name),
      duration: t.duration || 210
    }));
  }, [rawTracks, isDownloaded, isLikes, customPlaylist]);

  // Filter tracks
  const filteredTracks = useMemo(() => {
    if (!innerSearch.trim()) return formattedTracks;
    const q = innerSearch.toLowerCase();
    return formattedTracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
  }, [formattedTracks, innerSearch]);

  const totalDurationStr = formatTotalDuration(formattedTracks);

  const handlePlayAll = (shuffle = false) => {
    if (!filteredTracks.length) return;
    const tracksToPlay = shuffle ? [...filteredTracks].sort(() => Math.random() - 0.5) : filteredTracks;
    setQueueAndPlay(tracksToPlay, 0);
    toast.success(`Lecture de ${isDownloaded ? 'vos titres téléchargés' : isLikes ? 'vos titres likés' : customPlaylist?.name}`);
  };

  const handleTrackClick = (track, idx) => {
    if (currentTrack?.videoId === track.videoId || currentTrack?.title === track.title) {
      togglePlayPause();
    } else {
      setQueueAndPlay(filteredTracks, idx);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Lien copié dans le presse-papier !');
  };

  const handleSaveName = (e) => {
    e.preventDefault();
    if (editedName.trim() && customPlaylist) {
      updatePlaylistName(customPlaylist.id, editedName.trim());
      setIsEditingName(false);
      toast.success('Nom mis à jour !');
    }
  };

  const coverImage = (isLikes || isDownloaded) 
    ? null 
    : (customPlaylist?.cover || (formattedTracks.length > 0 ? formattedTracks[0].thumbnail : null));

  return (
    <>
      <div className="relative w-full bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col fade-in my-2">
      {/* Header Banner */}
      <div 
        className={`relative p-6 sm:p-8 border-b border-white/10 flex flex-col sm:flex-row items-center sm:items-end gap-6 shrink-0 ${
          isDownloaded
            ? 'bg-gradient-to-b from-emerald-900 via-teal-950 to-[#121212]'
            : isLikes 
              ? 'bg-gradient-to-b from-indigo-900 via-purple-900 to-[#121212]' 
              : 'bg-gradient-to-b from-[#242424] to-[#121212]'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center gap-1.5 transition-all cursor-pointer z-20 border border-white/10 shadow-lg text-xs font-bold"
          title="Retour à la bibliothèque"
        >
          <ArrowLeft size={16} />
          <span>Retour</span>
        </button>

          {/* Cover */}
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/15 shrink-0 bg-black/40 flex items-center justify-center">
            {isDownloaded ? (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-900 flex items-center justify-center text-black">
                <ArrowDownCircle size={64} className="text-white drop-shadow-lg" />
              </div>
            ) : isLikes ? (
              <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-900 flex items-center justify-center text-white">
                <Heart size={64} className="fill-white drop-shadow-lg" />
              </div>
            ) : coverImage ? (
              <img src={coverImage} alt={customPlaylist?.name} className="w-full h-full object-cover" />
            ) : (
              <ListMusic size={64} className="text-gray-600" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left space-y-3 z-10 min-w-0">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
              isDownloaded
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : 'text-[#1DB954] bg-[#1DB954]/10 border-[#1DB954]/30'
            }`}>
              {isDownloaded ? 'STOCKAGE LOCAL HORS-LIGNE (MODE AVION)' : isLikes ? 'COLLECTION PRIVÉE' : 'PLAYLIST UTILISATEUR'}
            </span>

            {isDownloaded ? (
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Titres Téléchargés
              </h1>
            ) : isLikes ? (
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Titres Likés
              </h1>
            ) : isEditingName ? (
              <form onSubmit={handleSaveName} className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  autoFocus
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="bg-black/60 border border-[#1DB954] rounded-xl px-3 py-1.5 text-xl font-bold text-white flex-1"
                />
                <button type="submit" className="bg-[#1DB954] text-black font-bold px-4 py-1.5 rounded-xl text-xs">
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight truncate">
                  {customPlaylist?.name}
                </h1>
                <button 
                  onClick={() => setIsEditingName(true)} 
                  className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10"
                  title="Modifier le nom"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-300 font-medium">
              <span className="text-white font-bold">{user.email || 'Vous'}</span>
              <span>•</span>
              <span>{formattedTracks.length} titre(s)</span>
              <span>•</span>
              <span>{totalDurationStr}</span>
              {isDownloaded && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check size={14} /> 100% Autonome
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 sm:px-8 bg-[#121212] border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            {/* Big Green Play Button */}
            <button
              onClick={() => handlePlayAll(false)}
              disabled={formattedTracks.length === 0}
              className={`w-12 h-12 rounded-full text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all cursor-pointer ${
                isDownloaded ? 'bg-emerald-400 hover:bg-emerald-300' : ''
              }`}
              style={{ backgroundColor: isDownloaded ? undefined : primaryColor }}
              title={isDownloaded ? "Tout lire hors-ligne" : "Tout lire"}
            >
              <Play size={22} fill="currentColor" className="ml-0.5 stroke-none" />
            </button>

            {/* Shuffle Button */}
            <button
              onClick={() => handlePlayAll(true)}
              disabled={formattedTracks.length === 0}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
              title="Lecture aléatoire"
            >
              <Shuffle size={18} />
            </button>

            {/* Download/Sync Button */}
            {(() => {
              const isAllDownloaded = formattedTracks.length > 0 && formattedTracks.every(t => downloadedTrackIds.has(t.videoId || t.id));
              return (
                <button
                  onClick={() => {
                    if (isAllDownloaded) {
                      toast.success('Tous les titres de cette liste sont déjà stockés hors-ligne !', { icon: '✅' });
                    } else {
                      downloadAllTracks(formattedTracks);
                    }
                  }}
                  disabled={formattedTracks.length === 0}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isAllDownloaded || isDownloaded 
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title={isAllDownloaded || isDownloaded ? "Tous les titres sont enregistrés en local" : "Tout télécharger pour le mode hors-ligne"}
                >
                  {isAllDownloaded || isDownloaded ? (
                    <Check size={18} strokeWidth={3} className="text-emerald-400" />
                  ) : (
                    <Download size={18} />
                  )}
                </button>
              );
            })()}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Partager"
            >
              <Share2 size={18} />
            </button>
          </div>

          {/* Quick Inner Search */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={innerSearch}
              onChange={(e) => setInnerSearch(e.target.value)}
              placeholder="Chercher dans ces titres..."
              className="w-full bg-[#181818] border border-white/10 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]"
            />
          </div>
        </div>

        {/* Tracks Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-widest text-gray-400 pb-2 border-b border-white/10 px-3">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6 sm:col-span-5">Titre</div>
            <div className="hidden sm:block sm:col-span-3">Album</div>
            <div className="hidden sm:block sm:col-span-2 text-right">Ajouté le</div>
            <div className="col-span-5 sm:col-span-1 text-right flex items-center justify-end gap-1">
              <Clock size={12} />
            </div>
          </div>

          {filteredTracks.length === 0 ? (
            <div className="text-center text-gray-500 py-16 text-xs space-y-2">
              <ArrowDownCircle size={32} className="mx-auto text-gray-600" />
              <p>Aucun titre trouvé dans cette liste.</p>
              {isDownloaded && (
                <p className="text-[11px] text-gray-400">
                  Cliquez sur l'icône de téléchargement dans vos "Titres Likés" pour les rendre disponibles hors-ligne.
                </p>
              )}
            </div>
          ) : (
            filteredTracks.map((track, idx) => {
              const trackId = track.videoId || track.id;
              const isCurrent = currentTrack?.videoId === trackId || currentTrack?.title === track.title;
              const isThisPlaying = isCurrent && isPlaying;
              const isTrackDownloadedInCache = downloadedTrackIds.has(trackId);
              const isDownloadingThis = isDownloading.has(trackId);

              return (
                <div
                  key={`drawer-tr-${trackId}-${idx}`}
                  onClick={() => handleTrackClick(track, idx)}
                  className={`grid grid-cols-12 items-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer group ${
                    isCurrent 
                      ? 'bg-[#1DB954]/15 border border-[#1DB954]/30' 
                      : 'hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  {/* # or Equalizer */}
                  <div className="col-span-1 text-center text-xs font-mono font-bold text-gray-400">
                    {isThisPlaying ? (
                      <div className="flex items-end justify-center gap-0.5 h-3">
                        <span className="w-1 bg-[#1DB954] animate-bounce rounded-full h-full" />
                        <span className="w-1 bg-[#1DB954] animate-bounce rounded-full h-2/3 delay-75" />
                        <span className="w-1 bg-[#1DB954] animate-bounce rounded-full h-4/5 delay-150" />
                      </div>
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Artwork + Title + Artist */}
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-black/40 border border-white/10">
                      <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play size={16} fill="currentColor" className="text-white ml-0.5" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#1DB954]' : 'text-white group-hover:text-[#1DB954]'}`}>
                          {track.title}
                        </p>
                        <DownloadBadge videoId={trackId} />
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="hidden sm:block sm:col-span-3 text-xs text-gray-400 truncate font-medium">
                    {track.album || 'Single'}
                  </div>

                  {/* Date added */}
                  <div className="hidden sm:block sm:col-span-2 text-right text-xs text-gray-400">
                    {formatDateAdded(track.downloadedAt || track.created_at || track.likedAt)}
                  </div>

                  {/* Duration & Actions */}
                  <div className="col-span-5 sm:col-span-1 flex items-center justify-end gap-2 text-xs font-mono text-gray-400">
                    <span>{formatDuration(track.duration)}</span>
                    
                    {/* Individual Download / Remove Offline Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isTrackDownloadedInCache) {
                          removeDownloadedTrack(trackId);
                        } else {
                          downloadTrack(track);
                        }
                      }}
                      disabled={isDownloadingThis}
                      className="p-1 hover:scale-110 transition-transform"
                      title={isTrackDownloadedInCache ? 'Retirer du stockage hors-ligne' : 'Télécharger en local'}
                    >
                      {isDownloadingThis ? (
                        <Loader2 size={15} className="text-[#1DB954] animate-spin" />
                      ) : isTrackDownloadedInCache ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                          <Check size={10} strokeWidth={3.5} />
                        </div>
                      ) : (
                        <Download size={15} className="text-gray-400 hover:text-white" />
                      )}
                    </button>

                    {/* Like Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track);
                      }}
                      className="p-1 hover:scale-110 transition-transform"
                      title={isLiked(track) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Heart size={15} className={isLiked(track) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-white'} />
                    </button>

                    {/* Custom Playlist Remove Action */}
                    {!isLikes && !isDownloaded && customPlaylist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTrackFromPlaylist(customPlaylist.id, track.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400"
                        title="Supprimer de la playlist"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}

                    {/* If in Downloaded View: Delete from offline cache */}
                    {isDownloaded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDownloadedTrack(trackId);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400"
                        title="Supprimer du stockage hors-ligne"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddToPlaylistModal
        track={selectedTrackForPlaylist}
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
      />
    </>
  );
}
