import { supabase } from '../lib/supabaseClient';

/**
 * Service pour gérer l'interaction avec la table 'likes' dans Supabase BDD
 */

export async function fetchUserLikes(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[likesService] Erreur lors de la récupération des likes:', error);
      throw error;
    }

    return (data || []).map(item => ({
      ...item,
      videoId: item.video_id || item.videoId || item.id,
      id: item.video_id || item.videoId || item.id,
      title: item.title || 'Titre inconnu',
      artist: item.artist || 'Artiste inconnu',
      thumbnail: item.thumbnail || '',
      album: item.album || '',
      created_at: item.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('[likesService] Échec de la requête Supabase:', err.message);
    throw err;
  }
}

export async function addUserLike(userId, track) {
  if (!userId || !track) return null;
  const trackId = typeof track === 'string' ? track : (track.videoId || track.id || track.video_id);
  if (!trackId) return null;

  const itemToSave = {
    user_id: userId,
    video_id: trackId,
    title: track.title || 'Titre inconnu',
    artist: track.artist || 'Artiste inconnu',
    thumbnail: track.thumbnail || '',
    album: track.album || '',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('likes')
    .insert(itemToSave)
    .select();

  if (error) {
    console.error('[likesService] Erreur lors de l\'ajout du me morceau aux likes:', error);
    throw error;
  }
  return data?.[0] || itemToSave;
}

export async function removeUserLike(userId, trackId) {
  if (!userId || !trackId) return false;

  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('video_id', trackId);

  if (error && error.code !== 'PGRST116') {
    console.error('[likesService] Erreur lors de la suppression du me morceau des likes:', error);
    throw error;
  }
  return true;
}
