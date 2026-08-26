/**
 * Module de classification, nettoyage intelligent et tri par priorité des flux audio.
 * 
 * Ordre strict de priorité :
 * - Priorité 1 (Top) : Versions "Audio" officielles (Topic / Official Audio / Auto-generated / Remaster)
 * - Priorité 2 : Clips vidéo officiels (Official Music Video / Video / Clip Officiel)
 * - Priorité 3 : Versions "Live" ou "Concert" (avec badge [LIVE] dédié)
 * - Priorité 4 (Relégué en bas) : Covers, remix non officiels, slowed/speed up, nightcore
 */

const NOISE_TAGS = [
  /\[\s*official\s*(?:music\s*)?video\s*\]/gi,
  /\(\s*official\s*(?:music\s*)?video\s*\)/gi,
  /\[\s*official\s*video\s*\]/gi,
  /\(\s*official\s*video\s*\)/gi,
  /\[\s*official\s*audio\s*\]/gi,
  /\(\s*official\s*audio\s*\)/gi,
  /\[\s*audio\s*officiel\s*\]/gi,
  /\(\s*audio\s*officiel\s*\)/gi,
  /\[\s*clip\s*officiel\s*\]/gi,
  /\(\s*clip\s*officiel\s*\)/gi,
  /\[\s*vid[ée]o\s*officielle?\s*\]/gi,
  /\(\s*vid[ée]o\s*officielle?\s*\)/gi,
  /\[\s*official\s*mv\s*\]/gi,
  /\(\s*official\s*mv\s*\)/gi,
  /\[\s*official\s*visualizer\s*\]/gi,
  /\(\s*official\s*visualizer\s*\)/gi,
  /\[\s*visualizer\s*\]/gi,
  /\(\s*visualizer\s*\)/gi,
  /\[\s*official\s*lyric\s*video\s*\]/gi,
  /\(\s*official\s*lyric\s*video\s*\)/gi,
  /\[\s*lyric\s*video\s*\]/gi,
  /\(\s*lyric\s*video\s*\)/gi,
  /\[\s*lyrics?\s*\]/gi,
  /\(\s*lyrics?\s*\)/gi,
  /\[\s*paroles\s*\]/gi,
  /\(\s*paroles\s*\)/gi,
  /\[\s*hq\s*\]/gi,
  /\(\s*hq\s*\)/gi,
  /\[\s*hd\s*\]/gi,
  /\(\s*hd\s*\)/gi,
  /\[\s*4k(?:\s*60fps)?\s*\]/gi,
  /\(\s*4k(?:\s*60fps)?\s*\)/gi,
  /\[\s*high\s*quality\s*\]/gi,
  /\(\s*high\s*quality\s*\)/gi,
  /\[\s*explicit\s*\]/gi,
  /\(\s*explicit\s*\)/gi,
  /\[\s*clean\s*version\s*\]/gi,
  /\(\s*clean\s*version\s*\)/gi,
  /\[\s*album\s*version\s*\]/gi,
  /\(\s*album\s*version\s*\)/gi,
  /\[\s*audio\s*\]/gi,
  /\(\s*audio\s*\)/gi,
  /\[\s*video\s*\]/gi,
  /\(\s*video\s*\)/gi,
  /\[\s*remastered(?:\s*\d{4})?\s*\]/gi,
  /\(\s*remastered(?:\s*\d{4})?\s*\)/gi,
  /\[\s*remaster(?:\s*\d{4})?\s*\]/gi,
  /\(\s*remaster(?:\s*\d{4})?\s*\)/gi
];

/**
 * Nettoie le titre brut et sépare l'artiste pour supprimer le bruit inutile
 * Exemple : "Daft Punk - Get Lucky (Official Audio) [HD]" -> title: "Get Lucky", artist: "Daft Punk"
 */
