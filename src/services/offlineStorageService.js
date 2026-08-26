import db from '../lib/db';
import { getLyraAudioStream } from './lyraAudio';

const CACHE_NAME = 'ege-vinyl-audio-cache-v1';

export async function isTrackDownloaded(videoId) {
  const track = await db.offlineTracks.get(videoId);
  return !!track;
}

export async function getDownloadedTracks() {
  return await db.offlineTracks.toArray();
}

export async function getTrackAudioUrl(videoId) {
  if (!await isTrackDownloaded(videoId)) return null;
  
  const cache = await caches.open(CACHE_NAME);
  // We store the requests as a fake local URL so we can retrieve them easily
  const cachedResponse = await cache.match(`/offline-audio/${videoId}`);
  if (cachedResponse) {
    const blob = await cachedResponse.blob();
    return URL.createObjectURL(blob);
  }
  return null;
}

export async function downloadTrack(track) {
  const videoId = track.videoId || track.id;
  if (!videoId) return false;
  
  // Already downloaded?
  if (await isTrackDownloaded(videoId)) return true;

  try {
    const streamUrl = await getLyraAudioStream(videoId);
    if (!streamUrl) throw new Error('No stream URL found');

    const cache = await caches.open(CACHE_NAME);
    
    // Fetch the audio stream. 
    // We use no-cors if it's external, but for audio Blob caching, 
    // we need to make sure we can read it. Let's just fetch it normally.
    // However, some streams might be opaque if no-cors. 
    const response = await fetch(streamUrl);
    if (!response.ok && response.type !== 'opaque') throw new Error('Failed to fetch stream');

    await cache.put(`/offline-audio/${videoId}`, response);
    
    // Cache the image too if possible, but for simplicity we save metadata
    // We can also fetch the image and cache it
    if (track.thumbnail) {
      try {
        const imgRes = await fetch(track.thumbnail);
        if (imgRes.ok) {
          await cache.put(`/offline-image/${videoId}`, imgRes);
        }
      } catch (err) {
        console.warn('Failed to cache image', err);
      }
    }

    // Save metadata in Dexie
    await db.offlineTracks.put({
      videoId,
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      thumbnail: track.thumbnail || '',
      downloadedAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Failed to download track', error);
    return false;
  }
}

export async function removeTrack(videoId) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(`/offline-audio/${videoId}`);
    await cache.delete(`/offline-image/${videoId}`);
    await db.offlineTracks.delete(videoId);
  } catch (err) {
    console.error('Failed to remove track', err);
  }
}

export async function getCachedImageUrl(videoId) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(`/offline-image/${videoId}`);
  if (cachedResponse) {
    const blob = await cachedResponse.blob();
    return URL.createObjectURL(blob);
  }
  return null;
}
