import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  downloadTrack as serviceDownloadTrack, 
  downloadAllTracks as serviceDownloadAllTracks,
  removeTrack as serviceRemoveTrack, 
  getDownloadedTracks 
} from '../services/downloadService';
import { toast } from 'react-hot-toast';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [downloadedTrackIds, setDownloadedTrackIds] = useState(new Set());
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null); // { current: 0, total: 0, percentage: 0, currentTitle: '', isSyncing: boolean }

  const refreshDownloadedList = useCallback(async () => {
    try {
      const tracks = await getDownloadedTracks();
      setDownloadedTrackIds(new Set(tracks.map(t => t.videoId || t.id)));
    } catch (err) {
      console.error('Failed to load offline tracks', err);
    }
  }, []);

  useEffect(() => {
    refreshDownloadedList();
    const syncPref = localStorage.getItem('ege-vinyl-sync-enabled') === 'true';
    setIsSyncEnabled(syncPref);

    // Event listener for cross-tab or cross-component sync
    const handleStorageUpdate = (e) => {
      if (e.detail?.action === 'add' && e.detail?.videoId) {
        setDownloadedTrackIds(prev => new Set(prev).add(e.detail.videoId));
      } else if (e.detail?.action === 'remove' && e.detail?.videoId) {
        setDownloadedTrackIds(prev => {
          const next = new Set(prev);
          next.delete(e.detail.videoId);
          return next;
        });
      } else {
        refreshDownloadedList();
      }
    };

    window.addEventListener('offline-tracks-updated', handleStorageUpdate);
    return () => window.removeEventListener('offline-tracks-updated', handleStorageUpdate);
  }, [refreshDownloadedList]);

  const isDownloaded = useCallback((videoId) => {
    if (!videoId) return false;
    return downloadedTrackIds.has(videoId);
  }, [downloadedTrackIds]);

  const downloadTrackHandler = useCallback(async (track) => {
    const videoId = track?.videoId || track?.video_id || track?.id;
    if (!videoId) return false;

    if (downloadedTrackIds.has(videoId)) {
      toast.success('Morceau déjà disponible hors-ligne');
      return true;
    }

    setDownloadingIds(prev => new Set(prev).add(videoId));
    try {
      const success = await serviceDownloadTrack(track);
      if (success) {
        setDownloadedTrackIds(prev => new Set(prev).add(videoId));
        toast.success(`"${track.title || 'Morceau'}" téléchargé hors-ligne !`, { icon: '💾' });
      } else {
        toast.error('Échec du téléchargement du morceau');
      }
      return success;
    } catch (err) {
      console.error('Download track error:', err);
      toast.error('Erreur lors du téléchargement');
      return false;
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  }, [downloadedTrackIds]);

  const removeTrackHandler = useCallback(async (videoId) => {
    if (!videoId) return;
    try {
      await serviceRemoveTrack(videoId);
      setDownloadedTrackIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
      toast.success('Morceau retiré du stockage hors-ligne');
    } catch (err) {
      console.error('Remove track error:', err);
    }
  }, []);

  /**
   * Batch download function: processes sequentially (for...of),
   * updates the green icon immediately after each track finishes,
   * displays real-time progress, and never crashes on track errors.
   */
  const downloadAllTracksHandler = useCallback(async (tracks) => {
    if (!Array.isArray(tracks) || tracks.length === 0) {
      toast('Aucun titre à télécharger');
      return;
    }

    const toDownload = tracks.filter(t => !downloadedTrackIds.has(t.videoId || t.video_id || t.id));
    if (toDownload.length === 0) {
      toast.success('Tous les titres de cette liste sont déjà disponibles hors-ligne !', { icon: '✅' });
      return;
    }

    toast(`Téléchargement de ${toDownload.length} titre(s) en cours...`, { icon: '⬇️' });

    setDownloadProgress({
      current: 0,
      total: toDownload.length,
      percentage: 0,
      currentTitle: toDownload[0].title || 'Préparation...',
      isSyncing: true
    });

    try {
      await serviceDownloadAllTracks(
        toDownload,
        (progress) => {
          setDownloadProgress({
            current: progress.current,
            total: progress.total,
            percentage: progress.percentage,
            currentTitle: progress.currentTitle,
            isSyncing: true
          });
        },
        (trackId) => {
          // Immediately update state so green badges switch on per track
          setDownloadedTrackIds(prev => new Set(prev).add(trackId));
        }
      );

      toast.success(`Téléchargement terminé avec succès (${toDownload.length} titres stockés) !`, { icon: '🎉' });
    } catch (err) {
      console.error('[OfflineContext] Batch download error:', err);
      toast.error('Une interruption est survenue durant le téléchargement');
    } finally {
      setTimeout(() => {
        setDownloadProgress(null);
      }, 2500);
    }
  }, [downloadedTrackIds]);

  const toggleSync = useCallback(async (likedTracks) => {
    const newState = !isSyncEnabled;
    setIsSyncEnabled(newState);
    localStorage.setItem('ege-vinyl-sync-enabled', String(newState));

    if (newState && likedTracks && likedTracks.length > 0) {
      await downloadAllTracksHandler(likedTracks);
    }
  }, [isSyncEnabled, downloadAllTracksHandler]);

  const handleTrackLiked = useCallback(async (track) => {
    if (isSyncEnabled) {
      const videoId = track.videoId || track.video_id || track.id;
      if (videoId && !downloadedTrackIds.has(videoId)) {
        const success = await serviceDownloadTrack(track);
        if (success) {
          setDownloadedTrackIds(prev => new Set(prev).add(videoId));
        }
      }
    }
  }, [isSyncEnabled, downloadedTrackIds]);

  const syncState = useMemo(() => {
    if (!downloadProgress) return { isSyncing: false, current: 0, total: 0, percentage: 0, currentTitle: '' };
    return {
      isSyncing: true,
      current: downloadProgress.current,
      total: downloadProgress.total,
      percentage: downloadProgress.percentage || Math.round((downloadProgress.current / downloadProgress.total) * 100),
      currentTitle: downloadProgress.currentTitle || 'Téléchargement en cours...'
    };
  }, [downloadProgress]);

  return (
    <OfflineContext.Provider value={{
      downloadedTrackIds,
      isDownloaded,
      isDownloading: downloadingIds,
      downloadTrack: downloadTrackHandler,
      downloadAllTracks: downloadAllTracksHandler,
      downloadBatch: downloadAllTracksHandler,
      removeTrack: removeTrackHandler,
      removeDownloadedTrack: removeTrackHandler,
      isSyncEnabled,
      toggleSync,
      downloadProgress,
      syncState,
      handleTrackLiked,
      refreshDownloadedList
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
