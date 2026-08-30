import { useAudio } from '../../context/AudioContext';
import { useLikes } from '../../hooks/useLikes';
import { ListMusic, Trash2, X, Music, Heart } from 'lucide-react';
import TrackImage from '../common/TrackImage';

export default function QueueDrawer({ isOpen, onClose }) {
  const { queue, play, currentTrack, isCurrentTrack, removeFromQueue, clearQueue } = useAudio();
  const { isLiked, toggleLike } = useLikes();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col p-6 fade-in safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <ListMusic size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">File d'Attente</h3>
            <p className="text-xs text-gray-400">{queue.length} titre(s) en attente</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-all"
              title="Vider la file"
            >
              <Trash2 size={13} />
              <span>Vider</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-full glass hover:bg-white/20 text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full py-4 space-y-2">
        {/* Titre actuel */}
        {currentTrack && (
          <div className="p-3.5 rounded-2xl bg-amber-600/15 border border-amber-600/40 mb-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm shrink-0">
              <TrackImage 
                src={currentTrack.thumbnail} 
                alt={currentTrack.title} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                En cours de lecture
              </span>
              <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
            </div>
          </div>
        )}

        {/* Éléments suivants */}
        {queue.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Music size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Votre file d'attente est vide.</p>
            <p className="text-xs text-gray-600 mt-1">Ajoutez des morceaux depuis la recherche ou l'accueil.</p>
          </div>
        ) : (
          queue.map((track, idx) => {
            const isPlayingThis = isCurrentTrack(track);
            const liked = isLiked(track);

            return (
              <div
                key={`${track.videoId || track.id}_${idx}`}
                onClick={() => play(track)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group ${
                  isPlayingThis ? 'bg-amber-500/15 border border-amber-500/40 shadow-sm' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={`text-xs font-mono w-5 text-center ${isPlayingThis ? 'text-amber-400 font-bold' : 'text-gray-500'}`}>
                  {idx + 1}
                </span>

                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/5">
                  <TrackImage 
                    src={track.thumbnail} 
                    alt={track.title} 
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isPlayingThis ? 'text-amber-400 font-bold' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("CLIC CŒUR CAPTURÉ", track);
                      toggleLike(track);
                    }}
                    className="p-1.5 transition-colors relative z-50 cursor-pointer"
                    title={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    style={{ pointerEvents: 'auto', zIndex: 50 }}
                  >
                    <Heart size={16} className={liked ? 'text-red-500 fill-red-500 drop-shadow-sm relative z-50 cursor-pointer' : 'text-gray-500 hover:text-white relative z-50 cursor-pointer'} style={{ pointerEvents: 'auto' }} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(idx);
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Retirer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
