import { useState, useCallback } from 'react';
import { useLiveQuery } from './useLiveQuery';
import db from '../lib/db';
import { getLyraAudioStream } from '../services/lyraAudio';

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
      const cache = await db.audioCache.toArray();
      let totalBytes = 0;
      cache.forEach(item => {
        if (item.blob) totalBytes += item.blob.size;
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
      streamUrl = await getLyraAudioStream(trackId, track.title, track.artist);
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
