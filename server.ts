import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy Innertube WEB_REMIX API (Music extraction)
  app.post("/api/innertube-search", async (req, res) => {
    try {
      const { query, params, context } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Missing query" });
      }

      const clientVersion = "1.20231214.00.00";
      const payload = {
        context: context || {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: clientVersion,
            hl: "fr",
            gl: "FR"
          }
        },
        query: query,
        params: params || "egWKAQIIAAWoAAMB"
      };

      const response = await fetch("https://music.youtube.com/youtubei/v1/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "X-YouTube-Client-Name": "67",
          "X-YouTube-Client-Version": clientVersion,
          "Origin": "https://music.youtube.com",
          "Referer": "https://music.youtube.com/"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Innertube search returned non-200", status: response.status });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error("[Server] Innertube search proxy error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Direct Unified YouTube Search Proxy
  app.get("/api/youtube-search", async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim();
      if (!q) return res.status(400).json({ error: "Missing query q" });

      const tracks: Array<{ id: string; videoId: string; title: string; artist: string; thumbnail: string; duration?: number }> = [];
      const seenIds = new Set<string>();

      const parseDurationStr = (durText?: string): number => {
        if (!durText) return 0;
        const match = durText.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
        if (!match) return 0;
        if (match[3]) {
          return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
        }
        return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      };

      // 1. YouTube Web Search (videoRenderer)
      try {
        const ytRes = await fetch("https://www.youtube.com/youtubei/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "WEB",
                clientVersion: "2.20240101.00.00",
                hl: "fr",
                gl: "FR"
              }
            },
            query: q
          })
        });

        if (ytRes.ok) {
          const data = await ytRes.json();
          const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
          for (const section of contents) {
            const itemContents = section?.itemSectionRenderer?.contents || [];
            for (const item of itemContents) {
              const v = item?.videoRenderer;
              if (v && v.videoId && !seenIds.has(v.videoId)) {
                seenIds.add(v.videoId);
                const title = v.title?.runs?.[0]?.text || v.title?.simpleText || '';
                const artist = v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || '';
                const thumb = v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
                const lengthText = v.lengthText?.simpleText || v.lengthText?.runs?.[0]?.text || '';
                const duration = parseDurationStr(lengthText) || parseDurationStr(artist);
                tracks.push({
                  id: v.videoId,
                  videoId: v.videoId,
                  title,
                  artist,
                  thumbnail: thumb,
                  ...(duration > 0 ? { duration } : {})
                });
              }
            }
          }
        }
      } catch (err: any) {
        console.warn("[Server] YT WEB Search error:", err.message);
      }

      // 2. YouTube Music Search (WEB_REMIX)
      try {
        const ytmRes = await fetch("https://music.youtube.com/youtubei/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "X-YouTube-Client-Name": "67",
            "X-YouTube-Client-Version": "1.20240801.01.00",
            "Origin": "https://music.youtube.com",
            "Referer": "https://music.youtube.com/"
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "WEB_REMIX",
                clientVersion: "1.20240801.01.00",
                hl: "fr",
                gl: "FR"
              }
            },
            query: q
          })
        });

        if (ytmRes.ok) {
          const data = await ytmRes.json();
          let sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
          if (!sections.length && data?.contents?.sectionListRenderer?.contents) {
            sections = data.contents.sectionListRenderer.contents;
          }

          for (const section of sections) {
            // Check musicCardShelfRenderer (Top Result)
            const card = section?.musicCardShelfRenderer;
            if (card) {
              const videoId = card.buttons?.find((b: any) => b?.buttonRenderer?.command?.watchEndpoint?.videoId)?.buttonRenderer?.command?.watchEndpoint?.videoId ||
                              card.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
                              card.subtitle?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
              if (videoId && !seenIds.has(videoId)) {
                seenIds.add(videoId);
                const title = card.title?.runs?.[0]?.text || '';
                const subtitleStr = card.subtitle?.runs?.map((r: any) => r.text).join('') || '';
                const duration = parseDurationStr(subtitleStr);
                tracks.unshift({
                  id: videoId,
                  videoId,
                  title,
                  artist: subtitleStr,
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                  ...(duration > 0 ? { duration } : {})
                });
              }
            }

            // Check musicShelfRenderer
            const items = section?.musicShelfRenderer?.contents || [];
            for (const item of items) {
              const r = item?.musicResponsiveListItemRenderer;
              if (!r) continue;
              const videoId = r.playlistItemData?.videoId ||
                              r.doubleTapData?.videoId ||
                              r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
                              r.navigationEndpoint?.watchEndpoint?.videoId;

              if (videoId && !seenIds.has(videoId)) {
                seenIds.add(videoId);
                const title = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || '';
                const artistRuns = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
                const artist = artistRuns.map((a: any) => a.text).join('') || '';
                const fixedColText = r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text || '';
                const duration = parseDurationStr(fixedColText) || parseDurationStr(artist);
                tracks.push({
                  id: videoId,
                  videoId,
                  title,
                  artist,
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                  ...(duration > 0 ? { duration } : {})
                });
              }
            }
          }
        }
      } catch (err: any) {
        console.warn("[Server] YTM Search error:", err.message);
      }

      res.json(tracks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Search Proxy using 100% Public Deezer API (No Client ID / Secret required)
  app.get(["/api/deezer-search-all", "/api/spotify-search"], async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim();
      if (!q) return res.status(400).json({ error: "Missing query q" });

      const dzHeaders = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };
      const [dzRes, dzArtRes, dzAlbRes] = await Promise.all([
        fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=30&order=RANKING_DESC`, { headers: dzHeaders }).catch(() => null),
        fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=15`, { headers: dzHeaders }).catch(() => null),
        fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(q)}&limit=20`, { headers: dzHeaders }).catch(() => null)
      ]);

      const dzTracksData = dzRes && dzRes.ok ? await dzRes.json() : { data: [] };
      const dzArtistsData = dzArtRes && dzArtRes.ok ? await dzArtRes.json() : { data: [] };
      const dzAlbumsData = dzAlbRes && dzAlbRes.ok ? await dzAlbRes.json() : { data: [] };

      // De-duplicate tracks based on track.id
      const seenTrackIds = new Set();
      const uniqueTracksList = (dzTracksData.data || []).filter((d: any) => {
        if (d && d.id) {
          if (seenTrackIds.has(d.id)) return false;
          seenTrackIds.add(d.id);
          return true;
        }
        return false;
      });

      // De-duplicate artists based on artist.id
      const seenArtistIds = new Set();
      const uniqueArtistsList = (dzArtistsData.data || []).filter((a: any) => {
        if (a && a.id) {
          if (seenArtistIds.has(a.id)) return false;
          seenArtistIds.add(a.id);
          return true;
        }
        return false;
      });

      // De-duplicate albums based on album.id
      const seenAlbumIds = new Set();
      const uniqueAlbumsList = (dzAlbumsData.data || []).filter((alb: any) => {
        if (alb && alb.id) {
          if (seenAlbumIds.has(alb.id)) return false;
          seenAlbumIds.add(alb.id);
          return true;
        }
        return false;
      });

      const tracks = uniqueTracksList.map((d: any) => ({
        id: `dz_${d.id}`,
        deezerId: d.id,
        title: d.title,
        artist: d.artist?.name || 'Artiste',
        artistId: d.artist?.id,
        album: d.album?.title || '',
        thumbnail: d.album?.cover_xl || d.album?.cover_big || d.artist?.picture_xl || '',
        duration: d.duration || 0,
        popularity: Math.min(100, Math.round((d.rank || 0) / 10000)),
        source: 'deezer',
        previewUrl: d.preview
      }));

      const artists = uniqueArtistsList.map((a: any) => ({
        id: `dz_art_${a.id}`,
        deezerId: a.id,
        name: a.name,
        genre: 'Artiste',
        nbFans: a.nb_fan || 0,
        artwork: a.picture_xl || a.picture_big || a.picture_medium || null,
        isOfficial: true
      }));

      const albums = uniqueAlbumsList.map((alb: any) => ({
        id: `dz_alb_${alb.id}`,
        deezerId: alb.id,
        title: alb.title,
        artist: alb.artist?.name || '',
        artwork: alb.cover_xl || alb.cover_big || alb.cover_medium || '',
        year: alb.release_date ? alb.release_date.split('-')[0] : '',
        trackCount: alb.nb_tracks || 0
      }));

      // Fallback iTunes API only if Deezer returned 0 tracks
      if (tracks.length === 0) {
        try {
          const [itSongsRes, itArtRes, itAlbRes] = await Promise.all([
            fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=25`).catch(() => null),
            fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=musicArtist&limit=10`).catch(() => null),
            fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=15`).catch(() => null)
          ]);

          if (itSongsRes && itSongsRes.ok) {
            const itData = await itSongsRes.json();
            (itData.results || []).forEach((s: any) => {
              tracks.push({
                id: `it_${s.trackId}`,
                title: s.trackName,
                artist: s.artistName,
                album: s.collectionName || '',
                thumbnail: s.artworkUrl100 ? s.artworkUrl100.replace('100x100bb', '600x600bb') : '',
                duration: Math.round((s.trackTimeMillis || 0) / 1000),
                popularity: 80,
                source: 'itunes',
                previewUrl: s.previewUrl
              });
            });
          }

          if (itArtRes && itArtRes.ok) {
            const itData = await itArtRes.json();
            (itData.results || []).forEach((a: any) => {
              artists.push({
                id: `it_art_${a.artistId}`,
                name: a.artistName,
                genre: a.primaryGenreName || 'Artiste',
                nbFans: 100000,
                artwork: null,
                isOfficial: true
              });
            });
          }

          if (itAlbRes && itAlbRes.ok) {
            const itData = await itAlbRes.json();
            (itData.results || []).forEach((alb: any) => {
              albums.push({
                id: `it_alb_${alb.collectionId}`,
                title: alb.collectionName,
                artist: alb.artistName,
                artwork: alb.artworkUrl100 ? alb.artworkUrl100.replace('100x100bb', '600x600bb') : '',
                year: alb.releaseDate ? alb.releaseDate.split('-')[0] : '',
                trackCount: alb.trackCount || 0
              });
            });
          }
        } catch (itErr) {
          console.warn('[Server] iTunes search fallback error:', itErr);
        }
      }

      return res.json({ tracks, artists, albums, source: 'deezer' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public New Releases / Chart Albums Proxy (Deezer Official Chart)
  app.get(["/api/deezer-new-releases", "/api/spotify-new-releases", "/api/deezer-chart-albums"], async (req, res) => {
    try {
      let dzRes = await fetch('https://api.deezer.com/chart/0/albums?limit=30', {
        headers: { "User-Agent": "Mozilla/5.0" }
      }).catch(() => null);

      if (!dzRes || !dzRes.ok) {
        dzRes = await fetch('https://api.deezer.com/editorial/0/releases', {
          headers: { "User-Agent": "Mozilla/5.0" }
        }).catch(() => null);
      }

      if (dzRes && dzRes.ok) {
        const data = await dzRes.json();
        const items = (data.data || []).map((item: any) => {
          const coverUrl = item.cover_xl || item.cover_big || item.cover_medium || item.cover;
          return {
            id: `dz_rel_${item.id}`,
            deezerId: item.id,
            title: item.title,
            artist: item.artist?.name || 'Artiste',
            artistId: item.artist?.id,
            cover: coverUrl,
            cover_big: item.cover_big || coverUrl,
            cover_medium: item.cover_medium || coverUrl,
            type: item.record_type === 'single' ? 'Single' : 'Album',
            releaseDate: item.release_date || 'Aujourd\'hui',
            tracks: [
              {
                id: `dz_${item.id}`,
                title: item.title,
                artist: item.artist?.name || 'Artiste',
                album: item.title,
                thumbnail: coverUrl,
                duration: 210
              }
            ]
          };
        });
        return res.json({ data: items, source: 'deezer' });
      }

      res.status(500).json({ error: "Failed to fetch releases" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy Deezer Search (Popularity & Ranking)
  app.get("/api/deezer-search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ error: "Missing query q" });
      const dzRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=25&order=RANKING_DESC`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();

      // De-duplicate results based on track.id
      if (data && Array.isArray(data.data)) {
        const seenTracks = new Set();
        data.data = data.data.filter((item: any) => {
          if (item && item.id) {
            if (seenTracks.has(item.id)) return false;
            seenTracks.add(item.id);
            return true;
          }
          return true;
        });
      }

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy Deezer Search Album
  app.get("/api/deezer-search-album", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ error: "Missing query q" });
      const dzRes = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(q)}&limit=20`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy Deezer Artist
  app.get("/api/deezer-artist", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ error: "Missing query q" });
      const dzRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=10`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy Deezer Artist Top Tracks
  app.get("/api/deezer-artist-top", async (req, res) => {
    try {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "Missing artist id" });
      const dzRes = await fetch(`https://api.deezer.com/artist/${encodeURIComponent(id)}/top?limit=50`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy Deezer Artist Albums with Pagination (limit 100, looping index)
  app.get("/api/deezer-artist-albums", async (req, res) => {
    try {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "Missing artist id" });
      
      let allAlbums: any[] = [];
      let index = 0;
      let total = 0;
      
      do {
        const dzRes = await fetch(`https://api.deezer.com/artist/${encodeURIComponent(id)}/albums?limit=100&index=${index}`, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (!dzRes.ok) break;
        const data = await dzRes.json();
        if (data && Array.isArray(data.data)) {
          allAlbums = allAlbums.concat(data.data);
          total = data.total || allAlbums.length;
          if (data.data.length < 100 || allAlbums.length >= total || allAlbums.length >= 200) {
            break;
          }
        } else {
          break;
        }
        index += 100;
      } while (index < 300);

      res.json({ data: allAlbums, total: allAlbums.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy Deezer Album Tracks
  app.get("/api/deezer-artist-related", async (req, res) => {
    try {
      const { id } = req.query;
      const dzRes = await fetch(`https://api.deezer.com/artist/${encodeURIComponent(id as string)}/related?limit=20`, {
        headers: { "Accept": "application/json" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch Deezer related artists" });
    }
  });

  app.get("/api/deezer-album-tracks", async (req, res) => {
    try {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "Missing album id" });
      const dzRes = await fetch(`https://api.deezer.com/album/${encodeURIComponent(id)}/tracks?limit=50`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy Deezer Artist Info
  app.get("/api/deezer-artist-info", async (req, res) => {
    try {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "Missing artist id" });
      const dzRes = await fetch(`https://api.deezer.com/artist/${encodeURIComponent(id)}`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy Innertube WEB_REMIX API (E-GE Vinyl extraction)
  // Proxy Innertube WEB_REMIX API (E-GE Vinyl extraction)
  app.post("/api/innertube-player", async (req, res) => {
    try {
      const { videoId } = req.body;
      if (!videoId) {
        return res.status(400).json({ error: "Missing videoId" });
      }

      const clientVersion = "1.20240801.01.00";
      const payload = {
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: clientVersion,
            hl: "fr",
            gl: "FR"
          }
        },
        videoId: videoId
      };

      const response = await fetch("https://music.youtube.com/youtubei/v1/player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "X-YouTube-Client-Name": "67",
          "X-YouTube-Client-Version": clientVersion,
          "Origin": "https://music.youtube.com",
          "Referer": "https://music.youtube.com/"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Innertube returned non-200", status: response.status });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error("[Server] Innertube proxy error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Dedicated Audio Stream / Download Proxy (CORS-free for offline caching)
  
  // Unified Full-Track Audio Stream & Download Proxy (CORS-free for offline caching & mobile playback)
  app.get(['/api/audio-download', '/api/stream', '/api/download'], async (req, res) => {
    try {
      const id = (req.query.id as string) || (req.query.videoId as string);
      const title = (req.query.title as string) || '';
      const artist = (req.query.artist as string) || '';
      const queryParam = (req.query.query as string);
      
      let videoId = id;
      
      // If we don't have an ID but have a query (or title+artist), we search Invidious first
      if (!videoId) {
        const queryTerm = queryParam || `${title} ${artist}`.trim();
        if (!queryTerm) {
          return res.status(400).json({ error: 'Missing video id or search query' });
        }
        
        const invSearchUrls = [
          `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(queryTerm)}`,
          `https://inv.tux.pizza/api/v1/search?q=${encodeURIComponent(queryTerm)}`,
          `https://invidious.projectsegfau.lt/api/v1/search?q=${encodeURIComponent(queryTerm)}`
        ];
        
        for (const url of invSearchUrls) {
          try {
            const sRes = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (sRes.ok) {
              const data = await sRes.json();
              if (data && data.length > 0 && data[0].videoId) {
                videoId = data[0].videoId;
                break;
              }
            }
          } catch (_) {}
        }
      }
      
      if (!videoId) {
        return res.status(404).json({ error: 'Could not resolve audio source' });
      }

      let audioStreamUrl: string | null = null;
      let contentType = 'audio/webm';

      // 1. Invidious Video API for FULL Audio Stream
      const invidiousInstances = [
        'https://invidious.nerdvpn.de',
        'https://inv.tux.pizza',
        'https://invidious.jing.rocks',
        'https://yt.artemislena.eu',
        'https://invidious.projectsegfau.lt'
      ];

      for (const inst of invidiousInstances) {
        try {
          const invRes = await fetch(`${inst}/api/v1/videos/${videoId}`, {
            signal: AbortSignal.timeout(3500)
          });
          if (invRes.ok) {
            const invData = await invRes.json();
            const audioFormats = invData.adaptiveFormats?.filter((f: any) => f.url && f.mimeType?.startsWith('audio/')) || [];
            if (audioFormats.length > 0) {
              audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
              audioStreamUrl = audioFormats[0].url;
              contentType = audioFormats[0].mimeType || 'audio/webm';
              break;
            }
          }
        } catch (_) {}
      }

      // 2. Cobalt API Fallback for FULL audio
      if (!audioStreamUrl) {
        try {
          const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: `https://www.youtube.com/watch?v=${videoId}`,
              isAudioOnly: true,
              audioFormat: 'mp3'
            }),
            signal: AbortSignal.timeout(4000)
          });
          if (cobaltRes.ok) {
            const cobData = await cobaltRes.json();
            if (cobData.url) {
              audioStreamUrl = cobData.url;
              contentType = 'audio/mpeg';
            }
          }
        } catch (_) {}
      }

      if (!audioStreamUrl) {
        return res.status(404).json({ error: 'No full audio stream available' });
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range as string;
      }

      // Proxy the stream completely to avoid CORS and Mobile WebView limitations
      const audioFetch = await fetch(audioStreamUrl, { headers });

      if (!audioFetch.ok && audioFetch.status !== 206) {
        return res.status(audioFetch.status).json({ error: 'Failed to fetch audio stream source' });
      }

      res.status(audioFetch.status);

      // Copy streaming headers from upstream
      audioFetch.headers.forEach((val, key) => {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === 'content-type' ||
          lowerKey === 'content-length' ||
          lowerKey === 'accept-ranges' ||
          lowerKey === 'content-range' ||
          lowerKey === 'cache-control'
        ) {
          res.setHeader(key, val);
        }
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      if (!res.getHeader('Accept-Ranges')) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      // Stream the response body directly to avoid buffering the entire file in memory
      if (audioFetch.body) {
        const reader = audioFetch.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(Buffer.from(value));
          }
        } catch (streamErr) {
          console.error('[Server] Stream piping error:', streamErr);
          res.end();
        }
      } else {
        const arrayBuffer = await audioFetch.arrayBuffer();
        res.end(Buffer.from(arrayBuffer));
      }
    } catch (err: any) {
      console.error('[Server] Audio stream error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 5+ use *all instead of *
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
