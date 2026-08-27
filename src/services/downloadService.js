import db from '../lib/db';
import { getAudioStreamUrl } from './audioResolver';

export const CACHE_NAME_PRIMARY = 'offline-audio-v1';
export const CACHE_NAME_LEGACY = 'ege-vinyl-audio-cache-v1';
const LOCAL_INDEX_KEY = 'ege-offline-tracks-index';


/**
 * Convert an image URL to a local Base64 string for 100% offline access
 */
export async function convertImageUrlToBase64(imageUrl) {
  if (!imageUrl) return '';
  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    // If external image fails CORS, return an empty string or existing URL
    return imageUrl;
  }
}

/**
 * Get the local in-memory/localStorage index of downloaded track IDs
 */
export function getLocalDownloadedIndex() {
  try {
    const raw = localStorage.getItem(LOCAL_INDEX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save track in the fast local metadata index
 */
function saveTrackToLocalIndex(track) {
  try {
    const index = getLocalDownloadedIndex();
    const videoId = track.videoId || track.id;
    index[videoId] = {
      videoId,
      id: videoId,
      title: track.title,
      artist: track.artist,
      album: track.album || 'Stockage Hors-Ligne',
      thumbnail: track.thumbnailBase64 || track.thumbnail || '',
      thumbnailBase64: track.thumbnailBase64 || track.thumbnail || '',
      duration: track.duration || 210,
      downloadedAt: track.downloadedAt || new Date().toISOString()
    };
    localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(index));
  } catch (_) {}
}

/**
 * Remove track from fast local metadata index
 */
function removeTrackFromLocalIndex(videoId) {
  try {
    const index = getLocalDownloadedIndex();
    delete index[videoId];
    localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(index));
  } catch (_) {}
}

/**
 * Check if a track is downloaded locally in IndexedDB or Cache API
 */
export async function isTrackDownloaded(videoId) {
  if (!videoId) return false;
  try {
    // 1. Fast local index check
    const localIndex = getLocalDownloadedIndex();
    if (localIndex[videoId]) return true;

    // 2. Dexie offlineTracks check
    const track = await db.offlineTracks.get(videoId);
    if (track && (track.audioBlob || track.isDownloaded)) return true;

    // 3. Dexie audioCache check
    const cached = await db.audioCache.get(videoId);
    if (cached && cached.blob) return true;

    // 4. Cache API check
    if (typeof caches !== 'undefined') {
      for (const cacheName of [CACHE_NAME_PRIMARY, CACHE_NAME_LEGACY]) {
        try {
          const cache = await caches.open(cacheName);
          const res = await cache.match(`/offline-audio/${videoId}`);
          if (res) return true;
        } catch (_) {}
      }
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
    let tracks = [];
    try {
      tracks = await db.offlineTracks.toArray();
    } catch (_) {}

    if (!tracks || tracks.length === 0) {
      // Fallback from localStorage index
      const localIndex = getLocalDownloadedIndex();
      tracks = Object.values(localIndex);
    }

    return tracks.map(t => ({
      ...t,
      videoId: t.videoId || t.id,
      id: t.videoId || t.id,
      thumbnail: t.thumbnailBase64 || t.thumbnail || '',
      album: t.album || 'Stockage Hors-Ligne'
    }));
  } catch (err) {
    console.error('[DownloadService] Error retrieving downloaded tracks:', err);
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
      for (const cacheName of [CACHE_NAME_PRIMARY, CACHE_NAME_LEGACY]) {
        try {
          const cache = await caches.open(cacheName);
          const cachedResponse = await cache.match(`/offline-audio/${videoId}`);
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            return URL.createObjectURL(blob);
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error('[DownloadService] Error getting track audio URL:', err);
  }

  return null;
}

/**
 * Get cached image base64 or blob URL
 */
export async function getCachedImageUrl(videoId) {
  if (!videoId) return null;
  try {
    const track = await db.offlineTracks.get(videoId);
    if (track && track.thumbnailBase64) return track.thumbnailBase64;
    
    if (typeof caches !== 'undefined') {
      for (const cacheName of [CACHE_NAME_PRIMARY, CACHE_NAME_LEGACY]) {
        try {
          const cache = await caches.open(cacheName);
          const res = await cache.match(`/offline-image/${videoId}`);
          if (res) return await res.text();
        } catch (_) {}
      }
    }
  } catch (_) {}
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

    const title = track.title || '';
    const artist = track.artist || '';

    // 1. Dedicated server proxy endpoint with CORS support
    const serverUrl = `/api/audio-download?id=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;

    try {
      const srvRes = await fetch(serverUrl, { 
        mode: 'cors',
        signal: AbortSignal.timeout(10000) 
      });
      if (srvRes.ok) {
        const b = await srvRes.blob();
        if (b && b.size > 8000) {
          audioBlob = b;
          mimeType = srvRes.headers.get('content-type') || 'audio/mpeg';
        }
      }
    } catch (e) {
      console.warn('[DownloadService] Server download endpoint error:', e.message);
    }

    // 2. Direct stream resolvers via LyraAudio
    if (!audioBlob || audioBlob.size < 8000) {
      try {
        const streamUrl = await getAudioStreamUrl(title, artist, videoId);
        if (streamUrl && !streamUrl.startsWith('/api/stream')) {
          const directRes = await fetch(streamUrl, { 
            mode: 'cors',
            signal: AbortSignal.timeout(8000) 
          });
          if (directRes.ok) {
            const b = await directRes.blob();
            if (b && b.size > 8000) {
              audioBlob = b;
              mimeType = directRes.headers.get('content-type') || 'audio/mpeg';
            }
          }
        }
      } catch (e) {
        console.warn('[DownloadService] Lyra stream download error:', e.message);
      }
    }

    // Return false if all sources failed to provide a full audio stream
    if (!audioBlob || audioBlob.size < 8000) {
      console.warn('[DownloadService] Failed to fetch full audio stream. Download aborted.');
      return false;
    }

    // Convert image to base64 for complete offline access
    const thumbnailBase64 = await convertImageUrlToBase64(track.thumbnail || track.artwork);

    // Save in Cache API (both modern and legacy caches for 100% compatibility)
    if (typeof caches !== 'undefined') {
      for (const cacheName of [CACHE_NAME_PRIMARY, CACHE_NAME_LEGACY]) {
        try {
          const cache = await caches.open(cacheName);
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
          console.warn('[DownloadService] Cache API warning:', cacheErr);
        }
      }
    }

    const downloadedItem = {
      videoId,
      id: videoId,
      title: track.title || 'Titre inconnu',
      artist: track.artist || 'Artiste inconnu',
      album: track.album || 'Stockage Hors-Ligne',
      thumbnail: track.thumbnail || '',
      thumbnailBase64: thumbnailBase64 || track.thumbnail || '',
      duration: track.duration || 210,
      audioBlob,
      mimeType,
      size: audioBlob.size,
      downloadedAt: new Date().toISOString(),
      isDownloaded: true
    };

    // Save in Dexie offlineTracks table
    try {
      await db.offlineTracks.put(downloadedItem);
    } catch (dbErr) {
      console.warn('[DownloadService] Dexie offlineTracks put warning:', dbErr);
    }

    // Save in Dexie audioCache table
    try {
      await db.audioCache.put({
        videoId,
        id: videoId,
        blob: audioBlob,
        mimeType,
        cachedAt: Date.now()
      });
    } catch (_) {}

    // Save in LocalStorage metadata index
    saveTrackToLocalIndex(downloadedItem);

    // Broadcast update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-tracks-updated', {
        detail: { action: 'add', videoId, track: downloadedItem }
      }));
    }

    return true;
  } catch (error) {
    console.error('[DownloadService] Failed to download track:', error);
    return false;
  }
}

/**
 * Sequential batch download function for "Tout télécharger"
 * Iterates one track at a time using for...of to prevent network crashes,
 * providing per-track success notifications and progress percentage.
 */
export async function downloadAllTracks(tracks, onProgress, onTrackSuccess) {
  if (!Array.isArray(tracks) || tracks.length === 0) return { successCount: 0, total: 0 };

  let successCount = 0;
  const total = tracks.length;

  for (let i = 0; i < total; i++) {
    const track = tracks[i];
    const trackId = track?.videoId || track?.video_id || track?.id;
    if (!trackId) continue;

    // Report start of this track
    onProgress?.({
      current: i,
      total,
      percentage: Math.round((i / total) * 100),
      currentTitle: track.title || 'Morceau',
      trackId
    });

    try {
      const isAlready = await isTrackDownloaded(trackId);
      let success = isAlready;

      if (!isAlready) {
        success = await downloadTrack(track);
      }

      if (success) {
        successCount++;
        // Immediately notify track success to update UI badge to green
        onTrackSuccess?.(trackId, track);
      }
    } catch (err) {
      console.warn(`[DownloadService] Batch item ${i + 1}/${total} (${track.title}) failed:`, err);
    }

    // Report end of this track
    onProgress?.({
      current: i + 1,
      total,
      percentage: Math.round(((i + 1) / total) * 100),
      currentTitle: track.title || 'Morceau',
      trackId
    });
  }

  return { successCount, total };
}

/**
 * Remove downloaded track from Dexie, Cache API and LocalStorage index
 */
export async function removeTrack(videoId) {
  if (!videoId) return;
  try {
    // 1. Remove from Cache API
    if (typeof caches !== 'undefined') {
      for (const cacheName of [CACHE_NAME_PRIMARY, CACHE_NAME_LEGACY]) {
        try {
          const cache = await caches.open(cacheName);
          await cache.delete(`/offline-audio/${videoId}`);
          await cache.delete(`/offline-image/${videoId}`);
        } catch (_) {}
      }
    }

    // 2. Remove from Dexie
    try {
      await db.offlineTracks.delete(videoId);
      await db.audioCache.delete(videoId);
    } catch (_) {}

    // 3. Remove from LocalStorage index
    removeTrackFromLocalIndex(videoId);

    // 4. Broadcast event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-tracks-updated', {
        detail: { action: 'remove', videoId }
      }));
    }
  } catch (err) {
    console.error('[DownloadService] Failed to remove track:', err);
  }
}

const downloadService = {
  CACHE_NAME_PRIMARY,
  CACHE_NAME_LEGACY,
  convertImageUrlToBase64,
  getLocalDownloadedIndex,
  isTrackDownloaded,
  getDownloadedTracks,
  getTrackAudioUrl,
  getCachedImageUrl,
  downloadTrack,
  downloadAllTracks,
  removeTrack
};

export default downloadService;
