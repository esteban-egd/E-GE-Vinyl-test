import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../lib/db';
import { getDirectAudioUrl } from '../services/audioStreamService';

const INSTANCES = [
  'https://invidious.flokinet.to',
  'https://vid.puffyan.us',
  'https://invidious.projectsegfau.lt',
  'https://inv.riverside.rocks'
];

export function useOfflineCache() {
  const [downloading, setDownloading] = useState(new Set());
  const [error, setError] = useState(null);

  const cachedTracks = useLiveQuery(async () => {
    const cache = await db.audioCache.toArray();
    const metadata = await Promise.all(
      cache.map(async (c) => {
        const track = await db.tracks.get(c.videoId);
        return {
          ...track,
          cachedAt: c.cachedAt,
          mimeType: c.mimeType,
          blob: c.blob
        };
      })
    );
    return metadata.filter(m => m.videoId);
  }, [], []);

  const getCacheSize = useCallback(async () => {
    try {
      const cache = await db.audioCache.toArray();
      let totalBytes = 0;
      cache.forEach(item => {
        if (item.blob) totalBytes += item.blob.size;
      });
      return (totalBytes / (1024 * 1024)).toFixed(2);
    } catch (e) {
      return "0.00";
    }
  }, []);

  const isCached = useCallback((videoId) => {
    return cachedTracks?.some((t) => t.videoId === videoId) || false;
  }, [cachedTracks]);

  const downloadTrack = useCallback(async (track) => {
    const videoId = track.videoId;
    if (isCached(videoId)) return;

    setDownloading((prev) => new Set(prev).add(videoId));
    setError(null);

    let streamUrl = null;
    let mimeType = 'audio/mp3';

    // 1. Try Cobalt direct extraction
    try {
      streamUrl = await getDirectAudioUrl(videoId);
    } catch {
      // Fallback
    }

    // 2. Fallback to instances if Cobalt didn't return a stream
    if (!streamUrl) {
      for (const instance of INSTANCES) {
        try {
          const res = await fetch(`${instance}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) continue;
          
          const data = await res.json();
          if (!data.adaptiveFormats) continue;
          
          const streams = data.adaptiveFormats
            .filter(s => s.type && s.type.includes('audio'))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            
          if (streams.length > 0) {
            streamUrl = streams[0].url;
            mimeType = streams[0].type || 'audio/mp4';
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (!streamUrl) {
      setError(`Failed to find stream for ${track.title}`);
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
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
          videoId,
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
        next.delete(videoId);
        return next;
      });
    }
  }, [isCached]);

  const removeTrack = useCallback(async (videoId) => {
    try {
      await db.audioCache.delete(videoId);
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
