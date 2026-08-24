import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../lib/db';

export function usePlaylists() {
  const playlists = useLiveQuery(() => db.playlists.orderBy('updatedAt').reverse().toArray(), []);

  const createPlaylist = useCallback(async (name) => {
    try {
      await db.playlists.add({
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  }, []);

  const deletePlaylist = useCallback(async (id) => {
    try {
      await db.transaction('rw', db.playlists, db.playlistTracks, async () => {
        await db.playlists.delete(id);
        // Delete all tracks associated with this playlist
        const tracksToDelete = await db.playlistTracks.where({ playlistId: id }).toArray();
        const ids = tracksToDelete.map(t => t.id);
        await db.playlistTracks.bulkDelete(ids);
      });
    } catch (err) {
      console.error('Error deleting playlist:', err);
    }
  }, []);

  const addTrackToPlaylist = useCallback(async (playlistId, track) => {
    try {
      await db.transaction('rw', db.playlists, db.playlistTracks, async () => {
        const existingTracks = await db.playlistTracks.where({ playlistId }).toArray();
        const nextPosition = existingTracks.length;

        await db.playlistTracks.add({
          playlistId,
          videoId: track.videoId,
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail,
          position: nextPosition,
        });

        await db.playlists.update(playlistId, { updatedAt: Date.now() });
      });
    } catch (err) {
      console.error('Error adding track to playlist:', err);
    }
  }, []);

  const removeTrackFromPlaylist = useCallback(async (playlistId, trackDbId) => {
     try {
       await db.transaction('rw', db.playlists, db.playlistTracks, async () => {
         await db.playlistTracks.delete(trackDbId);
         await db.playlists.update(playlistId, { updatedAt: Date.now() });
       });
     } catch (err) {
        console.error('Error removing track from playlist:', err);
     }
  }, []);

  return {
    playlists: playlists || [],
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist
  };
}

export function usePlaylistTracks(playlistId) {
  const tracks = useLiveQuery(
    () => {
      if (!playlistId) return [];
      return db.playlistTracks.where({ playlistId }).sortBy('position');
    },
    [playlistId]
  );

  return tracks || [];
}
