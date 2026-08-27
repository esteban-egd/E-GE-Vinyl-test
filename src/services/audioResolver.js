import { getLyraAudioStream } from './lyraAudio';

/**
 * audioResolver.js
 * Helper qui prend en entrée { title, artist } et interroge l'API pour récupérer
 * le flux audio complet (mp3/m4a de 3 à 4 minutes).
 */
export async function getAudioStreamUrl(trackTitle, artistName, videoId = null) {
  try {
    // Si l'ID est disponible, on peut l'utiliser, sinon on cherche par titre et artiste.
    // L'implémentation sous-jacente getLyraAudioStream gère déjà la recherche si on ne passe qu'un texte.
    const streamUrl = await getLyraAudioStream(videoId, trackTitle, artistName);
    return streamUrl;
  } catch (error) {
    console.error('[AudioResolver] Erreur lors de la résolution du flux audio complet:', error);
    return null;
  }
}
