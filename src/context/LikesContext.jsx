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
    const currentUserId = user?.id || user?.uid;
    console.log("UserID actuel :", user?.id);

    if (!currentUserId) {
      setLikedTracks([]);
      return;
    }

    setLoading(true);
    try {
      if (navigator.onLine && !user?.is_guest) {
        const { data, error } = await supabase
          .from('likes')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false });

        console.log("Likes récupérés depuis Supabase :", data, "Erreur :", error);

        if (error) {
          console.error('[LikesContext] Erreur Supabase:', error);
          throw error;
        }

        const rawItems = data || [];
        const formatted = rawItems.map(item => ({
          ...item,
          video_id: item.video_id || item.videoId || item.id,
          videoId: item.video_id || item.videoId || item.id,
          id: item.video_id || item.videoId || item.id,
          title: item.title || 'Titre inconnu',
          artist: item.artist || 'Artiste inconnu',
          thumbnail: item.thumbnail || '',
          album: item.album || '',
          user_id: item.user_id || currentUserId,
          created_at: item.created_at || item.likedAt || new Date().toISOString()
        }));

        // Directly set global state with Supabase data
        setLikedTracks(formatted);

        // Safe background sync to IndexedDB
        try {
          await db.transaction('rw', db.likes, async () => {
            await db.likes.clear();
            for (const item of formatted) {
              await db.likes.put({
                user_id: currentUserId,
                video_id: item.video_id,
                videoId: item.videoId,
                title: item.title,
                artist: item.artist,
                thumbnail: item.thumbnail,
                likedAt: item.created_at,
                created_at: item.created_at
              });
            }
          });
        } catch (dexieErr) {
          console.warn('[LikesContext] IndexedDB sync non-blocking warning:', dexieErr);
        }

        // Start delta sync in background
        autoDownloadService.deltaSyncLikedTracks(formatted);
      } else {
        // Fallback to local DB when offline or guest
        const localLikes = await db.likes.toArray();
        const filtered = localLikes.filter(item => item.user_id === currentUserId || !item.user_id);
        const formattedLocal = filtered.map(item => ({
          ...item,
          video_id: item.video_id || item.videoId || item.id,
          videoId: item.video_id || item.videoId || item.id,
          id: item.video_id || item.videoId || item.id,
          title: item.title || 'Titre inconnu',
          artist: item.artist || 'Artiste inconnu',
          thumbnail: item.thumbnail || ''
        }));
        setLikedTracks(formattedLocal);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to IndexedDB:', err.message);
      try {
        const localLikes = await db.likes.toArray();
        const filtered = localLikes.filter(item => item.user_id === currentUserId || !item.user_id);
        const formattedLocal = filtered.map(item => ({
          ...item,
          video_id: item.video_id || item.videoId || item.id,
          videoId: item.video_id || item.videoId || item.id,
          id: item.video_id || item.videoId || item.id,
          title: item.title || 'Titre inconnu',
          artist: item.artist || 'Artiste inconnu',
          thumbnail: item.thumbnail || ''
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
    const handleAuth = () => {
      fetchLikes();
    };
    window.addEventListener('lyra:auth_changed', handleAuth);

    const currentUserId = user?.id || user?.uid;
    let channel = null;
    if (currentUserId && !user?.is_guest) {
      channel = supabase.channel(`realtime-likes-${currentUserId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `user_id=eq.${currentUserId}`
        }, () => {
          fetchLikes();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('lyra:auth_changed', handleAuth);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchLikes, user]);

  const isLiked = useCallback((trackOrId) => {
    if (!trackOrId || !likedTracks) return false;
    
    const trackId = typeof trackOrId === 'string' 
      ? trackOrId 
      : (trackOrId.id || trackOrId.video_id || trackOrId.videoId);
      
    if (!trackId) return false;
    
    return likedTracks.some(t => (t.video_id || t.id || t.videoId) === trackId);
  }, [likedTracks]);

  const toggleLike = useCallback(async (track) => {
    const currentUserId = user?.id || user?.uid;
    if (!currentUserId) {
      toast.error('Connectez-vous pour ajouter des favoris !');
      return;
    }
    if (!track) return;

    const trackId = typeof track === 'string' ? track : (track.id || track.video_id || track.videoId);
    
    if (!trackId) {
      console.error('Missing trackId for like operation:', track);
      toast.error('Impossible d\'identifier le morceau');
      return;
    }

    const existing = isLiked(trackId);
    const title = track.title || 'Titre inconnu';
    const artist = track.artist || 'Artiste inconnu';
    const thumbnail = track.thumbnail || track.cover || '';

    try {
      if (existing) {
        // Optimistic local deletion by finding the matching IndexedDB item(s) and deleting by their auto-incremented id
        try {
          const matching = await db.likes.filter(l => l.video_id === trackId || l.videoId === trackId).toArray();
          for (const m of matching) {
            if (m.id) {
              await db.likes.delete(m.id);
            }
          }
        } catch (dbErr) {
          console.warn('[LikesContext] IndexedDB local delete failed, proceeding with UI state update:', dbErr);
        }

        setLikedTracks(prev => prev.filter(t => t.video_id !== trackId && t.videoId !== trackId && t.id !== trackId));
        toast.success('Retiré des favoris');
        try {
          removeDownloadedTrack(trackId);
        } catch (offlineErr) {
          console.warn('[LikesContext] Could not remove offline track download:', offlineErr);
        }

        if (navigator.onLine && !user?.is_guest) {
          try {
            const { error } = await supabase
              .from('likes')
              .delete()
              .eq('user_id', currentUserId)
              .eq('video_id', trackId);
            if (error && error.code !== 'PGRST116') throw error;
          } catch (sbErr) {
            console.warn('[LikesContext] Supabase sync delete failed, kept local state:', sbErr);
          }
        }
      } else {
        // Optimistic local insertion
        const localItem = {
          user_id: currentUserId,
          videoId: trackId,
          video_id: trackId,
          title,
          artist,
          thumbnail,
          likedAt: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        try {
          await db.likes.put(localItem);
        } catch (dbErr) {
          console.warn('[LikesContext] IndexedDB local put failed, proceeding with UI state update:', dbErr);
        }

        setLikedTracks(prev => [
          { ...localItem, video_id: trackId, id: trackId },
          ...prev
        ]);
        toast.success('Ajouté aux favoris');
        
        try {
          autoDownloadService.handleTrackLiked({ ...localItem, video_id: trackId, id: trackId });
        } catch (autoDlErr) {
          console.warn('[LikesContext] Auto-download trigger failed:', autoDlErr);
        }

        if (navigator.onLine && !user?.is_guest) {
          const itemToSave = {
            user_id: currentUserId,
            video_id: trackId,
            title,
            artist,
            thumbnail,
            album: track.album || '',
          };
          
          console.log("[LikesContext] Insertion dans likes :", itemToSave);
          
          try {
            const { error } = await supabase
              .from('likes')
              .insert(itemToSave);
            if (error) {
              if (error.code === '42P01') {
                throw new Error('La table "likes" n\'existe pas dans votre base de données Supabase. Veuillez exécuter le script SQL fourni.');
              }
              throw error;
            }
          } catch (sbErr) {
            console.warn('[LikesContext] Supabase sync insert failed, kept local state:', sbErr.message || sbErr);
          }
        }
      }
    } catch (err) {
      console.error('Erreur toggleLike:', err.message || err);
      toast.error(`Erreur : ${err.message || err}`);
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
