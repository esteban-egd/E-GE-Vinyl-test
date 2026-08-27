import { getAudioStreamUrl } from './audioResolver';

/**
 * audioDownloadApi.js
 * Resolver audio unifié cross-platform (EXE Electron + APK Mobile).
 * Utilise notre proxy backend sécurisé sans CORS pour récupérer les flux audios entiers (3-4 mins)
 * ou bascule sur le resolver direct de Lyra si besoin.
 */
export async function fetchFullAudioBlob(title, artist, videoId = null) {
  try {
    // Appel à l'endpoint unifié
    const query = encodeURIComponent(`${title} ${artist}`);
    const idParam = videoId ? `&id=${encodeURIComponent(videoId)}` : '';
    const serverUrl = `/api/download?query=${query}${idParam}`;
    
    console.log(`[AudioDownloadAPI] Fetching full audio for: ${title} - ${artist}`);
    
    const response = await fetch(serverUrl, {
      mode: 'cors',
      signal: AbortSignal.timeout(15000)
    });
    
    if (response.ok) {
      const blob = await response.blob();
      // On s'assure que c'est un fichier complet (plus de quelques centaines de Ko)
      // Un fichier audio complet fait typiquement plusieurs Mo.
      if (blob && blob.size > 100000) { // > 100 KB ensures it's not an empty or tiny error fallback
        return {
          blob,
          mimeType: response.headers.get('content-type') || 'audio/mpeg'
        };
      }
    }
  } catch (error) {
    console.warn('[AudioDownloadAPI] Backend proxy failed, falling back to direct resolver:', error);
  }

  // Fallback ultime sur notre resolver direct (ex: Piped) si le proxy échoue
  try {
    const directStreamUrl = await getAudioStreamUrl(title, artist, videoId);
    if (directStreamUrl) {
      const response = await fetch(directStreamUrl, {
        mode: 'cors',
        signal: AbortSignal.timeout(15000)
      });
      if (response.ok) {
        const blob = await response.blob();
        if (blob && blob.size > 100000) {
          return {
            blob,
            mimeType: response.headers.get('content-type') || 'audio/mpeg'
          };
        }
      }
    }
  } catch (err) {
    console.error('[AudioDownloadAPI] All full-track resolvers failed:', err);
  }

  return null;
}
