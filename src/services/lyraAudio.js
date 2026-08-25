/**
 * Lyra Music Audio Stream Resolver & Search Engine
 * Extracted and adapted from official Lyra Source Code (Module 93895 & Stream Pipeline)
 */

const DECIPHER_ARG = "sig";
const N_ARG = "ncode";

// Algorithme de hachage court extrait de Lyra
function shortHash(e) {
  let t = 5381;
  for (let a = 0; a < e.length; a++) t = ((t << 5) + t + e.charCodeAt(a)) | 0;
  return (t >>> 0).toString(16);
}

// Parser de querystring extrait de Lyra
function parseQueryString(e) {
  const t = {};
  if (!e) return t;
  if (e.indexOf("?") !== -1) e = e.split("?")[1];
  if (e.indexOf("#") !== -1) e = e.split("#")[0];
  e.split("&").forEach(item => {
    const [a, i] = item.split("=");
    if (a) {
      t[decodeURIComponent(a)] = !i || decodeURIComponent(i.replace(/\+/g, " "));
    }
  });
  return t;
}

// Déchiffrement de la signature et transformation n-token de Lyra
export function decipherFormat(format, playerScriptData) {
  if (!format) return null;

  const decipherFn = playerScriptData?.decipherFn || null;
  const nTransformFn = playerScriptData?.nTransformFn || null;

  const decipher = url => {
    const args = parseQueryString(url);
    if (!args.s) return args.url || url;
    
    if (decipherFn) {
      try {
        const sig = decodeURIComponent(args.s);
        const result = eval(`var ${DECIPHER_ARG} = ${JSON.stringify(sig)}; ${decipherFn}`);
        const components = new URL(decodeURIComponent(args.url));
        components.searchParams.set(args.sp || "signature", result);
        return components.toString();
      } catch (err) {
        console.warn("Erreur decipher eval:", err);
      }
    }
    
    return args.url || url;
  };

  const ncode = url => {
    try {
      const components = new URL(decodeURIComponent(url));
      const n = components.searchParams.get("n");
      if (!n || !nTransformFn) return url;
      
      const result = eval(`var ${N_ARG} = ${JSON.stringify(n)}; ${nTransformFn}`);
      components.searchParams.set("n", result);
      return components.toString();
    } catch {
      return url;
    }
  };

  const result = { ...format };
  const cipher = !format.url;
  const rawUrl = format.url || format.signatureCipher || format.cipher;
  if (!rawUrl) return null;

  const processedUrl = cipher ? decipher(rawUrl) : rawUrl;
  result.url = ncode(processedUrl);
  delete result.signatureCipher;
  delete result.cipher;

  return result;
}

/**
 * Moteur de recherche YouTube / Lyra via Piped & Invidious en parallèle ultra-rapide (Racing)
 */
export async function searchYouTubeMusic(query) {
  if (!query || !query.trim()) return [];

  const pipedInstances = [
    "https://pipedapi.kavin.rocks",
    "https://api.piped.privacydev.net",
    "https://pipedapi.mha.fi",
    "https://pipedapi.adminforge.de"
  ];

  const invidiousInstances = [
    "https://invidious.nerdvpn.de",
    "https://inv.tux.pizza",
    "https://invidious.jing.rocks"
  ];

  // Implémentation robuste d'un Promise.any personnalisé pour renvoyer le premier succès réel
  const raceToSuccess = (promises) => {
    return new Promise((resolve, reject) => {
      let rejectedCount = 0;
      const errors = [];
      promises.forEach((p, idx) => {
        Promise.resolve(p)
          .then((res) => {
            if (res && res.length > 0) {
              resolve(res);
            } else {
              throw new Error("Empty results");
            }
          })
          .catch((err) => {
            errors[idx] = err;
            rejectedCount++;
            if (rejectedCount === promises.length) {
              reject(new Error("All parallel instances failed or returned empty"));
            }
          });
      });
    });
  };

  // 1. Essai parallèle sur toutes les instances Piped (Timeouts courts de 2s)
  const pipedPromises = pipedInstances.map((instance) => {
    return (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      try {
        const targetUrl = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
        const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        
        const res = await fetch(proxiedUrl, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          if (items.length > 0) {
            return items.map(item => ({
              videoId: item.url ? item.url.replace('/watch?v=', '') : item.id,
              title: item.title,
              artist: item.uploaderName || 'Artiste',
              thumbnail: item.thumbnail,
              duration: item.duration || 200
            }));
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
      }
      throw new Error("Instance failed");
    })();
  });

  try {
    const fastPipedResults = await raceToSuccess(pipedPromises);
    if (fastPipedResults && fastPipedResults.length > 0) {
      return fastPipedResults;
    }
  } catch (pipedErr) {
    // Si tout Piped a échoué, repli sur Invidious en parallèle
    const invidiousPromises = invidiousInstances.map((instance) => {
      return (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        try {
          const targetUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
          const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          
          const res = await fetch(proxiedUrl, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              return data.slice(0, 15).map(item => ({
                videoId: item.videoId,
                title: item.title,
                artist: item.author || 'Artiste',
                thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
                duration: item.lengthSeconds || 200
              }));
            }
          }
        } catch (err) {
          clearTimeout(timeoutId);
        }
        throw new Error("Instance failed");
      })();
    });

    try {
      const fastInvidiousResults = await raceToSuccess(invidiousPromises);
      if (fastInvidiousResults && fastInvidiousResults.length > 0) {
        return fastInvidiousResults;
      }
    } catch (invErr) {
      // Les deux méthodes parallèles ont échoué, on retourne un tableau vide
    }
  }

  return [];
}

/**
 * Résolution multi-sources haute disponibilité pour le streaming audio direct YouTube complet
 * 1. Endpoint Serverless Vercel /api/stream?id=... (Priorité absolue, contourne CORS sans limite)
 * 2. Cobalt API Direct
 * 3. Piped API instances (flux m4a / webm complets)
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
    console.warn('[LyraAudio] Échec endpoint /api/stream local, passage aux fallbacks distants:', e.message);
  }

  // 2. Cobalt API (Extraction directe alternative)
  try {
    const cobaltRes = await fetch("https://api.cobalt.tools/", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: "audio",
        audioFormat: "mp3"
      }),
      signal: AbortSignal.timeout(5000)
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

  // 3. Instances Piped API (Flux complets M4A/WebM)
  const pipedInstances = [
    "https://pipedapi.kavin.rocks",
    "https://api.piped.privacydev.net",
    "https://pipedapi.mha.fi",
    "https://pipedapi.adminforge.de",
    "https://piped-api.lunar.icu"
  ];

  for (const instance of pipedInstances) {
    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        const bestStream = (data.audioStreams || []).find(s => s.format === "M4A" || s.mimeType?.includes('audio')) || data.audioStreams?.[0];
        if (bestStream?.url) {
          return bestStream.url.replace('http://', 'https://');
        }
      }
    } catch (e) {}
  }

  return null;
}
