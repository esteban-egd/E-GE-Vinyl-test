import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import db from '../lib/db';
import { getLyraAudioStream } from '../services/lyraAudio';
import { toast } from 'react-hot-toast';

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const { user } = useAuth();
  const [downloadedIds, setDownloadedIds] = useState(new Set());
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [isDownloading, setIsDownloading] = useState(new Set());
  
  // Sync state
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    total: 0,
    current: 0,
    currentTitle: ''
  });

  const syncUserIdRef = useRef(null);

  // Load offline tracks from IndexedDB
  const loadOfflineTracks = useCallback(async () => {
    if (!user || user.is_guest) {
      setDownloadedTracks([]);
      setDownloadedIds(new Set());
      return;
    }
    try {
      const tracks = await db.offlineTracks.toArray();
      const userTracks = tracks.filter(t => 
        (t.userIds && t.userIds.includes(user.id)) || t.userId === user.id
      );
      setDownloadedTracks(userTracks);
      setDownloadedIds(new Set(userTracks.map(t => t.videoId)));
    } catch (err) {
      console.error('Failed to load offline tracks:', err);
    }
  }, [user]);

  useEffect(() => {
    loadOfflineTracks();
  }, [loadOfflineTracks]);

  // Synchronize with Cloud (Supabase) sequentially
  useEffect(() => {
    if (!user || user.is_guest) {
      syncUserIdRef.current = null;
      setSyncState({ isSyncing: false, total: 0, current: 0, currentTitle: '' });
      return;
    }

    // Prevent double-syncing for the same user session
    if (syncUserIdRef.current === user.id) return;
    syncUserIdRef.current = user.id;

    const syncWithCloud = async () => {
      try {
        // 1. Fetch local track list
        const allTracks = await db.offlineTracks.toArray();
        const localTracks = allTracks.filter(t => 
          (t.userIds && t.userIds.includes(user.id)) || t.userId === user.id
        );
        const localIds = new Set(localTracks.map(t => t.videoId));

        // 2. Fetch remote track list
        const { data: cloudTracks, error } = await supabase
          .from('offline_tracks')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to load offline tracks from Supabase:', error);
          return;
        }

        if (!cloudTracks || cloudTracks.length === 0) return;

        // 3. Find tracks on the cloud that are missing locally
        const missingLocally = cloudTracks.filter(ct => !localIds.has(ct.video_id));

        if (missingLocally.length > 0) {
          setSyncState({
            isSyncing: true,
            total: missingLocally.length,
            current: 0,
            currentTitle: missingLocally[0].title || 'Initialisation...'
          });

          let downloadedCount = 0;

          for (const track of missingLocally) {
            const trackId = track.video_id;
            
            setSyncState(prev => ({
              ...prev,
              current: downloadedCount,
              currentTitle: `${track.artist} - ${track.title}`
            }));

            try {
              // Check if track is already downloaded by another user locally
              const existing = await db.offlineTracks.get(trackId);
              const userIds = existing?.userIds ? [...existing.userIds] : (existing?.userId ? [existing.userId] : []);
              if (!userIds.includes(user.id)) {
                userIds.push(user.id);
              }

              let audioBlob = existing?.audioBlob || null;
              let thumbnailBlob = existing?.thumbnailBlob || null;

              // Only fetch over network if we don't have it locally
              if (!audioBlob) {
                const streamUrl = await getLyraAudioStream(trackId, track.title, track.artist);
                if (streamUrl) {
                  try {
                    const audioRes = await fetch(streamUrl);
                    if (audioRes.ok) audioBlob = await audioRes.blob();
                  } catch (_) {}
                }
              }

              if (!thumbnailBlob && track.thumbnail) {
                try {
                  const thumbRes = await fetch(track.thumbnail);
                  if (thumbRes.ok) thumbnailBlob = await thumbRes.blob();
                } catch (_) {}
              }

              // Save to local DB
              await db.offlineTracks.put({
                videoId: trackId,
                userIds,
                userId: user.id,
                title: track.title,
                artist: track.artist,
                album: track.album || '',
                thumbnail: track.thumbnail,
                duration: track.duration,
                audioBlob,
                thumbnailBlob,
                downloadedAt: track.downloaded_at || new Date().toISOString()
              });
            } catch (e) {
              console.error(`Failed to sync track ${trackId} in background:`, e);
            }

            downloadedCount++;
            setSyncState(prev => ({
              ...prev,
              current: downloadedCount
            }));
          }

          // Complete syncing successfully
          toast.success(`${missingLocally.length} titres restaurés hors-ligne !`, { duration: 4000 });
          setSyncState({ isSyncing: false, total: 0, current: 0, currentTitle: '' });
          await loadOfflineTracks();
        }
      } catch (err) {
        console.error('Error during cloud offline synchronization:', err);
        setSyncState({ isSyncing: false, total: 0, current: 0, currentTitle: '' });
      }
    };

    syncWithCloud();
  }, [user, loadOfflineTracks]);

  const isDownloaded = useCallback((trackId) => {
    return downloadedIds.has(trackId);
  }, [downloadedIds]);

  const downloadTrack = useCallback(async (track) => {
    if (!user || user.is_guest) {
      toast.error('Le mode Invité est restreint. Connectez-vous ou créez un compte pour télécharger des morceaux !', {
        icon: '🔒',
        duration: 4000
      });
      return;
    }

    const trackId = track.videoId || track.id;
    if (downloadedIds.has(trackId) || isDownloading.has(trackId)) return;

    setIsDownloading(prev => new Set(prev).add(trackId));
    const toastId = toast.loading('Téléchargement en cours...');

    try {
      const existing = await db.offlineTracks.get(trackId);
      const userIds = existing?.userIds ? [...existing.userIds] : (existing?.userId ? [existing.userId] : []);
      if (!userIds.includes(user.id)) {
        userIds.push(user.id);
      }

      let audioBlob = existing?.audioBlob || null;
      let thumbnailBlob = existing?.thumbnailBlob || null;

      if (!audioBlob) {
        const streamUrl = await getLyraAudioStream(trackId, track.title, track.artist);
        if (streamUrl) {
          try {
            const audioRes = await fetch(streamUrl);
            if (audioRes.ok) audioBlob = await audioRes.blob();
          } catch (e) {
            console.warn('Audio download failed (CORS/Network), saving metadata only');
          }
        }
      }

      if (!thumbnailBlob && track.thumbnail) {
        try {
          const thumbRes = await fetch(track.thumbnail);
          if (thumbRes.ok) thumbnailBlob = await thumbRes.blob();
        } catch (e) {
          console.warn('Could not download thumbnail, continuing...', e);
        }
      }

      await db.offlineTracks.put({
        videoId: trackId,
        userIds,
        userId: user.id,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        thumbnail: track.thumbnail,
        duration: track.duration,
        audioBlob,
        thumbnailBlob,
        downloadedAt: existing?.downloadedAt || new Date().toISOString()
      });

      const { error: supabaseError } = await supabase
        .from('offline_tracks')
        .upsert({
          user_id: user.id,
          video_id: trackId,
          title: track.title,
          artist: track.artist,
          album: track.album || '',
          thumbnail: track.thumbnail,
          duration: track.duration,
          downloaded_at: new Date().toISOString()
        });

      if (supabaseError) {
        console.warn('Supabase sync failed (offline_tracks), but saved locally:', supabaseError);
      }

      await loadOfflineTracks();

      if (!audioBlob) {
        toast.success('Enregistré dans la bibliothèque (Le fichier audio complet sera disponible sur l\'application native .exe / .apk)', { id: toastId, duration: 5000 });
      } else {
        toast.success('Morceau disponible hors-ligne', { id: toastId });
      }
    } catch (err) {
      console.error('Download failed:', err);
      toast.error(`Échec: ${err.message}`, { id: toastId });
    } finally {
      setIsDownloading(prev => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  }, [user, downloadedIds, isDownloading, loadOfflineTracks]);

  const removeTrack = useCallback(async (trackId) => {
    try {
      if (!user) return;

      const existing = await db.offlineTracks.get(trackId);
      if (existing) {
        const userIds = existing.userIds ? existing.userIds.filter(id => id !== user.id) : [];
        
        if (userIds.length > 0) {
          await db.offlineTracks.put({
            ...existing,
            userIds,
            userId: userIds[0]
          });
        } else {
          await db.offlineTracks.delete(trackId);
        }
      }

      await supabase
        .from('offline_tracks')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', trackId);

      await loadOfflineTracks();
      toast.success('Morceau retiré du mode hors-ligne');
    } catch (err) {
      console.error('Failed to remove track:', err);
      toast.error('Erreur lors de la suppression');
    }
  }, [user, loadOfflineTracks]);

  return (
    <OfflineContext.Provider value={{
      downloadedTracks,
      downloadedIds,
      isDownloading,
      isDownloaded,
      downloadTrack,
      removeTrack,
      syncState
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOfflineContext() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  return context;
}
