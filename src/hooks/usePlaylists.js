import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function usePlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (err) {
      console.error('Error fetching playlists:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const createPlaylist = useCallback(async (name, cover = null) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name,
          cover: cover || null,
        })
        .select()
        .single();

      if (error) throw error;
      fetchPlaylists();
      return data.id;
    } catch (err) {
      console.error('Error creating playlist:', err.message);
      return null;
    }
  }, [user, fetchPlaylists]);

  const deletePlaylist = useCallback(async (id) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      fetchPlaylists();
    } catch (err) {
      console.error('Error deleting playlist:', err.message);
    }
  }, [user, fetchPlaylists]);

  const addTrackToPlaylist = useCallback(async (playlistId, track) => {
    if (!user) return;
    try {
      // First, get the current max position
      const { data: tracks, error: fetchError } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;
      const nextPosition = tracks.length > 0 ? tracks[0].position + 1 : 0;

      const { error: insertError } = await supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          video_id: track.videoId || track.id,
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail,
          position: nextPosition,
        });

      if (insertError) throw insertError;

      // Update playlist cover if not set
      const targetPlaylist = playlists.find(p => p.id === playlistId);
      if (targetPlaylist && !targetPlaylist.cover && track.thumbnail) {
        await supabase
          .from('playlists')
          .update({ cover: track.thumbnail, updated_at: new Date().toISOString() })
          .eq('id', playlistId);
      } else {
        await supabase
          .from('playlists')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', playlistId);
      }
      
      fetchPlaylists();
    } catch (err) {
      console.error('Error adding track to playlist:', err.message);
    }
  }, [user, playlists, fetchPlaylists]);

  const updatePlaylistCover = useCallback(async (playlistId, coverUrl) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('playlists')
        .update({ cover: coverUrl, updated_at: new Date().toISOString() })
        .eq('id', playlistId)
        .eq('user_id', user.id);

      if (error) throw error;
      fetchPlaylists();
    } catch (err) {
      console.error('Error updating playlist cover:', err.message);
    }
  }, [user, fetchPlaylists]);

  const updatePlaylistName = useCallback(async (playlistId, newName) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('playlists')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', playlistId)
        .eq('user_id', user.id);

      if (error) throw error;
      fetchPlaylists();
    } catch (err) {
      console.error('Error updating playlist name:', err.message);
    }
  }, [user, fetchPlaylists]);

  const removeTrackFromPlaylist = useCallback(async (playlistId, trackId) => {
    if (!user) return;
     try {
       const { error } = await supabase
         .from('playlist_tracks')
         .delete()
         .eq('id', trackId);

       if (error) throw error;
       
       await supabase
         .from('playlists')
         .update({ updated_at: new Date().toISOString() })
         .eq('id', playlistId);
         
       fetchPlaylists();
     } catch (err) {
        console.error('Error removing track from playlist:', err.message);
     }
  }, [user, fetchPlaylists]);

  return {
    playlists,
    loading,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    updatePlaylistCover,
    updatePlaylistName
  };
}

export function usePlaylistTracks(playlistId) {
  const { user } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playlistId || !user) {
      setTracks([]);
      return;
    }

    const fetchTracks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('playlist_tracks')
          .select('*')
          .eq('playlist_id', playlistId)
          .order('position', { ascending: true });

        if (error) throw error;
        
        // Map to standard track format
        const formatted = (data || []).map(t => ({
          ...t,
          videoId: t.video_id,
          id: t.id // This is the record ID for deletion
        }));
        
        setTracks(formatted);
      } catch (err) {
        console.error('Error fetching playlist tracks:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [playlistId, user]);

  return tracks;
}

