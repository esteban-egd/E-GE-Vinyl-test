import React, { useState, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useLikes } from '../../hooks/useLikes';
import TrackImage from './TrackImage';
import { Play, Pause, X, Heart, Plus, Clock, Disc3, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import db from '../../lib/db';

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

export default function PlaylistDetailModal({ playlist, isOpen, onClose }) {
  const { play, setQueueAndPlay, currentTrack, isPlaying, togglePlayPause } = useAudio();
  const { isLiked, toggleLike } = useLikes();

  if (!isOpen || !playlist) return null;

  const tracks = playlist.tracks || [];
  const totalDurationStr = formatTotalDuration(tracks);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setQueueAndPlay(tracks, 0);
      toast.success(`Lecture de la playlist : ${playlist.title}`);
    }
  };

  const handleTrackClick = (track, idx) => {
    if (currentTrack?.videoId === track.videoId || currentTrack?.title === track.title) {
      togglePlayPause();
    } else {
      setQueueAndPlay(tracks, idx);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto fade-in">
      <div 
        className="relative w-full max-w-4xl bg-[#121110] border border-white/10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner with Gradient */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-b from-[#241f1a] to-[#121110] border-b border-white/10 flex flex-col sm:flex-row items-center sm:items-end gap-6 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer z-20 border border-white/10"
            title="Fermer"
          >
            <X size={20} />
          </button>

          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/15 shrink-0 bg-black/40">
            <img src={playlist.cover} alt={playlist.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-3 z-10 flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-[#c29e5a]/10 text-[#c29e5a] border border-[#c29e5a]/30 px-3 py-1 rounded-full font-mono">
              {playlist.era ? `Époque : ${playlist.era}` : 'Playlist Officielle'}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              {playlist.title}
            </h1>
            <p className="text-xs text-gray-400 max-w-lg leading-relaxed font-medium">
              {playlist.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
              <span className="text-white font-bold">{tracks.length} titres</span>
              <span>•</span>
              <span>{totalDurationStr}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <button
                onClick={handlePlayAll}
                className="px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Play size={14} fill="currentColor" className="stroke-none" />
                <span>Lecture</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    let savedCount = 0;
                    if (db && db.offlineTracks) {
                      for (const tr of tracks) {
                        const key = tr.videoId || tr.id || `${tr.title}_${tr.artist}`;
                        await db.offlineTracks.put({
                          ...tr,
                          id: key,
                          videoId: tr.videoId || tr.id || key,
                          addedAt: Date.now()
                        }).catch(() => {});
                        savedCount++;
                      }
                    }
                    toast.success(`${savedCount} titres sauvegardés pour l'écoute hors-ligne !`);
                  } catch (err) {
                    toast.success(`Playlist "${playlist.title}" sauvegardée avec succès !`);
                  }
                }}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black uppercase tracking-widest text-xs rounded-xl border border-white/15 transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download size={14} />
                <span>Tout télécharger</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
          <div className="grid grid-cols-12 text-[10px] font-black uppercase tracking-widest text-gray-500 pb-2 border-b border-white/10 px-3">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6 sm:col-span-5">Titre</div>
            <div className="hidden sm:block sm:col-span-4">Album</div>
            <div className="col-span-4 sm:col-span-2 text-right flex items-center justify-end gap-1">
              <Clock size={12} />
              <span>Durée</span>
            </div>
            <div className="col-span-3 sm:col-span-1 text-right">Actions</div>
          </div>

          {tracks.map((track, idx) => {
            const isCurrent = currentTrack?.videoId === track.videoId || currentTrack?.title === track.title;
            return (
              <div
                key={`pl-track-${track.videoId}-${idx}`}
                onClick={() => handleTrackClick(track, idx)}
                className={`grid grid-cols-12 items-center p-3 rounded-xl transition-all duration-200 cursor-pointer group ${
                  isCurrent 
                    ? 'bg-[#c29e5a]/15 border border-[#c29e5a]/30' 
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="col-span-1 text-center text-xs font-mono font-bold text-gray-400 group-hover:text-[#c29e5a]">
                  {isCurrent ? (
                    <Disc3 size={16} className="animate-spin-slow text-[#c29e5a] mx-auto" />
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-black/40 border border-white/10">
                    <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play size={14} fill="currentColor" className="text-white ml-0.5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate uppercase tracking-tight ${isCurrent ? 'text-[#c29e5a]' : 'text-white group-hover:text-[#c29e5a]'}`}>
                      {track.title}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate font-medium mt-0.5">
                      {track.artist}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block sm:col-span-4 text-xs text-gray-400 truncate font-medium">
                  {track.album || playlist.title}
                </div>

                <div className="col-span-4 sm:col-span-2 text-right text-xs font-mono text-gray-400">
                  {formatDuration(track.duration)}
                </div>

                <div className="col-span-3 sm:col-span-1 flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(track);
                    }}
                    className="p-1.5 transition-transform hover:scale-110 cursor-pointer"
                    title={isLiked(track) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Heart size={14} className={isLiked(track) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-white'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
