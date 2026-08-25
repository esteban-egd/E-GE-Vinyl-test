import { useState } from 'react';
import { useLikes } from '../hooks/useLikes';
import { usePlaylists, usePlaylistTracks } from '../hooks/usePlaylists';
import { useFollowedArtists } from '../hooks/useFollowedArtists';
import { useOffline } from '../hooks/useOffline';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ArtistAvatar from '../components/common/ArtistAvatar';
import AddToPlaylistModal from '../components/common/AddToPlaylistModal';
import TrackImage from '../components/common/TrackImage';
import { 
  Play, 
  Shuffle,
  Heart, 
  Trash2, 
  ListMusic, 
  CloudOff, 
  Plus, 
  ChevronLeft, 
  UserCheck, 
  Users,
  Image as ImageIcon,
  Edit2,
  Sparkles,
  Check,
  Lock,
  Disc3
} from 'lucide-react';

export default function LibraryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('likes'); // 'likes', 'playlists', 'artists', 'offline'
  
  if (!user && activeTab !== 'offline') {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full fade-in pb-28 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6">
          <Lock size={40} />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Bibliothèque Privée</h1>
        <p className="text-gray-400 max-w-md text-sm mb-8">
          Connectez-vous pour synchroniser vos favoris, playlists et artistes suivis sur tous vos appareils.
        </p>
        <div className="flex gap-4">
           <TabButton active={activeTab === 'offline'} onClick={() => setActiveTab('offline')} icon={CloudOff} label="Voir le contenu Hors-ligne" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full fade-in pb-28">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider text-equinox">
            MA BIBLIOTHÈQUE
          </h1>
          <p className="text-xs text-gray-400 mt-1">Vos favoris, playlists sur mesure et artistes suivis</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[#111111] p-1.5 rounded-2xl border border-white/10 overflow-x-auto hide-scrollbar shrink-0">
        <TabButton active={activeTab === 'likes'} onClick={() => setActiveTab('likes')} icon={Heart} label="Favoris" />
        <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} icon={ListMusic} label="Playlists" />
        <TabButton active={activeTab === 'artists'} onClick={() => setActiveTab('artists')} icon={UserCheck} label="Artistes suivis" />
        <TabButton active={activeTab === 'offline'} onClick={() => setActiveTab('offline')} icon={CloudOff} label="Hors-ligne" />
      </div>

      <div>
        {activeTab === 'likes' && <LikesTab />}
        {activeTab === 'playlists' && <PlaylistsTab />}
        {activeTab === 'artists' && <FollowedArtistsTab />}
        {activeTab === 'offline' && <OfflineTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs md:text-sm font-semibold whitespace-nowrap ${
        active 
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={18} className={active ? 'text-amber-400' : ''} />
      <span>{label}</span>
    </button>
  );
}

// --- TAB 1: FAVORIS ---
function LikesTab() {
  const { likedTracks, toggleLike, loading } = useLikes();
  const { play, setQueueAndPlay, currentTrack } = useAudio();
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Disc3 size={40} className="text-amber-500 animate-spin opacity-50" />
        <p className="text-xs text-gray-400 mt-4 font-mono tracking-widest uppercase">Synchronisation Supabase...</p>
      </div>
    );
  }

  if (likedTracks.length === 0) {
    return <EmptyState icon={Heart} title="Aucun favori pour le moment" desc="Cliquez sur le cœur d'un morceau pour le retrouver ici." />;
  }

  const handlePlayAll = (shuffle = false) => {
    if (!likedTracks.length) return;
    const tracks = shuffle ? [...likedTracks].sort(() => Math.random() - 0.5) : likedTracks;
    setQueueAndPlay(tracks, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
        <span className="text-xs text-gray-300 font-medium">{likedTracks.length} titre(s) en favori</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePlayAll(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            <Play size={14} fill="currentColor" /> Tout lire
          </button>
          <button
            onClick={() => handlePlayAll(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
          >
            <Shuffle size={14} /> Aléatoire
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {likedTracks.map((track) => (
          <TrackItem 
            key={track.videoId || track.id} 
            track={track} 
            currentTrack={currentTrack} 
            onPlay={() => play(track)} 
            onAddToPlaylist={() => setSelectedTrackForPlaylist(track)}
          />
        ))}
      </div>

      <AddToPlaylistModal
        track={selectedTrackForPlaylist}
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
      />
    </div>
  );
}

// --- TAB 2: PLAYLISTS ---
function PlaylistsTab() {
  const { playlists, createPlaylist, deletePlaylist, loading } = usePlaylists();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null);

  const handleCreate = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreate(false);
    }
  };

  if (loading && !playlists.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Disc3 size={40} className="text-amber-500 animate-spin opacity-50" />
      </div>
    );
  }

  if (activePlaylist) {
    return <PlaylistView playlist={activePlaylist} onBack={() => setActivePlaylist(null)} />;
  }

  return (
    <div className="space-y-5">
      <button 
        onClick={() => setShowCreate(true)}
        className="w-full p-4 border border-dashed border-amber-500/30 rounded-2xl flex items-center justify-center gap-2.5 text-amber-400 hover:text-amber-300 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 transition-all font-semibold text-sm"
      >
        <Plus size={20} />
        <span>Créer une nouvelle playlist sur mesure</span>
      </button>

      {showCreate && (
        <form onSubmit={handleCreate} className="flex gap-2 p-3 bg-white/5 rounded-2xl border border-white/10">
          <input 
            type="text" 
            autoFocus
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="Nom de la playlist (ex: French Touch, Gym, Soirée...)"
            className="flex-1 bg-black/40 border border-white/15 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          />
          <button type="submit" className="bg-amber-500 px-5 py-2 rounded-xl text-black font-bold text-xs hover:bg-amber-400 transition-colors">
            Créer
          </button>
        </form>
      )}

      {playlists.length === 0 && !showCreate ? (
        <EmptyState icon={ListMusic} title="Aucune playlist" desc="Créez vos playlists personnalisées et choisissez leurs couvertures !" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {playlists.map(pl => (
            <div 
              key={pl.id} 
              className="bg-[#141414] border border-white/10 rounded-2xl p-3.5 cursor-pointer hover:border-amber-500/50 hover:bg-white/[0.04] transition-all group relative flex flex-col justify-between"
              onClick={() => setActivePlaylist(pl)}
            >
              <div>
                <div className="w-full aspect-square bg-[#222] rounded-xl mb-3 overflow-hidden flex items-center justify-center text-gray-600 relative shadow-md">
                  {pl.cover ? (
                    <img src={pl.cover} alt={pl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <ListMusic size={36} className="group-hover:text-amber-400 transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <Play size={20} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>
                <h3 className="text-white font-bold text-sm truncate">{pl.name}</h3>
                <span className="text-[11px] text-gray-400 block mt-0.5">Playlist utilisateur</span>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}
                className="absolute top-2 right-2 p-1.5 bg-black/70 text-gray-400 hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Supprimer la playlist"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- SINGLE PLAYLIST VIEW ---
function PlaylistView({ playlist, onBack }) {
  const tracks = usePlaylistTracks(playlist.id);
  const { removeTrackFromPlaylist, updatePlaylistCover, updatePlaylistName } = usePlaylists();
  const { play, setQueueAndPlay, currentTrack } = useAudio();

  const [isEditingCover, setIsEditingCover] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(playlist.name);
  const [customCoverUrl, setCustomCoverUrl] = useState('');

  const handlePlayAll = (shuffle = false) => {
    if (!tracks.length) return;
    const playListTracks = tracks.map(t => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail
    }));
    const sorted = shuffle ? [...playListTracks].sort(() => Math.random() - 0.5) : playListTracks;
    setQueueAndPlay(sorted, 0);
  };

  const handleSaveName = (e) => {
    e.preventDefault();
    if (editedName.trim()) {
      updatePlaylistName(playlist.id, editedName.trim());
      setIsEditingName(false);
    }
  };

  const handleSelectTrackCover = (coverUrl) => {
    updatePlaylistCover(playlist.id, coverUrl);
    setIsEditingCover(false);
  };

  const handleSaveCustomUrl = (e) => {
    e.preventDefault();
    if (customCoverUrl.trim()) {
      updatePlaylistCover(playlist.id, customCoverUrl.trim());
      setCustomCoverUrl('');
      setIsEditingCover(false);
    }
  };

  const currentCover = playlist.cover || (tracks.length > 0 ? tracks[0].thumbnail : null);

  return (
    <div className="fade-in space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors">
        <ChevronLeft size={18} />
        <span>Retour à la liste des playlists</span>
      </button>

      {/* Playlist Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 bg-white/5 p-6 rounded-3xl border border-white/10">
        <div className="relative w-36 h-36 rounded-2xl overflow-hidden shrink-0 bg-[#222] border border-white/10 shadow-xl group">
          {currentCover ? (
            <img src={currentCover} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <ListMusic size={48} />
            </div>
          )}

          <button
            onClick={() => setIsEditingCover(true)}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity gap-1"
          >
            <ImageIcon size={20} className="text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Changer l'image</span>
          </button>
        </div>

        <div className="flex-1 text-center md:text-left min-w-0">
          <span className="text-[10px] text-amber-400 uppercase tracking-widest font-mono font-bold block mb-1">Playlist Personnalisée</span>
          
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex gap-2 max-w-sm my-1">
              <input
                type="text"
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="bg-black/60 border border-amber-500 rounded-lg px-3 py-1 text-base text-white font-bold flex-1"
              />
              <button type="submit" className="bg-amber-500 px-3 py-1 rounded-lg text-black font-bold text-xs">OK</button>
            </form>
          ) : (
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white truncate">{playlist.name}</h2>
              <button onClick={() => setIsEditingName(true)} className="p-1 text-gray-400 hover:text-amber-400">
                <Edit2 size={16} />
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">{tracks.length} morceau(x) enregistré(s)</p>

          <div className="flex flex-wrap items-center gap-3 mt-4 justify-center md:justify-start">
            <button
              onClick={() => handlePlayAll(false)}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg disabled:opacity-50 transition-colors"
            >
              <Play size={16} fill="currentColor" />
              <span>Tout lire</span>
            </button>
            <button
              onClick={() => handlePlayAll(true)}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs disabled:opacity-50 transition-colors"
            >
              <Shuffle size={16} />
              <span>Mélanger</span>
            </button>
            <button
              onClick={() => setIsEditingCover(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-white/20 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <ImageIcon size={14} />
              <span>Changer la pochette</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cover Image Selector Modal */}
      {isEditingCover && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4 fade-in">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} /> Choisir la pochette de la playlist
            </h4>
            <button onClick={() => setIsEditingCover(false)} className="text-xs text-gray-400 hover:text-white">Fermer</button>
          </div>

          <p className="text-xs text-gray-300">Sélectionnez la pochette parmi l'un des morceaux de cette playlist :</p>
          
          {tracks.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
              {tracks.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => handleSelectTrackCover(t.thumbnail)}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-amber-500 transition-all relative group"
                >
                  <TrackImage src={t.thumbnail} alt={t.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-amber-400">
                    <Check size={20} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Ajoutez d'abord des morceaux pour choisir leur pochette.</p>
          )}

          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-2">Ou renseignez l'URL d'une image personnalisée :</p>
            <form onSubmit={handleSaveCustomUrl} className="flex gap-2">
              <input
                type="url"
                value={customCoverUrl}
                onChange={(e) => setCustomCoverUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <button type="submit" className="px-3 py-1.5 bg-amber-500 text-black font-bold text-xs rounded-xl">Appliquer</button>
            </form>
          </div>
        </div>
      )}

      {/* Playlist Tracks List */}
      {tracks.length === 0 ? (
        <p className="text-center text-gray-500 py-12 text-sm">Cette playlist est vide. Utilisez le bouton (+) sur n'importe quel morceau pour l'ajouter ici.</p>
      ) : (
        <div className="space-y-2">
          {tracks.map(track => (
            <TrackItem 
              key={track.id} 
              track={track} 
              currentTrack={currentTrack} 
              onPlay={() => play({
                videoId: track.videoId,
                title: track.title,
                artist: track.artist,
                thumbnail: track.thumbnail
              })} 
              actionIcon={<Trash2 size={18} className="text-gray-400 hover:text-red-400" />}
              onAction={() => removeTrackFromPlaylist(playlist.id, track.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- TAB 3: ARTISTES SUIVIS ---
function FollowedArtistsTab() {
  const { followedArtists, unfollowArtist, loading } = useFollowedArtists();
  const navigate = useNavigate();

  if (loading && !followedArtists.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Disc3 size={40} className="text-amber-500 animate-spin opacity-50" />
      </div>
    );
  }

  if (followedArtists.length === 0) {
    return <EmptyState icon={Users} title="Aucun artiste suivi" desc="Abonnez-vous à vos artistes préférés sur leur page pour les retrouver ici !" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 font-medium">{followedArtists.length} artiste(s) suivi(s)</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {followedArtists.map((artist) => (
          <div 
            key={artist.name}
            onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
            className="bg-[#141414] border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:border-amber-500/50 hover:bg-white/[0.04] transition-all group relative"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-amber-500/30 group-hover:border-amber-400 shadow-lg mb-3 shrink-0">
              <ArtistAvatar artistName={artist.name} fallbackSrc={artist.avatar} className="w-full h-full object-cover" />
            </div>

            <h3 className="text-white font-bold text-sm truncate w-full">{artist.name}</h3>
            <span className="text-[11px] text-amber-400 font-mono block mt-0.5">{artist.genre || 'Artiste'}</span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                unfollowArtist(artist.name);
              }}
              className="mt-3 px-3 py-1 rounded-full border border-white/20 text-[11px] text-gray-400 hover:text-red-400 hover:border-red-400/50 transition-colors"
            >
              Ne plus suivre
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- TAB 4: HORS-LIGNE ---
function OfflineTab() {
  const { downloadedTracks, removeTrack } = useOffline();
  const { play, currentTrack } = useAudio();
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);

  if (!downloadedTracks || downloadedTracks.length === 0) {
    return <EmptyState icon={CloudOff} title="Aucun morceau téléchargé" desc="Téléchargez vos titres préférés pour une écoute sans aucune connexion internet." />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-medium">{downloadedTracks.length} morceau(x) disponible(s) hors-ligne</p>
      <div className="space-y-2">
        {downloadedTracks.map((track) => (
          <TrackItem 
            key={track.videoId} 
            track={track} 
            currentTrack={currentTrack} 
            onPlay={() => play(track)} 
            onAddToPlaylist={() => setSelectedTrackForPlaylist(track)}
            actionIcon={<Trash2 size={18} className="text-gray-400 hover:text-red-400" />}
            onAction={() => removeTrack(track.videoId)}
          />
        ))}
      </div>

      <AddToPlaylistModal
        track={selectedTrackForPlaylist}
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
      />
    </div>
  );
}

// --- SHARED TRACK ITEM ---
function TrackItem({ track, currentTrack, onPlay, onAddToPlaylist, actionIcon, onAction }) {
  const { isCurrentTrack, isPlaying } = useAudio();
  const { isLiked, toggleLike } = useLikes();
  
  const isThisActive = isCurrentTrack(track);
  const isThisPlaying = isThisActive && isPlaying;
  const liked = isLiked(track);

  return (
    <div className={`flex items-center gap-3.5 p-2.5 rounded-2xl transition-all border ${
      isThisActive 
        ? 'bg-amber-500/15 border-amber-500/40 shadow-md ring-1 ring-amber-500/20' 
        : 'border-transparent hover:border-white/10 hover:bg-white/5'
    }`}>
      <div 
        className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 cursor-pointer group shadow-sm border ${
          isThisActive ? 'border-amber-500/50' : 'border-white/5'
        }`}
        onClick={onPlay}
      >
        <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
          isThisActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {isThisPlaying ? (
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-1 bg-amber-400 animate-bounce rounded-full h-full" />
              <span className="w-1 bg-amber-400 animate-bounce rounded-full h-2/3 delay-75" />
              <span className="w-1 bg-amber-400 animate-bounce rounded-full h-4/5 delay-150" />
            </div>
          ) : (
            <Play size={18} className="text-white fill-white" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <p className={`font-bold text-sm truncate ${isThisActive ? 'text-amber-400 font-bold' : 'text-white'}`}>
          {track.title}
        </p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track);
          }}
          className="p-2 transition-transform active:scale-90"
          title={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart size={18} className={liked ? 'text-red-500 fill-red-500 drop-shadow-sm' : 'text-gray-400 hover:text-white'} />
        </button>

        {onAddToPlaylist && (
          <button 
            onClick={() => onAddToPlaylist(track)}
            className="p-2 text-gray-400 hover:text-amber-400 rounded-full hover:bg-white/10 transition-colors"
            title="Ajouter à une playlist"
          >
            <Plus size={18} />
          </button>
        )}

        {actionIcon && (
          <button onClick={onAction} className="p-2 transition-transform active:scale-90 text-gray-400 hover:text-white">
            {actionIcon}
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-4">
        <Icon size={32} />
      </div>
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-gray-400 max-w-sm">{desc}</p>
    </div>
  );
}
