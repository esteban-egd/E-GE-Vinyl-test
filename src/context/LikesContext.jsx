import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { getMainArtistName } from '../services/musicDataService';
import { toast } from 'react-hot-toast';

const LikesContext = createContext();

export function LikesProvider({ children }) {
  const { user } = useAuth();
  const [likedTracks, setLikedTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLikes = useCallback(async () => {
    if (!user || user.is_guest) {
      setLikedTracks([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formatted = (data || []).map(item => ({
        ...item,
        videoId: item.video_id,
        id: item.video_id 
      }));

      setLikedTracks(formatted);
    } catch (err) {
      console.error('Error fetching likes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  const isLiked = useCallback((trackOrId) => {
    if (!trackOrId || !likedTracks) return false;
    const trackId = typeof trackOrId === 'string' ? trackOrId : (trackOrId.videoId || trackOrId.id);
    return likedTracks.some(t => t.video_id === trackId || t.videoId === trackId);
  }, [likedTracks]);

  const toggleLike = useCallback(async (track) => {
    if (!user || user.is_guest) {
      toast.error('Le mode Invité est restreint. Connectez-vous ou créez un compte pour ajouter des favoris !', {
        icon: '🔒',
        duration: 4000
      });
      return;
    }
    if (!track) return;

    const trackId = typeof track === 'string' ? track : (track.videoId || track.id);
    
    if (!trackId) {
      console.error('Missing trackId for like operation:', track);
      toast.error('Impossible d\'identifier le morceau');
      return;
    }

    const existing = isLiked(trackId);

    try {
      if (existing) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', trackId);
        
        if (error) {
          if (error.code === 'PGRST116') { // Not found or similar
             // Handle gracefully
          } else {
            throw error;
          }
        }
        toast.success('Retiré des favoris');
      } else {
        const itemToSave = {
          user_id: user.id,
          video_id: trackId,
          title: track.title || 'Titre inconnu',
          artist: getMainArtistName(track.artist || 'Artiste inconnu'),
          thumbnail: track.thumbnail || '',
          album: track.album || '',
        };

        const { error } = await supabase
          .from('likes')
          .insert(itemToSave);
        
        if (error) {
          if (error.code === '42P01') { // Table does not exist
            throw new Error('La table "likes" n\'existe pas dans votre base de données Supabase. Veuillez exécuter le script SQL fourni.');
          }
          throw error;
        }
        toast.success('Ajouté aux favoris');
      }
      
      fetchLikes();
    } catch (err) {
      console.error('Error toggling like:', err);
      const errorMessage = err.message || 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
    }
  }, [user, isLiked, fetchLikes]);

  return (
    <LikesContext.Provider value={{ likedTracks, loading, isLiked, toggleLike, fetchLikes }}>
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const context = useContext(LikesContext);
  if (!context) {
    throw new Error('useLikes must be used within a LikesProvider');
  }
  return context;
}
