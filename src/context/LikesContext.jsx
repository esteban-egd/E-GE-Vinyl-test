import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { getMainArtistName } from '../services/musicDataService';
import { toast } from 'react-hot-toast';
import db from '../lib/db';
import { useOffline } from './OfflineContext';
import { autoDownloadService } from '../services/autoDownloadService';

const LikesContext = createContext();

export function LikesProvider({ children }) {
  const { user } = useAuth();
  const { handleTrackLiked, removeDownloadedTrack } = useOffline();
  const [likedTracks, setLikedTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLikes = useCallback(async () => {
    if (!user || user.is_guest) {
      setLikedTracks([]);
      return;
    }

    setLoading(true);
    try {
      if (navigator.onLine) {
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

        // Sync with local Dexie DB
        await db.transaction('rw', db.likes, async () => {
          await db.likes.clear();
          for (const item of formatted) {
            await db.likes.put({
              videoId: item.videoId,
              title: item.title,
              artist: item.artist,
              thumbnail: item.thumbnail,
              likedAt: item.created_at || new Date().toISOString()
            });
          }
        });

        setLikedTracks(formatted);
        // Start delta sync in background
        autoDownloadService.deltaSyncLikedTracks(formatted);
      } else {
        // Fallback to local DB when offline
        const localLikes = await db.likes.toArray();
        const formattedLocal = localLikes.map(item => ({
          ...item,
          video_id: item.videoId,
          id: item.videoId
        }));
        setLikedTracks(formattedLocal);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to IndexedDB:', err.message);
      try {
        const localLikes = await db.likes.toArray();
        const formattedLocal = localLikes.map(item => ({
          ...item,
          video_id: item.videoId,
          id: item.videoId
        }));
        setLikedTracks(formattedLocal);
      } catch (localErr) {
        console.error('IndexedDB fallback likes failed:', localErr);
      }
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
    const title = track.title || 'Titre inconnu';
    const artist = getMainArtistName(track.artist || 'Artiste inconnu');
    const thumbnail = track.thumbnail || '';

    try {
      if (existing) {
        // Optimistic local deletion
        await db.likes.delete(trackId);
        setLikedTracks(prev => prev.filter(t => t.video_id !== trackId && t.videoId !== trackId));
        toast.success('Retiré des favoris');
        // Optionally remove from offline if unliked? Actually, wait, let's just leave it in offline storage unless explicitly deleted, or we can delete it. 
        // Let's delete it from offline storage if they unlike it? The prompt says "auto-download", maybe they want to keep it? The user didn't specify. Let's remove it to save space.
        removeDownloadedTrack(trackId);

        if (navigator.onLine) {
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('user_id', user.id)
            .eq('video_id', trackId);
          if (error && error.code !== 'PGRST116') throw error;
        }
      } else {
        // Optimistic local insertion
        const localItem = {
          videoId: trackId,
          title,
          artist,
          thumbnail,
          likedAt: new Date().toISOString()
        };
        await db.likes.put(localItem);
        setLikedTracks(prev => [
          { ...localItem, video_id: trackId, id: trackId },
          ...prev
        ]);
        toast.success('Ajouté aux favoris');
        // Trigger offline sync if enabled via autoDownloadService
        autoDownloadService.handleTrackLiked({ ...localItem, video_id: trackId, id: trackId });

        if (navigator.onLine) {
          const itemToSave = {
            user_id: user.id,
            video_id: trackId,
            title,
            artist,
            thumbnail,
            album: track.album || '',
          };
          const { error } = await supabase
            .from('likes')
            .insert(itemToSave);
          if (error) {
            if (error.code === '42P01') {
              throw new Error('La table "likes" n\'existe pas dans votre base de données Supabase. Veuillez exécuter le script SQL fourni.');
            }
            throw error;
          }
        }
      }
    } catch (err) {
      console.warn('Offline or Supabase sync failed, kept changes locally:', err);
    } finally {
      fetchLikes();
    }
  }, [user, isLiked, fetchLikes, handleTrackLiked, removeDownloadedTrack]);

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
