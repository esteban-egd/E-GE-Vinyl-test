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

  // Direct Audio Stream Resolver & Proxy (/api/stream?id=... or /api/stream?url=...)
  app.get("/api/stream", async (req, res) => {
    try {
      const videoId = (req.query.id || req.query.videoId) as string;
      const targetUrl = req.query.url as string;

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Authorization");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

      // Mode 1 : Proxy direct
      if (targetUrl) {
        const headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Referer": "https://music.youtube.com/",
          "Origin": "https://music.youtube.com"
        };
        if (req.headers.range) {
          headers["Range"] = req.headers.range as string;
        }
        const upstreamRes = await fetch(targetUrl, { headers });
        res.status(upstreamRes.status);
        upstreamRes.headers.forEach((value, key) => {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey === "content-type" ||
            lowerKey === "content-length" ||
            lowerKey === "accept-ranges" ||
            lowerKey === "content-range"
          ) {
            res.setHeader(key, value);
          }
        });
        if (!upstreamRes.body) return res.end();
        const arrayBuffer = await upstreamRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }

      if (!videoId) {
        return res.status(400).json({ error: "Missing id or videoId parameter" });
      }

      // Mode 2 : Résolution du flux audio
      const PIPED_INSTANCES = [
        "https://pipedapi.kavin.rocks",
        "https://api.piped.privacydev.net",
        "https://pipedapi.mha.fi",
        "https://pipedapi.adminforge.de",
        "https://piped-api.lunar.icu"
      ];

      let audioStreamUrl: string | null = null;

      // 1. Cobalt
      try {
        const cobaltRes = await fetch("https://api.cobalt.tools/", {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            downloadMode: "audio",
            audioFormat: "mp3"
          }),
          signal: AbortSignal.timeout(3500)
        });
        if (cobaltRes.ok) {
          const data = await cobaltRes.json();
          if (data?.url) audioStreamUrl = data.url.replace("http://", "https://");
        }
      } catch (e) {}

      // 2. Piped
      if (!audioStreamUrl) {
        for (const inst of PIPED_INSTANCES) {
          try {
            const pipedRes = await fetch(`${inst}/streams/${videoId}`, { signal: AbortSignal.timeout(3000) });
            if (pipedRes.ok) {
              const data = await pipedRes.json();
              const streams = data.audioStreams || [];
              const best = streams.find((s: any) => s.format === "M4A" || s.mimeType?.includes("audio")) || streams[0];
              if (best?.url) {
                audioStreamUrl = best.url.replace("http://", "https://");
                break;
              }
            }
          } catch (e) {}
        }
      }

      if (audioStreamUrl) {
        if (req.query.redirect === "true") {
          return res.redirect(audioStreamUrl);
        }
        return res.json({
          success: true,
          videoId,
          url: audioStreamUrl,
          proxiedUrl: `/api/stream?url=${encodeURIComponent(audioStreamUrl)}`
        });
      }

      return res.status(404).json({ error: "Audio stream not found", videoId });
    } catch (err: any) {
      console.error("[Server] Stream error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Audio Stream Proxy with Byte Range Support (Bypass CORS for HTML5 <audio>)
  app.get("/api/stream-proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send("Missing target url parameter");
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Referer": "https://music.youtube.com/",
        "Origin": "https://music.youtube.com"
      };

      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }

      const upstreamRes = await fetch(targetUrl, { headers });

      res.status(upstreamRes.status);
      
      upstreamRes.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === "content-type" ||
          lowerKey === "content-length" ||
          lowerKey === "accept-ranges" ||
          lowerKey === "content-range"
        ) {
          res.setHeader(key, value);
        }
      });

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (!upstreamRes.body) {
        return res.end();
      }

      const reader = upstreamRes.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      // Stream to Express Response
      const responseStream = new Response(stream);
      const arrayBuffer = await responseStream.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error("[Server] Stream proxy error:", err.message);
      if (!res.headersSent) {
        res.status(500).send("Stream proxy failed");
      }
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
