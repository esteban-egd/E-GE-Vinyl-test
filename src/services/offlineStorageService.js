import db from '../lib/db';
import { getLyraAudioStream } from './lyraAudio';

const CACHE_NAME = 'ege-vinyl-audio-cache-v1';

/**
 * Convert an image URL to a local Base64 string for 100% offline access
 */
export async function convertImageUrlToBase64(imageUrl) {
  if (!imageUrl) return '';
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[OfflineStorage] Failed to convert image to base64:', err);
    return '';
  }
}

/**
 * Check if a track is downloaded locally in IndexedDB or Cache API
 */
export async function isTrackDownloaded(videoId) {
  if (!videoId) return false;
  try {
    const track = await db.offlineTracks.get(videoId);
    if (track && (track.audioBlob || track.isDownloaded)) return true;

    // Check Dexie audioCache
    const cached = await db.audioCache.get(videoId);
    if (cached && cached.blob) return true;

    // Check Cache API
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      const res = await cache.match(`/offline-audio/${videoId}`);
      if (res) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get list of all downloaded offline tracks
 */
export async function getDownloadedTracks() {
  try {
    const tracks = await db.offlineTracks.toArray();
    return tracks.map(t => ({
      ...t,
      videoId: t.videoId || t.id,
      id: t.videoId || t.id,
      thumbnail: t.thumbnailBase64 || t.thumbnail || ''
    }));
  } catch (err) {
    console.error('[OfflineStorage] Error retrieving downloaded tracks:', err);
    return [];
  }
}

/**
 * Retrieve playable local Object URL for an offline track
 */
export async function getTrackAudioUrl(videoId) {
  if (!videoId) return null;
  
  try {
    // 1. Try Dexie offlineTracks
    const track = await db.offlineTracks.get(videoId);
    if (track && track.audioBlob) {
      return URL.createObjectURL(track.audioBlob);
    }

    // 2. Try Dexie audioCache
    const cached = await db.audioCache.get(videoId);
    if (cached && cached.blob) {
      return URL.createObjectURL(cached.blob);
    }

    // 3. Try Cache API
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(`/offline-audio/${videoId}`);
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }
    }
  } catch (err) {
    console.error('[OfflineStorage] Error getting track audio URL:', err);
  }
  
  return null;
}

/**
 * Download and store full audio binary + metadata locally
 */
export async function downloadTrack(track) {
  const videoId = track?.videoId || track?.video_id || track?.id;
  if (!videoId) return false;
  
  // Already downloaded?
  const alreadyCached = await isTrackDownloaded(videoId);
  if (alreadyCached) return true;

  try {
    let audioBlob = null;
    let mimeType = 'audio/mpeg';

    // 1. First attempt: Dedicated server endpoint
    const title = track.title || '';
    const artist = track.artist || '';
    const serverUrl = `/api/audio-download?id=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;

    try {
      const srvRes = await fetch(serverUrl, { signal: AbortSignal.timeout(10000) });
      if (srvRes.ok) {
        audioBlob = await srvRes.blob();
        mimeType = srvRes.headers.get('content-type') || 'audio/mpeg';
      }
    } catch (e) {
      console.warn('[OfflineStorage] Server download route timeout or failed:', e.message);
    }

    // 2. Second attempt: Direct stream via Lyra fallback resolvers
    if (!audioBlob || audioBlob.size < 10000) {
      const streamUrl = await getLyraAudioStream(videoId, title, artist);
      if (streamUrl && !streamUrl.startsWith('/api/stream')) {
        const directRes = await fetch(streamUrl, { signal: AbortSignal.timeout(10000) });
        if (directRes.ok) {
          audioBlob = await directRes.blob();
          mimeType = directRes.headers.get('content-type') || 'audio/mpeg';
        }
      }
    }

    // 3. Third attempt: Deezer direct preview match if available
    if (!audioBlob || audioBlob.size < 10000) {
      try {
        const dzRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(`${title} ${artist}`)}&limit=1`, {
          signal: AbortSignal.timeout(4000)
        });
        if (dzRes.ok) {
          const dzData = await dzRes.json();
          if (dzData?.data?.[0]?.preview) {
            const previewRes = await fetch(dzData.data[0].preview);
            if (previewRes.ok) {
              audioBlob = await previewRes.blob();
              mimeType = 'audio/mpeg';
            }
          }
        }
      } catch (_) {}
    }

    if (!audioBlob || audioBlob.size < 5000) {
      throw new Error('Audio stream data could not be downloaded');
    }

    // Fetch and convert image to base64 so it renders 100% offline
    const thumbnailBase64 = await convertImageUrlToBase64(track.thumbnail || track.artwork);

    // Save in Cache API
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        const audioResponse = new Response(audioBlob, {
          headers: { 'Content-Type': mimeType }
        });
        await cache.put(`/offline-audio/${videoId}`, audioResponse);

        if (thumbnailBase64) {
          const imgResponse = new Response(thumbnailBase64, {
            headers: { 'Content-Type': 'text/plain' }
          });
          await cache.put(`/offline-image/${videoId}`, imgResponse);
        }
      } catch (cacheErr) {
        console.warn('[OfflineStorage] Cache API put warning:', cacheErr);
      }
    }

    // Save complete track object in Dexie offlineTracks table
    await db.offlineTracks.put({
      videoId,
      id: videoId,
      title: track.title || 'Titre inconnu',
      artist: track.artist || 'Artiste inconnu',
      album: track.album || '',
      thumbnail: track.thumbnail || '',
      thumbnailBase64: thumbnailBase64 || track.thumbnail || '',
      duration: track.duration || 210,
      audioBlob,
      mimeType,
      size: audioBlob.size,
      downloadedAt: new Date().toISOString(),
      isDownloaded: true
    });

    // Also store in audioCache for Dexie compatibility
    try {
      await db.audioCache.put({
        videoId,
        id: videoId,
        blob: audioBlob,
        mimeType,
        cachedAt: Date.now()
      });
    } catch (_) {}

    return true;
  } catch (error) {
    console.error('[OfflineStorage] Failed to download track:', error);
    return false;
  }
}

/**
 * Remove downloaded track from Dexie and Cache API
 */
export async function removeTrack(videoId) {
  if (!videoId) return;
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(`/offline-audio/${videoId}`);
      await cache.delete(`/offline-image/${videoId}`);
    }
    await db.offlineTracks.delete(videoId);
    await db.audioCache.delete(videoId);
  } catch (err) {
    console.error('[OfflineStorage] Failed to remove track:', err);
  }
}

/**
 * Get cached image base64 or blob URL
 */
export async function getCachedImageUrl(videoId) {
  if (!videoId) return null;
  try {
    const track = await db.offlineTracks.get(videoId);
    if (track?.thumbnailBase64) return track.thumbnailBase64;

    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      const res = await cache.match(`/offline-image/${videoId}`);
      if (res) {
        return await res.text();
      }
    }
  } catch (_) {}
  return null;
}
