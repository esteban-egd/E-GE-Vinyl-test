import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import db from '../lib/db';
import { getLyraAudioStream } from '../services/lyraAudio';
import { toast } from 'react-hot-toast';

export function useOffline() {
  const { user } = useAuth();
  const [downloadedIds, setDownloadedIds] = useState(new Set());
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [isDownloading, setIsDownloading] = useState(new Set());

  // Charge l'état local au montage
  const loadOfflineTracks = useCallback(async () => {
    try {
      const tracks = await db.offlineTracks.toArray();
      setDownloadedTracks(tracks);
      setDownloadedIds(new Set(tracks.map(t => t.videoId)));
    } catch (err) {
      console.error('Failed to load offline tracks:', err);
    }
  }, []);

  useEffect(() => {
    loadOfflineTracks();
  }, [loadOfflineTracks]);

  const isDownloaded = useCallback((trackId) => {
    return downloadedIds.has(trackId);
  }, [downloadedIds]);

  const downloadTrack = useCallback(async (track) => {
    if (!user) {
      toast.error('Connectez-vous pour télécharger des morceaux');
      return;
    }

    const trackId = track.videoId || track.id;
    if (downloadedIds.has(trackId) || isDownloading.has(trackId)) return;

    setIsDownloading(prev => new Set(prev).add(trackId));
    const toastId = toast.loading('Téléchargement en cours...');

    try {
      // 1. Récupérer le flux audio via Lyra
      const streamUrl = await getLyraAudioStream(trackId, track.title, track.artist);
      
      // 2. Tenter de télécharger le fichier audio (Blob)
      let audioBlob = null;
      if (streamUrl) {
        try {
          const audioRes = await fetch(streamUrl);
          if (audioRes.ok) audioBlob = await audioRes.blob();
        } catch (e) {
          console.warn('Audio download failed (CORS/Network), saving metadata only');
        }
      }

      // 3. Télécharger la pochette (Blob) si disponible
      let thumbnailBlob = null;
      if (track.thumbnail) {
        try {
          const thumbRes = await fetch(track.thumbnail);
          if (thumbRes.ok) thumbnailBlob = await thumbRes.blob();
        } catch (e) {
          console.warn('Could not download thumbnail, continuing...', e);
        }
      }

      // 4. Sauvegarder dans IndexedDB (Dexie)
      await db.offlineTracks.put({
        videoId: trackId,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        thumbnail: track.thumbnail,
        duration: track.duration,
        audioBlob,
        thumbnailBlob,
        downloadedAt: new Date().toISOString()
      });

      // 5. Synchroniser avec Supabase
      const { error: supabaseError } = await supabase
        .from('offline_tracks')
        .upsert({
          user_id: user.id,
          video_id: trackId,
          title: track.title,
          artist: track.artist,
          album: track.album || '',
          thumbnail: track.thumbnail,
          duration: track.duration,
          downloaded_at: new Date().toISOString()
        });

      if (supabaseError) {
        console.warn('Supabase sync failed (offline_tracks), but saved locally:', supabaseError);
      }

      await loadOfflineTracks();

      if (!audioBlob) {
        toast.success('Enregistré dans la bibliothèque (Le fichier audio complet sera disponible sur l\'application native .exe / .apk)', { id: toastId, duration: 5000 });
      } else {
        toast.success('Morceau disponible hors-ligne', { id: toastId });
      }
    } catch (err) {
      console.error('Download failed:', err);
      toast.error(`Échec: ${err.message}`, { id: toastId });
    } finally {
      setIsDownloading(prev => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  }, [user, downloadedIds, isDownloading, loadOfflineTracks]);

  const removeTrack = useCallback(async (trackId) => {
    try {
      // 1. Supprimer de IndexedDB
      await db.offlineTracks.delete(trackId);

      // 2. Supprimer de Supabase
      if (user) {
        await supabase
          .from('offline_tracks')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', trackId);
      }

      await loadOfflineTracks();
      toast.success('Morceau retiré du mode hors-ligne');
    } catch (err) {
      console.error('Failed to remove track:', err);
      toast.error('Erreur lors de la suppression');
    }
  }, [user, loadOfflineTracks]);

  return {
    downloadedTracks,
    downloadedIds,
    isDownloading,
    isDownloaded,
    downloadTrack,
    removeTrack
  };
}