export function cleanTitleAndArtist(rawTitle, rawArtist) {
  if (!rawTitle) return { title: '', artist: rawArtist || 'Artiste inconnu' };
  
  let title = String(rawTitle).trim();
  let artist = String(rawArtist || '').trim();

  // 1. Si l'artiste se termine par " - Topic", le nettoyer
  if (artist.toLowerCase().endsWith(' - topic')) {
    artist = artist.slice(0, -8).trim();
  } else if (artist.toLowerCase().endsWith('-topic')) {
    artist = artist.slice(0, -6).trim();
  }

  // 2. Détection du format "Artiste - Titre" dans la chaîne de titre
  const dashSeparators = [' - ', ' – ', ' — ', ' : '];
  for (const sep of dashSeparators) {
    if (title.includes(sep)) {
      const parts = title.split(sep);
      if (parts.length >= 2) {
        const potentialArtist = parts[0].trim();
        const potentialTitle = parts.slice(1).join(sep).trim();
        
        // Si l'artiste actuel est vide, générique ou correspond à l'artiste extrait
        if (
          !artist || 
          artist === 'Artiste inconnu' || 
          artist === 'Artiste' || 
          potentialArtist.toLowerCase() === artist.toLowerCase() ||
          potentialArtist.toLowerCase().includes(artist.toLowerCase()) ||
          artist.toLowerCase().includes(potentialArtist.toLowerCase())
        ) {
          artist = potentialArtist;
          title = potentialTitle;
        }
        break;
      }
    }
  }

  // 3. Suppression des balises et bruits parasites
  for (const regex of NOISE_TAGS) {
    title = title.replace(regex, ' ');
  }

  // 4. Nettoyage des espaces multiples et ponctuation résiduelle
  title = title
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s\-_|•]+$/, '')
    .replace(/^[\s\-_|•]+/, '')
    .trim();

  return { 
    title: title || rawTitle, 
    artist: artist || 'Artiste inconnu' 
  };
}

/**
 * Analyse et catégorise un morceau audio avec son badge visuel et son rang de priorité
 */
