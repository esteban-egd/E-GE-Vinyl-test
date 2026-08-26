import { extractYouTubeId } from './lyraAudio';
import { classifyTrack } from '../utils/trackClassifier';

export async function searchLyraTracks(query) {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim();

  try {
    const res = await fetch('/api/innertube-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: cleanQuery }),
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const data = await res.json();
      const sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      const tracks = [];
      
      for (const section of sections) {
        const items = section?.musicShelfRenderer?.contents || [];
        for (const item of items) {
          const track = item.musicResponsiveListItemRenderer;
          if (!track) continue;
          
          const rawVideoId = track.playlistItemData?.videoId || track.navigationEndpoint?.watchEndpoint?.videoId;
          const videoId = extractYouTubeId(rawVideoId);
          if (!videoId) continue;
          
          const title = track.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
          if (!title) continue;
          
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
          
          const rawTrackObj = {
            id: videoId,
            videoId,
            title,
            artist: cleanArtist || 'Artiste',
            thumbnail,
            source: 'youtube-music'
          };

          const classified = classifyTrack(rawTrackObj);
          tracks.push(classified || rawTrackObj);
        }
      }
      return tracks.filter(Boolean);
    }
  } catch (error) {
    console.error("Erreur de recherche Lyra :", error);
  }
  return [];
}
