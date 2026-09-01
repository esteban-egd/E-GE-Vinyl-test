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
    const isOnline = status === 'online' || status === 'listening';
    const nowIso = new Date().toISOString();
    const payload = {
      status: status || 'online',
      is_online: isOnline,
      last_seen: nowIso,
      updated_at: nowIso
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
 * Increment total cumulative listening time in seconds for a user
 */
export async function incrementListeningTime(userId, secondsToAdd = 5) {
  if (!userId || secondsToAdd <= 0) return 0;
  
  let updatedTotal = 0;

  // 1. Update local Dexie first for instant zero-latency UI
  try {
    if (db?.profiles) {
      const existing = await db.profiles.get(userId);
      const currentSec = Number(existing?.total_listening_seconds || 0);
      updatedTotal = currentSec + secondsToAdd;
      await db.profiles.put({
        ...(existing || {}),
        id: userId,
        total_listening_seconds: updatedTotal,
        updated_at: new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn('[userBddService] Local listening time update error:', e);
  }

  // Notify UI live of the updated listening seconds
  if (typeof window !== 'undefined' && updatedTotal > 0) {
    window.dispatchEvent(new CustomEvent('lyra:listening_time_updated', {
      detail: { userId, totalSeconds: updatedTotal }
    }));
  }

  // 2. Update Supabase BDD (RPC if exists, otherwise fallback to select + update)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('increment_listening_time', {
      p_user_id: userId,
      p_seconds_to_add: secondsToAdd
    });

    if (!rpcError && typeof rpcData === 'number') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lyra:listening_time_updated', {
          detail: { userId, totalSeconds: rpcData }
        }));
      }
      return rpcData;
    }

    // Direct update fallback
    const { data: prof, error: selectError } = await supabase
      .from('profiles')
      .select('total_listening_seconds')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      if (selectError.code === 'PGRST204' || selectError.message.includes('total_listening_seconds')) {
         if (typeof window !== 'undefined' && !window.hasWarnedSql) {
           console.error("Veuillez exécuter le script SQL dans Supabase pour créer la colonne total_listening_seconds !");
           window.hasWarnedSql = true;
         }
      }
      return updatedTotal; // Fallback to local value if column missing
    }

    const currentBddSec = Number(prof?.total_listening_seconds || (updatedTotal > 0 ? updatedTotal - secondsToAdd : 0));
    const newTotal = currentBddSec + secondsToAdd;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        total_listening_seconds: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error("[userBddService] Supabase fallback update error:", updateError);
      return updatedTotal; // fallback
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lyra:listening_time_updated', {
        detail: { userId, totalSeconds: newTotal }
      }));
    }

    return newTotal;
  } catch (err) {
    console.warn('[userBddService] Supabase increment listening time error:', err);
  }

  return updatedTotal;
}

/**
 * Format listening seconds into a detailed, human-readable string
 */
export function formatListeningTime(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (sec === 0) return '0 min';
  
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 && minutes < 5 ? `${minutes}min ${seconds}s` : `${minutes} min`;
  }
  return `${seconds}s`;
}

/**
 * Calculates effective live user status based on status flags and heartbeat recency
 */
export function getEffectiveStatus(profile) {
  if (!profile) return 'offline';
  const rawStatus = profile.status || (profile.is_online ? 'online' : 'offline');
  if (rawStatus === 'offline' || rawStatus === 'none' || profile.is_online === false) {
    return 'offline';
  }

  // Check last_seen / updated_at heartbeat recency (tolerance: 2 minutes)
  const lastActive = profile.last_seen || profile.updated_at;
  if (lastActive) {
    const elapsed = Date.now() - new Date(lastActive).getTime();
    if (elapsed > 2 * 60 * 1000) {
      return 'offline';
    }
  }

  return rawStatus === 'listening' ? 'listening' : 'online';
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
