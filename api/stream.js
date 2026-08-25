/**
 * Vercel Serverless Function: /api/stream.js
 * Résolution et proxying haute résilience pour flux audio YouTube complets en production.
 */

// Catalogue élargi d'instances Invidious publiques & fiables
const INVIDIOUS_INSTANCES = [
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza',
  'https://invidious.jing.rocks',
  'https://invidious.privacyredirect.com',
  'https://invidious.drgns.space',
  'https://yt.artemislena.eu',
  'https://invidious.projectsegfau.lt',
  'https://invidious.flokinet.to'
];

// Catalogue élargi d'instances Piped publiques
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.mha.fi',
  'https://piped-api.lunar.icu',
  'https://pipedapi.colins.link'
];

// Instances Cobalt alternatives
const COBALT_INSTANCES = [
  'https://api.cobalt.tools/',
  'https://co.wuk.sh/api/json'
];

/**
 * Extrait le meilleur flux audio selon le bitrate (le plus élevé possible)
 */
function extractBestAudioFromInvidious(data) {
  const formats = [...(data.adaptiveFormats || []), ...(data.formatStreams || [])];
  const audioFormats = formats.filter(f => 
    (f.type && f.type.includes('audio')) || 
    (f.mimeType && f.mimeType.includes('audio')) ||
    (f.audioQuality && !f.videoOnly)
  );

  if (audioFormats.length === 0) return null;

  // Tri par bitrate descendant (priorité au débit max)
  audioFormats.sort((a, b) => {
    const bitA = parseInt(a.bitrate || a.audioSampleRate || 0, 10);
    const bitB = parseInt(b.bitrate || b.audioSampleRate || 0, 10);
    return bitB - bitA;
  });

  return audioFormats[0]?.url || null;
}

/**
 * Extrait le meilleur flux audio Piped selon le bitrate
 */
function extractBestAudioFromPiped(data) {
  const streams = data.audioStreams || [];
  if (streams.length === 0) return null;

  // Tri par bitrate descendant
  streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  return streams[0]?.url || null;
}

export default async function handler(req, res) {
  // 1. En-têtes CORS stricts et universels
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.query.id || req.query.videoId;
  const targetUrl = req.query.url;

  // Mode 1 : Proxy direct d'un flux audio avec support du streaming par blocs (Byte-Range)
  if (targetUrl) {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Referer': 'https://music.youtube.com/',
        'Origin': 'https://music.youtube.com'
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const upstreamRes = await fetch(targetUrl, { headers });
      res.status(upstreamRes.status);

      upstreamRes.headers.forEach((val, key) => {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === 'content-type' ||
          lowerKey === 'content-length' ||
          lowerKey === 'accept-ranges' ||
          lowerKey === 'content-range'
        ) {
          res.setHeader(key, val);
        }
      });

      if (!upstreamRes.body) {
        return res.end();
      }

      const arrayBuffer = await upstreamRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('[API Stream Proxy Error]', err);
      return res.status(500).json({ error: 'Stream proxy failed', message: err.message });
    }
  }

  if (!videoId) {
    return res.status(400).json({ error: 'Paramètre id ou videoId manquant' });
  }

  let bestAudioUrl = null;

  // 2. Stratégie combinée A : Invidious Instances (souvent moins bloquées que Piped sur cloud Vercel)
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const invRes = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(3200),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LyraMusic/1.0; +https://lyramusic.app)'
        }
      });
      if (invRes.ok) {
        const data = await invRes.json();
        const found = extractBestAudioFromInvidious(data);
        if (found) {
          bestAudioUrl = found.replace('http://', 'https://');
          break;
        }
      }
    } catch (_) {
      // Instance suivante
    }
  }

  // 3. Stratégie combinée B : Piped Instances avec extraction du bitrate maximum
  if (!bestAudioUrl) {
    for (const inst of PIPED_INSTANCES) {
      try {
        const pipedRes = await fetch(`${inst}/streams/${videoId}`, {
          signal: AbortSignal.timeout(3200),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LyraMusic/1.0; +https://lyramusic.app)'
          }
        });
        if (pipedRes.ok) {
          const data = await pipedRes.json();
          const found = extractBestAudioFromPiped(data);
          if (found) {
            bestAudioUrl = found.replace('http://', 'https://');
            break;
          }
        }
      } catch (_) {
        // Instance suivante
      }
    }
  }

  // 4. Stratégie combinée C : Cobalt API
  if (!bestAudioUrl) {
    for (const cob of COBALT_INSTANCES) {
      try {
        const cobaltRes = await fetch(cob, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            downloadMode: 'audio',
            audioFormat: 'mp3',
            audioBitrate: '320'
          }),
          signal: AbortSignal.timeout(4000)
        });

        if (cobaltRes.ok) {
          const data = await cobaltRes.json();
          if (data?.url) {
            bestAudioUrl = data.url.replace('http://', 'https://');
            break;
          }
        }
      } catch (_) {}
    }
  }

  // 5. Réponse JSON propre contenant le flux audio de haute qualité
  if (bestAudioUrl) {
    if (req.query.redirect === 'true') {
      return res.redirect(bestAudioUrl);
    }

    return res.status(200).json({
      url: bestAudioUrl,
      videoId,
      proxiedUrl: `/api/stream?url=${encodeURIComponent(bestAudioUrl)}`
    });
  }

  return res.status(404).json({
    error: 'Audio stream not found',
    videoId
  });
}
