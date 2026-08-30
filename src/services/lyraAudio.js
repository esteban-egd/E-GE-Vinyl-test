/**
 * Service de recherche & de résolution audio Lyra
 * Intégration Innertube, Invidious, Piped et Serverless Vercel
 */


import { parseDurationToSeconds, getRealisticDuration } from '../utils/formatDuration';

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

  // 1. Direct Unified YouTube Server Search (extremely fast and works on both web & native)
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
          duration: parseDurationToSeconds(t.duration || t.lengthSeconds, `${t.title}_${t.artist}_${t.videoId}`)
        }));
      }
    }
  } catch (err) {
    console.warn('[LyraSearch] Server youtube-search unavailable:', err.message);
  }

  // 2. Fallback Innertube WEB_REMIX via Server Proxy
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
            const cardTitle = card.title?.runs?.[0]?.text || '';
            const cardArtist = card.subtitle?.runs?.map(r => r.text).join('') || 'Artiste inconnu';
            tracks.unshift({
              id: videoId,
              videoId: videoId,
              title: cardTitle,
              artist: cardArtist,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              duration: parseDurationToSeconds(card.subtitle?.runs?.[2]?.text, `${cardTitle}_${cardArtist}_${videoId}`)
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
            
            // Look for time string in flexColumns or fixedColumns
            let durStr = item?.musicResponsiveListItemRenderer?.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text;
            if (!durStr) {
              for (const col of flexColumns) {
                const textRuns = col?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
                for (const tr of textRuns) {
                  if (tr?.text && /^\d+:\d{2}(:\d{2})?$/.test(tr.text.trim())) {
                    durStr = tr.text.trim();
                    break;
                  }
                }
                if (durStr) break;
              }
            }

            tracks.push({
              id: videoId,
              videoId: videoId,
              title: title,
              artist: artist,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              duration: parseDurationToSeconds(durStr, `${title}_${artist}_${videoId}`)
            });
          }
        }
      }

      if (tracks.length > 0) return tracks;
    }
  } catch (err) {
    console.warn('[LyraSearch] Innertube non disponible:', err.message);
  }

  // 3. Fallback client-side Invidious instances if server is down
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
      duration: parseDurationToSeconds(item.lengthSeconds, `${item.title}_${item.author}_${item.videoId}`)
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
export async function getLyraAudioStream(videoId, title, artist, targetDuration = 0) {
  let resolvedYtId = extractYouTubeId(videoId);

  // Si videoId n'est pas un ID YouTube de 11 caractères, rechercher à la demande avec filtrage strict par durée (+/- 3s max)
  if (!resolvedYtId || resolvedYtId.length !== 11) {
    if (title || artist) {
      try {
        const query = `${title || ''} ${artist || ''}`.trim();
        const searchResults = await searchLyraMusic(query);
        if (searchResults && searchResults.length > 0) {
          let best = null;
          let bestDiff = 999;

          for (const cand of searchResults) {
            const candDur = typeof cand.duration === 'number' ? cand.duration : parseDurationToSeconds(cand.duration);
            const diff = targetDuration > 0 && candDur > 0 ? Math.abs(candDur - targetDuration) : 0;
            
            // Priorité absolue : candidats dans la tolérance +/- 3s max
            if (targetDuration > 0 && candDur > 0 && diff <= 3) {
              if (diff < bestDiff) {
                bestDiff = diff;
                best = cand;
              }
            }
          }

          // Fallback à +/- 6s si rien trouvé à +/- 3s
          if (!best && targetDuration > 0) {
            for (const cand of searchResults) {
              const candDur = typeof cand.duration === 'number' ? cand.duration : parseDurationToSeconds(cand.duration);
              const diff = Math.abs(candDur - targetDuration);
              if (candDur > 0 && diff <= 6) {
                if (diff < bestDiff) {
                  bestDiff = diff;
                  best = cand;
                }
              }
            }
          }

          if (!best) {
            best = searchResults[0];
          }

          const foundId = extractYouTubeId(best.videoId || best.id);
          if (foundId && foundId.length === 11) {
            resolvedYtId = foundId;
          }
        }
      } catch (err) {
        console.warn('[LyraAudio] On-demand YouTube resolution failed:', err);
      }
    }
  }

  if (!resolvedYtId) {
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      resolvedYtId = videoId;
    } else {
      return null;
    }
  }

  // 1. First, try several Invidious instances to fetch the audio stream direct URL
  const instances = [
    'https://invidious.nerdvpn.de',
    'https://inv.tux.pizza',
    'https://invidious.jing.rocks',
    'https://invidious.privacyredirect.com',
    'https://invidious.drgns.space',
    'https://yt.artemislena.eu',
    'https://invidious.projectsegfau.lt'
  ];

  for (const inst of instances) {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${resolvedYtId}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        // Look for adaptiveFormats or formatStreams that contain audio
        const audioFormat = data.adaptiveFormats?.find(f => f.mimeType?.startsWith('audio/'));
        if (audioFormat?.url) {
          return audioFormat.url;
        }
      }
    } catch (_) {}
  }

  // 2. Fallback to Cobalt API (highly reliable direct video/audio resolver)
  try {
    const res = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${resolvedYtId}`,
        isAudioOnly: true,
        audioFormat: 'mp3',
        audioQuality: '8' // 320kbps
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (_) {}

  // 3. Fallback to Piped API
  try {
    const res = await fetch(`https://pipedapi.kavin.rocks/streams/${resolvedYtId}`, {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      const audioStream = data.audioStreams?.find(s => s.mimeType?.startsWith('audio/'));
      if (audioStream?.url) return audioStream.url;
    }
  } catch (_) {}

  // 4. Default to standard public search stream format endpoint or fallback to Vercel api stream endpoint
  return `/api/stream?id=${resolvedYtId}`;
}
