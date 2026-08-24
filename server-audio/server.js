const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Liste dynamique d'instances et passerelles de flux audio
const AUDIO_ENDPOINTS = [
  // Instances Piped / Invidious avec format audio direct
  {
    type: 'piped',
    url: 'https://pipedapi.kavin.rocks/streams/'
  },
  {
    type: 'piped',
    url: 'https://piped-api.lunar.icu/streams/'
  },
  {
    type: 'invidious',
    url: 'https://inv.nadeko.net/api/v1/videos/'
  },
  {
    type: 'invidious',
    url: 'https://invidious.nerdvpn.de/api/v1/videos/'
  },
  {
    type: 'invidious',
    url: 'https://vid.puffyan.us/api/v1/videos/'
  }
];

app.get('/api/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'ID de vidéo requis' });

  console.log(`[Server] Recherche de flux pour ${videoId}...`);

  for (const endpoint of AUDIO_ENDPOINTS) {
    try {
      if (endpoint.type === 'piped') {
        const response = await fetch(`${endpoint.url}${videoId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VinylApp/1.0)' },
          signal: AbortSignal.timeout(3500)
        });

        if (response.ok) {
          const data = await response.json();
          const audio = data.audioStreams?.find(s => s.url) || data.videoStreams?.find(s => s.url);
          if (audio?.url) {
            console.log(`[Server] Flux extrait via Piped (${endpoint.url})`);
            return res.json({ url: audio.url, source: 'piped' });
          }
        }
      } else if (endpoint.type === 'invidious') {
        const response = await fetch(`${endpoint.url}${videoId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VinylApp/1.0)' },
          signal: AbortSignal.timeout(3500)
        });

        if (response.ok) {
          const data = await response.json();
          const audio = data.adaptiveFormats?.find(f => f.type?.includes('audio') || f.container === 'm4a')
                     || data.formatStreams?.find(f => f.type?.includes('audio'));
          if (audio?.url) {
            console.log(`[Server] Flux extrait via Invidious (${endpoint.url})`);
            return res.json({ url: audio.url, source: 'invidious' });
          }
        }
      }
    } catch (err) {
      console.warn(`[Server] Échec sur ${endpoint.url}:`, err.message);
    }
  }

  // Si aucun proxy externe ne répond, renvoyer un statut 503 explicite
  // pour que le client bascule instantanément sur le lecteur intégré.
  return res.status(503).json({
    error: 'Impossible de récupérer le flux audio direct via les passerelles publiques.',
    fallback: 'iframe',
    videoId
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Serveur audio opérationnel sur le port ${PORT}`));
