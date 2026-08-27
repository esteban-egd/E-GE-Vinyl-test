import { useState, useCallback } from 'react';
import { useLiveQuery } from './useLiveQuery';
import db from '../lib/db';
import { getAudioStreamUrl } from '../services/audioResolver';

export function useOfflineCache() {
  const [downloading, setDownloading] = useState(new Set());
  const [error, setError] = useState(null);

  const cachedTracks = useLiveQuery(async () => {
    const cache = await db.audioCache.toArray();
    const metadata = await Promise.all(
      cache.map(async (c) => {
        const track = await db.tracks.get(c.id);
        return {
          ...track,
          cachedAt: c.cachedAt,
          mimeType: c.mimeType,
          blob: c.blob
        };
      })
    );
    return metadata.filter(m => m.id);
  }, [], []);

  const getCacheSize = useCallback(async () => {
    try {
      let totalBytes = 0;
      const cache = await db.audioCache.toArray();
      cache.forEach(item => {
        if (item.blob) totalBytes += item.blob.size;
      });
      const offline = await db.offlineTracks.toArray();
      offline.forEach(item => {
        if (item.audioBlob) totalBytes += item.audioBlob.size;
      });
      return (totalBytes / (1024 * 1024)).toFixed(2);
    } catch {
      return "0.00";
    }
  }, []);

  const isCached = useCallback((id) => {
    return cachedTracks?.some((t) => t.id === id) || false;
  }, [cachedTracks]);

  const downloadTrack = useCallback(async (track) => {
    const trackId = track.videoId || track.id;
    const id = trackId || `${track.title}_${track.artist}`;
    if (isCached(id)) return;

    setDownloading((prev) => new Set(prev).add(id));
    setError(null);

    let streamUrl = track.audioUrl || track.streamUrl;
    let mimeType = 'audio/mp3';

    if (!streamUrl && trackId) {
      streamUrl = await getAudioStreamUrl(track.title, track.artist, trackId);
    }

    if (!streamUrl) {
      setError(`Failed to find stream for ${track.title}`);
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    try {
      const res = await fetch(streamUrl);
      if (!res.ok) throw new Error('Failed to download audio data');
      const blob = await res.blob();

      await db.transaction('rw', db.audioCache, db.tracks, async () => {
        await db.audioCache.put({
          id,
          blob,
          mimeType,
          cachedAt: Date.now(),
        });
        
        await db.tracks.put({
          ...track,
          addedAt: Date.now()
        });
      });

    } catch (err) {
      console.error('Download error:', err);
      setError(`Échec du téléchargement: ${track.title}`);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [isCached]);

  const removeTrack = useCallback(async (id) => {
    try {
      await db.audioCache.delete(id);
    } catch (err) {
      console.error('Remove error:', err);
      setError('Failed to remove track');
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await db.audioCache.clear();
      await db.offlineTracks.clear();
      if (typeof caches !== 'undefined') {
        await caches.delete('offline-audio-v1');
        await caches.delete('ege-vinyl-audio-cache-v1');
      }
      localStorage.removeItem('ege-offline-tracks-index');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-tracks-updated', { detail: { action: 'clear' } }));
      }
    } catch (err) {
      console.error('Clear cache error:', err);
      setError('Failed to clear cache');
    }
  }, []);

  return {
    cachedTracks,
    downloading,
    error,
    isCached,
    downloadTrack,
    removeTrack,
    clearCache,
    getCacheSize,
  };
}
