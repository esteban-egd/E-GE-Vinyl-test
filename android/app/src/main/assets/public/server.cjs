var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_cors = __toESM(require("cors"), 1);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
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
            clientVersion,
            hl: "fr",
            gl: "FR"
          }
        },
        query,
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
    } catch (err) {
      console.error("[Server] Innertube search proxy error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/youtube-search", async (req, res) => {
    try {
      const q = (req.query.q || "").trim();
      if (!q) return res.status(400).json({ error: "Missing query q" });
      const tracks = [];
      const seenIds = /* @__PURE__ */ new Set();
      try {
        const ytRes = await fetch("https://www.youtube.com/youtubei/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
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
                const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "";
                const artist = v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || "";
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
      } catch (err) {
        console.warn("[Server] YT WEB Search error:", err.message);
      }
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
            const card = section?.musicCardShelfRenderer;
            if (card) {
              const videoId = card.buttons?.find((b) => b?.buttonRenderer?.command?.watchEndpoint?.videoId)?.buttonRenderer?.command?.watchEndpoint?.videoId || card.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId || card.subtitle?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
              if (videoId && !seenIds.has(videoId)) {
                seenIds.add(videoId);
                const title = card.title?.runs?.[0]?.text || "";
                const artist = card.subtitle?.runs?.map((r) => r.text).join("") || "";
                tracks.unshift({
                  id: videoId,
                  videoId,
                  title,
                  artist,
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                });
              }
            }
            const items = section?.musicShelfRenderer?.contents || [];
            for (const item of items) {
              const r = item?.musicResponsiveListItemRenderer;
              if (!r) continue;
              const videoId = r.playlistItemData?.videoId || r.doubleTapData?.videoId || r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId || r.navigationEndpoint?.watchEndpoint?.videoId;
              if (videoId && !seenIds.has(videoId)) {
                seenIds.add(videoId);
                const title = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "";
                const artistRuns = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
                const artist = artistRuns.map((a) => a.text).join("") || "";
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
      } catch (err) {
        console.warn("[Server] YTM Search error:", err.message);
      }
      res.json(tracks);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/deezer-search", async (req, res) => {
    try {
      const q = req.query.q;
      if (!q) return res.status(400).json({ error: "Missing query q" });
      const dzRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=25`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/deezer-artist", async (req, res) => {
    try {
      const q = req.query.q;
      if (!q) return res.status(400).json({ error: "Missing query q" });
      const dzRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=10`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/deezer-artist-top", async (req, res) => {
    try {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing artist id" });
      const dzRes = await fetch(`https://api.deezer.com/artist/${encodeURIComponent(id)}/top?limit=50`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/deezer-artist-albums", async (req, res) => {
    try {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing artist id" });
      const dzRes = await fetch(`https://api.deezer.com/artist/${encodeURIComponent(id)}/albums?limit=50`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/deezer-album-tracks", async (req, res) => {
    try {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing album id" });
      const dzRes = await fetch(`https://api.deezer.com/album/${encodeURIComponent(id)}/tracks?limit=50`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/deezer-artist-info", async (req, res) => {
    try {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing artist id" });
      const dzRes = await fetch(`https://api.deezer.com/artist/${encodeURIComponent(id)}`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await dzRes.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
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
            clientVersion,
            hl: "fr",
            gl: "FR"
          }
        },
        videoId
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
    } catch (err) {
      console.error("[Server] Innertube proxy error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