export function classifyTrack(rawTrack) {
  if (!rawTrack) return null;
  
  const rawTitle = rawTrack.title || '';
  const rawArtist = rawTrack.artist || '';

  const { title: cleanTitle, artist: cleanArtist } = cleanTitleAndArtist(rawTitle, rawArtist);

  // 1. Détection des versions Live / Concert
  const isLive = /\b(live|en concert|in concert|live at|live in|live from|live performance|live session|session live|unplugged|en direct|live version|concert|tv show|festival|acoustic live|live acoustic|recorded live|live on|stade de france|wembley|olympia|bercy)\b/i.test(rawTitle);

  // 2. Détection des versions altérées / Covers / Remixes non officiels / Slowed / Speed up
  const isFanOrCover = /\b(cover|reprise|tribute|karaoke|slowed|reverb|nightcore|speed up|sped up|8d audio|fan made|bootleg|mashup|pitch|chipmunk|tribute to)\b/i.test(rawTitle);

  // 3. Détection Remaster
  const isRemaster = /\b(remastered|remaster|digitally remastered|\d{4} remaster)\b/i.test(rawTitle);

  // 4. Détection Audio Officiel (Topic, Audio Officiel, Auto-generated)
  const isTopic = rawArtist.toLowerCase().endsWith(' - topic') || rawArtist.toLowerCase().endsWith('-topic') || rawArtist.toLowerCase().includes('topic');
  const isOfficialAudio = isTopic || 
    /\b(official audio|audio officiel|official track|auto-generated|provided to youtube|released on)\b/i.test(rawTitle) || 
    (/\b(audio)\b/i.test(rawTitle) && !/\b(video|clip)\b/i.test(rawTitle));

  // 5. Détection Clip Vidéo Officiel
  const isOfficialVideo = /\b(official video|official music video|clip officiel|vid[ée]o officielle|music video|official mv|official video clip)\b/i.test(rawTitle);

  let category = 'STUDIO';
  let priorityRank = 1;
  let badge = null;

  if (isFanOrCover) {
    category = 'COVER_REMIX';
    priorityRank = 4;
    badge = { 
      label: 'REMIX/COVER', 
      type: 'remix', 
      bg: 'bg-white/10', 
      text: 'text-gray-400', 
      border: 'border-white/10' 
    };
  } else if (isLive) {
    category = 'LIVE';
    priorityRank = 3;
    badge = { 
      label: 'LIVE', 
      type: 'live', 
      bg: 'bg-amber-500/20', 
      text: 'text-amber-400', 
      border: 'border-amber-500/40' 
    };
  } else if (isRemaster) {
    category = 'REMASTER';
    priorityRank = 1;
    badge = { 
      label: 'REMASTER', 
      type: 'remaster', 
      bg: 'bg-purple-500/20', 
      text: 'text-purple-300', 
      border: 'border-purple-500/40' 
    };
  } else if (isOfficialAudio) {
    category = 'OFFICIAL_AUDIO';
    priorityRank = 1;
    badge = { 
      label: 'AUDIO', 
      type: 'audio', 
      bg: 'bg-emerald-500/20', 
      text: 'text-emerald-400', 
      border: 'border-emerald-500/40' 
    };
  } else if (isOfficialVideo) {
    category = 'OFFICIAL_VIDEO';
    priorityRank = 2;
    badge = { 
      label: 'CLIP', 
      type: 'clip', 
      bg: 'bg-sky-500/20', 
      text: 'text-sky-400', 
      border: 'border-sky-500/40' 
    };
  } else {
    // Piste Studio standard de haute fidélité
    category = 'STUDIO';
    priorityRank = 1;
    badge = { 
      label: 'STUDIO', 
      type: 'studio', 
      bg: 'bg-white/10', 
      text: 'text-gray-300', 
      border: 'border-white/15' 
    };
  }

  return {
    ...rawTrack,
    title: cleanTitle,
    rawTitle: rawTitle,
    artist: cleanArtist,
    rawArtist: rawArtist,
    category,
    priorityRank,
    badge,
    isLive,
    isOfficialAudio,
    isOfficialVideo,
    isFanOrCover,
    isRemaster
  };
}

/**
 * Trie et ordonne les morceaux selon l'ordre strict de priorité et la préférence utilisateur
 * @param {Array} tracks - Liste des morceaux
 * @param {string} audioMode - 'studio' (défaut) | 'live'
 */
export function sortTracksByPriority(tracks, audioMode = 'studio') {
  if (!Array.isArray(tracks) || tracks.length === 0) return [];

  const classified = tracks.map(t => (t.priorityRank !== undefined && t.badge ? t : classifyTrack(t)));

  return [...classified].sort((a, b) => {
    // 1. Mode Live : Priorité 1 aux versions Live / Concert
    if (audioMode === 'live') {
      const rankA = a.isLive ? 0 : (a.priorityRank === 4 ? 4 : (a.priorityRank || 1) + 1);
      const rankB = b.isLive ? 0 : (b.priorityRank === 4 ? 4 : (b.priorityRank || 1) + 1);
      if (rankA !== rankB) return rankA - rankB;
    } else {
      // Mode Studio (défaut) :
      // Priorité 1 : Versions Audio officielles / Studio / Remaster
      // Priorité 2 : Clips vidéo officiels
      // Priorité 3 : Versions Live / Concert
      // Priorité 4 : Covers / Remixes non officiels / Slowed / Speed up
      const rankA = a.priorityRank || 1;
      const rankB = b.priorityRank || 1;
      if (rankA !== rankB) return rankA - rankB;
    }

    // 2. Score de pertinence s'il a été calculé
    const scoreA = a.relevanceScore || a.rank || 0;
    const scoreB = b.relevanceScore || b.rank || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    // 3. Popularité
    const popA = a.popularity || 50;
    const popB = b.popularity || 50;
    return popB - popA;
  });
}
