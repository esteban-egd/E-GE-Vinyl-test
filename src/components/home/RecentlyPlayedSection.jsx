import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, History, Disc3, Trash2, ArrowRight } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { getRecentlyPlayed, clearRecentlyPlayed } from '../../services/recentlyPlayedService';
import { getMainArtistName } from '../../services/musicDataService';

const DEFAULT_HD_COVER = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "À l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Il y a ${diffDays} j`;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RecentlyPlayedSection({ onSelectTrackForPlaylist }) {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const { currentTrack, isPlaying, play, togglePlayPause, setQueueAndPlay, isCurrentTrack } = useAudio();

  const [recentTracks, setRecentTracks] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadTracks = useCallback(() => {
    const list = getRecentlyPlayed(10);
    setRecentTracks(list);
  }, []);

  useEffect(() => {
    loadTracks();

    const handleUpdate = () => {
      loadTracks();
    };

    window.addEventListener('ege_recently_played_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('ege_recently_played_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadTracks]);

  const handlePlayAll = () => {
    if (recentTracks.length === 0) return;
    setQueueAndPlay(recentTracks, 0);
  };

  const handleTrackClick = (track) => {
    if (isCurrentTrack(track)) {
      togglePlayPause();
    } else {
      play(track);
    }
  };

  const handleClear = () => {
    clearRecentlyPlayed();
    setRecentTracks([]);
    setShowClearConfirm(false);
  };

  const primaryColor = currentTheme?.primary || '#1ED760';

  if (recentTracks.length === 0) {
    return null; // Si aucun historique dans localStorage, la section est masquée ou affiche un état léger
  }

  return (
    <section className="space-y-4 pt-1" aria-label="Recently Played Tracks">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 shrink-0"
              style={{ background: `${primaryColor}15`, color: primaryColor }}
            >
              <History size={17} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Recently Played</span>
              <span className="text-xs font-mono font-medium text-gray-400">
                · {recentTracks.length} {recentTracks.length > 1 ? 'vinyles' : 'vinyle'}
              </span>
            </h2>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-1 pl-10.5">
            Accédez instantanément à vos 10 dernières écoutes mémorisées
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {recentTracks.length > 1 && (
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
              style={{ borderColor: `${primaryColor}40` }}
              title="Lire la liste des morceaux récemment écoutés"
            >
              <Play size={13} fill="currentColor" style={{ color: primaryColor }} />
              <span>Tout écouter</span>
            </button>
          )}

          {showClearConfirm ? (
            <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 px-2 py-1 rounded-xl">
              <span className="text-[11px] text-red-300 font-medium">Effacer ?</span>
              <button
                onClick={handleClear}
                className="text-[11px] font-bold text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded cursor-pointer"
              >
                Oui
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-[11px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
              >
                Non
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Effacer l'historique récent du navigateur"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Responsive Vinyl Cards Grid (10 items max) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {recentTracks.map((track, idx) => {
          const isThisPlaying = isCurrentTrack(track) && isPlaying;
          const isThisCurrent = isCurrentTrack(track);
          const coverUrl = track.thumbnail || track.cover || DEFAULT_HD_COVER;
          const cleanArtist = getMainArtistName(track.artist);
          const timeLabel = formatRelativeTime(track.playedAt);
          const durationLabel = formatDuration(track.duration);

          return (
            <div
              key={`recent_${track.id || track.videoId || idx}`}
              onClick={() => handleTrackClick(track)}
              className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                isThisCurrent
                  ? 'bg-white/10 border-white/30 shadow-lg'
                  : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20 shadow-sm'
              }`}
            >
              {/* Vinyl Sleeve & Interactive Disc Container */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 border border-white/10 shadow-md bg-black/40">
                {/* Vinyl record peek effect */}
                <div 
                  className={`absolute right-1 top-1 bottom-1 w-2/3 rounded-full bg-[#0d0c0b] border border-white/15 pointer-events-none transition-transform duration-500 flex items-center justify-center ${
                    isThisPlaying 
                      ? 'translate-x-3 rotate-180 animate-spin-slow' 
                      : 'translate-x-1 group-hover:translate-x-4 group-hover:rotate-45'
                  }`}
                  style={{ animationDuration: '6s' }}
                >
                  {/* Microgroove rings */}
                  <div className="w-4/5 h-4/5 rounded-full border border-white/5 flex items-center justify-center">
                    <div className="w-1/2 h-1/2 rounded-full border border-white/5 flex items-center justify-center">
                      {/* Center label sticker */}
                      <div 
                        className="w-1/2 h-1/2 rounded-full shadow-inner flex items-center justify-center"
                        style={{ background: `${primaryColor}40` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-black border border-white/30" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Album Artwork Jacket */}
                <img
                  src={coverUrl}
                  alt={track.title}
                  className="relative z-10 w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_HD_COVER;
                  }}
                />

                {/* Playing indicator badge (unboxed wave) */}
                {isThisPlaying && (
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">Lecture</span>
                  </div>
                )}

                {/* Hover Play/Pause Overlay */}
                <div className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-end p-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrackClick(track);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    style={{ background: primaryColor, color: '#000000' }}
                    title={isThisPlaying ? 'Mettre en pause' : 'Lire ce vinyle'}
                  >
                    {isThisPlaying ? (
                      <Pause size={18} fill="currentColor" className="stroke-none" />
                    ) : (
                      <Play size={18} fill="currentColor" className="ml-0.5 stroke-none" />
                    )}
                  </button>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="min-w-0">
                <h3 
                  className="font-bold text-sm text-white truncate transition-colors"
                  style={{ color: isThisCurrent ? primaryColor : undefined }}
                  title={track.title}
                >
                  {track.title}
                </h3>

                <p
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/artist/${encodeURIComponent(cleanArtist)}`);
                  }}
                  className="text-xs text-gray-400 truncate mt-0.5 font-medium hover:text-white hover:underline cursor-pointer"
                  title={cleanArtist}
                >
                  {cleanArtist}
                </p>

                {/* Clean unboxed metadata (anti-slop rule) */}
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono mt-1.5">
                  {timeLabel && <span>{timeLabel}</span>}
                  {timeLabel && durationLabel && <span aria-hidden="true">·</span>}
                  {durationLabel && <span>{durationLabel}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
