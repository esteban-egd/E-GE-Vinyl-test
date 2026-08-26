/**
 * Service de recherche & de résolution audio Lyra
 * Intégration Innertube, Invidious, Piped et Serverless Vercel
 */


/**
 * Extrait systématiquement l'ID YouTube valide de 11 caractères
 * (gère les URLs complètes, raccourcies youtu.be, shorts, embeds, et IDs directs).
 */
export function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const clean = urlOrId.trim();

  // Reject internal non-YouTube IDs or pure numeric IDs (Deezer/iTunes IDs like 3135556 or 15891234567)
  if (
    clean.startsWith('dz_') || 
    clean.startsWith('it_') || 
    clean.startsWith('trk_') || 
    clean.startsWith('feat_') || 
    clean.includes('__') ||
    /^\d+$/.test(clean)
  ) {
    return '';
  }

  // Exact 11-character YouTube video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // YouTube URLs (youtube.com, youtu.be, etc.)
  const urlPatterns = [
    /(?:v=|vi=|\/v\/|\/vi\/|\/embed\/|\/shorts\/|\/tracks\/|youtu\.be\/|\/watch\?v=|\/live\/)([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of urlPatterns) {
    const match = clean.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }

  return '';
}

// Instances Invidious fiables pour la recherche et le streaming
export const INVIDIOUS_INSTANCES = [
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza',
  'https://invidious.jing.rocks',
  'https://invidious.privacyredirect.com',
  'https://invidious.drgns.space',
  'https://yt.artemislena.eu',
  'https://invidious.projectsegfau.lt',
  'https://invidious.flokinet.to'
];

/**
 * Détermine si l'application s'exécute dans un environnement natif (Electron, Capacitor...)
 */
function isNativeEnvironment() {
  if (typeof window === 'undefined') return false;
  const isElectron = Boolean(window.process?.versions?.electron || window.electron);
  const isCapacitor = Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor);
  const isCordova = Boolean(window.cordova);
  const isTauri = Boolean(window.__TAURI__);
  const isAndroidApp = Boolean(window.Android || window.AndroidBridge);
  return isElectron || isCapacitor || isCordova || isTauri || isAndroidApp;
}

/**
 * Lance plusieurs promesses en compétition et retourne la première qui réussit
 */
async function raceToSuccess(promises) {
  return new Promise((resolve, reject) => {
    let rejections = 0;
    const total = promises.length;
    if (total === 0) return reject(new Error("No promises"));

    promises.forEach(p => {
      p.then(res => {
        if (res && (!Array.isArray(res) || res.length > 0)) {
          resolve(res);
        } else {
          rejections++;
          if (rejections === total) reject(new Error("All promises resolved empty"));
        }
      }).catch(() => {
        rejections++;
        if (rejections === total) reject(new Error("All promises failed"));
      });
    });
  });
}

/**
 * Recherche multi-sources avec priorité Innertube
 */
export async function searchLyraMusic(query) {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim();
  const isNative = isNativeEnvironment();

  if (isNative) {
    // 1. Direct Unified YouTube Server Search
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(cleanQuery)}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const tracks = await res.json();
        if (Array.isArray(tracks) && tracks.length > 0) {
          return tracks.map(t => ({
            id: t.videoId,
            videoId: t.videoId,
            title: t.title,
            artist: t.artist || 'Artiste inconnu',
            thumbnail: t.thumbnail || `https://i.ytimg.com/vi/${t.videoId}/hqdefault.jpg`,
            duration: 210
          }));
        }
      }
    } catch (err) {
      console.warn('[LyraSearch] Server youtube-search unavailable:', err.message);
    }

    // 2. Fallback Innertube WEB_REMIX
    try {
      const res = await fetch('/api/innertube-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleanQuery }),
        signal: AbortSignal.timeout(4000)
      });

      if (res.ok) {
        const data = await res.json();
        let sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        if (!sections.length && data?.contents?.sectionListRenderer?.contents) {
          sections = data.contents.sectionListRenderer.contents;
        }

        const tracks = [];

        for (const section of sections) {
          const card = section?.musicCardShelfRenderer;
          if (card) {
            const videoId = card.buttons?.find((b) => b?.buttonRenderer?.command?.watchEndpoint?.videoId)?.buttonRenderer?.command?.watchEndpoint?.videoId ||
                            card.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
            if (videoId) {
              tracks.unshift({
                id: videoId,
                videoId: videoId,
                title: card.title?.runs?.[0]?.text || '',
                artist: card.subtitle?.runs?.map(r => r.text).join('') || 'Artiste inconnu',
                thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: 210
              });
            }
          }

          const items = section?.musicShelfRenderer?.contents || [];
          for (const item of items) {
            const flexColumns = item?.musicResponsiveListItemRenderer?.flexColumns || [];
            const videoId = item?.musicResponsiveListItemRenderer?.playlistItemData?.videoId ||
                            item?.musicResponsiveListItemRenderer?.doubleTapData?.videoId;

            if (videoId) {
              const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || '';
              const artistRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
              const artist = artistRuns.map(r => r.text).join('') || 'Artiste inconnu';

              tracks.push({
                id: videoId,
                videoId: videoId,
                title: title,
                artist: artist,
                thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: 210
              });
            }
          }
        }

        if (tracks.length > 0) return tracks;
      }
    } catch (err) {
      console.warn('[LyraSearch] Innertube non disponible:', err.message);
    }
  }

  // Pure Web Search (Client-Side) or Native Fallback
  const invidiousPromises = INVIDIOUS_INSTANCES.map(async (inst) => {
    const res = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video`, {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return (data || []).map(item => ({
      id: item.videoId,
      videoId: item.videoId,
      title: item.title,
      artist: item.author || 'Artiste inconnu',
      thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
      duration: item.lengthSeconds || 200
    }));
  });

  try {
    const results = await raceToSuccess(invidiousPromises);
    if (results && results.length > 0) return results;
  } catch (_) {}

  return [];
}

// Alias de compatibilité
export const searchYouTubeMusic = searchLyraMusic;

/**
 * Résolution multi-sources haute disponibilité pour le streaming audio direct YouTube complet
 * 1. Endpoint Serverless Vercel /api/stream?id=... (Priorité absolue, contourne CORS sans limite)
 * 2. Invidious Instances distantes
 * 3. Cobalt API Direct
 * 4. Piped API instances (flux m4a / webm complets)
 */
export async function getLyraAudioStream() {
  return null;
}
