/**
 * Service d'extraction de flux audio direct
 * Priorité : Backend Render personnalisé (https://e-ge-vinyl-test.onrender.com)
 * Optimisé pour contourner les erreurs 403, CORS et les restrictions iOS Safari / PWA.
 */

const RENDER_BACKEND_URL = 'https://e-ge-vinyl-test.onrender.com/api/stream';

/**
 * Récupère l'URL audio directe d'une vidéo YouTube
 * @param {string} videoId - L'ID de la vidéo YouTube
 * @returns {Promise<string|null>} L'URL directe du flux audio
 */
export async function getDirectAudioUrl(videoId) {
  if (!videoId) return null;

  // 1. Appel au backend Render personnalisé
  try {
    console.log(`[AudioService] Extraction flux via Render Backend pour ID: ${videoId}`);
    const response = await fetch(`${RENDER_BACKEND_URL}?id=${encodeURIComponent(videoId)}`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(6000) // 6s timeout pour basculer rapidement si le backend est indisponible
    });

    if (!response.ok) {
      console.error(`[AudioService] Erreur Render (${response.status}): ${response.statusText}`);
    } else {
      const data = await response.json();
      if (data && data.url) {
        console.log(`[AudioService] Flux audio reçu avec succès depuis Render.`);
        return data.url;
      } else {
        console.error('[AudioService] Réponse JSON invalide reçue de Render:', data);
      }
    }
  } catch (err) {
    console.error('[AudioService] Échec requête vers backend Render:', err.message || err);
  }

  return null;
}
