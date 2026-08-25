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

  // Déjà un ID YouTube strict de 11 caractères
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // URLs YouTube standards (youtube.com, youtu.be, music.youtube.com, etc.)
  const urlPatterns = [
    /(?:v=|vi=|\/v\/|\/vi\/|\/embed\/|\/shorts\/|\/tracks\/|youtu\.be\/|\/watch\?v=|\/live\/)([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
    /\/([a-zA-Z0-9_-]{11})(?:\?|&|$)/
  ];

  for (const pattern of urlPatterns) {
    const match = clean.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }

  // Fallback : recherche d'une séquence de 11 caractères
  const genericMatch = clean.match(/([a-zA-Z0-9_-]{11})/);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1];
  }

  return clean;
}

// Instances Invidious fiables pour la recherche et le streaming
export const INVIDIOUS_INSTANCES = [
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza',
  'https://invidious.jing.rocks',
  'https://invidious.privacyredirect.com',
  'https://invidious.drgns.space',
  'https://yt.artemislena.eu'
];

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

  // 1. Essai prioritaire Innertube WEB_REMIX
  try {
    const res = await fetch('/api/innertube-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: cleanQuery }),
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      const sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      const tracks = [];

      for (const section of sections) {
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
    console.warn('[LyraSearch] Innertube non disponible, bascule sur Invidious:', err.message);
  }

  // 2. Recherche Invidious en fallback
  const invidiousPromises = INVIDIOUS_INSTANCES.map(async (inst) => {
    const res = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video`, {
      signal: AbortSignal.timeout(3500)
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
export async function getLyraAudioStream(videoId, title = "", artist = "") {
  if (!videoId) return null;

  // 1. Endpoint Serverless Vercel dédié (/api/stream)
  try {
    const streamRes = await fetch(`/api/stream?id=${encodeURIComponent(videoId)}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (streamRes.ok) {
      const data = await streamRes.json();
      if (data?.url) {
        return data.url.replace('http://', 'https://');
      }
    }
  } catch (e) {
    console.warn('[LyraAudio] Échec endpoint /api/stream, passage aux fallbacks distants:', e.message);
  }

  // 2. Instances Invidious distantes directes
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const invRes = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(3500)
      });
      if (invRes.ok) {
        const data = await invRes.json();
        const formats = [...(data.adaptiveFormats || []), ...(data.formatStreams || [])];
        const audioFormats = formats.filter(f => 
          (f.type && f.type.includes('audio')) || 
          (f.mimeType && f.mimeType.includes('audio'))
        );
        if (audioFormats.length > 0) {
          audioFormats.sort((a, b) => (parseInt(b.bitrate || 0, 10) - parseInt(a.bitrate || 0, 10)));
          if (audioFormats[0]?.url) {
            return audioFormats[0].url.replace('http://', 'https://');
          }
        }
      }
    } catch (_) {}
  }

  // 3. Cobalt API (Extraction directe alternative)
  try {
    const cobaltRes = await fetch("https://api.cobalt.tools/", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: "audio",
        audioFormat: "mp3",
        audioBitrate: "320"
      }),
      signal: AbortSignal.timeout(4500)
    });
    if (cobaltRes.ok) {
      const data = await cobaltRes.json();
      if (data?.url) {
        return data.url.replace('http://', 'https://');
      }
    }
  } catch (e) {
    console.warn("[LyraAudio] Cobalt resolution failed");
  }

  // 4. Instances Piped API (Flux complets M4A/WebM)
  const pipedInstances = [
    "https://pipedapi.kavin.rocks",
    "https://api.piped.privacydev.net",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.mha.fi",
    "https://piped-api.lunar.icu"
  ];

  for (const instance of pipedInstances) {
    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        const streams = data.audioStreams || [];
        streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        if (streams[0]?.url) {
          return streams[0].url.replace('http://', 'https://');
        }
      }
    } catch (e) {}
  }

  return null;
}
