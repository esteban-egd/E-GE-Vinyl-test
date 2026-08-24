import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getMainArtistName } from '../services/musicDataService';

export function useFollowedArtists() {
  const { user } = useAuth();
  const [followedArtists, setFollowedArtists] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFollowed = useCallback(async () => {
    if (!user) {
      setFollowedArtists([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowedArtists(data || []);
    } catch (err) {
      console.error('Error fetching followed artists:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFollowed();
  }, [fetchFollowed]);

  const isFollowing = useCallback((artistName) => {
    if (!artistName || !followedArtists) return false;
    const mainName = getMainArtistName(artistName).toLowerCase();
    return followedArtists.some(a => (a.name || '').toLowerCase() === mainName);
  }, [followedArtists]);

  const followArtist = useCallback(async (artistData) => {
    if (!user || !artistData || !artistData.name) return;
    const mainName = getMainArtistName(artistData.name);
    try {
      const { error } = await supabase
        .from('followed_artists')
        .upsert({
          user_id: user.id,
          name: mainName,
          avatar: artistData.avatar || artistData.thumbnail || '',
          genre: artistData.genre || 'Artiste',
        });

      if (error) throw error;
      fetchFollowed();
    } catch (err) {
      console.error('Error following artist:', err.message);
    }
  }, [user, fetchFollowed]);

  const unfollowArtist = useCallback(async (artistName) => {
    if (!user || !artistName) return;
    const mainName = getMainArtistName(artistName);
    try {
      const { error } = await supabase
        .from('followed_artists')
        .delete()
        .eq('user_id', user.id)
        .eq('name', mainName);

      if (error) throw error;
      fetchFollowed();
    } catch (err) {
      console.error('Error unfollowing artist:', err.message);
    }
  }, [user, fetchFollowed]);

  const toggleFollow = useCallback(async (artistData) => {
    if (!artistData || !artistData.name) return;
    const following = isFollowing(artistData.name);
    if (following) {
      await unfollowArtist(artistData.name);
    } else {
      await followArtist(artistData);
    }
  }, [isFollowing, followArtist, unfollowArtist]);

  return {
    followedArtists,
    loading,
    isFollowing,
    followArtist,
    unfollowArtist,
    toggleFollow
  };
}

