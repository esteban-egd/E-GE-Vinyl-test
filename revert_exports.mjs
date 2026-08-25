import fs from 'fs';

// 1. Restore extractYouTubeId to lyraAudio.js
let lyraAudio = fs.readFileSync('src/services/lyraAudio.js', 'utf8');
if (!lyraAudio.includes('extractYouTubeId')) {
    const extractFunc = `
/**
 * Extrait systématiquement l'ID YouTube valide de 11 caractères
 * (gère les URLs complètes, raccourcies youtu.be, shorts, embeds, et IDs directs).
 */
export function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const clean = urlOrId.trim();

  // Déjà un ID YouTube strict de 11 caractères
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // URLs YouTube standards (youtube.com, youtu.be, music.youtube.com, etc.)
  const urlPatterns = [
    /(?:v=|vi=|\\/v\\/|\\/vi\\/|\\/embed\\/|\\/shorts\\/|\\/tracks\\/|youtu\\.be\\/|\\/watch\\?v=|\\/live\\/)([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
    /\\/([a-zA-Z0-9_-]{11})(?:\\?|&|$)/
  ];

  for (const pattern of urlPatterns) {
    const match = clean.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }

  // Fallback : recherche d'une séquence de 11 caractères
  const genericMatch = clean.match(/([a-zA-Z0-9_-]{11})/);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1];
  }

  return clean;
}
`;
    lyraAudio = lyraAudio.replace('// Instances Invidious', extractFunc + '\n// Instances Invidious');
    fs.writeFileSync('src/services/lyraAudio.js', lyraAudio);
}

// 2. Restore extractYouTubeId in musicDataService.js
let musicDataService = fs.readFileSync('src/services/musicDataService.js', 'utf8');
if (musicDataService.includes("import { getLyraAudioStream, searchYouTubeMusic } from './lyraAudio';")) {
    musicDataService = musicDataService.replace(
        "import { getLyraAudioStream, searchYouTubeMusic } from './lyraAudio';",
        "import { getLyraAudioStream, searchYouTubeMusic, extractYouTubeId } from './lyraAudio';\nexport { extractYouTubeId };"
    );
    fs.writeFileSync('src/services/musicDataService.js', musicDataService);
}

// 3. Restore in lyraSearch.js
let lyraSearch = fs.readFileSync('src/services/lyraSearch.js', 'utf8');
if (!lyraSearch.includes('extractYouTubeId')) {
    lyraSearch = "import { extractYouTubeId } from './lyraAudio';\n" + lyraSearch;
    lyraSearch = lyraSearch.replace(
        "const videoId = track.playlistItemData?.videoId ||",
        "const rawVideoId = track.playlistItemData?.videoId ||"
    );
    lyraSearch = lyraSearch.replace(
        "track.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;\n      const title",
        "track.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;\n      const videoId = extractYouTubeId(rawVideoId);\n      const title"
    );
    lyraSearch = lyraSearch.replace(
        "return data.items.map(i => ({\n            id: i.videoId || i.url?.replace('/watch?v=', ''),\n            videoId: i.videoId || i.url?.replace('/watch?v=', ''),",
        "return data.items.map(i => {\n            const vId = extractYouTubeId(i.videoId || i.url);\n            return {\n              id: vId,\n              videoId: vId,"
    );
    lyraSearch = lyraSearch.replace(
        "duration: i.duration || 0,\n            source: 'youtube-music'\n          })).filter(t => t.videoId && t.title);",
        "duration: i.duration || 0,\n              source: 'youtube-music'\n            };\n          }).filter(t => t.videoId && t.title);"
    );
    fs.writeFileSync('src/services/lyraSearch.js', lyraSearch);
}
console.log("Exports restored.");
