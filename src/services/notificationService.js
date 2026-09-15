import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const CHANNEL_ID = 'ege_vinyl_notifications';
let isInitialized = false;

/**
 * Initialise le système de notifications pour Android (Capacitor) et Web
 */
export async function initNotifications() {
  if (isInitialized) return;
  isInitialized = true;

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Créer le canal de notification Android haute importance
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Messages & Morceaux E-GE Vinyl',
        description: 'Notifications pour les messages, morceaux partagés et demandes d\'ami',
        importance: 5, // Notification Heads-up prioritaire avec son/vibration
        visibility: 1, // Public sur l'écran de verrouillage
        vibration: true,
        lights: true,
        lightColor: '#c29e5a'
      });
      console.log('[NotificationService] Android Notification Channel créé');

      // 2. Vérifier et demander la permission si nécessaire
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      // 3. Écouter le clic sur la notification native
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('[NotificationService] Clic sur notification native:', action);
        const extra = action?.notification?.extra;
        if (extra) {
          handleNotificationClick(extra);
        }
      });
    } catch (err) {
      console.warn('[NotificationService] Erreur init Capacitor LocalNotifications:', err);
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window) {
    // Navigateur Web standard
    try {
      if (Notification.permission === 'default') {
        // Demande au premier clic ou interaction
        console.log('[NotificationService] Prêt pour les notifications Web');
      }
    } catch (_) {}
  }
}

/**
 * Demande manuellement l'autorisation à l'utilisateur (utile pour un bouton dans les paramètres)
 */
export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted';
    } catch (err) {
      console.error('[NotificationService] Erreur demande permission native:', err);
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch (err) {
      console.error('[NotificationService] Erreur demande permission web:', err);
      return false;
    }
  }

  return false;
}

/**
 * Vérifie si les notifications sont actuellement autorisées
 */
export async function checkNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.checkPermissions();
      return res.display === 'granted';
    } catch (_) {
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }

  return false;
}

/**
 * Envoie une VRAIE notification Android ou Web
 * @param {Object} options
 * @param {string} options.title Titre de la notification
 * @param {string} options.body Corps du message
 * @param {Object} [options.extra] Métadonnées (ex: track, type de message)
 */
export async function sendNativeNotification({ title, body, extra = {} }) {
  if (!title) return;

  // Vibration physique immédiate sur mobile
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate([100, 50, 100]);
    } catch (_) {}
  }

  // Si on est sur l'application Android native (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const notifId = Math.floor(Math.random() * 2000000000) + 1;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: title,
            body: body,
            channelId: CHANNEL_ID,
            smallIcon: 'ic_launcher',
            iconColor: '#c29e5a',
            extra: extra,
            autoCancel: true
          }
        ]
      });
      console.log(`[NotificationService] Notification Android envoyée: "${title}"`);
      return true;
    } catch (err) {
      console.warn('[NotificationService] Échec envoi notification Capacitor:', err);
    }
  }

  // Fallback navigateur Web / Desktop
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          data: extra
        });
        notif.onclick = () => {
          window.focus();
          handleNotificationClick(extra);
        };
        return true;
      } catch (err) {
        console.warn('[NotificationService] Échec Web Notification:', err);
      }
    }
  }

  return false;
}

/**
 * Action lors du clic sur la notification
 */
function handleNotificationClick(extra) {
  if (!extra) return;

  if (extra.type === 'play_track' && extra.track) {
    window.dispatchEvent(new CustomEvent('lyra:play_track', { detail: extra.track }));
  }

  if (extra.type === 'chat_message' || extra.type === 'friend_request' || extra.type === 'friend_accepted') {
    window.dispatchEvent(new CustomEvent('ege:open_social_tab', { detail: extra }));
  }
}
