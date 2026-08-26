import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { isTrackDownloaded, downloadTrack as serviceDownloadTrack, removeTrack as serviceRemoveTrack, getDownloadedTracks } from '../services/offlineStorageService';
import { toast } from 'react-hot-toast';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [downloadedTrackIds, setDownloadedTrackIds] = useState(new Set());
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null); // { current: 0, total: 0, currentTitle: '' }

  useEffect(() => {
    // Load initial state
    const loadState = async () => {
      try {
        const tracks = await getDownloadedTracks();
        setDownloadedTrackIds(new Set(tracks.map(t => t.videoId)));
        const syncPref = localStorage.getItem('ege-vinyl-sync-enabled') === 'true';
        setIsSyncEnabled(syncPref);
      } catch (err) {
        console.error('Failed to load offline tracks', err);
      }
    };
    loadState();
  }, []);

  const isDownloaded = useCallback((videoId) => {
    if (!videoId) return false;
    return downloadedTrackIds.has(videoId);
  }, [downloadedTrackIds]);

  const downloadTrackHandler = useCallback(async (track) => {
    const videoId = track?.videoId || track?.video_id || track?.id;
    if (!videoId) return false;

    if (downloadedTrackIds.has(videoId)) {
      toast.success('Morceau déjà téléchargé');
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

  const toggleSync = useCallback(async (likedTracks) => {
    const newState = !isSyncEnabled;
    setIsSyncEnabled(newState);
    localStorage.setItem('ege-vinyl-sync-enabled', newState);

    if (newState && likedTracks && likedTracks.length > 0) {
      const toDownload = likedTracks.filter(t => !downloadedTrackIds.has(t.videoId || t.video_id || t.id));
      if (toDownload.length > 0) {
        setDownloadProgress({ current: 0, total: toDownload.length, currentTitle: toDownload[0].title || '' });
        
        for (let i = 0; i < toDownload.length; i++) {
          const track = toDownload[i];
          const vId = track.videoId || track.video_id || track.id;
          setDownloadProgress({ current: i, total: toDownload.length, currentTitle: track.title || '' });
          const success = await serviceDownloadTrack(track);
          if (success) {
            setDownloadedTrackIds(prev => new Set(prev).add(vId));
          }
          setDownloadProgress({ current: i + 1, total: toDownload.length, currentTitle: track.title || '' });
        }
        
        setTimeout(() => setDownloadProgress(null), 2500);
      }
    }
  }, [isSyncEnabled, downloadedTrackIds]);

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
    if (!downloadProgress) return { isSyncing: false, current: 0, total: 0, currentTitle: '' };
    return {
      isSyncing: true,
      current: downloadProgress.current,
      total: downloadProgress.total,
      currentTitle: downloadProgress.currentTitle || 'Téléchargement...'
    };
  }, [downloadProgress]);

  return (
    <OfflineContext.Provider value={{
      downloadedTrackIds,
      isDownloaded,
      isDownloading: downloadingIds,
      downloadTrack: downloadTrackHandler,
      removeTrack: removeTrackHandler,
      removeDownloadedTrack: removeTrackHandler,
      isSyncEnabled,
      toggleSync,
      downloadProgress,
      syncState,
      handleTrackLiked
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
