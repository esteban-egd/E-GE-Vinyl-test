import { isTrackDownloaded, downloadTrack as serviceDownloadTrack } from './downloadService';
import db from '../lib/db';

/**
 * autoDownloadService.js
 * Synchronisation intelligente et automatique des "Titres likés".
 */

class AutoDownloadService {
  constructor() {
    this.isSyncing = false;
  }

  /**
   * Écoute l'événement 'like' d'un titre et déclenche son téléchargement en arrière-plan.
   * Ignore si le titre est déjà téléchargé.
   */
  async handleTrackLiked(track) {
    if (!track) return;
    
    const videoId = track.videoId || track.video_id || track.id;
    if (!videoId) return;

    try {
      // Si le titre est déjà présent dans le cache/IndexedDB, ignore-le.
      const alreadyDownloaded = await isTrackDownloaded(videoId);
      if (alreadyDownloaded) {
        console.log(`[AutoDownloadService] Le titre "${track.title}" est déjà stocké localement. Ignoré.`);
        return;
      }

      console.log(`[AutoDownloadService] Téléchargement automatique en arrière-plan de "${track.title}"...`);
      // Déclenche le téléchargement en arrière-plan
      await serviceDownloadTrack(track);
    } catch (error) {
      console.error(`[AutoDownloadService] Erreur lors de l'auto-téléchargement de "${track.title}":`, error);
    }
  }

  /**
   * Vérification différentielle (delta sync) pour télécharger automatiquement 
   * tout titre liké qui ne serait pas encore stocké localement.
   */
  async deltaSyncLikedTracks(likedTracks) {
    if (this.isSyncing || !navigator.onLine) return;
    
    if (!likedTracks || !Array.isArray(likedTracks) || likedTracks.length === 0) {
      return;
    }

    this.isSyncing = true;
    console.log('[AutoDownloadService] Démarrage de la vérification différentielle (delta sync) des titres likés...');

    try {
      for (const track of likedTracks) {
        const videoId = track.videoId || track.video_id || track.id;
        if (!videoId) continue;
        
        const alreadyDownloaded = await isTrackDownloaded(videoId);
        if (!alreadyDownloaded) {
          console.log(`[AutoDownloadService] Delta sync: Téléchargement manquant pour "${track.title}"...`);
          await serviceDownloadTrack(track);
        }
      }
      console.log('[AutoDownloadService] Delta sync terminé.');
    } catch (error) {
      console.error('[AutoDownloadService] Erreur durant le delta sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const autoDownloadService = new AutoDownloadService();
