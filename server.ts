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

      const tracks: Array<{ id: string; videoId: string; title: string; artist: string; thumbnail: string }> = [];
      const seenIds = new Set<string>();

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
                tracks.push({
                  id: v.videoId,
                  videoId: v.videoId,
                  title,
                  artist,
                  thumbnail: thumb
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
                const artist = card.subtitle?.runs?.map((r: any) => r.text).join('') || '';
                tracks.unshift({
                  id: videoId,
                  videoId,
                  title,
                  artist,
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
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
                tracks.push({
                  id: videoId,
                  videoId,
                  title,
                  artist,
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
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

  // Proxy Deezer Search (Popularity & Ranking)
  app.get("/api/deezer-search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ error: "Missing query q" });
      const dzRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=25`, {
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

  // Proxy Deezer Artist Albums
  app.get("/api/deezer-artist-albums", async (req, res) => {
    try {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "Missing artist id" });
      const dzRes = await fetch(`https://api.deezer.com/artist/${encodeURIComponent(id)}/albums?limit=50`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy Deezer Album Tracks
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

  // Proxy Innertube WEB_REMIX API (Lyra Music extraction)
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
