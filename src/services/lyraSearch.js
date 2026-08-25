import { extractYouTubeId } from './lyraAudio';

const YT_MUSIC_SEARCH_URL = "https://music.youtube.com/youtubei/v1/search";

const INNERTUBE_CONTEXT = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20231214.00.00",
    gl: "FR",
    hl: "fr"
  }
};

export async function searchLyraTracks(query) {
  if (!query || query.trim() === "") return [];

  const payload = {
    context: INNERTUBE_CONTEXT,
    query: query,
    params: "egWKAQIIAAWoAAMB" // Filtre strict YouTube Music "Chansons"
  };

  // Helper pour extraire les pistes de la réponse Innertube
  const extractTracksFromData = (data) => {
    if (!data) return [];
    const sections = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    const rawItems = [];
    for (const section of sections) {
      if (section.musicShelfRenderer?.contents) {
        rawItems.push(...section.musicShelfRenderer.contents);
      }
      if (section.itemSectionRenderer?.contents) {
        rawItems.push(...section.itemSectionRenderer.contents);
      }
      if (section.musicCardShelfRenderer?.contents) {
        rawItems.push(...section.musicCardShelfRenderer.contents);
      }
    }

    return rawItems.map(item => {
      const track = item.musicResponsiveListItemRenderer;
      if (!track) return null;
      const rawVideoId = track.playlistItemData?.videoId || 
                      track.doubleColumnItemRenderer?.navigationalEndpoint?.watchEndpoint?.videoId ||
                      track.navigationEndpoint?.watchEndpoint?.videoId ||
                      track.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
      const videoId = extractYouTubeId(rawVideoId);
      const title = track.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
      const rawArtistRuns = track.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const categoryWords = ['titre', 'chanson', 'single', 'vidéo', 'video', 'artiste', 'artist', 'song', 'track', 'ep', 'album'];
      const textParts = rawArtistRuns.map(r => r.text?.trim()).filter(Boolean);
      const validParts = textParts.filter(p => p !== '•' && !categoryWords.includes(p.toLowerCase()));

      let rawArtist = validParts.length > 0 ? validParts[0] : '';
      if (!rawArtist) {
        rawArtist = rawArtistRuns.map(r => r.text).join("").replace(/^(titre|chanson|single|vidéo|video|artiste|artist|song|track)\s*[•\-\|]\s*/i, '').replace(/^[•\s]+/, '').trim();
      }
      
      const cleanArtist = rawArtist ? rawArtist.split(/\s*•\s*/)[0].trim() : '';

      const thumbnails = track.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
      const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : "";
      if (!videoId || !title) return null;
      return { 
        id: videoId,
        videoId, 
        title, 
        artist: cleanArtist || 'Artiste', 
        thumbnail,
        source: 'youtube-music'
      };
    }).filter(Boolean);
  };

  try {
    // Essayer les instances Piped API directement (plus fiables en prod sans backend proxy)
    const PIPED_INSTANCES = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.privacydev.net',
      'https://pipedapi.mha.fi',
      'https://pipedapi.adminforge.de'
    ];
    for (const inst of PIPED_INSTANCES) {
      try {
        const targetUrl = `${inst}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
        const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        
        const res = await fetch(proxiedUrl, {
          signal: AbortSignal.timeout(3500)
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          return data.items.map(i => {
            const vId = extractYouTubeId(i.videoId || i.url);
            return {
              id: vId,
              videoId: vId,
              title: i.title,
              artist: i.uploaderName || i.uploader || '',
              thumbnail: i.thumbnail || (i.thumbnails?.[0]?.url) || '',
              duration: i.duration || 0,
              source: 'youtube-music'
            };
          }).filter(t => t.videoId && t.title);
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error("Erreur de recherche Lyra :", error);
  }

  return [];
}
