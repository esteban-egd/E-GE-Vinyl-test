import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../lib/db';

export function useLikes() {
  const likedTracks = useLiveQuery(() => db.likes.orderBy('likedAt').reverse().toArray(), []);

  const isLiked = useCallback((videoId) => {
    return likedTracks?.some((t) => t.videoId === videoId) || false;
  }, [likedTracks]);

  const toggleLike = useCallback(async (track) => {
    if (!track || !track.videoId) return;

    try {
      if (isLiked(track.videoId)) {
        await db.likes.delete(track.videoId);
      } else {
        await db.likes.put({
          videoId: track.videoId,
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail,
          likedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  }, [isLiked]);

  return {
    likedTracks: likedTracks || [],
    isLiked,
    toggleLike,
  };
}
