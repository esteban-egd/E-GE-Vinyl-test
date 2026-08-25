/**
 * Vercel Serverless Function: /api/stream.js
 * Résout et proxyfie les flux audio YouTube complets en contournant CORS pour la production Vercel.
 */

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://pipedapi.mha.fi',
  'https://pipedapi.adminforge.de',
  'https://piped-api.lunar.icu'
];

const INVIDIOUS_INSTANCES = [
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza',
  'https://invidious.jing.rocks',
  'https://invidious.privacyredirect.com'
];

export default async function handler(req, res) {
  // En-têtes CORS universels
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

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

  // Mode 2 : Résolution du flux audio YouTube complet
  let audioStreamUrl = null;

  // 1. Essai Cobalt API
  try {
    const cobaltRes = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: 'audio',
        audioFormat: 'mp3'
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (cobaltRes.ok) {
      const data = await cobaltRes.json();
      if (data?.url) {
        audioStreamUrl = data.url.replace('http://', 'https://');
      }
    }
  } catch (e) {
    // Ignorer et passer aux instances suivantes
  }

  // 2. Essai Piped API (Côté serveur sans restriction CORS navigateur)
  if (!audioStreamUrl) {
    for (const inst of PIPED_INSTANCES) {
      try {
        const pipedRes = await fetch(`${inst}/streams/${videoId}`, {
          signal: AbortSignal.timeout(3500)
        });
        if (pipedRes.ok) {
          const data = await pipedRes.json();
          const streams = data.audioStreams || [];
          const best = streams.find(s => s.format === 'M4A' || s.mimeType?.includes('audio')) || streams[0];
          if (best?.url) {
            audioStreamUrl = best.url.replace('http://', 'https://');
            break;
          }
        }
      } catch (e) {}
    }
  }

  // 3. Essai Invidious API
  if (!audioStreamUrl) {
    for (const inst of INVIDIOUS_INSTANCES) {
      try {
        const invRes = await fetch(`${inst}/api/v1/videos/${videoId}`, {
          signal: AbortSignal.timeout(3500)
        });
        if (invRes.ok) {
          const data = await invRes.json();
          const formats = data.adaptiveFormats || [];
          const best = formats.find(f => f.type?.includes('audio') || f.mimeType?.includes('audio'));
          if (best?.url) {
            audioStreamUrl = best.url.replace('http://', 'https://');
            break;
          }
        }
      } catch (e) {}
    }
  }

  // 4. Si un flux a été trouvé
  if (audioStreamUrl) {
    // Si l'utilisateur demande une redirection directe pour la balise <audio>
    if (req.query.redirect === 'true') {
      return res.redirect(audioStreamUrl);
    }

    return res.status(200).json({
      success: true,
      videoId,
      url: audioStreamUrl,
      // URL proxyfiée pour éviter les éventuelles restrictions de referer
      proxiedUrl: `/api/stream?url=${encodeURIComponent(audioStreamUrl)}`
    });
  }

  return res.status(404).json({
    error: 'Audio stream not found',
    videoId
  });
}
