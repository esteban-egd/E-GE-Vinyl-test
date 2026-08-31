import { supabase } from '../lib/supabaseClient';
import db from '../lib/db';

/**
 * Record a listening event in BDD (listening_history) linked to user.id
 */
export async function recordListeningHistory(user, track) {
  if (!user || !track) return;
  const userId = user.id || user.uid;
  if (!userId) return;

  const trackId = track.videoId || track.id;
  if (!trackId) return;

  const payload = {
    user_id: userId,
    track_id: trackId,
    video_id: trackId,
    title: track.title || 'Titre inconnu',
    artist: track.artist || 'Artiste inconnu',
    thumbnail: track.thumbnail || '',
    duration: track.duration || '',
    played_at: new Date().toISOString()
  };

  // 1. Local Dexie table for fast offline fallback
  try {
    if (db?.listening_history) {
      await db.listening_history.add({
        ...payload,
        videoId: trackId,
        addedAt: Date.now()
      });
    }
  } catch (err) {
    console.warn('[userBddService] Dexie history error:', err);
  }

  // 2. Supabase BDD record linked to user_id
  try {
    await supabase.from('listening_history').insert(payload);
    
    // 3. Update profile status to 'listening' and set current_track
    await updateUserStatus(userId, 'listening', track.title);
  } catch (err) {
    console.warn('[userBddService] Supabase listening_history insert error:', err);
  }
}

/**
 * Update user status and current track in profiles table
 */
export async function updateUserStatus(userId, status, currentTrack = null) {
  if (!userId) return;
  
  try {
    const payload = {
      status: status || 'online',
      updated_at: new Date().toISOString()
    };
    
    if (currentTrack !== undefined) {
      payload.current_track = currentTrack;
    }
    
    await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);
  } catch (err) {
    // Silently fail if column doesn't exist yet
    console.warn('[userBddService] Failed to update profile status:', err.message);
  }
}

/**
 * Fetch listening history from BDD filtered strictly by user.id
 */
export async function fetchListeningHistory(userId, limit = 20) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('listening_history')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data.map(item => ({
        ...item,
        videoId: item.track_id || item.video_id || item.id,
        id: item.track_id || item.video_id || item.id,
        addedAt: item.played_at ? new Date(item.played_at).getTime() : Date.now()
      }));
    }
  } catch (err) {
    console.warn('[userBddService] Supabase fetch listening history error:', err);
  }

  try {
    if (db?.listening_history) {
      const items = await db.listening_history
        .where('user_id')
        .equals(userId)
        .reverse()
        .limit(limit)
        .toArray();

      if (items && items.length > 0) {
        return items.map(item => ({
          ...item,
          videoId: item.track_id || item.video_id || item.id,
          id: item.track_id || item.video_id || item.id,
          addedAt: item.played_at ? new Date(item.played_at).getTime() : Date.now()
        }));
      }
    }
  } catch (err) {
    console.warn('[userBddService] Dexie fetch listening history error:', err);
  }

  return [];
}

/**
 * Save active player queue and state in BDD (user_queue) linked to user.id
 */
export async function saveUserQueue(userId, queue, queueIndex, currentTrack) {
  if (!userId) return;

  const payload = {
    user_id: userId,
    queue_data: JSON.stringify(queue || []),
    queue_index: typeof queueIndex === 'number' ? queueIndex : -1,
    current_track: JSON.stringify(currentTrack || null),
    updated_at: new Date().toISOString()
  };

  try {
    if (db?.user_queue) {
      await db.user_queue.put(payload);
    }
  } catch (_) {}

  try {
    await supabase.from('user_queue').upsert(payload);
  } catch (err) {
    console.warn('[userBddService] Supabase user_queue upsert error:', err);
  }
}

/**
 * Fetch active player queue from BDD for user.id
 */
export async function fetchUserQueue(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_queue')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      let queue = [];
      let currentTrack = null;
      try {
        queue = typeof data.queue_data === 'string' ? JSON.parse(data.queue_data) : (data.queue_data || []);
      } catch (_) {}
      try {
        currentTrack = typeof data.current_track === 'string' ? JSON.parse(data.current_track) : (data.current_track || null);
      } catch (_) {}

      return {
        queue,
        queueIndex: data.queue_index ?? -1,
        currentTrack
      };
    }
  } catch (err) {
    console.warn('[userBddService] Supabase fetch user_queue error:', err);
  }

  try {
    if (db?.user_queue) {
      const data = await db.user_queue.get(userId);
      if (data) {
        let queue = [];
        let currentTrack = null;
        try {
          queue = typeof data.queue_data === 'string' ? JSON.parse(data.queue_data) : (data.queue_data || []);
        } catch (_) {}
        try {
          currentTrack = typeof data.current_track === 'string' ? JSON.parse(data.current_track) : (data.current_track || null);
        } catch (_) {}
        return {
          queue,
          queueIndex: data.queue_index ?? -1,
          currentTrack
        };
      }
    }
  } catch (_) {}

  return null;
}
