/**
 * Recently Played Service
 * Gère l'historique d'écoute des derniers morceaux et vinyles dans le localStorage.
 */

const RECENTLY_PLAYED_KEY = 'ege_recently_played_tracks';
const MAX_STORED_TRACKS = 30;

/**
 * Récupère la liste des morceaux récemment écoutés depuis le localStorage.
 * @param {number} limit - Nombre maximal de titres à renvoyer (par défaut 10)
 * @returns {Array} Liste des morceaux
 */
export function getRecentlyPlayed(limit = 10) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENTLY_PLAYED_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.slice(0, limit);
  } catch (err) {
    console.warn('[RecentlyPlayedService] Erreur lecture localStorage:', err);
    return [];
  }
}

/**
 * Enregistre un morceau/vinyle dans les titres récemment écoutés dans le localStorage.
 * @param {Object} track - Métadonnées du morceau
 * @returns {Array} Liste mise à jour
 */
export function addRecentlyPlayed(track) {
  if (typeof window === 'undefined' || !track) return [];
  if (!track.title && !track.name) return getRecentlyPlayed();

  try {
    const raw = localStorage.getItem(RECENTLY_PLAYED_KEY);
    let list = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      } catch (_) {}
    }

    const cleanTitle = (track.title || track.name || '').trim();
    const cleanArtist = (typeof track.artist === 'string' ? track.artist : track.artist?.name || 'Artiste').trim();
    const trackId = track.id || track.videoId || track.deezerId || `${cleanTitle}_${cleanArtist}`;
    const videoId = track.videoId || (track.id && String(track.id).length === 11 ? track.id : '');

    const record = {
      id: trackId,
      videoId: videoId || undefined,
      deezerId: track.deezerId || track.id,
      title: cleanTitle,
      artist: cleanArtist,
      album: track.album || track.albumTitle || (typeof track.albumObj === 'object' ? track.albumObj?.title : '') || '',
      thumbnail: track.thumbnail || track.cover || track.cover_big || track.cover_xl || '',
      cover: track.thumbnail || track.cover || track.cover_big || track.cover_xl || '',
      duration: track.duration || 0,
      previewUrl: track.previewUrl || track.preview || '',
      playedAt: Date.now()
    };

    // Déduplication : retirer toute occurrence antérieure du même morceau
    list = list.filter(item => {
      if (!item) return false;
      if (item.id && record.id && String(item.id) === String(record.id)) return false;
      if (item.videoId && record.videoId && String(item.videoId) === String(record.videoId)) return false;
      if (
        item.title && record.title &&
        item.title.toLowerCase().trim() === record.title.toLowerCase().trim() &&
        item.artist && record.artist &&
        item.artist.toLowerCase().trim() === record.artist.toLowerCase().trim()
      ) {
        return false;
      }
      return true;
    });

    // Ajouter en première position (index 0)
    list.unshift(record);

    // Limiter la taille du stockage
    if (list.length > MAX_STORED_TRACKS) {
      list = list.slice(0, MAX_STORED_TRACKS);
    }

    localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(list));

    // Notifier l'application pour synchronisation instantanée
    window.dispatchEvent(new CustomEvent('ege_recently_played_changed', { detail: list }));

    return list.slice(0, 10);
  } catch (err) {
    console.warn('[RecentlyPlayedService] Erreur écriture localStorage:', err);
    return getRecentlyPlayed();
  }
}

/**
 * Efface l'historique des morceaux récemment joués dans le localStorage.
 */
export function clearRecentlyPlayed() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENTLY_PLAYED_KEY);
    window.dispatchEvent(new CustomEvent('ege_recently_played_changed', { detail: [] }));
  } catch (err) {
    console.warn('[RecentlyPlayedService] Erreur suppression localStorage:', err);
  }
}
