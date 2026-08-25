import { useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useLikes } from '../../hooks/useLikes';
import { useOffline } from '../../hooks/useOffline';
import { useNavigate } from 'react-router-dom';
import { getMainArtistName } from '../../services/musicDataService';
import QueueDrawer from './QueueDrawer';
import AddToPlaylistModal from '../common/AddToPlaylistModal';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Shuffle, Repeat, Repeat1, Heart, Download, Check,
  ListMusic, User, Plus
} from 'lucide-react';

export default function PlayerControls() {
  const { 
    isPlaying, togglePlayPause, playNext, playPrevious,
    currentTime, duration, seek, shuffle, toggleShuffle,
    repeat, toggleRepeat, currentTrack, isLoading, queue
  } = useAudio();

  const { isLiked, toggleLike } = useLikes();
  const { isDownloaded, downloadTrack, isDownloading, removeTrack } = useOffline();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  const [showQueue, setShowQueue] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const formatTime = (time) => {
    if (isNaN(time) || time === null) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const value = parseFloat(e.target.value);
    seek(value);
  };

  if (!currentTrack) {
    return (
      <div className="w-full max-w-md mx-auto px-6 py-8 flex flex-col items-center text-center gap-4 z-10 bg-[#120f0a]/90 border border-[#2d1c12] rounded-3xl mt-4 shadow-2xl relative overflow-hidden">
        <div className="w-12 h-12 rounded-full bg-[#c29e5a]/10 border border-[#c29e5a]/20 flex items-center justify-center text-[#c29e5a]">
          <Plus size={20} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Aucun Vinyle sélectionné</h3>
          <p className="text-[11px] text-gray-400 max-w-[260px] leading-relaxed mx-auto">
            Sélectionnez une musique pour la charger sur la platine et lancer l'écoute.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gradient-to-r from-[#e1bb72] to-[#c29e5a] text-[#0d0c0b] text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.03] active:scale-[0.97] transition-all shadow-md cursor-pointer"
        >
          Parcourir les Albums
        </button>
      </div>
    );
  }

  const trackLiked = isLiked(currentTrack);
  const trackDownloaded = isDownloaded(currentTrack.videoId);
  const trackDownloading = isDownloading.has(currentTrack.videoId);

  return (
    <>
      <div className="w-full max-w-md mx-auto px-5 pt-6 pb-4 flex flex-col gap-5 z-10 glass-strong rounded-3xl mt-4 border border-white/10 shadow-2xl relative overflow-hidden">
        {currentTrack?.thumbnail && (
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url(${currentTrack.thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(20px) saturate(2)"
            }}
          />
        )}
        
        {/* Title & Actions */}
        <div className="flex justify-between items-center">
          <div className="flex-1 overflow-hidden pr-3">
            <h2 className="text-lg md:text-xl font-bold text-white truncate text-equinox tracking-widest">
              {currentTrack.title}
            </h2>
            <p 
              onClick={() => navigate(`/artist/${encodeURIComponent(getMainArtistName(currentTrack.artist))}`)}
              className="text-xs md:text-sm font-medium truncate hover:underline cursor-pointer flex items-center gap-1.5 w-fit mt-0.5"
              style={{ color: currentTheme?.primary || '#1ED760' }}
            >
              <User size={13} />
              <span>{currentTrack.artist}</span>
            </p>
          </div>
          
          <div className="flex gap-1.5 items-center shrink-0">
            <button
              onClick={() => setShowPlaylistModal(true)}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors hover:text-white"
              title="Ajouter à une playlist (+)"
            >
              <Plus size={20} />
            </button>

            <button 
              onClick={() => toggleLike(currentTrack)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title={trackLiked ? 'Favori' : 'Ajouter aux favoris'}
            >
              <Heart 
                size={20} 
                className={trackLiked ? 'text-pink-500 fill-pink-500 neon-purple' : 'text-gray-400'} 
              />
            </button>
            
            <button 
              onClick={() => trackDownloaded ? removeTrack(currentTrack.videoId) : downloadTrack(currentTrack)}
              disabled={trackDownloading}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title={trackDownloaded ? 'Retirer du mode hors-ligne' : 'Télécharger hors-ligne'}
            >
              {trackDownloaded ? (
                <Check size={20} className="text-amber-500" />
              ) : trackDownloading ? (
                <div className="w-[20px] h-[20px] rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              ) : (
                <Download size={20} className="text-gray-400 hover:text-amber-500" />
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={currentTime || 0}
            onChange={handleSeek}
            className="progress-track w-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${currentTheme?.primary || '#1ED760'} ${(currentTime / (duration || 1)) * 100}%, #262626 ${(currentTime / (duration || 1)) * 100}%)`
            }}
          />
          <div className="flex justify-between text-[11px] text-gray-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
        <div className="flex justify-between items-center px-1">
          <button 
            onClick={toggleShuffle}
            className="p-2 rounded-full transition-colors hover:text-white"
            style={shuffle ? { color: currentTheme?.primary || '#1ED760', backgroundColor: `${currentTheme?.primary || '#1ED760'}25` } : { color: '#9ca3af' }}
            title="Lecture Aléatoire"
          >
            <Shuffle size={18} />
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={playPrevious}
              className="p-2.5 rounded-full text-white hover:bg-white/10 transition-colors active:scale-90"
              title="Précédent"
            >
              <SkipBack size={22} fill="currentColor" />
            </button>

            <button 
              onClick={togglePlayPause}
              disabled={isLoading && !isPlaying}
              className="w-14 h-14 flex items-center justify-center rounded-full text-black hover:scale-105 active:scale-95 transition-all shadow-lg"
              style={{
                backgroundColor: currentTheme?.primary || '#1ED760',
                boxShadow: `0 0 20px ${currentTheme?.glow || 'rgba(30, 215, 96, 0.4)'}`
              }}
              title={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isLoading && !isPlaying ? (
                <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="ml-1" />
              )}
            </button>

            <button 
              onClick={playNext}
              className="p-2.5 rounded-full text-white hover:bg-white/10 transition-colors active:scale-90"
              title="Suivant"
            >
              <SkipForward size={22} fill="currentColor" />
            </button>
          </div>

          <button 
            onClick={toggleRepeat}
            className="p-2 rounded-full transition-colors hover:text-white"
            style={repeat !== 'off' ? { color: currentTheme?.primary || '#1ED760', backgroundColor: `${currentTheme?.primary || '#1ED760'}25` } : { color: '#9ca3af' }}
            title={`Répétition: ${repeat}`}
          >
            {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Extra Action Pills (File d'attente) */}
        <div className="flex items-center justify-center gap-3 pt-2 border-t border-white/5">
          <button
            onClick={() => setShowQueue(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass hover:bg-white/15 text-xs text-cyan-300 font-medium transition-all"
          >
            <ListMusic size={13} />
            <span>File ({queue.length})</span>
          </button>
        </div>
      </div>

      {/* Drawers & Modals */}
      <QueueDrawer isOpen={showQueue} onClose={() => setShowQueue(false)} />
      <AddToPlaylistModal track={currentTrack} isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} />
    </>
  );
}
