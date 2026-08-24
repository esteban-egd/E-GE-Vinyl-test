import { useState } from 'react';
import { useLikes } from '../hooks/useLikes';
import { usePlaylists, usePlaylistTracks } from '../hooks/usePlaylists';
import { useOfflineCache } from '../hooks/useOfflineCache';
import { useAudio } from '../context/AudioContext';
import { Play, Heart, Download, Trash2, ListMusic, CloudOff, Plus, ChevronLeft } from 'lucide-react';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('likes'); // 'likes', 'playlists', 'offline'
  
  return (
    <div className="flex flex-col h-full p-4 md:p-8 max-w-4xl mx-auto w-full fade-in">
      <h1 className="text-2xl font-bold text-white mb-6 text-equinox tracking-widest pt-4">BIBLIOTHÈQUE</h1>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[#111111] p-1 rounded-xl border border-[#2a2a2a] overflow-x-auto hide-scrollbar">
        <TabButton active={activeTab === 'likes'} onClick={() => setActiveTab('likes')} icon={Heart} label="Favoris" />
        <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} icon={ListMusic} label="Playlists" />
        <TabButton active={activeTab === 'offline'} onClick={() => setActiveTab('offline')} icon={CloudOff} label="Hors-ligne" />
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'likes' && <LikesTab />}
        {activeTab === 'playlists' && <PlaylistsTab />}
        {activeTab === 'offline' && <OfflineTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium whitespace-nowrap ${
        active 
          ? 'bg-[#222222] text-white shadow-sm' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={18} className={active ? 'text-purple-400' : ''} />
      <span>{label}</span>
    </button>
  );
}

// --- TABS COMPONENTS ---

function LikesTab() {
  const { likedTracks, toggleLike } = useLikes();
  const { play, currentTrack } = useAudio();

  if (likedTracks.length === 0) {
    return <EmptyState icon={Heart} title="Aucun favori" desc="Vos morceaux aimés apparaîtront ici." />;
  }

  return (
    <div className="space-y-2">
      {likedTracks.map((track) => (
        <TrackItem 
          key={track.videoId} 
          track={track} 
          currentTrack={currentTrack} 
          onPlay={() => play(track)} 
          actionIcon={<Heart size={20} className="text-pink-500 fill-pink-500" />}
          onAction={() => toggleLike(track)}
        />
      ))}
    </div>
  );
}

function PlaylistsTab() {
  const { playlists, createPlaylist, deletePlaylist } = usePlaylists();
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

  if (activePlaylist) {
    return <PlaylistView playlist={activePlaylist} onBack={() => setActivePlaylist(null)} />;
  }

  return (
    <div className="space-y-4">
      <button 
        onClick={() => setShowCreate(true)}
        className="w-full p-4 border border-dashed border-[#333] rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-purple-500 transition-colors"
      >
        <Plus size={20} />
        <span>Créer une playlist</span>
      </button>

      {showCreate && (
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input 
            type="text" 
            autoFocus
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="Nom de la playlist"
            className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          />
          <button type="submit" className="bg-purple-600 px-4 py-2 rounded-lg text-white font-medium hover:bg-purple-500">
            Créer
          </button>
        </form>
      )}

      {playlists.length === 0 && !showCreate ? (
        <EmptyState icon={ListMusic} title="Aucune playlist" desc="Créez vos playlists personnalisées." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {playlists.map(pl => (
            <div 
              key={pl.id} 
              className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 cursor-pointer hover:border-purple-500/50 transition-colors group relative"
              onClick={() => setActivePlaylist(pl)}
            >
              <div className="w-full aspect-square bg-[#222222] rounded-lg mb-3 flex items-center justify-center text-gray-600 group-hover:text-purple-400 transition-colors">
                 <ListMusic size={32} />
              </div>
              <h3 className="text-white font-medium truncate">{pl.name}</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 text-gray-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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

function PlaylistView({ playlist, onBack }) {
  const tracks = usePlaylistTracks(playlist.id);
  const { removeTrackFromPlaylist } = usePlaylists();
  const { play, currentTrack } = useAudio();

  return (
    <div className="fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-white truncate">{playlist.name}</h2>
      </div>

      {tracks.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Cette playlist est vide. Cherchez des morceaux pour les ajouter.</p>
      ) : (
        <div className="space-y-2">
          {tracks.map(track => (
            <TrackItem 
              key={track.id} 
              track={track} 
              currentTrack={currentTrack} 
              onPlay={() => play(track)} 
              actionIcon={<Trash2 size={18} />}
              onAction={() => removeTrackFromPlaylist(playlist.id, track.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OfflineTab() {
  const { cachedTracks, removeTrack } = useOfflineCache();
  const { play, currentTrack } = useAudio();

  if (!cachedTracks || cachedTracks.length === 0) {
    return <EmptyState icon={CloudOff} title="Rien hors-ligne" desc="Téléchargez des morceaux pour les écouter sans connexion." />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-400 mb-4">{cachedTracks.length} morceau(x) disponible(s) hors-ligne</p>
      {cachedTracks.map((track) => (
        <TrackItem 
          key={track.videoId} 
          track={track} 
          currentTrack={currentTrack} 
          onPlay={() => play(track)} 
          actionIcon={<Trash2 size={18} className="text-gray-400 hover:text-red-500" />}
          onAction={() => removeTrack(track.videoId)}
        />
      ))}
    </div>
  );
}

// --- SHARED COMPONENTS ---

function TrackItem({ track, currentTrack, onPlay, actionIcon, onAction }) {
  const isPlaying = currentTrack?.videoId === track.videoId;

  return (
    <div className={`flex items-center gap-4 p-2 rounded-xl transition-colors hover:bg-white/5 ${isPlaying ? 'bg-white/10' : ''}`}>
      <div 
        className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 cursor-pointer group"
        onClick={onPlay}
      >
        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isPlaying ? (
            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse neon-purple" />
          ) : (
            <Play size={20} className="text-white fill-white" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <p className={`font-semibold text-sm truncate ${isPlaying ? 'text-purple-400' : 'text-white'}`}>
          {track.title}
        </p>
        <p className="text-xs text-gray-400 truncate">{track.artist}</p>
      </div>

      <button onClick={onAction} className="p-2 transition-transform active:scale-90">
        {actionIcon}
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <Icon size={48} className="mb-4 opacity-50" />
      <h3 className="text-lg font-medium text-gray-300 mb-1">{title}</h3>
      <p className="text-sm">{desc}</p>
    </div>
  );
}
