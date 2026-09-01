/**
 * Lyra Music Universal Data & Audio Engine
 * Combines Lyra's audio resolving pipeline, YouTube Music search & metadata, 
 * iTunes/Apple Music 4K Artwork and multi-source streaming.
 */

import { getLyraAudioStream, searchYouTubeMusic, extractYouTubeId } from './lyraAudio';
import db from '../lib/db';
import { classifyTrack, sortTracksByPriority, cleanTitleAndArtist } from '../utils/trackClassifier';
import { parseDurationToSeconds, getRealisticDuration } from '../utils/formatDuration';
export { extractYouTubeId, classifyTrack, sortTracksByPriority, cleanTitleAndArtist };

const memoryCache = new Map();

// Décode de manière récursive et sécurisée les chaînes qui peuvent être double ou triple url-encodées
export function safeDecodeURI(str) {
  if (!str || typeof str !== 'string') return '';
  let decoded = str;
  try {
    let prev;
    let limit = 0;
    while (decoded.includes('%') && prev !== decoded && limit < 4) {
      prev = decoded;
      decoded = decodeURIComponent(decoded);
      limit++;
    }
  } catch (e) {
    // Garder la dernière version décodée avec succès
  }
  return decoded;
}

// Vérifie si une URL d'artwork ou d'avatar est valide et n'est pas un placeholder vide / silhouette Deezer
export function isValidArtwork(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().trim();
  if (
    lower === '' ||
    lower.includes('/images/artist//') || 
    lower.includes('d41d8cd98f00b204e9800998ecf8427e') || 
    lower.includes('/artist/default') ||
    lower.includes('default_artist') ||
    lower.includes('missing_') ||
    lower.includes('placeholder') ||
    lower.includes('ui-avatars.com')
  ) {
    return false;
  }
  return true;
}

// Extraction du nom de l'artiste principal (ex: "Titre • Mark Knopfler" -> "Mark Knopfler", "Travis Scott ft. Playboi Carti" -> "Travis Scott")
export function getMainArtistName(artistName) {
  if (!artistName || typeof artistName !== 'string') return '';
  let clean = artistName.trim();

  // Supprime les préfixes de type YouTube Music ("Titre • ", "Chanson • ", "Single • ", "Vidéo • ", "Artiste • ", "Song • ")
  clean = clean.replace(/^(titre|chanson|single|vidéo|video|artiste|artist|song|track)\s*[•\-\|]\s*/i, '');

  // Supprime les suffixes de type " - Topic", "-Topic", "vevo", " official", etc.
  clean = clean.replace(/\s*[-–|•]\s*(topic|vevo|subject|music|clip|video|audio|official|channel|hq|hd)\b.*/i, '');
  clean = clean.replace(/\s+(topic|vevo|subject|official\s+channel)\b.*/i, '');

  // Si la chaîne contient des puces '•', extraire le segment qui correspond au nom d'artiste
  if (clean.includes('•')) {
    const parts = clean.split(/\s*•\s*/).map(p => p.trim()).filter(Boolean);
    const validPart = parts.find(p => !/^(titre|chanson|single|vidéo|video|artiste|artist|song|track)$/i.test(p));
    if (validPart) {
      clean = validPart;
    }
  }

  // Nettoyage des séparateurs de featurings explicites ("ft.", "feat.", "featuring", "with", "vs.")
  const match = clean.match(/^(.*?)(?:\s+(?:ft\.?|feat\.?|featuring|with|vs\.?)\s+)/i);
  if (match && match[1] && match[1].trim().length > 0) {
    clean = match[1].trim();
  }

  return clean;
}

// Normalise un nom d'artiste pour éviter les doublons ("Lynyrd Skynyrd" vs "Lynyrd Skynyrd " vs "The Lynyrd Skynyrd")
export function normalizeArtistKey(name) {
  if (!name || typeof name !== 'string') return '';
  const decoded = safeDecodeURI(name);
  const mainName = getMainArtistName(decoded);
  return mainName
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\(\[\{].*?[\)\]\}]/g, '') // Supprime les parenthèses (feat...), (Live)
    .replace(/^(the\s+|les\s+|le\s+|la\s+|l')/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Vérifie de manière flexible et stricte si un candidat correspond à un artiste (évite Queen vs Club Queen / Dancing Queen, gère les feat)
export function isArtistMatch(candidate, artistName) {
  if (!candidate || !artistName) return false;

  const targetMain = getMainArtistName(safeDecodeURI(artistName));
  const targetKey = normalizeArtistKey(targetMain);
  if (!targetKey) return false;

  const decodedCand = safeDecodeURI(candidate);
  const candParts = decodedCand
    .split(/\s+(?:ft\.?|feat\.?|featuring|with|x|&|vs\.?)\s+|,|\(/i)
    .map(p => p.replace(/[\)\}\]]/g, '').trim())
    .filter(Boolean);

  for (const part of candParts) {
    const partKey = normalizeArtistKey(part);
    if (partKey === targetKey) return true;
  }

  // Fallback si l'un contient l'autre de manière évidente
  const candKey = normalizeArtistKey(decodedCand);
  if (candKey && targetKey && (candKey.includes(targetKey) || targetKey.includes(candKey))) {
    return true;
  }

  return false;
}

// Detects live versions (to prioritize official studio tracks)
export function isLiveTrack(title) {
  if (!title || typeof title !== 'string') return false;
  return /\b(live|en concert|in concert|live at|live in|live performance|live session|unplugged|en direct|live version|concert|tv show|festival|tour|applause|bootleg|live recording|session live|sessions|bbc session|bbc sessions|live audio|live video|recorded live|captured live|stage version|show live|direct|au stade|en public|live clip|acoustic live|live acoustic)\b/i.test(title);
}

// Filtre les faux artistes, karaokés, groupes de reprises et résultats parasites
export function isJunkArtist(name) {
  if (!name || typeof name !== 'string') return true;
  const clean = name.trim().toLowerCase();
  if (clean.length < 2) return true;
  
  const junkKeywords = [
    'karaoke', 'tribute', 'done again', 'cover band', 'soundalike',
    'originally performed', 'the hits of', 'the songs of', 'in the style of',
    'backing track', 'the karaoke', 'singers of', 'made famous by',
    'guests from', 'the original performers', 'hit crew', 'party tracks',
    'various artists', 'unknown artist', 'remix factory', 'instrumental band',
    're-recorded', 'originally by', 'as made famous by', 'play-along',
    'greatest hits band', 'studio musicians', 'bb band',
    'siegfried', 'magic music', 'fortnite', 'fan made', 'fan-made', 'fanmade',
    'trailer', 'live event', 'experience', 'cover version', 'tribute project',
    'alumni', 'honkettes', 'tribute band', 'tribute to', 'in the style'
  ];

  if (clean === 'the jimi hendrix experience' || clean === 'jimi hendrix experience') {
    return false;
  }

  return junkKeywords.some(kw => clean.includes(kw));
}

// Filtre les faux albums et compilations génériques
export function isJunkAlbum(albumName) {
  if (!albumName || typeof albumName !== 'string') return false;
  const lower = albumName.toLowerCase().trim();
  return /\b(compilation|pre-cleared|girls and guitars|love rocks|various artists|100 hits|best of 90s|greatest hits 19|greatest hits 20|hit list|essential hits|tribute to|soundtrack|karaoke)\b/i.test(lower);
}

// Détecte si une piste YouTube correspond à un clip vidéo musical (par opposition à l'audio pur)
export function isClipTrack(title) {
  if (!title || typeof title !== 'string') return false;
  const clean = title.toLowerCase();
  const hasClipWord = /\b(clip|clip officiel|official video|official music video|music video|mv|m\/v|vidéo officielle|video officielle|court métrage|short film|official mv|official video clip)\b/i.test(clean);
  const hasAudioWord = /\b(audio|official audio|lyric|lyrics|paroles|karaoke|instrumental|album track|official lyric video)\b/i.test(clean);
  return hasClipWord && !hasAudioWord;
}

// Calcule le score de correspondance pour trouver la meilleure version audio studio d'un morceau
export function scoreAudioTrack(track, cleanTitle, cleanArtist) {
  if (!track || !track.title) return -99999;
  
  const norm = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const title = norm(track.title);
  const artist = norm(track.artist);
  
  const qTitle = norm(cleanTitle);
  const qArtist = norm(cleanArtist);
  
  let score = 100;

  // Détection des versions non-officielles / amateurs
  const isQueryCover = /\b(cover|reprise|tribute|karaoke|instrumental|remake)\b/i.test(qTitle);
  const isCandCover = /\b(cover|reprise|tribute|karaoke|instrumental|remake|parody|reaction|fan\s*made|guitar\s*cover|piano\s*cover|drum\s*cover|acoustic\s*cover|tutorial|lesson|tab|how\s*to\s*play)\b/i.test(title) ||
                      /\b(cover|reprise|karaoke|tribute)\b/i.test(artist);
  if (!isQueryCover && isCandCover) {
    score -= 30000; // Élimination quasi-totale des covers/karaoké non désirés
  }

  // Détection des versions modifiées (Sped up, Slowed + reverb, Nightcore, 8D)
  const isQuerySped = /\b(sped\s*up|speed\s*up|slowed|nightcore|8d|bass\s*boost)\b/i.test(qTitle);
  const isCandSped = /\b(sped\s*up|speed\s*up|speedup|slowed|slow\s*reverb|nightcore|8d\s*audio|bass\s*boosted|bass\s*boost|mashup|tiktok\s*version|edit\s*audio)\b/i.test(title);
  if (!isQuerySped && isCandSped) {
    score -= 30000;
  }

  // Détection Live / Concert
  const isQueryLive = /\b(live|concert|en\s*public|acoustic|acoustique|unplugged)\b/i.test(qTitle);
  const isCandLive = isLiveTrack(track.title) || isLiveTrack(track.artist) || /\b(live\s*at|in\s*concert|festival|tour\s*20\d\d|tour\s*19\d\d)\b/i.test(title);
  if (!isQueryLive && isCandLive) {
    score -= 25000;
  }
  
  // Pénalité pour les clips vidéo (souvent bruits de fond, dialogues ou bruitages d'intro/outro)
  if (isClipTrack(track.title)) {
    score -= 3000;
  }
  
  // ⭐️ BONUS MAJEUR : Chaîne officielle "- Topic" / "Auto-generated by YouTube" / "Provided to YouTube by"
  if (
    track.isTopic || 
    track.isTopicChannel || 
    artist.endsWith(' - topic') || 
    artist.endsWith('-topic') || 
    artist.includes('topic') ||
    artist.includes('auto-generated') ||
    artist.includes('provided to youtube')
  ) {
    score += 25000;
  }
  
  // ⭐️ BONUS MAJEUR : Chaîne officielle VEVO ou Official Artist Channel
  if (artist.includes('vevo') || artist.includes('official') || track.isOfficial) {
    score += 8000;
  }

  // ⭐️ Bonus si titre contient "Official Audio" ou "Audio Officiel" ou "Art Track"
  if (/\b(official\s+audio|audio\s+officiel|original\s+audio|art\s+track|original\s+mix|album\s+version|studio\s+version)\b/i.test(track.title)) {
    score += 15000;
  } else if (/\b(audio|lyrics|lyric|paroles)\b/i.test(track.title)) {
    score += 3000;
  }
  
  // Correspondance du titre
  if (qTitle && title.includes(qTitle)) {
    score += 5000;
    const titleCleaned = norm(track.title.replace(/\s*[\(\[\{].*?[\)\]\}]/g, ''));
    if (titleCleaned === qTitle) {
      score += 10000;
    }
  } else if (qTitle) {
    const words = qTitle.split(/\s+/).filter(w => w.length > 2);
    let wordMatches = 0;
    for (const w of words) {
      if (title.includes(w)) wordMatches++;
    }
    if (wordMatches > 0) {
      score += wordMatches * 1000;
    } else {
      score -= 15000; // Pas le bon morceau
    }
  }
  
  // Correspondance de l'artiste
  if (qArtist && isArtistMatch(track.artist, cleanArtist)) {
    score += 8000;
  } else if (qArtist && (artist.includes(qArtist) || qArtist.includes(artist))) {
    score += 4000;
  } else if (qArtist) {
    // Si l'artiste n'est pas trouvé du tout
    score -= 10000;
  }
  
  return score;
}

// Distance de Levenshtein pour la recherche tolérante aux fautes de frappe
export function levenshtein(a, b) {
  if (!a || !b) return ((a || '').length + (b || '').length);
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Score de similarité floue entre deux chaînes (titres, albums, artistes)
export function calcFuzzySimilarity(query, target) {
  if (!query || !target) return 0;
  const qNorm = query.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "");
  const tNorm = target.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "");

  if (!qNorm || !tNorm) return 0;
  if (qNorm === tNorm) return 10000;
  if (tNorm.startsWith(qNorm)) return 7000;
  if (tNorm.includes(qNorm)) return 4000;

  const qWords = qNorm.split(/\s+/).filter(Boolean);
  const tWords = tNorm.split(/\s+/).filter(Boolean);

  let wordScore = 0;
  for (const qw of qWords) {
    for (const tw of tWords) {
      if (tw === qw) {
        wordScore += 2000;
        break;
      } else if (tw.startsWith(qw)) {
        wordScore += 1200;
        break;
      } else if (qw.length >= 3 && tw.length >= 3) {
        const dist = levenshtein(qw, tw);
        if (dist <= 1) {
          wordScore += 1000;
          break;
        } else if (dist <= 2 && qw.length >= 5) {
          wordScore += 600;
          break;
        }
      }
    }
  }

  if (qNorm.length >= 4 && Math.abs(qNorm.length - tNorm.length) <= 3) {
    const fullDist = levenshtein(qNorm, tNorm);
    if (fullDist <= 2) {
      return Math.max(wordScore, 5000 - fullDist * 1000);
    }
  }

  return wordScore;
}

// Calcul du score de similarité d'un nom d'artiste par rapport à une recherche utilisateur (gère fautes de frappe ex: "emy w" -> "Amy Winehouse", "daft p" -> "Daft Punk")
export function calcArtistSimilarity(query, artistName) {
  if (!query || !artistName) return 0;
  const qNorm = query.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const aNorm = artistName.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const qKey = normalizeArtistKey(query);
  const aKey = normalizeArtistKey(artistName);

  if (!qKey || !aKey) return 0;

  if (qKey === aKey || qNorm === aNorm) return 10000;
  if (aKey.startsWith(qKey) || aNorm.startsWith(qNorm)) return 6000;
  if (aKey.includes(qKey) || aNorm.includes(qNorm)) return 3000;

  const qWords = qNorm.split(/[^a-z0-9]+/g).filter(w => w.length > 0);
  const aWords = aNorm.split(/[^a-z0-9]+/g).filter(w => w.length > 0);

  if (qWords.length > 0 && aWords.length > 0) {
    let matchedWordsCount = 0;
    for (const qW of qWords) {
      const match = aWords.find(aW => {
        if (aW.startsWith(qW)) return true;
        if (qW.length >= 3 && aW.length >= 3) {
          if (qW === aW) return true;
          if (qW.length === aW.length) {
            let diffs = 0;
            for (let i = 0; i < qW.length; i++) {
              if (qW[i] !== aW[i]) diffs++;
            }
            if (diffs <= 1) return true;
          }
        }
        return false;
      });
      if (match) matchedWordsCount++;
    }

    if (matchedWordsCount === qWords.length) {
      return 5000;
    } else if (matchedWordsCount > 0) {
      return matchedWordsCount * 1500;
    }
  }

  return 0;
}

// Extraction d'une signature d'image normalisée pour détecter les mêmes photos sous des résolutions différentes
export function getArtworkSignature(url) {
  if (!url || typeof url !== 'string') return '';
  let clean = url.toLowerCase().trim();
  clean = clean.split('?')[0];
  // Supprime les dimensions /250x250-000000-80-0-0.jpg, /1000x1000.jpg, 100x100bb.jpg, etc.
  clean = clean.replace(/\/\d+x\d+.*?\.(jpg|jpeg|png|webp)/i, '');
  clean = clean.replace(/\d+x\d+bb/i, '');
  clean = clean.replace(/\d+x\d+/i, '');
  return clean.trim();
}

// Détermine si deux fiches artistes représentent STRICTEMENT le même artiste (par ID, clé exacte ou photo identique)
export function areArtistsSame(a, b) {
  if (!a || !b) return false;

  // 1. Identifiant Spotify, Deezer ou ID interne identique
  if (a.spotifyId && b.spotifyId && String(a.spotifyId) === String(b.spotifyId)) {
    return true;
  }
  if (a.deezerId && b.deezerId && String(a.deezerId) === String(b.deezerId)) {
    return true;
  }
  if (a.id && b.id && String(a.id) === String(b.id)) {
    return true;
  }

  const nameA = getMainArtistName(a.name);
  const nameB = getMainArtistName(b.name);
  const keyA = normalizeArtistKey(nameA);
  const keyB = normalizeArtistKey(nameB);

  // 2. Clé normalisée exacte (ex: "lynyrdskynyrd" === "lynyrdskynyrd")
  if (keyA && keyB && keyA === keyB) {
    return true;
  }

  // 3. Image d'artiste identique (même signature d'URL)
  const sigA = getArtworkSignature(a.artwork);
  const sigB = getArtworkSignature(b.artwork);
  if (sigA && sigB && sigA === sigB && sigA.length > 15) {
    return true;
  }

  return false;
}

// Fusionne deux fiches artistes du MÊME artiste en conservant la version la plus complète et officielle
export function mergeArtistData(target, source) {
  if (!target || !source) return target;

  // Priorité absolue aux métadonnées officielles Spotify
  if (source.isSpotifyNative && !target.isSpotifyNative) {
    target.isSpotifyNative = true;
    target.spotifyId = source.spotifyId || target.spotifyId;
    if (source.name) target.name = source.name;
    if (isValidArtwork(source.artwork)) target.artwork = source.artwork;
  }

  if ((source.nbFans || 0) > (target.nbFans || 0)) {
    target.nbFans = source.nbFans;
  }

  if (source.deezerId && !target.deezerId) {
    target.deezerId = source.deezerId;
    if (source.id) target.id = source.id;
  }

  if (source.isOfficial || source.isVerified) {
    target.isOfficial = true;
    target.isVerified = true;
  }

  if (source.isFeatured) {
    target.isFeatured = true;
  }

  if (isValidArtwork(source.artwork) && !isValidArtwork(target.artwork)) {
    target.artwork = source.artwork;
  }

  // Nom d'artiste : privilégier le nom officiel sans jamais remplacer un nom court officiel par un nom de groupe hommage plus long
  if (!target.isSpotifyNative && source.isSpotifyNative && source.name) {
    target.name = source.name;
  } else if (!target.isOfficial && source.isOfficial && source.name) {
    target.name = source.name;
  }

  if (source.genre && source.genre !== 'Artiste' && (target.genre === 'Artiste' || !target.genre)) {
    target.genre = source.genre;
  }

  return target;
}

// Extraction et conversion de l'artwork en haute résolution fiable (hqdefault)
export function getHdArtwork(url, fallbackVideoId = null) {
  if (!url) {
    if (fallbackVideoId) {
      return `https://i.ytimg.com/vi/${fallbackVideoId}/hqdefault.jpg`;
    }
    return '';
  }

  let cleanUrl = typeof url === 'string' && url.startsWith('http://') 
    ? url.replace('http://', 'https://') 
    : url;

  if (cleanUrl.includes('mzstatic.com')) {
    return cleanUrl.replace(/\/[0-9]+x[0-9]+[a-zA-Z]*\./, '/1000x1000bb.');
  }

  if (cleanUrl.includes('i.ytimg.com') || cleanUrl.includes('ytimg.com')) {
    return cleanUrl
      .replace('/maxresdefault.jpg', '/hqdefault.jpg')
      .replace('/sddefault.jpg', '/hqdefault.jpg')
      .replace('/mqdefault.jpg', '/hqdefault.jpg')
      .replace('/default.jpg', '/hqdefault.jpg');
  }

  return cleanUrl;
}

// Fallback preview Deezer HQ
export async function getDeezerPreview(title, artist) {
  try {
    const query = `${artist || ''} ${title || ''}`.trim();
    if (!query) return null;
    const res = await fetch(`/api/deezer-search?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0 && data.data[0].preview) {
        return data.data[0].preview;
      }
    }
  } catch (err) {
    console.warn('[MusicDataService] Erreur Deezer preview:', err);
  }
  return null;
}

export function normalizeTrackTitleKey(title) {
  if (!title) return '';
  let clean = title.toLowerCase();
  
  // Enlever le contenu des parenthèses, crochets et accolades
  clean = clean.replace(/[\(\[\{].*?[\)\]\s*\}]/g, '');
  
  // Supprimer les suffixes fréquents séparés par -, |, •, :
  clean = clean.replace(/\s*[-–|•:]\s*(remastered|remaster|radio\s+edit|single\s+version|album\s+version|live|concert|studio|original\s+mix|original\s+version|hq|hd|audio|video|clip|lyrics?|lyrics?\s+video|official|extended\s+mix|club\s+mix|karaoke|acoustic|instrumental|deluxe|version|mono|stereo|soundtrack|ost)\b.*/i, '');
  
  // Supprimer les années résiduelles après remaster ou version (ex: "2012 remaster")
  clean = clean.replace(/\s*\b\d{4}\s*(remastered|remaster|mix|edit|version|rec)\b.*/i, '');
  clean = clean.replace(/\s*(remastered|remaster|radio\s+edit|single\s+version|original\s+mix|original\s+version)\b.*/i, '');
  
  // Enlever la ponctuation et les espaces superflus
  return clean
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizeAlbumTitleKey(title) {
  if (!title) return '';
  let clean = title.toLowerCase();
  clean = clean.replace(/[\(\[\{].*?[\)\]\s*\}]/g, '');
  clean = clean.replace(/\s*[-–|•:]\s*(remastered|remaster|deluxe|special|expanded|anniversary|super\s+deluxe|collector|edition|original|soundtrack|ost)\b.*/i, '');
  clean = clean.replace(/\s*(deluxe|special|expanded|edition|remastered)\b.*/i, '');
  return clean
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function createCombinedSignal(customSignal, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  if (customSignal) {
    if (customSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      const abortHandler = () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
      customSignal.addEventListener('abort', abortHandler);
      controller.signal.addEventListener('abort', () => {
        customSignal.removeEventListener('abort', abortHandler);
      });
    }
  }
  
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

/**
 * Recherche globale unifiée (Lyra & Spotify style ranking)
 * Classement par popularité, pertinence et hits les plus écoutés
 */
export async function searchUnified(query, audioMode = 'studio', signal = null) {
  if (!query || !query.trim()) return { tracks: [], artists: [], albums: [] };
  const cleanQuery = query.trim().toLowerCase();
  const cacheKey = `unified_search_v5_${cleanQuery}_${audioMode}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const deezerAllComb = createCombinedSignal(signal, 5000);
  const itunesSongsComb = createCombinedSignal(signal, 5000);
  const itunesArtistsComb = createCombinedSignal(signal, 5000);
  const itunesAlbumsComb = createCombinedSignal(signal, 5000);

  try {
    // 1. Requête principale : API Deezer Unified (/api/deezer-search-all) pour 100% des métadonnées
    const deezerAllPromise = fetch(`/api/deezer-search-all?q=${encodeURIComponent(query)}`, {
      signal: deezerAllComb.signal
    }).then(async res => {
      deezerAllComb.clear();
      if (!res.ok) {
        console.warn(`[MusicDataService] Deezer unified proxy error status: ${res.status}`);
        return { tracks: [], artists: [], albums: [] };
      }
      return res.json();
    }).catch(err => {
      deezerAllComb.clear();
      console.warn('[MusicDataService] Deezer unified search failed:', err?.message || err);
      return { tracks: [], artists: [], albums: [] };
    });

    const itunesSongsPromise = fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`,
      { signal: itunesSongsComb.signal }
    ).then(res => {
      itunesSongsComb.clear();
      return res.json();
    }).catch(err => {
      itunesSongsComb.clear();
      console.warn('[MusicDataService] iTunes songs fetch error:', err?.message || err);
      return { results: [] };
    });

    const itunesArtistsPromise = fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=10`,
      { signal: itunesArtistsComb.signal }
    ).then(res => {
      itunesArtistsComb.clear();
      return res.json();
    }).catch(err => {
      itunesArtistsComb.clear();
      console.warn('[MusicDataService] iTunes artists fetch error:', err?.message || err);
      return { results: [] };
    });

    const itunesAlbumsPromise = fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=15`,
      { signal: itunesAlbumsComb.signal }
    ).then(res => {
      itunesAlbumsComb.clear();
      return res.json();
    }).catch(err => {
      itunesAlbumsComb.clear();
      console.warn('[MusicDataService] iTunes albums fetch error:', err?.message || err);
      return { results: [] };
    });

    const lyraPromise = Promise.race([
      searchYouTubeMusic(query),
      new Promise(resolve => setTimeout(() => resolve([]), 2000))
    ]).catch(() => []);

    const [deezerAllData, songsData, albumsData, artistsData, lyraResults] = await Promise.all([
      deezerAllPromise,
      itunesSongsPromise,
      itunesAlbumsPromise,
      itunesArtistsPromise,
      lyraPromise
    ]);

    // Backwards-compatible objects mapped directly from Deezer unified search to maintain exact merging logic
    const spData = deezerAllData;
    const deezerData = { data: (deezerAllData?.tracks || []).map(t => ({ id: t.deezerId, title: t.title, artist: { name: t.artist }, album: { title: t.album, cover_xl: t.thumbnail }, duration: t.duration, rank: (t.popularity || 0) * 10000, preview: t.previewUrl })) };
    const dzArtistsData = { data: (deezerAllData?.artists || []).map(a => ({ id: a.deezerId, name: a.name, picture_xl: a.artwork, nb_fan: a.nbFans })) };
    const deezerAlbumData = { data: (deezerAllData?.albums || []).map(alb => ({ id: alb.deezerId, title: alb.title, artist: { name: alb.artist }, cover_xl: alb.artwork, release_date: alb.year, nb_tracks: alb.trackCount })) };

    const rawTracks = [];
    const seenMap = new Map();

    // 0. Injecter les morceaux NATIFS Deezer (depuis l'API Unifiée)
    if (spData && Array.isArray(spData.tracks) && spData.tracks.length > 0) {
      for (const t of spData.tracks) {
        if (!t.title) continue;
        const normTitle = t.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
        const normArtist = (t.artist || '').toLowerCase().trim();
        const key = `${normTitle}__${normArtist}`;

        if (!seenMap.has(key)) {
          const trackObj = {
            id: t.id,
            title: t.title,
            artist: t.artist || 'Artiste inconnu',
            album: t.album || '',
            thumbnail: t.thumbnail,
            duration: t.duration || 210,
            source: 'deezer',
            rank: 980000 + (t.popularity || 0) * 100,
            popularity: t.popularity || 85,
            isSpotifyNative: false,
            isDeezerNative: true
          };
          seenMap.set(key, trackObj);
          rawTracks.push(trackObj);
        }
      }
    }

    // 0b. Recherche catalogue local pré-chargé
    const localCatalog = [
      ...(Array.isArray(TRENDING_TRACKS) ? TRENDING_TRACKS : [])
    ];

    for (const item of localCatalog) {
      if (!item || !item.title) continue;
      const titleSim = calcFuzzySimilarity(cleanQuery, item.title);
      const artistSim = calcFuzzySimilarity(cleanQuery, item.artist || '');
      const albumSim = calcFuzzySimilarity(cleanQuery, item.album || '');

      if (titleSim > 1500 || artistSim > 1500 || albumSim > 1500) {
        const normTitle = (item.title || '').toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
        const normArtist = (item.artist || '').toLowerCase().trim();
        const key = `${normTitle}__${normArtist}`;

        if (!seenMap.has(key)) {
          const trackObj = {
            id: item.videoId || item.id || key,
            title: item.title,
            artist: item.artist || 'Artiste inconnu',
            album: item.album || '',
            thumbnail: item.thumbnail || '',
            duration: parseDurationToSeconds(item.duration, `${item.title}_${item.artist}_${item.id}`),
            source: 'curated',
            rank: 900000,
            popularity: 98,
            isCurated: true
          };
          seenMap.set(key, trackObj);
          rawTracks.push(trackObj);
        }
      }
    }

    // 0. Si un artiste officiel correspond (ex: "Téléphone", "Daft Punk", etc.), chercher ses top tracks officielles
    const matchedArtist = dzArtistsData?.data?.find(a => 
      a.name.toLowerCase() === cleanQuery || 
      a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === cleanQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    ) || dzArtistsData?.data?.[0];

    if (matchedArtist && matchedArtist.id) {
      try {
        const topRes = await fetch(`/api/deezer-artist-top?id=${matchedArtist.id}`, { signal: AbortSignal.timeout(2500) });
        if (topRes.ok) {
          const topData = await topRes.json();
          if (topData && Array.isArray(topData.data)) {
            for (const d of topData.data) {
              const normTitle = d.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
              const normArtist = (d.artist?.name || matchedArtist.name).toLowerCase().trim();
              const key = `${normTitle}__${normArtist}`;
              if (!seenMap.has(key)) {
                const trackObj = {
                  id: d.id ? `dz_${d.id}` : key,
                  videoId: d.id ? `dz_${d.id}` : key,
                  title: d.title,
                  artist: d.artist?.name || matchedArtist.name,
                  album: d.album?.title || '',
                  thumbnail: d.album?.cover_xl || d.album?.cover_big || matchedArtist.picture_xl || '',
                  duration: parseDurationToSeconds(d.duration, `${d.title}_${matchedArtist.name}_${d.id}`),
                  source: 'deezer',
                  previewUrl: d.preview,
                  rank: (d.rank || 500000) + 300000,
                  popularity: 95,
                  isDirectArtistTrack: true
                };
                seenMap.set(key, trackObj);
                rawTracks.push(trackObj);
              }
            }
          }
        }
      } catch (_) {}
    }

    // 1. Enrichissement via Deezer (contient les ranks de popularité officiels)
    if (deezerData && Array.isArray(deezerData.data)) {
      for (const d of deezerData.data) {
        if (!d.title) continue;
        const normTitle = d.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
        const normArtist = (d.artist?.name || '').toLowerCase().trim();
        const key = `${normTitle}__${normArtist}`;

        if (!seenMap.has(key)) {
          const trackObj = {
            id: d.id ? `dz_${d.id}` : key,
            videoId: d.id ? `dz_${d.id}` : key,
            title: d.title,
            artist: d.artist?.name || 'Artiste inconnu',
            album: d.album?.title || '',
            thumbnail: d.album?.cover_xl || d.album?.cover_big || d.album?.cover_medium || (d.artist?.picture_xl || ''),
            duration: parseDurationToSeconds(d.duration, `${d.title}_${d.artist?.name}_${d.id}`),
            source: 'deezer',
            previewUrl: d.preview,
            rank: d.rank || 500000,
            popularity: d.rank ? Math.min(100, Math.round(d.rank / 10000)) : 70
          };
          seenMap.set(key, trackObj);
          rawTracks.push(trackObj);
        }
      }
    }

    // 2. Enrichissement via iTunes (métadonnées officielles & pochettes HD)
    if (songsData.results && Array.isArray(songsData.results)) {
      for (const s of songsData.results) {
        if (!s.trackName) continue;
        const normTitle = s.trackName.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
        const normArtist = (s.artistName || '').toLowerCase().trim();
        const key = `${normTitle}__${normArtist}`;

        if (!seenMap.has(key)) {
          const trackObj = {
            id: s.trackId ? s.trackId.toString() : key,
            videoId: s.trackId ? s.trackId.toString() : key,
            title: s.trackName,
            artist: s.artistName,
            album: s.collectionName,
            thumbnail: getHdArtwork(s.artworkUrl100),
            duration: parseDurationToSeconds(s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : null, `${s.trackName}_${s.artistName}_${s.trackId}`),
            source: 'itunes',
            previewUrl: s.previewUrl,
            rank: 600000,
            popularity: 80
          };
          seenMap.set(key, trackObj);
          rawTracks.push(trackObj);
        } else {
          const existing = seenMap.get(key);
          if (s.artworkUrl100 && !existing.thumbnail?.includes('mzstatic')) {
            existing.thumbnail = getHdArtwork(s.artworkUrl100);
          }
          if (s.previewUrl && !existing.previewUrl) {
            existing.previewUrl = s.previewUrl;
          }
        }
      }
    }

    // 3. Fusion des résultats YouTube / Lyra (pour avoir les flux audio complets)
    if (lyraResults && Array.isArray(lyraResults)) {
      for (const item of lyraResults) {
        if (!item.title) continue;
        const normTitle = item.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
        const normArtist = (item.artist || '').toLowerCase().trim();
        const key = `${normTitle}__${normArtist}`;

        if (!seenMap.has(key)) {
          const trackObj = {
            id: item.videoId || key,
            videoId: item.videoId || key,
            title: item.title,
            artist: item.artist || 'Artiste inconnu',
            album: item.album || '',
            thumbnail: getHdArtwork(item.thumbnail, item.videoId),
            duration: parseDurationToSeconds(item.duration, `${item.title}_${item.artist}_${item.videoId}`),
            source: 'youtube',
            rank: 400000,
            popularity: 60
          };
          seenMap.set(key, trackObj);
          rawTracks.push(trackObj);
        } else {
          const existing = seenMap.get(key);
          if (item.videoId) {
            existing.videoId = item.videoId;
            existing.ytVideoId = item.videoId;
          }
        }
      }
    }

    // 4. Algorithme de Scoring intelligent & Classification par ordre strict de priorité
    const cleanQueryNorm = cleanQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const userExplicitlyRequestedLive = /\b(live|concert|en direct|unplugged)\b/i.test(cleanQuery);
    const isLiveModeActive = audioMode === 'live' || userExplicitlyRequestedLive;

    const scoredTracks = rawTracks.map(rawT => {
      const t = classifyTrack(rawT) || rawT;
      let score = (t.rank || 100000) / 10000;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerTitleNorm = lowerTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const lowerArtist = (t.artist || '').toLowerCase();
      const lowerArtistNorm = lowerArtist.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const lowerAlbum = (t.album || '').toLowerCase();
      const lowerAlbumNorm = lowerAlbum.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Bonus si morceau direct de l'artiste recherché
      if (t.isDirectArtistTrack) {
        score += 250;
      }
      if (t.isCurated) {
        score += 150;
      }

      // Fuzzy matching multi-champs
      const titleFuzzy = calcFuzzySimilarity(cleanQuery, lowerTitle);
      const artistFuzzy = calcFuzzySimilarity(cleanQuery, lowerArtist);
      const albumFuzzy = calcFuzzySimilarity(cleanQuery, lowerAlbum);

      score += (titleFuzzy / 50);
      score += (artistFuzzy / 40);
      score += (albumFuzzy / 80);

      // Correspondances directes
      if (lowerArtistNorm === cleanQueryNorm) score += 200;
      else if (lowerArtistNorm.startsWith(cleanQueryNorm)) score += 100;
      else if (lowerArtistNorm.includes(cleanQueryNorm)) score += 40;

      if (lowerTitleNorm === cleanQueryNorm) score += 150;
      else if (lowerTitleNorm.startsWith(cleanQueryNorm)) score += 80;
      else if (lowerTitleNorm.includes(cleanQueryNorm)) score += 30;

      if (lowerAlbumNorm === cleanQueryNorm) score += 100;
      else if (lowerAlbumNorm.includes(cleanQueryNorm)) score += 25;

      // =========================================================================
      // SCORING STRICT SELON L'ORDRE DE PRIORITÉ :
      // Priorité 1 : Versions "Audio" officielles (Topic / Official Audio / Auto-generated / Remaster)
      // Priorité 2 : Clips vidéo officiels (Official Video / Clip Officiel)
      // Priorité 3 : Versions "Live" ou "Concert"
      // Priorité 4 : Covers, remix non officiels, versions ralenties/speed up (nightcore)
      // =========================================================================
      if (isLiveModeActive) {
        if (t.isLive) {
          score += 1500; // Priorité 1 absolue en mode Live
        } else if (t.isOfficialAudio || t.isRemaster || t.category === 'STUDIO') {
          score += 300;
        } else if (t.isOfficialVideo) {
          score += 150;
        }
      } else {
        // Mode Studio (défaut) :
        if (t.isOfficialAudio || t.isRemaster || (t.category === 'STUDIO' && !t.isLive && !t.isFanOrCover)) {
          score += 600; // Priorité 1 : Versions audio studio officielles
        } else if (t.isOfficialVideo) {
          score += 300; // Priorité 2 : Clips vidéo officiels
        } else if (t.isLive) {
          score -= 600; // Priorité 3 : Live relégué sous les versions studio
        }
      }

      // Priorité 4 : Fort rejet des reprises non officielles, karaoke, nightcore, etc.
      if (t.isFanOrCover) {
        score -= 1500;
      }

      return { ...t, relevanceScore: score };
    });

    // Tri décroissant selon la priorité et le score
    const sortedTracks = sortTracksByPriority(scoredTracks, isLiveModeActive ? 'live' : 'studio');

    // Déduplication stricte des morceaux
    const uniqueScoredTracks = [];
    const seenTrackKeys = new Set();
    for (const track of sortedTracks) {
      const trackKey = `${normalizeTrackTitleKey(track.title)}___${normalizeArtistKey(getMainArtistName(track.artist))}`;
      if (trackKey && !seenTrackKeys.has(trackKey)) {
        seenTrackKeys.add(trackKey);
        uniqueScoredTracks.push(track);
      }
    }

    // 5. Extraction et enrichissement des Artistes (moteur de pertinence et dominance)
    const rawArtists = [];
    const seenArtistKeys = new Set();

    const findBestArtistArtwork = (artName, defaultPic = null) => {
      if (isValidArtwork(defaultPic)) return defaultPic;

      const featured = FEATURED_ARTISTS.find(f => normalizeArtistKey(getMainArtistName(f.name)) === normalizeArtistKey(getMainArtistName(artName)));
      if (featured && isValidArtwork(featured.avatar)) return featured.avatar;

      // EXPLICITEMENT AUCUN FALLBACK SUR LES COVERS D'ALBUM OU DE TRACK
      return null;
    };

    // a) Artistes Spotify Natifs
    if (spData && Array.isArray(spData.artists) && spData.artists.length > 0) {
      for (const a of spData.artists) {
        if (!a || !a.name || isJunkArtist(a.name)) continue;
        const mainName = getMainArtistName(a.name);
        const key = normalizeArtistKey(mainName);
        if (key && !seenArtistKeys.has(key)) {
          seenArtistKeys.add(key);
          rawArtists.push({
            id: a.id || `sp_art_${key}`,
            spotifyId: a.spotifyId,
            name: mainName,
            genre: a.genre || 'Artiste',
            nbFans: a.nbFans || 0,
            artwork: a.artwork,
            popularity: a.popularity || 0,
            isOfficial: true,
            isSpotifyNative: true
          });
        }
      }
    }

    // b) Artistes de la sélection Featured
    for (const f of FEATURED_ARTISTS) {
      const sim = calcArtistSimilarity(cleanQuery, f.name);
      if (sim > 0) {
        const mainName = getMainArtistName(f.name);
        const key = normalizeArtistKey(mainName);
        if (key && !seenArtistKeys.has(key)) {
          seenArtistKeys.add(key);
          rawArtists.push({
            id: `feat_art_${key}`,
            name: mainName,
            genre: f.genre || 'Artiste Culte',
            nbFans: 5000000,
            artwork: f.avatar,
            isOfficial: true,
            isFeatured: true
          });
        }
      }
    }

    // b) Artistes officiels Deezer
    if (dzArtistsData && Array.isArray(dzArtistsData.data)) {
      for (const a of dzArtistsData.data) {
        if (!a || !a.name || isJunkArtist(a.name)) continue;
        const mainName = getMainArtistName(a.name);
        const key = normalizeArtistKey(mainName);
        if (key && !seenArtistKeys.has(key)) {
          seenArtistKeys.add(key);
          const artwork = findBestArtistArtwork(mainName, a.picture_xl || a.picture_big || a.picture_medium);
          rawArtists.push({
            id: a.id ? `dz_art_${a.id}` : mainName,
            deezerId: a.id,
            name: mainName,
            genre: 'Artiste',
            nbFans: a.nb_fan || 0,
            artwork: artwork,
            isOfficial: true
          });
        }
      }
    }

    // c) Artistes issus de la recherche iTunes
    if (artistsData && Array.isArray(artistsData.results)) {
      for (const a of artistsData.results) {
        if (!a || !a.artistName || isJunkArtist(a.artistName)) continue;
        const mainName = getMainArtistName(a.artistName);
        const key = normalizeArtistKey(mainName);
        if (key && !seenArtistKeys.has(key)) {
          seenArtistKeys.add(key);
          const artwork = findBestArtistArtwork(mainName);
          rawArtists.push({
            id: a.artistId ? `it_art_${a.artistId}` : mainName,
            name: mainName,
            genre: a.primaryGenreName || 'Artiste',
            nbFans: 100000,
            artwork: artwork,
            isOfficial: true
          });
        }
      }
    }

    // d) Artistes extraits des morceaux populaires
    for (const t of uniqueScoredTracks) {
      if (!t.artist || isJunkArtist(t.artist)) continue;
      const mainName = getMainArtistName(t.artist);
      const key = normalizeArtistKey(mainName);
      if (key && !seenArtistKeys.has(key)) {
        seenArtistKeys.add(key);
        const artwork = findBestArtistArtwork(mainName, null);
        rawArtists.push({
          id: `trk_art_${key}`,
          name: mainName,
          genre: 'Artiste',
          nbFans: 0,
          artwork: artwork,
          isOfficial: false
        });
      }
    }

    // e) Nettoyage, Dédoublonnage et Scoring (Filtre Strict)
    const uniqueArtistsMap = new Map();
    for (const a of rawArtists) {
      const cleanName = getMainArtistName(a.name);
      if (!cleanName || isJunkArtist(cleanName)) continue;
      a.name = cleanName;

      const mainNameKey = normalizeArtistKey(cleanName);
      if (!mainNameKey) continue;
      
      const isExactMatch = mainNameKey === normalizeArtistKey(cleanQuery);
      const isIncluded = mainNameKey.includes(normalizeArtistKey(cleanQuery)) || normalizeArtistKey(cleanQuery).includes(mainNameKey);
      
      if (!isIncluded && !isExactMatch) continue;

      let isDup = false;
      for (const [existingKey, existing] of uniqueArtistsMap) {
        if (areArtistsSame(a, existing)) {
          isDup = true;
          mergeArtistData(existing, a);
          break;
        }
      }
      
      if (!isDup) {
        uniqueArtistsMap.set(mainNameKey, a);
      }
    }
    
    let rawFilteredArtists = Array.from(uniqueArtistsMap.values());

    // Trier les candidats par ordre de complétude et officialité avant dédoublonnage profond
    const sortedCandidates = [...rawFilteredArtists].sort((a, b) => {
      const isOffA = a.isOfficial || a.isFeatured || !!a.deezerId;
      const isOffB = b.isOfficial || b.isFeatured || !!b.deezerId;
      if (isOffA !== isOffB) return isOffA ? -1 : 1;
      
      const hasArtA = isValidArtwork(a.artwork);
      const hasArtB = isValidArtwork(b.artwork);
      if (hasArtA !== hasArtB) return hasArtA ? -1 : 1;
      
      const fansA = a.nbFans || 0;
      const fansB = b.nbFans || 0;
      if (fansA !== fansB) return fansB - fansA;
      
      return (b.name || '').length - (a.name || '').length;
    });

    const deepDeduplicated = [];
    for (const item of sortedCandidates) {
      if (!item || !item.name) continue;

      let isDup = false;
      for (const accepted of deepDeduplicated) {
        if (areArtistsSame(item, accepted)) {
          isDup = true;
          mergeArtistData(accepted, item);
          break;
        }
      }
      
      if (!isDup) {
        deepDeduplicated.push(item);
      }
    }

    let filteredArtists = deepDeduplicated;

    for (const a of filteredArtists) {
      const qClean = cleanQuery.toLowerCase().trim();
      const qNorm = qClean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const aClean = a.name.toLowerCase().trim();
      const aNorm = aClean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const aKey = normalizeArtistKey(a.name);
      const qKey = normalizeArtistKey(cleanQuery);

      const isExactMatch = aKey === qKey || aClean === qClean || aNorm === qNorm;
      const isPrefixMatch = aKey.startsWith(qKey) || aClean.startsWith(qClean) || aNorm.startsWith(qNorm);
      
      const words = aClean.split(/[^a-z0-9]+/g).filter(Boolean);
      const isWordMatch = words.some(word => word === qClean || word.startsWith(qClean));

      let matchScore = 0;
      if (isExactMatch) {
        matchScore = 2000000;
        a.isExact = true;
      } else if (isPrefixMatch) {
        matchScore = 1000000;
        a.isExact = false;
      } else if (isWordMatch) {
        matchScore = 500000;
        a.isExact = false;
      } else {
        matchScore = 100000;
        a.isExact = false;
      }

      // Add popularity (fans/listeners) directly so that a mega-famous artist (like Stromae) correctly ranks above a tiny obscure direct match (like Ström)
      const fans = a.nbFans || a.listeners || 0;
      let score = matchScore + fans;

      if (a.isOfficial || a.isFeatured) {
        score += 200000;
      }

      a.dominanceScore = score;
    }

    filteredArtists.sort((a, b) => b.dominanceScore - a.dominanceScore);
    const artists = filteredArtists.slice(0, 10);

    // 6. Albums formatés, dédoublonnés et classés avec scoring flou
    const uniqueAlbumsMap = new Map();

    const addAlbumToMap = (albumObj) => {
      const albumKey = `${normalizeAlbumTitleKey(albumObj.title)}___${normalizeArtistKey(getMainArtistName(albumObj.artist))}`;
      if (!albumKey) return;
      const existing = uniqueAlbumsMap.get(albumKey);
      if (!existing) {
        uniqueAlbumsMap.set(albumKey, albumObj);
      } else {
        // Regrouper et fusionner les doublons d'albums ayant les mêmes pochette, titre et artiste
        if ((albumObj.trackCount || 0) > (existing.trackCount || 0)) existing.trackCount = albumObj.trackCount;
        if (albumObj.year && !existing.year) existing.year = albumObj.year;
        if (albumObj.score > existing.score) existing.score = albumObj.score;
        if (isValidArtwork(albumObj.artwork) && !isValidArtwork(existing.artwork)) {
          existing.artwork = albumObj.artwork;
        }
      }
    };

    // a) Albums Spotify Natifs
    if (spData && Array.isArray(spData.albums) && spData.albums.length > 0) {
      for (const alb of spData.albums) {
        if (!alb || !alb.title) continue;
        const score = calcFuzzySimilarity(cleanQuery, alb.title) + (calcFuzzySimilarity(cleanQuery, alb.artist || '') / 2);
        addAlbumToMap({
          id: alb.id,
          title: alb.title,
          artist: alb.artist || 'Artiste inconnu',
          year: alb.year || '',
          artwork: alb.artwork,
          trackCount: alb.trackCount || 0,
          score: score + 2000
        });
      }
    }

    // b) Albums Deezer
    if (typeof deezerAlbumData !== 'undefined' && deezerAlbumData && Array.isArray(deezerAlbumData.data)) {
      for (const alb of deezerAlbumData.data) {
        if (!alb || !alb.title) continue;
        const score = calcFuzzySimilarity(cleanQuery, alb.title) + (calcFuzzySimilarity(cleanQuery, alb.artist?.name || '') / 2);
        addAlbumToMap({
          id: alb.id ? `dz_alb_${alb.id}` : alb.title,
          title: alb.title,
          artist: alb.artist?.name || 'Artiste inconnu',
          year: alb.release_date ? new Date(alb.release_date).getFullYear() : '',
          artwork: alb.cover_xl || alb.cover_big || alb.cover_medium || '',
          trackCount: alb.nb_tracks || 0,
          score: score + 1000
        });
      }
    }

    // b) Albums iTunes
    if (albumsData.results && Array.isArray(albumsData.results)) {
      for (const alb of albumsData.results) {
        if (!alb || !alb.collectionName) continue;
        const score = calcFuzzySimilarity(cleanQuery, alb.collectionName) + (calcFuzzySimilarity(cleanQuery, alb.artistName || '') / 2);
        addAlbumToMap({
          id: alb.collectionId ? `it_alb_${alb.collectionId}` : alb.collectionName,
          title: alb.collectionName,
          artist: alb.artistName,
          year: alb.releaseDate ? new Date(alb.releaseDate).getFullYear() : '',
          artwork: getHdArtwork(alb.artworkUrl100),
          trackCount: alb.trackCount || 0,
          score: score
        });
      }
    }

    // c) Albums dérivés des morceaux trouvés si non présents
    for (const t of uniqueScoredTracks) {
      if (t.album && t.album.trim().length > 1) {
        const score = calcFuzzySimilarity(cleanQuery, t.album) + (calcFuzzySimilarity(cleanQuery, t.artist || '') / 2);
        addAlbumToMap({
          id: `trk_alb_${t.album}`,
          title: t.album,
          artist: t.artist,
          year: '',
          artwork: t.thumbnail,
          trackCount: 0,
          score: score
        });
      }
    }

    const rawAlbums = Array.from(uniqueAlbumsMap.values());
    rawAlbums.sort((a, b) => b.score - a.score);
    const albums = rawAlbums.slice(0, 12);

    const finalResult = { 
      tracks: uniqueScoredTracks, 
      artists: artists.slice(0, 10), 
      albums: albums
    };

    if (uniqueScoredTracks.length > 0 || artists.length > 0 || albums.length > 0) {
      memoryCache.set(cacheKey, finalResult);
    }
    return finalResult;
  } catch (error) {
    console.error('[MusicDataService] Erreur lors de la recherche unifiée:', error);
    return { tracks: [], artists: [], albums: [] };
  }
}

/**
 * Récupère l'avatar officiel d'un artiste en cherchant sa chaîne officielle sur YouTube / Piped / Invidious
 */
export async function fetchArtistAvatarFromYT(artistName) {
  if (!artistName) return null;
  const cleanName = getMainArtistName(artistName).trim();

  // On liste des instances Piped fiables pour la recherche de chaînes/artistes
  const pipedInstances = [
    "https://pipedapi.kavin.rocks",
    "https://api.piped.privacydev.net",
    "https://pipedapi.mha.fi",
    "https://pipedapi.adminforge.de"
  ];

  for (const instance of pipedInstances) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(cleanName)}&filter=music_artists`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const match = data.items.find(item => 
            item.name && item.name.toLowerCase().includes(cleanName.toLowerCase())
          ) || data.items[0];
          if (match && match.thumbnail) {
            return match.thumbnail;
          }
        }
      }
    } catch (_) {}
  }

  // Seconde tentative sur Piped avec filtre général "channels"
  for (const instance of pipedInstances) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(cleanName)}&filter=channels`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const match = data.items.find(item => 
            item.name && item.name.toLowerCase().includes(cleanName.toLowerCase())
          ) || data.items[0];
          if (match && match.thumbnail) {
            return match.thumbnail;
          }
        }
      }
    } catch (_) {}
  }

  // Troisième tentative via Invidious
  const invidiousInstances = [
    "https://invidious.nerdvpn.de",
    "https://inv.tux.pizza",
    "https://invidious.jing.rocks"
  ];

  for (const instance of invidiousInstances) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(cleanName)}&type=channel`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const match = data.find(item => 
            item.author && item.author.toLowerCase().includes(cleanName.toLowerCase())
          ) || data[0];
          if (match && match.authorThumbnails && match.authorThumbnails.length > 0) {
            const thumbs = match.authorThumbnails;
            const bestThumb = thumbs.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
            if (bestThumb && bestThumb.url) {
              let imgUrl = bestThumb.url;
              if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
              return imgUrl;
            }
          }
        }
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Récupère un portrait artistique live / scène depuis l'API publique Unsplash
 */
export async function fetchUnsplashArtistAvatar(artistName) {
  try {
    const cleanName = getMainArtistName(artistName).trim();
    // Recherche ciblée concert/studio pour garder un esthétisme incroyable
    const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(cleanName + ' singer concert stage')}&per_page=3`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].urls?.regular || data.results[0].urls?.small;
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Récupère les visuels d'artiste officiels depuis TheAudioDB & Deezer
 */
export async function fetchTheAudioDbArtistVisuals(artistName) {
  if (!artistName) return null;
  const mainName = getMainArtistName(artistName);

  // Vérifier d'abord si l'artiste en vedette a un avatar personnalisé de haute fidélité (non générique d'Unsplash)
  const featured = FEATURED_ARTISTS.find(a => isArtistMatch(a.name, mainName));
  if (featured && isValidArtwork(featured.avatar) && !featured.avatar.includes('unsplash.com')) {
    return {
      avatar: featured.avatar,
      banner: featured.banner || featured.avatar,
      bio: null
    };
  }

  let avatar = null;
  let banner = null;
  let bio = null;

  // 1. Essai Deezer via proxy backend (très haute qualité pour les artistes majeurs)
  try {
    const dzRes = await fetch(`/api/deezer-artist?q=${encodeURIComponent(mainName)}`, {
      signal: AbortSignal.timeout(3000)
    });
    if (dzRes.ok) {
      const dzData = await dzRes.json();
      if (dzData && dzData.data && dzData.data.length > 0) {
        const best = dzData.data.find(d => isArtistMatch(d.name, mainName) && isValidArtwork(d.picture_xl || d.picture_big)) || dzData.data.find(d => isArtistMatch(d.name, mainName));
        if (best) {
          const candidatePic = best.picture_xl || best.picture_big || best.picture_medium;
          if (isValidArtwork(candidatePic)) {
            avatar = candidatePic;
            banner = candidatePic;
          }
        }
      }
    }
  } catch (_) {}

  // 2. Essai TheAudioDB (photos de groupes 4K)
  try {
    const res = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(mainName)}`, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.artists) && data.artists.length > 0) {
        const art = data.artists[0];
        if (isValidArtwork(art.strArtistThumb)) avatar = art.strArtistThumb;
        if (isValidArtwork(art.strArtistFanart || art.strArtistBanner || art.strArtistWideThumb)) {
          banner = art.strArtistFanart || art.strArtistBanner || art.strArtistWideThumb;
        }
        bio = art.strBiographyFR || art.strBiographyEN || null;
      }
    }
  } catch (err) {
    console.warn('[MusicDataService] Erreur TheAudioDB pour:', mainName, err);
  }

  // 3. Si toujours pas d'avatar valide, récupérer la pochette de son album le plus vendu sur iTunes
  if (!isValidArtwork(avatar)) {
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(mainName)}&entity=album&attribute=artistTerm&limit=3`,
        { signal: AbortSignal.timeout(2500) }
      );
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        if (itunesData.results && itunesData.results.length > 0 && itunesData.results[0].artworkUrl100) {
          avatar = getHdArtwork(itunesData.results[0].artworkUrl100);
          if (!banner) banner = avatar;
        }
      }
    } catch (_) {}
  }

  // 4. Quatrième étape : recherche de chaîne YouTube officielle (couverture de 100% des artistes underground, indépendants et rap)
  if (!isValidArtwork(avatar)) {
    try {
      const ytAvatar = await fetchArtistAvatarFromYT(mainName);
      if (isValidArtwork(ytAvatar)) {
        avatar = ytAvatar;
        if (!banner) banner = ytAvatar;
      }
    } catch (_) {}
  }

  // 5. Cinquième étape : recherche d'une photo artistique professionnelle sur Unsplash
  if (!isValidArtwork(avatar)) {
    try {
      const unsplashPic = await fetchUnsplashArtistAvatar(mainName);
      if (isValidArtwork(unsplashPic)) {
        avatar = unsplashPic;
        if (!banner) banner = unsplashPic;
      }
    } catch (_) {}
  }

  // 6. Sixième étape : Fallback ultime sur les images préconfigurées
  if (!isValidArtwork(avatar) && featured && isValidArtwork(featured.avatar)) {
    avatar = featured.avatar;
    if (!banner) banner = featured.banner || featured.avatar;
  }

  if (avatar || banner || bio) {
    return { avatar, banner: banner || avatar, bio };
  }
  return null;
}

/**
 * Récupère les données complètes d'un artiste (Top Titres officiels, Albums complets, Biographie)
 * Filtre strictement pour n'avoir QUE la discographie et les morceaux de cet artiste précis.
 */
export async function getSimilarArtistsByGenre(genre) {
  try {
    const res = await fetch(`/api/deezer-search?q=genre:"${encodeURIComponent(genre)}"&limit=10`, {
      signal: AbortSignal.timeout(5000)
    }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        // Deezer search results have `artist` object inside tracks
        // We need to extract unique artists
        const artists = [];
        const seen = new Set();
        for (const track of data.data) {
          if (track.artist && !seen.has(track.artist.id)) {
            seen.add(track.artist.id);
            artists.push({
              id: track.artist.id,
              name: track.artist.name,
              picture: track.artist.picture_xl || track.artist.picture_medium,
            });
            if (artists.length >= 10) break;
          }
        }
        return artists;
      }
    }
  } catch (err) {
    console.error('Error fetching similar artists by genre:', err);
  }
  return [];
}

export async function getArtistDetails(artistName) {
  if (!artistName) return null;
  const targetMainName = getMainArtistName(safeDecodeURI(artistName));
  const cleanName = targetMainName.trim();
  const cacheKey = `artist_details_v6_${cleanName.toLowerCase()}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  try {
    const cleanKey = normalizeArtistKey(cleanName);
    const cleanNorm = cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const matchFn = (candidate) => isArtistMatch(candidate, cleanName);

    // 1. Recherche de l'artiste officiel sur Deezer
    let dzArtist = null;
    let dzTopTracks = [];
    let dzAlbums = [];
    let dzRelated = [];
    let dzSearchTracks = [];

    try {
      // 1a. Recherche exacte de l'artiste
      const dzArtistRes = await fetch(`/api/deezer-artist?q=${encodeURIComponent(cleanName)}`, {
        signal: AbortSignal.timeout(5000)
      }).catch(() => null);
      
      if (dzArtistRes && dzArtistRes.ok) {
        const dzArtistData = await dzArtistRes.json();
        if (dzArtistData && Array.isArray(dzArtistData.data) && dzArtistData.data.length > 0) {
          const sorted = [...dzArtistData.data].sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0));
          dzArtist = sorted.find(a => matchFn(a.name)) || sorted.find(a => a.name && (normalizeArtistKey(a.name).includes(cleanKey) || cleanKey.includes(normalizeArtistKey(a.name)))) || sorted[0];
        }
      }

      // 1b. Récupérer des pistes pour fallback
      const dzSearchRes = await fetch(`/api/deezer-search?q=artist:"${encodeURIComponent(cleanName)}"`, {
        signal: AbortSignal.timeout(5000)
      }).catch(() => null);
      if (dzSearchRes && dzSearchRes.ok) {
        const data = await dzSearchRes.json();
        if (data && Array.isArray(data.data)) dzSearchTracks = data.data;
      }

      if (dzSearchTracks.length === 0) {
        const dzGeneralRes = await fetch(`/api/deezer-search?q=${encodeURIComponent(cleanName)}`, {
          signal: AbortSignal.timeout(5000)
        }).catch(() => null);
        if (dzGeneralRes && dzGeneralRes.ok) {
          const data = await dzGeneralRes.json();
          if (data && Array.isArray(data.data)) dzSearchTracks = data.data;
        }
      }

      // 1c. Resolver d'artiste Auto-Retry si aucun ID trouvé (Fallback ID)
      if (!dzArtist && dzSearchTracks.length > 0) {
        const fallbackTrack = dzSearchTracks.find(t => matchFn(t.artist.name)) || dzSearchTracks[0];
        if (fallbackTrack && fallbackTrack.artist) {
          dzArtist = fallbackTrack.artist;
        }
      }

      // 1d. Récupérer Top (strictement ordonné par rank), Albums, Related
      if (dzArtist && dzArtist.id) {
        // Fetch direct JSONP pour le top tracks + fallback proxy
        const fetchTopPromise = (async () => {
          try {
            if (typeof window !== 'undefined' && typeof document !== 'undefined') {
              const cbName = 'dzTopCb_' + Math.round(Math.random() * 1000000);
              const script = document.createElement('script');
              const topData = await new Promise((res) => {
                const timer = setTimeout(() => {
                  try { delete window[cbName]; } catch (_) {}
                  if (script.parentNode) script.parentNode.removeChild(script);
                  res(null);
                }, 3500);
                window[cbName] = (d) => {
                  clearTimeout(timer);
                  try { delete window[cbName]; } catch (_) {}
                  if (script.parentNode) script.parentNode.removeChild(script);
                  res(d);
                };
                script.src = `https://api.deezer.com/artist/${dzArtist.id}/top?limit=50&output=jsonp&callback=${cbName}`;
                script.onerror = () => {
                  clearTimeout(timer);
                  try { delete window[cbName]; } catch (_) {}
                  if (script.parentNode) script.parentNode.removeChild(script);
                  res(null);
                };
                document.body.appendChild(script);
              });
              if (topData && Array.isArray(topData.data) && topData.data.length > 0) {
                return topData;
              }
            }
          } catch (_) {}
          return fetch(`/api/deezer-artist-top?id=${dzArtist.id}`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({ data: [] }));
        })();

        const [topRes, albRes, relatedRes] = await Promise.all([
          fetchTopPromise,
          fetch(`/api/deezer-artist-albums?id=${dzArtist.id}`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(`/api/deezer-artist-related?id=${dzArtist.id}`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({ data: [] }))
        ]);
        dzTopTracks = topRes?.data || [];
        dzAlbums = albRes?.data || [];
        dzRelated = relatedRes?.data || [];
      }

      // 1e. Fallback Albums
      if (dzAlbums.length === 0) {
        const fallbackAlbRes = await fetch(`/api/deezer-search-album?q=${encodeURIComponent(cleanName)}`, {
          signal: AbortSignal.timeout(5000)
        }).catch(() => null);
        if (fallbackAlbRes && fallbackAlbRes.ok) {
          const albData = await fallbackAlbRes.json();
          if (albData && Array.isArray(albData.data)) {
            dzAlbums = albData.data.filter(a => matchFn(a.artist?.name || ''));
          }
        }
      }

      // 1f. Fallback "Fans aiment aussi" (Artistes similaires)
      if (dzRelated.length === 0 && dzSearchTracks.length > 0) {
        const fallbackArtists = new Map();
        for (const track of dzSearchTracks) {
          if (track.artist && !matchFn(track.artist.name) && track.artist.id !== dzArtist?.id) {
            fallbackArtists.set(track.artist.id, track.artist);
          }
          if (track.contributors) {
            for (const contributor of track.contributors) {
              if (contributor.id && !matchFn(contributor.name) && contributor.id !== dzArtist?.id) {
                fallbackArtists.set(contributor.id, contributor);
              }
            }
          }
        }
        dzRelated = Array.from(fallbackArtists.values()).slice(0, 10);
      }
    } catch (e) {
      console.warn('[MusicDataService] Erreur Deezer artist & fallback:', e);
    }

    // 3. Requêtes iTunes sérialisées / limitées pour réduire la concurrence simultanée (Max 2 requêtes en même temps)
    const tracksData1 = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=song&limit=50`,
      { signal: AbortSignal.timeout(4000) }
    ).then(res => res.json()).catch(() => ({ results: [] }));

    const tracksData2 = cleanNorm !== cleanName.toLowerCase()
      ? await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanNorm)}&entity=song&limit=50`, { signal: AbortSignal.timeout(4000) }).then(res => res.json()).catch(() => ({ results: [] }))
      : { results: [] };

    const [albumsData, officialVisuals] = await Promise.all([
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=album&limit=30`,
        { signal: AbortSignal.timeout(4000) }
      ).then(res => res.json()).catch(() => ({ results: [] })),
      fetchTheAudioDbArtistVisuals(cleanName).catch(() => null)
    ]);

    const allItunesTracks = [...(tracksData1.results || []), ...(tracksData2.results || [])];

    // 4. Construction des Top Tracks strictement de cet artiste
    const topTracks = [];
    const seenTracks = new Set();

    const addTrack = (track) => {
      if (!track || !track.title) return;
      const normTitle = track.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      if (!normTitle || seenTracks.has(normTitle)) return;
      seenTracks.add(normTitle);

      // Si l'album est une compilation parasite (ex: "Girls And Guitars"), nettoyer
      let cleanAlbum = track.album || '';
      if (isJunkAlbum(cleanAlbum)) {
        cleanAlbum = '';
      }

      topTracks.push({
        ...track,
        album: cleanAlbum
      });
    };

    // a) Top hits Deezer officiels (Priorité absolue et rank authentique)
    for (let i = 0; i < dzTopTracks.length; i++) {
      const d = dzTopTracks[i];
      if (!d.title) continue;
      // Les morceaux du top officiel ont un bonus de position pour respecter scrupuleusement l'ordre Deezer
      const topOrderRank = (d.rank || 800000) + Math.max(0, (50 - i) * 5000);
      addTrack({
        id: d.id ? `dz_${d.id}` : d.title,
        deezerId: d.id,
        videoId: d.id ? `dz_${d.id}` : d.title,
        title: d.title_short || d.title,
        artist: d.artist?.name || dzArtist?.name || cleanName,
        artistId: d.artist?.id || dzArtist?.id,
        album: d.album?.title || '',
        thumbnail: d.album?.cover_xl || d.album?.cover_big || dzArtist?.picture_xl || getArtistAvatar(cleanName),
        duration: parseDurationToSeconds(d.duration, `${d.title}_${d.artist?.name || cleanName}_${d.id}`),
        previewUrl: d.preview,
        source: 'deezer',
        rank: topOrderRank
      });
    }

    // b) Morceaux Deezer Search
    for (const d of dzSearchTracks) {
      if (!d.title || !d.artist || !matchFn(d.artist.name)) continue;
      addTrack({
        id: d.id ? `dz_${d.id}` : d.title,
        videoId: d.id ? `dz_${d.id}` : d.title,
        title: d.title,
        artist: d.artist.name,
        album: d.album?.title || '',
        thumbnail: d.album?.cover_xl || d.album?.cover_big || getArtistAvatar(cleanName),
        duration: parseDurationToSeconds(d.duration, `${d.title}_${d.artist.name}_${d.id}`),
        previewUrl: d.preview,
        source: 'deezer',
        rank: d.rank || 500000
      });
    }

    // c) Compléter avec les morceaux iTunes correspondants
    for (const t of allItunesTracks) {
      if (!t.trackName || !t.artistName || !matchFn(t.artistName)) continue;
      addTrack({
        id: t.trackId ? t.trackId.toString() : t.trackName,
        videoId: t.trackId ? t.trackId.toString() : t.trackName,
        title: t.trackName,
        artist: t.artistName,
        album: t.collectionName,
        thumbnail: getHdArtwork(t.artworkUrl100),
        duration: Math.round((t.trackTimeMillis || 200000) / 1000),
        previewUrl: t.previewUrl,
        releaseYear: t.releaseDate ? new Date(t.releaseDate).getFullYear() : '',
        source: 'itunes',
        rank: 400000
      });
    }

    // 5. Construction de la Discographie (Albums, Singles, EPs)
    const albums = [];
    const seenAlbums = new Set();

    for (const alb of dzAlbums) {
      if (!alb.title || isJunkAlbum(alb.title)) continue;
      const albNorm = alb.title.toLowerCase().trim();
      if (!seenAlbums.has(albNorm)) {
        seenAlbums.add(albNorm);
        albums.push({
          id: alb.id ? `dz_alb_${alb.id}` : albNorm,
          deezerId: alb.id,
          title: alb.title,
          artist: dzArtist?.name || cleanName,
          year: alb.release_date ? new Date(alb.release_date).getFullYear() : '',
          artwork: alb.cover_xl || alb.cover_big || alb.cover_medium,
          genre: dzArtist?.genre || 'Rock / Pop',
          trackCount: alb.nb_tracks || 0,
          recordType: alb.record_type || 'album'
        });
      }
    }

    if (albumsData.results && Array.isArray(albumsData.results)) {
      for (const a of albumsData.results) {
        if (!a.collectionName || isJunkAlbum(a.collectionName) || !a.artistName || !matchFn(a.artistName)) continue;
        const albNorm = a.collectionName.toLowerCase().trim();
        if (!seenAlbums.has(albNorm)) {
          seenAlbums.add(albNorm);
          albums.push({
            id: a.collectionId,
            title: a.collectionName,
            artist: a.artistName,
            year: a.releaseDate ? new Date(a.releaseDate).getFullYear() : '',
            artwork: getHdArtwork(a.artworkUrl100),
            genre: a.primaryGenreName || 'Musique',
            trackCount: a.trackCount || 0,
            recordType: a.collectionType === 'Album' ? 'album' : 'single'
          });
        }
      }
    }

    // Fallback de secours si moins de 2 albums trouvés
    const mainAlbumsCount = albums.filter(a => a.recordType === 'album').length;
    if (mainAlbumsCount < 2) {
      try {
        const fallbackAlbRes = await fetch(`/api/deezer-search-album?q=${encodeURIComponent(cleanName)}`, {
          signal: AbortSignal.timeout(4000)
        }).catch(() => null);
        if (fallbackAlbRes && fallbackAlbRes.ok) {
          const albData = await fallbackAlbRes.json();
          if (albData && Array.isArray(albData.data)) {
            for (const alb of albData.data) {
              if (!alb.title || isJunkAlbum(alb.title)) continue;
              const albNorm = alb.title.toLowerCase().trim();
              if (!seenAlbums.has(albNorm)) {
                seenAlbums.add(albNorm);
                albums.push({
                  id: alb.id ? `dz_alb_${alb.id}` : albNorm,
                  deezerId: alb.id,
                  title: alb.title,
                  artist: alb.artist?.name || cleanName,
                  year: alb.release_date ? new Date(alb.release_date).getFullYear() : '',
                  artwork: alb.cover_xl || alb.cover_big || alb.cover_medium,
                  genre: 'Musique',
                  trackCount: alb.nb_tracks || 0,
                  recordType: alb.record_type || 'album'
                });
              }
            }
          }
        }
      } catch (_) {}
    }

    // Tri chronologique strict du plus récent au plus ancien (year décroissant)
    albums.sort((a, b) => {
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      return yearB - yearA;
    });

    // d) Si moins de 8 titres mais des albums trouvés, charger les morceaux des albums Deezer
    if (topTracks.length < 8 && albums.length > 0) {
      const topAlbumsToFetch = albums.filter(a => a.deezerId).slice(0, 3);
      for (const alb of topAlbumsToFetch) {
        try {
          const albTracksRes = await fetch(`/api/deezer-album-tracks?id=${alb.deezerId}`, {
            signal: AbortSignal.timeout(3000)
          });
          if (albTracksRes.ok) {
            const albData = await albTracksRes.json();
            if (albData && Array.isArray(albData.data)) {
              for (const trk of albData.data) {
                addTrack({
                  id: trk.id ? `dz_${trk.id}` : trk.title,
                  videoId: trk.id ? `dz_${trk.id}` : trk.title,
                  title: trk.title,
                  artist: trk.artist?.name || dzArtist?.name || cleanName,
                  album: alb.title,
                  thumbnail: alb.artwork,
                  duration: parseDurationToSeconds(trk.duration, `${trk.title}_${cleanName}_${trk.id}`),
                  previewUrl: trk.preview,
                  source: 'deezer',
                  rank: trk.rank || 300000
                });
              }
            }
          }
        } catch (_) {}
      }
    }

    // Tri des topTracks : ordre strict de popularité décroissante
    topTracks.sort((a, b) => (b.rank || 0) - (a.rank || 0));

    // Déduplication intelligente : si une version studio existe pour un titre, éliminer la version live doublon
    const studioTracksMap = new Map();
    const studioTopTracks = [];

    for (const t of topTracks) {
      const isLive = isLiveTrack(t.title);
      const cleanTitleKey = (t.title || '')
        .toLowerCase()
        .replace(/\b(live|en concert|in concert|live at|live in|live performance|live session|unplugged|en direct|live version|concert|tv show|festival|tour|bootleg|live recording|session live|bbc sessions)\b.*/i, '')
        .replace(/[\(\[\{].*?[\)\]\}]/g, '')
        .trim();

      if (!cleanTitleKey) continue;

      if (!studioTracksMap.has(cleanTitleKey)) {
        studioTracksMap.set(cleanTitleKey, t);
        studioTopTracks.push(t);
      } else {
        const existing = studioTracksMap.get(cleanTitleKey);
        const existingIsLive = isLiveTrack(existing.title);
        if (existingIsLive && !isLive) {
          const idx = studioTopTracks.indexOf(existing);
          if (idx !== -1) {
            studioTopTracks[idx] = t;
          }
          studioTracksMap.set(cleanTitleKey, t);
        }
      }
    }

    const finalTopTracks = studioTopTracks;

    // Formater explicitement les titres live restants si besoin
    finalTopTracks.forEach(t => {
      if (isLiveTrack(t.title) && !/\(live\)/i.test(t.title) && !/live/i.test(t.title)) {
        t.title = `${t.title} (Live)`;
      }
    });

    // Détermination ultra-précise et intelligente du genre (gère les traductions et évite les aberrations type "Country")
    const artistGenrePresets = {
      'nirvana': 'Grunge / Rock Alternatif',
      'daft punk': 'French Touch / Electro',
      'pink floyd': 'Progressive Rock / Classic Rock',
      'amy winehouse': 'R&B / Soul / Jazz',
      'indochine': 'Rock Français / New Wave',
      'telephone': 'Rock Français / Pop',
      'pnl': 'Cloud Rap / Rap Français',
      'jul': 'Rap Français / Marseille',
      'damso': 'Rap Belge / Hip-Hop',
      'ninho': 'Rap Français / Hip-Hop',
      'johnny hallyday': 'Chanson Française / Rock',
      'celine dion': 'Variété Française / Pop',
      'playboi carti': 'Trap / Hip-Hop',
      'travis scott': 'Hip-Hop / Trap',
      'the weeknd': 'R&B / Synthpop',
      'billie eilish': 'Alt Pop / Electronic',
      'lady gaga': 'Pop / Dance',
      'eminem': 'Hip-Hop / Rap',
      'queen': 'Classic Rock / Hard Rock',
      'linkin park': 'Alternative Rock / Nu Metal',
      'stromae': 'Chanson / Dance / Pop',
      'michael jackson': 'Pop / Soul / Funk'
    };

    const normCleanName = cleanName.toLowerCase().trim();
    let mainGenre = artistGenrePresets[normCleanName];
    if (!mainGenre) {
      const keyName = normalizeArtistKey(cleanName);
      for (const [k, g] of Object.entries(artistGenrePresets)) {
        if (normalizeArtistKey(k) === keyName) {
          mainGenre = g;
          break;
        }
      }
    }

    if (!mainGenre) {
      const genreCounts = {};
      for (const track of allItunesTracks) {
        if (track.primaryGenreName && track.primaryGenreName !== 'Music') {
          genreCounts[track.primaryGenreName] = (genreCounts[track.primaryGenreName] || 0) + 1;
        }
      }
      if (albumsData.results && Array.isArray(albumsData.results)) {
        for (const alb of albumsData.results) {
          if (alb.primaryGenreName && alb.primaryGenreName !== 'Music') {
            genreCounts[alb.primaryGenreName] = (genreCounts[alb.primaryGenreName] || 0) + 3;
          }
        }
      }

      const genreTranslations = {
        'alternative': 'Rock Alternatif',
        'alternative rock': 'Rock Alternatif',
        'hard rock': 'Hard Rock',
        'rock': 'Rock',
        'pop': 'Pop / Variété',
        'r&b/soul': 'R&B / Soul',
        'soul': 'R&B / Soul',
        'hip-hop': 'Hip-Hop / Rap',
        'rap': 'Hip-Hop / Rap',
        'hip-hop/rap': 'Hip-Hop / Rap',
        'french pop': 'Variété Française / Pop',
        'chanson française': 'Variété Française / Chanson',
        'dance': 'Electro / Dance',
        'electronic': 'Electro / Synth',
        'jazz': 'Jazz / Soul',
        'blues': 'Blues / Rock',
        'reggae': 'Reggae / Dub',
        'soundtrack': 'Bande Originale',
        'classical': 'Musique Classique',
        'folk': 'Folk / Acoustique',
        'country': 'Country / Americana'
      };

      let bestGenre = null;
      let maxGenreCount = 0;
      for (const [g, count] of Object.entries(genreCounts)) {
        if (count > maxGenreCount) {
          maxGenreCount = count;
          bestGenre = g;
        }
      }

      if (bestGenre) {
        const lowerG = bestGenre.toLowerCase().trim();
        mainGenre = genreTranslations[lowerG] || bestGenre;
      } else if (dzArtist?.genre) {
        mainGenre = dzArtist.genre;
      } else if (allItunesTracks[0]?.primaryGenreName) {
        const lowerG = allItunesTracks[0].primaryGenreName.toLowerCase().trim();
        mainGenre = genreTranslations[lowerG] || allItunesTracks[0].primaryGenreName;
      } else {
        mainGenre = 'Rock / Pop / Chanson';
      }
    }

    const candidateAvatar = officialVisuals?.avatar || dzArtist?.picture_xl || dzArtist?.picture_big;
    const avatar = isValidArtwork(candidateAvatar)
      ? candidateAvatar
      : (albums[0]?.artwork || topTracks[0]?.thumbnail || getArtistAvatar(cleanName));
    const banner = isValidArtwork(officialVisuals?.banner)
      ? officialVisuals.banner
      : (isValidArtwork(dzArtist?.picture_xl) ? dzArtist.picture_xl : (albums[0]?.artwork || topTracks[0]?.thumbnail || avatar));
    
    const listenersCount = dzArtist?.nb_fan ? Number(dzArtist.nb_fan) : (officialVisuals?.listeners || 1800000);

    const artistObj = {
      name: dzArtist?.name || cleanName,
      genre: mainGenre,
      banner,
      avatar,
      bio: officialVisuals?.bio || `Groupe / Artiste culte ${dzArtist?.name || cleanName}. Retrouvez l'ensemble de ses albums originaux, ses plus grands titres et ses enregistrements studio masterisés en haute fidélité.`,
      topTracks: finalTopTracks,
      albums,
      relatedArtists: dzRelated.slice(0, 10).map(r => ({
        id: r.id,
        name: r.name,
        picture: r.picture_xl || r.picture_large || r.picture_medium || r.picture,
        nb_fan: r.nb_fan,
        nbFans: r.nb_fan
      })),
      listeners: listenersCount,
      nbFans: listenersCount,
      monthlyListeners: listenersCount
    };

    memoryCache.set(cacheKey, artistObj);
    return artistObj;
  } catch (error) {
    console.error('[MusicDataService] Erreur récupération artiste:', error);
    return null;
  }
}

/**
 * Récupère tous les titres d'un album dans l'ordre original
 */
export async function getAlbumTracks(album, artistName) {
  if (!album) return [];
  const cleanArtist = artistName || album.artist || '';

  // 1. Si on a un deezerId
  if (album.deezerId) {
    try {
      const res = await fetch(`/api/deezer-album-tracks?id=${album.deezerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          // Sort explicitly by disk_number and track_position to ensure proper album track sequencing (e.g. for cohesive albums)
          const sortedData = [...data.data].sort((a, b) => {
            const diskA = a.disk_number || 1;
            const diskB = b.disk_number || 1;
            if (diskA !== diskB) return diskA - diskB;
            return (a.track_position || 0) - (b.track_position || 0);
          });
          return sortedData.map((t, idx) => ({
            id: `dz_${t.id}`,
            videoId: `dz_${t.id}`,
            title: t.title,
            artist: t.artist?.name || cleanArtist,
            album: album.title,
            thumbnail: album.artwork || t.album?.cover_xl || t.album?.cover_big || album.artwork,
            duration: parseDurationToSeconds(t.duration, `${t.title}_${cleanArtist}_${t.id}`),
            previewUrl: t.preview,
            source: 'deezer',
            trackNumber: t.track_position || (idx + 1)
          }));
        }
      }
    } catch (e) {
      console.error("Error fetching Deezer album tracks:", e);
    }
  }

  // 2. Si on a un id numérique (iTunes collectionId)
  if (album.id && /^\d+$/.test(album.id.toString())) {
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${album.id}&entity=song`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results)) {
          const songs = data.results.filter(r => r.wrapperType === 'track');
          songs.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));
          return songs.map(s => ({
            id: s.trackId ? s.trackId.toString() : s.trackName,
            videoId: s.trackId ? s.trackId.toString() : s.trackName,
            title: s.trackName,
            artist: s.artistName || cleanArtist,
            album: album.title,
            thumbnail: album.artwork || s.artworkUrl100,
            duration: Math.round((s.trackTimeMillis || 200000) / 1000),
            previewUrl: s.previewUrl,
            source: 'itunes',
            trackNumber: s.trackNumber || 1
          }));
        }
      }
    } catch (e) {
      console.error("Error fetching iTunes album tracks:", e);
    }
  }

  return [];
}

/**
 * Top artistes prédéfinis avec visuels soignés 4K
 */
export const FEATURED_ARTISTS = [
  {
    name: 'Amy Winehouse',
    genre: 'R&B / Soul / Jazz',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/0cacb43a576b031eb169cca27171c1f5/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/0cacb43a576b031eb169cca27171c1f5/1000x1000-000000-80-0-0.jpg',
    monthly: '22.5M auditeurs'
  },
  {
    name: 'The Cranberries',
    genre: 'Alternative Rock / Irish',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/8e57c9fe64a7d1c3ed241e16f4c0f154/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/8e57c9fe64a7d1c3ed241e16f4c0f154/1000x1000-000000-80-0-0.jpg',
    monthly: '18.1M auditeurs'
  },
  {
    name: 'Indochine',
    genre: 'Rock Français / New Wave',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/25b2e9befc7d9faf2b95feab29ba7c00/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/25b2e9befc7d9faf2b95feab29ba7c00/1000x1000-000000-80-0-0.jpg',
    monthly: '2.8M auditeurs'
  },
  {
    name: 'Téléphone',
    genre: 'Rock Français / Pop',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/515ab34a37147cc6ba275294b58bb3c8/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/515ab34a37147cc6ba275294b58bb3c8/1000x1000-000000-80-0-0.jpg',
    monthly: '1.4M auditeurs'
  },
  {
    name: 'Daft Punk',
    genre: 'French Touch / Electro',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/638e69b9caaf9f9f3f8826febea7b543/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/638e69b9caaf9f9f3f8826febea7b543/1000x1000-000000-80-0-0.jpg',
    monthly: '24.8M auditeurs'
  },
  {
    name: 'The Weeknd',
    genre: 'R&B / Synthpop',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/1000x1000-000000-80-0-0.jpg',
    monthly: '108.5M auditeurs'
  },
  {
    name: 'Billie Eilish',
    genre: 'Alt Pop / Electronic',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/8eab1a9a644889aabaca1e193e05f984/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/8eab1a9a644889aabaca1e193e05f984/1000x1000-000000-80-0-0.jpg',
    monthly: '92.3M auditeurs'
  },
  {
    name: 'Travis Scott',
    genre: 'Hip-Hop / Trap',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/8d8316146026d7e6ce377e314536df62/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/8d8316146026d7e6ce377e314536df62/1000x1000-000000-80-0-0.jpg',
    monthly: '68.4M auditeurs'
  },
  {
    name: 'PNL',
    genre: 'Cloud Rap / Rap Français',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/9277fdce45b79945918c24f69cb6e8e3/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/9277fdce45b79945918c24f69cb6e8e3/1000x1000-000000-80-0-0.jpg',
    monthly: '6.2M auditeurs'
  },
  {
    name: 'Dua Lipa',
    genre: 'Nu-Disco / Pop',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/877872aaf75694f11d53c318700ab2b5/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/877872aaf75694f11d53c318700ab2b5/1000x1000-000000-80-0-0.jpg',
    monthly: '74.1M auditeurs'
  },
  {
    name: 'Michael Jackson',
    genre: 'Pop / Soul / Funk',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/97fae13b2b30e4aec2e8c9e0c7839d92/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/97fae13b2b30e4aec2e8c9e0c7839d92/1000x1000-000000-80-0-0.jpg',
    monthly: '41.2M auditeurs'
  },
  {
    name: 'Justice',
    genre: 'Electro Rock / French Touch',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/e5bf29cb99852f92a0079b184ace9479/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/e5bf29cb99852f92a0079b184ace9479/1000x1000-000000-80-0-0.jpg',
    monthly: '4.8M auditeurs'
  },
  {
    name: 'Stromae',
    genre: 'Chanson / Dance / Pop',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/3634186855460543a9476870a912a31a/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/3634186855460543a9476870a912a31a/1000x1000-000000-80-0-0.jpg',
    monthly: '12.4M auditeurs'
  },
  {
    name: 'Eminem',
    genre: 'Hip-Hop / Rap',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/0f30bbd33a680030054af004d698d6ac/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/0f30bbd33a680030054af004d698d6ac/1000x1000-000000-80-0-0.jpg',
    monthly: '80.6M auditeurs'
  },
  {
    name: 'Queen',
    genre: 'Classic Rock / Hard Rock',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/71eeb9e2eeb375df35a3c0654a5a01ab/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/71eeb9e2eeb375df35a3c0654a5a01ab/1000x1000-000000-80-0-0.jpg',
    monthly: '48.2M auditeurs'
  },
  {
    name: 'Linkin Park',
    genre: 'Alternative Rock / Nu Metal',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/4886905210739af3438990897bad3a98/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/4886905210739af3438990897bad3a98/1000x1000-000000-80-0-0.jpg',
    monthly: '38.6M auditeurs'
  },
  {
    name: 'Playboi Carti',
    genre: 'Trap / Hip-Hop',
    avatar: 'https://cdn-images.dzcdn.net/images/artist/b90097972a60d9d8598a79a786be1a3a/500x500-000000-80-0-0.jpg',
    banner: 'https://cdn-images.dzcdn.net/images/artist/b90097972a60d9d8598a79a786be1a3a/1000x1000-000000-80-0-0.jpg',
    monthly: '21.5M auditeurs'
  }
];


export const DECADE_PLAYLISTS = [
  {
    id: 'decade-70s',
    title: 'Incontournables Années 70',
    description: 'Bohemian Rhapsody, Dancing Queen, September... L\'âge d\'or du Rock, Funk & Disco',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    era: '70s',
    tracks: [
      { videoId: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg', duration: 354 },
      { videoId: 'xFrGuyw1V8s', title: 'Dancing Queen', artist: 'ABBA', album: 'Arrival', thumbnail: 'https://i.ytimg.com/vi/xFrGuyw1V8s/hqdefault.jpg', duration: 231 },
      { videoId: 'I_izvAbhExY', title: 'Stayin\' Alive', artist: 'Bee Gees', album: 'Saturday Night Fever', thumbnail: 'https://i.ytimg.com/vi/I_izvAbhExY/hqdefault.jpg', duration: 285 },
      { videoId: 'Gs069dndIYk', title: 'September', artist: 'Earth, Wind & Fire', album: 'The Best of Earth, Wind & Fire', thumbnail: 'https://i.ytimg.com/vi/Gs069dndIYk/hqdefault.jpg', duration: 215 },
      { videoId: 'HrxX9TBj2zY', title: 'Another Brick In The Wall', artist: 'Pink Floyd', album: 'The Wall', thumbnail: 'https://i.ytimg.com/vi/HrxX9TBj2zY/hqdefault.jpg', duration: 239 },
      { videoId: 'lXgkuM2nhY8', title: 'Heroes', artist: 'David Bowie', album: 'Heroes', thumbnail: 'https://i.ytimg.com/vi/lXgkuM2nhY8/hqdefault.jpg', duration: 371 },
      { videoId: '6ul-cZyuYq4', title: 'Go Your Own Way', artist: 'Fleetwood Mac', album: 'Rumours', thumbnail: 'https://i.ytimg.com/vi/6ul-cZyuYq4/hqdefault.jpg', duration: 223 },
      { videoId: '09839DpTctU', title: 'Hotel California', artist: 'Eagles', album: 'Hotel California', thumbnail: 'https://i.ytimg.com/vi/09839DpTctU/hqdefault.jpg', duration: 391 },
      { videoId: 'DF3XjEhJ40Y', title: 'Rocket Man', artist: 'Elton John', album: 'Honky Château', thumbnail: 'https://i.ytimg.com/vi/DF3XjEhJ40Y/hqdefault.jpg', duration: 281 },
      { videoId: '0CFuCYNx-1g', title: 'Superstition', artist: 'Stevie Wonder', album: 'Talking Book', thumbnail: 'https://i.ytimg.com/vi/0CFuCYNx-1g/hqdefault.jpg', duration: 245 },
      { videoId: 'yURRmWtbTbo', title: 'Don\'t Stop \'Til You Get Enough', artist: 'Michael Jackson', album: 'Off the Wall', thumbnail: 'https://i.ytimg.com/vi/yURRmWtbTbo/hqdefault.jpg', duration: 365 },
      { videoId: 'jGqrvn3914o', title: 'No Woman No Cry', artist: 'Bob Marley', album: 'Natty Dread', thumbnail: 'https://i.ytimg.com/vi/jGqrvn3914o/hqdefault.jpg', duration: 247 },
      { videoId: 'gEPmA31yH6w', title: 'Highway to Hell', artist: 'AC/DC', album: 'Highway to Hell', thumbnail: 'https://i.ytimg.com/vi/gEPmA31yH6w/hqdefault.jpg', duration: 208 },
      { videoId: 'Nm-ISatLDG0', title: 'I Feel Love', artist: 'Donna Summer', album: 'I Remember Yesterday', thumbnail: 'https://i.ytimg.com/vi/Nm-ISatLDG0/hqdefault.jpg', duration: 353 },
      { videoId: 'h1qQ1SKNlgY', title: 'Le Freak', artist: 'Chic', album: 'C\'est Chic', thumbnail: 'https://i.ytimg.com/vi/h1qQ1SKNlgY/hqdefault.jpg', duration: 323 },
      { videoId: 'zUwEIt9ezDI', title: 'Smoke on the Water', artist: 'Deep Purple', album: 'Machine Head', thumbnail: 'https://i.ytimg.com/vi/zUwEIt9ezDI/hqdefault.jpg', duration: 340 },
      { videoId: 'gE-g921bCVI', title: 'I Was Made For Lovin\' You', artist: 'Kiss', album: 'Dynasty', thumbnail: 'https://i.ytimg.com/vi/gE-g921bCVI/hqdefault.jpg', duration: 270 },
      { videoId: '3T1c7GkzRQQ', title: 'Roxanne', artist: 'The Police', album: 'Outlandos d\'Amour', thumbnail: 'https://i.ytimg.com/vi/3T1c7GkzRQQ/hqdefault.jpg', duration: 194 },
      { videoId: 't4qk8j3o240', title: 'More Than a Feeling', artist: 'Boston', album: 'Boston', thumbnail: 'https://i.ytimg.com/vi/t4qk8j3o240/hqdefault.jpg', duration: 285 },
      { videoId: '2X_2Id06538', title: 'Carry on Wayward Son', artist: 'Kansas', album: 'Leftoverture', thumbnail: 'https://i.ytimg.com/vi/2X_2Id06538/hqdefault.jpg', duration: 323 },
      { videoId: 'H-kA3UtBj4M', title: 'What\'s Going On', artist: 'Marvin Gaye', album: 'What\'s Going On', thumbnail: 'https://i.ytimg.com/vi/H-kA3UtBj4M/hqdefault.jpg', duration: 233 },
      { videoId: 'Hphwfq1wLjs', title: 'Da Ya Think I\'m Sexy?', artist: 'Rod Stewart', album: 'Blondes Have More Fun', thumbnail: 'https://i.ytimg.com/vi/Hphwfq1wLjs/hqdefault.jpg', duration: 326 },
      { videoId: 'bKtB5RM1nL4', title: 'Walk This Way', artist: 'Aerosmith', album: 'Toys in the Attic', thumbnail: 'https://i.ytimg.com/vi/bKtB5RM1nL4/hqdefault.jpg', duration: 212 },
      { videoId: 'efH4Bbfd09U', title: 'London Calling', artist: 'The Clash', album: 'London Calling', thumbnail: 'https://i.ytimg.com/vi/efH4Bbfd09U/hqdefault.jpg', duration: 199 },
      { videoId: 'TYh1l8piVBU', title: 'Blitzkrieg Bop', artist: 'Ramones', album: 'Ramones', thumbnail: 'https://i.ytimg.com/vi/TYh1l8piVBU/hqdefault.jpg', duration: 132 },
      { videoId: 'WGU_4-5RaxU', title: 'Heart Of Glass', artist: 'Blondie', album: 'Parallel Lines', thumbnail: 'https://i.ytimg.com/vi/WGU_4-5RaxU/hqdefault.jpg', duration: 275 },
      { videoId: 'OQJeJR3UUfU', title: 'The Logical Song', artist: 'Supertramp', album: 'Breakfast in America', thumbnail: 'https://i.ytimg.com/vi/OQJeJR3UUfU/hqdefault.jpg', duration: 250 },
      { videoId: 'h0ffIJ7ZO4U', title: 'Sultans Of Swing', artist: 'Dire Straits', album: 'Dire Straits', thumbnail: 'https://i.ytimg.com/vi/h0ffIJ7ZO4U/hqdefault.jpg', duration: 348 },
      { videoId: 'YkgkThbgXDC', title: 'Imagine', artist: 'John Lennon', album: 'Imagine', thumbnail: 'https://i.ytimg.com/vi/YkgkThbgXDC/hqdefault.jpg', duration: 183 },
      { videoId: 'gY5rFSUOagE', title: 'Baba O\'Riley', artist: 'The Who', album: 'Who\'s Next', thumbnail: 'https://i.ytimg.com/vi/gY5rFSUOagE/hqdefault.jpg', duration: 300 }
    ]
  },
  {
    id: 'decade-80s',
    title: 'Hymnes Années 80',
    description: 'Billie Jean, Take On Me, L\'aventurier, Un autre monde... Les légendes de la synthpop et du rock',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
    era: '80s',
    tracks: [
      { videoId: 'Zi_XLOBDo_Y', title: 'Billie Jean', artist: 'Michael Jackson', album: 'Thriller', thumbnail: 'https://i.ytimg.com/vi/Zi_XLOBDo_Y/hqdefault.jpg', duration: 294 },
      { videoId: 'djV11Xbc914', title: 'Take On Me', artist: 'a-ha', album: 'Hunting High and Low', thumbnail: 'https://i.ytimg.com/vi/djV11Xbc914/hqdefault.jpg', duration: 227 },
      { videoId: 'v1pQk055e_Q', title: 'L\'aventurier', artist: 'Indochine', album: 'L\'aventurier', thumbnail: 'https://i.ytimg.com/vi/v1pQk055e_Q/hqdefault.jpg', duration: 229 },
      { videoId: 'vY6R9nQj5Gg', title: 'Un autre monde', artist: 'Téléphone', album: 'Un autre monde', thumbnail: 'https://i.ytimg.com/vi/vY6R9nQj5Gg/hqdefault.jpg', duration: 270 },
      { videoId: 'OMOGaugKpzs', title: 'Every Breath You Take', artist: 'The Police', album: 'Synchronicity', thumbnail: 'https://i.ytimg.com/vi/OMOGaugKpzs/hqdefault.jpg', duration: 253 },
      { videoId: 'TvnYWHp6B28', title: 'Purple Rain', artist: 'Prince', album: 'Purple Rain', thumbnail: 'https://i.ytimg.com/vi/TvnYWHp6B28/hqdefault.jpg', duration: 520 },
      { videoId: 's__rX_WL100', title: 'Like a Virgin', artist: 'Madonna', album: 'Like a Virgin', thumbnail: 'https://i.ytimg.com/vi/s__rX_WL100/hqdefault.jpg', duration: 218 },
      { videoId: 'PIb6AZdTr-A', title: 'Girls Just Want to Have Fun', artist: 'Cyndi Lauper', album: 'She\'s So Unusual', thumbnail: 'https://i.ytimg.com/vi/PIb6AZdTr-A/hqdefault.jpg', duration: 235 },
      { videoId: 'pIgZ7gMze7A', title: 'Wake Me Up Before You Go-Go', artist: 'Wham!', album: 'Make It Big', thumbnail: 'https://i.ytimg.com/vi/pIgZ7gMze7A/hqdefault.jpg', duration: 231 },
      { videoId: 'izGwDsrQ1eQ', title: 'Careless Whisper', artist: 'George Michael', album: 'Make It Big', thumbnail: 'https://i.ytimg.com/vi/izGwDsrQ1eQ/hqdefault.jpg', duration: 302 },
      { videoId: 'rY0WxgSXdEE', title: 'Another One Bites the Dust', artist: 'Queen', album: 'The Game', thumbnail: 'https://i.ytimg.com/vi/rY0WxgSXdEE/hqdefault.jpg', duration: 215 },
      { videoId: 'eH3giaIzONA', title: 'I Wanna Dance with Somebody', artist: 'Whitney Houston', album: 'Whitney', thumbnail: 'https://i.ytimg.com/vi/eH3giaIzONA/hqdefault.jpg', duration: 291 },
      { videoId: 'lDK9QqIzhwk', title: 'Livin\' On A Prayer', artist: 'Bon Jovi', album: 'Slippery When Wet', thumbnail: 'https://i.ytimg.com/vi/lDK9QqIzhwk/hqdefault.jpg', duration: 249 },
      { videoId: '1w7OgIMMRc4', title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', album: 'Appetite for Destruction', thumbnail: 'https://i.ytimg.com/vi/1w7OgIMMRc4/hqdefault.jpg', duration: 356 },
      { videoId: 'xjlbZlDAwAE', title: 'With Or Without You', artist: 'U2', album: 'The Joshua Tree', thumbnail: 'https://i.ytimg.com/vi/xjlbZlDAwAE/hqdefault.jpg', duration: 296 },
      { videoId: 'aGSKrC7dGcY', title: 'Enjoy The Silence', artist: 'Depeche Mode', album: 'Violator', thumbnail: 'https://i.ytimg.com/vi/aGSKrC7dGcY/hqdefault.jpg', duration: 256 },
      { videoId: 'oJL-lCzEXgI', title: 'Hungry Like the Wolf', artist: 'Duran Duran', album: 'Rio', thumbnail: 'https://i.ytimg.com/vi/oJL-lCzEXgI/hqdefault.jpg', duration: 221 },
      { videoId: 'qeMFqkcPYcg', title: 'Sweet Dreams (Are Made of This)', artist: 'Eurythmics', album: 'Sweet Dreams', thumbnail: 'https://i.ytimg.com/vi/qeMFqkcPYcg/hqdefault.jpg', duration: 216 },
      { videoId: 'aGCdLKXNFzw', title: 'Everybody Wants To Rule The World', artist: 'Tears for Fears', album: 'Songs from the Big Chair', thumbnail: 'https://i.ytimg.com/vi/aGCdLKXNFzw/hqdefault.jpg', duration: 251 },
      { videoId: 'FTQbiNvZqaY', title: 'Africa', artist: 'Toto', album: 'Toto IV', thumbnail: 'https://i.ytimg.com/vi/FTQbiNvZqaY/hqdefault.jpg', duration: 295 },
      { videoId: '1k8craCGwV4', title: 'Don\'t Stop Believin\'', artist: 'Journey', album: 'Escape', thumbnail: 'https://i.ytimg.com/vi/1k8craCGwV4/hqdefault.jpg', duration: 250 },
      { videoId: 'eFjjO_lhf9c', title: 'Summer Of \'69', artist: 'Bryan Adams', album: 'Reckless', thumbnail: 'https://i.ytimg.com/vi/eFjjO_lhf9c/hqdefault.jpg', duration: 216 },
      { videoId: 'YkADj0TPrJA', title: 'In The Air Tonight', artist: 'Phil Collins', album: 'Face Value', thumbnail: 'https://i.ytimg.com/vi/YkADj0TPrJA/hqdefault.jpg', duration: 334 },
      { videoId: 'EPhWR4d3FJQ', title: 'Born in the U.S.A.', artist: 'Bruce Springsteen', album: 'Born in the U.S.A.', thumbnail: 'https://i.ytimg.com/vi/EPhWR4d3FJQ/hqdefault.jpg', duration: 279 },
      { videoId: 'oGpFcHTujAo', title: 'What\'s Love Got to Do with It', artist: 'Tina Turner', album: 'Private Dancer', thumbnail: 'https://i.ytimg.com/vi/oGpFcHTujAo/hqdefault.jpg', duration: 228 },
      { videoId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', album: 'Whenever You Need Somebody', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', duration: 213 },
      { videoId: 't1TcDHrkQYg', title: 'Forever Young', artist: 'Alphaville', album: 'Forever Young', thumbnail: 'https://i.ytimg.com/vi/t1TcDHrkQYg/hqdefault.jpg', duration: 226 },
      { videoId: 'XZVmAQBM6hM', title: 'Tainted Love', artist: 'Soft Cell', album: 'Non-Stop Erotic Cabaret', thumbnail: 'https://i.ytimg.com/vi/XZVmAQBM6hM/hqdefault.jpg', duration: 163 },
      { videoId: '4kHl4FoK1Ys', title: 'You\'re My Heart, You\'re My Soul', artist: 'Modern Talking', album: 'The 1st Album', thumbnail: 'https://i.ytimg.com/vi/4kHl4FoK1Ys/hqdefault.jpg', duration: 238 },
      { videoId: 'btPJPFnesV4', title: 'Eye of the Tiger', artist: 'Survivor', album: 'Eye of the Tiger', thumbnail: 'https://i.ytimg.com/vi/btPJPFnesV4/hqdefault.jpg', duration: 245 }
    ]
  },
  {
    id: 'decade-90s',
    title: 'Explosion Années 90',
    description: 'Nirvana, Daft Punk, Oasis, MC Solaar... Le Rock Alternatif, le Rap US/FR et la French Touch',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    era: '90s',
    tracks: [
      { videoId: 'hTWKbfoiklM', title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', thumbnail: 'https://i.ytimg.com/vi/hTWKbfoiklM/hqdefault.jpg', duration: 301 },
      { videoId: 'K0HSD_i2Uzg', title: 'Around The World', artist: 'Daft Punk', album: 'Homework', thumbnail: 'https://i.ytimg.com/vi/K0HSD_i2Uzg/hqdefault.jpg', duration: 240 },
      { videoId: '6hzrDeceEKc', title: 'Wonderwall', artist: 'Oasis', album: '(What\'s the Story) Morning Glory?', thumbnail: 'https://i.ytimg.com/vi/6hzrDeceEKc/hqdefault.jpg', duration: 258 },
      { videoId: 'uU3xL0nE5y8', title: 'Caroline', artist: 'MC Solaar', album: 'Qui sème le vent récolte le tempo', thumbnail: 'https://i.ytimg.com/vi/uU3xL0nE5y8/hqdefault.jpg', duration: 282 },
      { videoId: '1lyu1KKwC74', title: 'Bitter Sweet Symphony', artist: 'The Verve', album: 'Urban Hymns', thumbnail: 'https://i.ytimg.com/vi/1lyu1KKwC74/hqdefault.jpg', duration: 275 },
      { videoId: 'lwlogyj7nFE', title: 'Under The Bridge', artist: 'Red Hot Chili Peppers', album: 'Blood Sugar Sex Magik', thumbnail: 'https://i.ytimg.com/vi/lwlogyj7nFE/hqdefault.jpg', duration: 264 },
      { videoId: 'XFkzRNyyg15', title: 'Creep', artist: 'Radiohead', album: 'Pablo Honey', thumbnail: 'https://i.ytimg.com/vi/XFkzRNyyg15/hqdefault.jpg', duration: 236 },
      { videoId: 'eBG7P-K-r1Y', title: 'Everlong', artist: 'Foo Fighters', album: 'The Colour and the Shape', thumbnail: 'https://i.ytimg.com/vi/eBG7P-K-r1Y/hqdefault.jpg', duration: 250 },
      { videoId: 'xwtdhWltSIg', title: 'Losing My Religion', artist: 'R.E.M.', album: 'Out of Time', thumbnail: 'https://i.ytimg.com/vi/xwtdhWltSIg/hqdefault.jpg', duration: 268 },
      { videoId: 'NUTGr5t3MoY', title: 'Basket Case', artist: 'Green Day', album: 'Dookie', thumbnail: 'https://i.ytimg.com/vi/NUTGr5t3MoY/hqdefault.jpg', duration: 183 },
      { videoId: '3mbBbFH9fAg', title: 'Black Hole Sun', artist: 'Soundgarden', album: 'Superunknown', thumbnail: 'https://i.ytimg.com/vi/3mbBbFH9fAg/hqdefault.jpg', duration: 318 },
      { videoId: 'qM0zINtulhM', title: 'Alive', artist: 'Pearl Jam', album: 'Ten', thumbnail: 'https://i.ytimg.com/vi/qM0zINtulhM/hqdefault.jpg', duration: 341 },
      { videoId: 'SSbQ1aKU158', title: 'Song 2', artist: 'Blur', album: 'Blur', thumbnail: 'https://i.ytimg.com/vi/SSbQ1aKU158/hqdefault.jpg', duration: 122 },
      { videoId: 'wmin5WkOuPw', title: 'Firestarter', artist: 'The Prodigy', album: 'The Fat of the Land', thumbnail: 'https://i.ytimg.com/vi/wmin5WkOuPw/hqdefault.jpg', duration: 285 },
      { videoId: 'ruAi4VboUB6', title: 'Praise You', artist: 'Fatboy Slim', album: 'You\'ve Come a Long Way, Baby', thumbnail: 'https://i.ytimg.com/vi/ruAi4VboUB6/hqdefault.jpg', duration: 223 },
      { videoId: '4JkIs37aBU8', title: 'Virtual Insanity', artist: 'Jamiroquai', album: 'Travelling Without Moving', thumbnail: 'https://i.ytimg.com/vi/4JkIs37aBU8/hqdefault.jpg', duration: 230 },
      { videoId: 'gJLIiF15fjQ', title: 'Wannabe', artist: 'Spice Girls', album: 'Spice', thumbnail: 'https://i.ytimg.com/vi/gJLIiF15fjQ/hqdefault.jpg', duration: 173 },
      { videoId: '4fndeDfaWCg', title: 'I Want It That Way', artist: 'Backstreet Boys', album: 'Millennium', thumbnail: 'https://i.ytimg.com/vi/4fndeDfaWCg/hqdefault.jpg', duration: 213 },
      { videoId: '8WEtxJ4-sh4', title: 'Waterfalls', artist: 'TLC', album: 'CrazySexyCool', thumbnail: 'https://i.ytimg.com/vi/8WEtxJ4-sh4/hqdefault.jpg', duration: 279 },
      { videoId: 'C-u5WLJ9Yk4', title: '...Baby One More Time', artist: 'Britney Spears', album: '...Baby One More Time', thumbnail: 'https://i.ytimg.com/vi/C-u5WLJ9Yk4/hqdefault.jpg', duration: 211 },
      { videoId: 'sNPnbI1arSE', title: 'My Name Is', artist: 'Eminem', album: 'The Slim Shady LP', thumbnail: 'https://i.ytimg.com/vi/sNPnbI1arSE/hqdefault.jpg', duration: 268 },
      { videoId: '0CxrZuu83l8', title: 'Gin and Juice', artist: 'Snoop Dogg', album: 'Doggystyle', thumbnail: 'https://i.ytimg.com/vi/0CxrZuu83l8/hqdefault.jpg', duration: 211 },
      { videoId: '5wBTdfBNqXA', title: 'California Love', artist: '2Pac', album: 'All Eyez on Me', thumbnail: 'https://i.ytimg.com/vi/5wBTdfBNqXA/hqdefault.jpg', duration: 285 },
      { videoId: '_CL6n0FJZpk', title: 'Still D.R.E.', artist: 'Dr. Dre ft. Snoop Dogg', album: '2001', thumbnail: 'https://i.ytimg.com/vi/_CL6n0FJZpk/hqdefault.jpg', duration: 271 },
      { videoId: 'z5-bZUk4p2g', title: 'Juicy', artist: 'The Notorious B.I.G.', album: 'Ready to Die', thumbnail: 'https://i.ytimg.com/vi/z5-bZUk4p2g/hqdefault.jpg', duration: 303 },
      { videoId: 'TR3Vdo5etCQ', title: 'Don\'t Speak', artist: 'No Doubt', album: 'Tragic Kingdom', thumbnail: 'https://i.ytimg.com/vi/TR3Vdo5etCQ/hqdefault.jpg', duration: 263 },
      { videoId: 'Jne9t8sHpUc', title: 'Ironic', artist: 'Alanis Morissette', album: 'Jagged Little Pill', thumbnail: 'https://i.ytimg.com/vi/Jne9t8sHpUc/hqdefault.jpg', duration: 229 },
      { videoId: '6Ejga4kJUts', title: 'Zombie', artist: 'The Cranberries', album: 'No Need to Argue', thumbnail: 'https://i.ytimg.com/vi/6Ejga4kJUts/hqdefault.jpg', duration: 307 },
      { videoId: 'b00Lw727mB0', title: 'Petit frère', artist: 'IAM', album: 'L\'école du micro d\'argent', thumbnail: 'https://i.ytimg.com/vi/b00Lw727mB0/hqdefault.jpg', duration: 284 },
      { videoId: '4GA2YI5aECA', title: 'La Tribu de Dana', artist: 'Manau', album: 'Panique celtique', thumbnail: 'https://i.ytimg.com/vi/4GA2YI5aECA/hqdefault.jpg', duration: 287 }
    ]
  },
  {
    id: 'decade-2000s',
    title: 'Génération Années 2000',
    description: 'Linkin Park, Eminem, Daft Punk, Beyoncé, Gorillaz... Les monstres sacrés des années 2000',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    era: '2000s',
    tracks: [
      { videoId: 'kXYiU_JCYtU', title: 'Numb', artist: 'Linkin Park', album: 'Meteora', thumbnail: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg', duration: 187 },
      { videoId: '_Yhyp-_hX2s', title: 'Lose Yourself', artist: 'Eminem', album: '8 Mile', thumbnail: 'https://i.ytimg.com/vi/_Yhyp-_hX2s/hqdefault.jpg', duration: 326 },
      { videoId: 'FGBhQbmPwH8', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery', thumbnail: 'https://i.ytimg.com/vi/FGBhQbmPwH8/hqdefault.jpg', duration: 320 },
      { videoId: 'ViwtNLUqk4Y', title: 'Crazy In Love', artist: 'Beyoncé ft. JAY-Z', album: 'Dangerously in Love', thumbnail: 'https://i.ytimg.com/vi/ViwtNLUqk4Y/hqdefault.jpg', duration: 236 },
      { videoId: 'HyHNuVaZJ-k', title: 'Feel Good Inc.', artist: 'Gorillaz', album: 'Demon Days', thumbnail: 'https://i.ytimg.com/vi/HyHNuVaZJ-k/hqdefault.jpg', duration: 222 },
      { videoId: 'dvgZkm1xWPE', title: 'Viva La Vida', artist: 'Coldplay', album: 'Viva la Vida or Death and All His Friends', thumbnail: 'https://i.ytimg.com/vi/dvgZkm1xWPE/hqdefault.jpg', duration: 242 },
      { videoId: '3YxaaGgTQYM', title: 'Bring Me To Life', artist: 'Evanescence', album: 'Fallen', thumbnail: 'https://i.ytimg.com/vi/3YxaaGgTQYM/hqdefault.jpg', duration: 237 },
      { videoId: 'Soa3gO7tL-c', title: 'Boulevard Of Broken Dreams', artist: 'Green Day', album: 'American Idiot', thumbnail: 'https://i.ytimg.com/vi/Soa3gO7tL-c/hqdefault.jpg', duration: 260 },
      { videoId: 'Xsp3_a-PMTw', title: 'Supermassive Black Hole', artist: 'Muse', album: 'Black Holes and Revelations', thumbnail: 'https://i.ytimg.com/vi/Xsp3_a-PMTw/hqdefault.jpg', duration: 212 },
      { videoId: 'gGdGFtwCNBE', title: 'Mr. Brightside', artist: 'The Killers', album: 'Hot Fuss', thumbnail: 'https://i.ytimg.com/vi/gGdGFtwCNBE/hqdefault.jpg', duration: 222 },
      { videoId: 'iywaBOMvYLI', title: 'Toxicity', artist: 'System of a Down', album: 'Toxicity', thumbnail: 'https://i.ytimg.com/vi/iywaBOMvYLI/hqdefault.jpg', duration: 219 },
      { videoId: 'CvBfHwUxHIk', title: 'Umbrella', artist: 'Rihanna', album: 'Good Girl Gone Bad', thumbnail: 'https://i.ytimg.com/vi/CvBfHwUxHIk/hqdefault.jpg', duration: 275 },
      { videoId: '3gOHvDP_dog', title: 'SexyBack', artist: 'Justin Timberlake', album: 'FutureSex/LoveSounds', thumbnail: 'https://i.ytimg.com/vi/3gOHvDP_dog/hqdefault.jpg', duration: 242 },
      { videoId: 'PsO6ZnUZI0g', title: 'Stronger', artist: 'Kanye West', album: 'Graduation', thumbnail: 'https://i.ytimg.com/vi/PsO6ZnUZI0g/hqdefault.jpg', duration: 312 },
      { videoId: '0UjsXo9l6I8', title: 'Empire State of Mind', artist: 'JAY-Z ft. Alicia Keys', album: 'The Blueprint 3', thumbnail: 'https://i.ytimg.com/vi/0UjsXo9l6I8/hqdefault.jpg', duration: 276 },
      { videoId: 'PWgvGjAhvIw', title: 'Hey Ya!', artist: 'Outkast', album: 'Speakerboxxx/The Love Below', thumbnail: 'https://i.ytimg.com/vi/PWgvGjAhvIw/hqdefault.jpg', duration: 235 },
      { videoId: 'uSD4vsh1zDA', title: 'I Gotta Feeling', artist: 'Black Eyed Peas', album: 'The E.N.D.', thumbnail: 'https://i.ytimg.com/vi/uSD4vsh1zDA/hqdefault.jpg', duration: 249 },
      { videoId: 'DUT5rEU6neM', title: 'Hips Don\'t Lie', artist: 'Shakira ft. Wyclef Jean', album: 'Oral Fixation, Vol. 2', thumbnail: 'https://i.ytimg.com/vi/DUT5rEU6neM/hqdefault.jpg', duration: 218 },
      { videoId: 'LOZuxwoc7B8', title: 'Toxic', artist: 'Britney Spears', album: 'In the Zone', thumbnail: 'https://i.ytimg.com/vi/LOZuxwoc7B8/hqdefault.jpg', duration: 199 },
      { videoId: '5NPBIwQyPWE', title: 'Complicated', artist: 'Avril Lavigne', album: 'Let Go', thumbnail: 'https://i.ytimg.com/vi/5NPBIwQyPWE/hqdefault.jpg', duration: 244 },
      { videoId: 'YlUKcNNmywk', title: 'Californication', artist: 'Red Hot Chili Peppers', album: 'Californication', thumbnail: 'https://i.ytimg.com/vi/YlUKcNNmywk/hqdefault.jpg', duration: 321 },
      { videoId: 'SBjQ9tuuTJQ', title: 'The Pretender', artist: 'Foo Fighters', album: 'Echoes, Silence, Patience & Grace', thumbnail: 'https://i.ytimg.com/vi/SBjQ9tuuTJQ/hqdefault.jpg', duration: 270 },
      { videoId: 'pdoV9UfOBOc', title: 'I Bet You Look Good On The Dancefloor', artist: 'Arctic Monkeys', album: 'Whatever People Say I Am, That\'s What I\'m Not', thumbnail: 'https://i.ytimg.com/vi/pdoV9UfOBOc/hqdefault.jpg', duration: 173 },
      { videoId: '5qm8PH4xAss', title: 'In Da Club', artist: '50 Cent', album: 'Get Rich or Die Tryin\'', thumbnail: 'https://i.ytimg.com/vi/5qm8PH4xAss/hqdefault.jpg', duration: 228 },
      { videoId: 'GxBSyx85Kp8', title: 'Yeah!', artist: 'Usher ft. Lil Jon & Ludacris', album: 'Confessions', thumbnail: 'https://i.ytimg.com/vi/GxBSyx85Kp8/hqdefault.jpg', duration: 250 },
      { videoId: 'rywUS-ohqeE', title: 'No One', artist: 'Alicia Keys', album: 'As I Am', thumbnail: 'https://i.ytimg.com/vi/rywUS-ohqeE/hqdefault.jpg', duration: 253 },
      { videoId: 'KUmZp8PR1uc', title: 'Rehab', artist: 'Amy Winehouse', album: 'Back to Black', thumbnail: 'https://i.ytimg.com/vi/KUmZp8PR1uc/hqdefault.jpg', duration: 215 },
      { videoId: 'bESGLojNYDo', title: 'Poker Face', artist: 'Lady Gaga', album: 'The Fame', thumbnail: 'https://i.ytimg.com/vi/bESGLojNYDo/hqdefault.jpg', duration: 238 },
      { videoId: '5NV6Rdv1a3I', title: 'Harder, Better, Faster, Stronger', artist: 'Daft Punk', album: 'Discovery', thumbnail: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/hqdefault.jpg', duration: 224 }
    ]
  },
  {
    id: 'decade-2010s',
    title: 'Pop & Streaming Années 2010',
    description: 'The Weeknd, Avicii, Stromae, PNL, Adele... L\'âge d\'or des plateformes et des hits mondiaux',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&auto=format&fit=crop&q=80',
    era: '2010s',
    tracks: [
      { videoId: '4NRXx6U8ABQ', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg', duration: 200 },
      { videoId: 'IcrbM1l_BoI', title: 'Wake Me Up', artist: 'Avicii', album: 'True', thumbnail: 'https://i.ytimg.com/vi/IcrbM1l_BoI/hqdefault.jpg', duration: 247 },
      { videoId: 'oiKj0Z_Xnjc', title: 'Papaoutai', artist: 'Stromae', album: 'Racine Carrée', thumbnail: 'https://i.ytimg.com/vi/oiKj0Z_Xnjc/hqdefault.jpg', duration: 232 },
      { videoId: 'BtyHYIHEaDA', title: 'Au DD', artist: 'PNL', album: 'Deux Frères', thumbnail: 'https://i.ytimg.com/vi/BtyHYIHEaDA/hqdefault.jpg', duration: 240 },
      { videoId: 'rYEDA3JcQqw', title: 'Rolling in the Deep', artist: 'Adele', album: '21', thumbnail: 'https://i.ytimg.com/vi/rYEDA3JcQqw/hqdefault.jpg', duration: 228 },
      { videoId: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', album: 'Uptown Special', thumbnail: 'https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg', duration: 270 },
      { videoId: 'uxp33D-KpBk', title: 'Hotline Bling', artist: 'Drake', album: 'Views', thumbnail: 'https://i.ytimg.com/vi/uxp33D-KpBk/hqdefault.jpg', duration: 267 },
      { videoId: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', album: '÷', thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg', duration: 233 },
      { videoId: 'nfWlot6h_JM', title: 'Shake It Off', artist: 'Taylor Swift', album: '1989', thumbnail: 'https://i.ytimg.com/vi/nfWlot6h_JM/hqdefault.jpg', duration: 219 },
      { videoId: 'tvTRZJ-4EyI', title: 'HUMBLE.', artist: 'Kendrick Lamar', album: 'DAMN.', thumbnail: 'https://i.ytimg.com/vi/tvTRZJ-4EyI/hqdefault.jpg', duration: 177 },
      { videoId: 'ktvTqWJM018', title: 'Radioactive', artist: 'Imagine Dragons', album: 'Night Visions', thumbnail: 'https://i.ytimg.com/vi/ktvTqWJM018/hqdefault.jpg', duration: 186 },
      { videoId: '2vjPBrBU-TM', title: 'Chandelier', artist: 'Sia', album: '1000 Forms of Fear', thumbnail: 'https://i.ytimg.com/vi/2vjPBrBU-TM/hqdefault.jpg', duration: 216 },
      { videoId: 'JRfuAukYTKg', title: 'Titanium', artist: 'David Guetta ft. Sia', album: 'Nothing but the Beat', thumbnail: 'https://i.ytimg.com/vi/JRfuAukYTKg/hqdefault.jpg', duration: 245 },
      { videoId: 'ebXbLfLACGM', title: 'Summer', artist: 'Calvin Harris', album: 'Motion', thumbnail: 'https://i.ytimg.com/vi/ebXbLfLACGM/hqdefault.jpg', duration: 214 },
      { videoId: '5NV6Rdv1a3I', title: 'Get Lucky', artist: 'Daft Punk ft. Pharrell Williams', album: 'Random Access Memories', thumbnail: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/hqdefault.jpg', duration: 248 },
      { videoId: 'ZbZSe6N_BXs', title: 'Happy', artist: 'Pharrell Williams', album: 'Girl', thumbnail: 'https://i.ytimg.com/vi/ZbZSe6N_BXs/hqdefault.jpg', duration: 233 },
      { videoId: 'nlcIKh6sBtc', title: 'Royals', artist: 'Lorde', album: 'Pure Heroine', thumbnail: 'https://i.ytimg.com/vi/nlcIKh6sBtc/hqdefault.jpg', duration: 190 },
      { videoId: 'TdrL3QxjyVw', title: 'Summertime Sadness', artist: 'Lana Del Rey', album: 'Born to Die', thumbnail: 'https://i.ytimg.com/vi/TdrL3QxjyVw/hqdefault.jpg', duration: 265 },
      { videoId: 'hT_nvWreIhg', title: 'Counting Stars', artist: 'OneRepublic', album: 'Native', thumbnail: 'https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg', duration: 257 },
      { videoId: 'pXRviuL6v35', title: 'Stressed Out', artist: 'Twenty One Pilots', album: 'Blurryface', thumbnail: 'https://i.ytimg.com/vi/pXRviuL6v35/hqdefault.jpg', duration: 202 },
      { videoId: 'PT2_F-1esPk', title: 'Closer', artist: 'The Chainsmokers ft. Halsey', album: 'Collage', thumbnail: 'https://i.ytimg.com/vi/PT2_F-1esPk/hqdefault.jpg', duration: 245 },
      { videoId: 'UceaB4D0jpo', title: 'Rockstar', artist: 'Post Malone ft. 21 Savage', album: 'beerbongs & bentleys', thumbnail: 'https://i.ytimg.com/vi/UceaB4D0jpo/hqdefault.jpg', duration: 218 },
      { videoId: 'k2qgadSVNyU', title: 'New Rules', artist: 'Dua Lipa', album: 'Dua Lipa', thumbnail: 'https://i.ytimg.com/vi/k2qgadSVNyU/hqdefault.jpg', duration: 209 },
      { videoId: 'DyDfgMOUjCI', title: 'bad guy', artist: 'Billie Eilish', album: 'WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?', thumbnail: 'https://i.ytimg.com/vi/DyDfgMOUjCI/hqdefault.jpg', duration: 194 },
      { videoId: '6ONRf7h3Mdk', title: 'SICKO MODE', artist: 'Travis Scott', album: 'ASTROWORLD', thumbnail: 'https://i.ytimg.com/vi/6ONRf7h3Mdk/hqdefault.jpg', duration: 312 },
      { videoId: 'pssIGfvlP40', title: 'Basique', artist: 'Orelsan', album: 'La fête est finie', thumbnail: 'https://i.ytimg.com/vi/pssIGfvlP40/hqdefault.jpg', duration: 164 },
      { videoId: 'Hi7Rx3En7-w', title: 'Balance ton quoi', artist: 'Angèle', album: 'Brol', thumbnail: 'https://i.ytimg.com/vi/Hi7Rx3En7-w/hqdefault.jpg', duration: 189 },
      { videoId: 'YqeW9_5kURI', title: 'Lean On', artist: 'Major Lazer & DJ Snake', album: 'Peace Is the Mission', thumbnail: 'https://i.ytimg.com/vi/YqeW9_5kURI/hqdefault.jpg', duration: 176 },
      { videoId: '8UVNT4wvIGY', title: 'Somebody That I Used To Know', artist: 'Gotye ft. Kimbra', album: 'Making Mirrors', thumbnail: 'https://i.ytimg.com/vi/8UVNT4wvIGY/hqdefault.jpg', duration: 244 },
      { videoId: 'SDTZ7iX4vTQ', title: 'Pumped Up Kicks', artist: 'Foster The People', album: 'Torches', thumbnail: 'https://i.ytimg.com/vi/SDTZ7iX4vTQ/hqdefault.jpg', duration: 239 }
    ]
  },
  {
    id: 'decade-2020s',
    title: 'Hits & Tendances Années 2020',
    description: 'Sabrina Carpenter, Billie Eilish, Kendrick Lamar, Charli xcx, Lady Gaga & Bruno Mars',
    cover: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    era: '2020s',
    tracks: [
      { videoId: 'eVli-tstM5E', title: 'Espresso', artist: 'Sabrina Carpenter', album: 'Short n\' Sweet', thumbnail: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg', duration: 175 },
      { videoId: 'd5g4u0R2oY0', title: 'BIRDS OF A FEATHER', artist: 'Billie Eilish', album: 'HIT ME HARD AND SOFT', thumbnail: 'https://i.ytimg.com/vi/d5g4u0R2oY0/hqdefault.jpg', duration: 198 },
      { videoId: 'H58vbez_m4E', title: 'Not Like Us', artist: 'Kendrick Lamar', album: 'Not Like Us - Single', thumbnail: 'https://i.ytimg.com/vi/H58vbez_m4E/hqdefault.jpg', duration: 274 },
      { videoId: 'kPa7bsKwL-c', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', album: 'Die With A Smile - Single', thumbnail: 'https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg', duration: 251 },
      { videoId: 'wNyk_7pPMkE', title: '360', artist: 'Charli xcx', album: 'BRAT', thumbnail: 'https://i.ytimg.com/vi/wNyk_7pPMkE/hqdefault.jpg', duration: 133 },
      { videoId: '1-SIG-r8318', title: 'Good Luck, Babe!', artist: 'Chappell Roan', album: 'Good Luck, Babe! - Single', thumbnail: 'https://i.ytimg.com/vi/1-SIG-r8318/hqdefault.jpg', duration: 218 },
      { videoId: 'MLlSSJ0z7xM', title: 'Dancing In The Flames', artist: 'The Weeknd', album: 'Hurry Up Tomorrow', thumbnail: 'https://i.ytimg.com/vi/MLlSSJ0z7xM/hqdefault.jpg', duration: 220 },
      { videoId: 'suAR1PYFnyA', title: 'Houdini', artist: 'Dua Lipa', album: 'Radical Optimism', thumbnail: 'https://i.ytimg.com/vi/suAR1PYFnyA/hqdefault.jpg', duration: 185 },
      { videoId: 'ZIfF8T6kY7c', title: 'vampire', artist: 'Olivia Rodrigo', album: 'GUTS', thumbnail: 'https://i.ytimg.com/vi/ZIfF8T6kY7c/hqdefault.jpg', duration: 219 },
      { videoId: 'MSRcC62y338', title: 'Kill Bill', artist: 'SZA', album: 'SOS', thumbnail: 'https://i.ytimg.com/vi/MSRcC62y338/hqdefault.jpg', duration: 153 },
      { videoId: 'H5v3kku4y6Q', title: 'As It Was', artist: 'Harry Styles', album: 'Harry\'s House', thumbnail: 'https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg', duration: 167 },
      { videoId: 'ic8j13gRBSY', title: 'Cruel Summer', artist: 'Taylor Swift', album: 'Lover', thumbnail: 'https://i.ytimg.com/vi/ic8j13gRBSY/hqdefault.jpg', duration: 178 },
      { videoId: 'G2_A6d3R-3g', title: 'CUFF IT', artist: 'Beyoncé', album: 'RENAISSANCE', thumbnail: 'https://i.ytimg.com/vi/G2_A6d3R-3g/hqdefault.jpg', duration: 225 },
      { videoId: 'G7KNmW9a75Y', title: 'Flowers', artist: 'Miley Cyrus', album: 'Endless Summer Vacation', thumbnail: 'https://i.ytimg.com/vi/G7KNmW9a75Y/hqdefault.jpg', duration: 200 },
      { videoId: 'TIW1-3A4yJ4', title: 'greedy', artist: 'Tate McRae', album: 'THINK LATER', thumbnail: 'https://i.ytimg.com/vi/TIW1-3A4yJ4/hqdefault.jpg', duration: 131 },
      { videoId: 'Oa_RSwwpPaA', title: 'Beautiful Things', artist: 'Benson Boone', album: 'Fireworks & Rollerblades', thumbnail: 'https://i.ytimg.com/vi/Oa_RSwwpPaA/hqdefault.jpg', duration: 180 },
      { videoId: 'GZ3zL7ApV_8', title: 'Lose Control', artist: 'Teddy Swims', album: 'I\'ve Tried Everything But Therapy (Part 1)', thumbnail: 'https://i.ytimg.com/vi/GZ3zL7ApV_8/hqdefault.jpg', duration: 210 },
      { videoId: 'a7fzkqL_V8o', title: 'Too Sweet', artist: 'Hozier', album: 'Unheard', thumbnail: 'https://i.ytimg.com/vi/a7fzkqL_V8o/hqdefault.jpg', duration: 251 },
      { videoId: 'c5pE-kS-2S0', title: 'MILLION DOLLAR BABY', artist: 'Tommy Richman', album: 'MILLION DOLLAR BABY - Single', thumbnail: 'https://i.ytimg.com/vi/c5pE-kS-2S0/hqdefault.jpg', duration: 155 },
      { videoId: 'ekr2nIex040', title: 'APT.', artist: 'ROSÉ & Bruno Mars', album: 'rosie', thumbnail: 'https://i.ytimg.com/vi/ekr2nIex040/hqdefault.jpg', duration: 169 },
      { videoId: 'c38r-h8564o', title: 'Please Please Please', artist: 'Sabrina Carpenter', album: 'Short n\' Sweet', thumbnail: 'https://i.ytimg.com/vi/c38r-h8564o/hqdefault.jpg', duration: 186 },
      { videoId: 'QeR_b5fD46w', title: 'LUNCH', artist: 'Billie Eilish', album: 'HIT ME HARD AND SOFT', thumbnail: 'https://i.ytimg.com/vi/QeR_b5fD46w/hqdefault.jpg', duration: 180 },
      { videoId: 'bF2_N1l-n3k', title: 'SPIDER', artist: 'GIMS ft. Dystinct', album: 'SPIDER - Single', thumbnail: 'https://i.ytimg.com/vi/bF2_N1l-n3k/hqdefault.jpg', duration: 188 }
    ]
  }
];

export const GENRE_PLAYLISTS = [
  {
    id: 'genre-pop',
    title: 'Pop & mainstream',
    genre: 'Pop',
    description: 'Les plus grands tubes pop du moment et incontournables mondiaux',
    color: 'from-pink-600 to-purple-800',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    tracks: [
      { videoId: 'eVli-tstM5E', title: 'Espresso', artist: 'Sabrina Carpenter', album: 'Short n\' Sweet', thumbnail: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg', duration: 175, genre: 'Pop' },
      { videoId: 'd5g4u0R2oY0', title: 'BIRDS OF A FEATHER', artist: 'Billie Eilish', album: 'HIT ME HARD AND SOFT', thumbnail: 'https://i.ytimg.com/vi/d5g4u0R2oY0/hqdefault.jpg', duration: 198, genre: 'Pop' },
      { videoId: 'kPa7bsKwL-c', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', album: 'Die With A Smile', thumbnail: 'https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg', duration: 251, genre: 'Pop' },
      { videoId: '1-SIG-r8318', title: 'Good Luck, Babe!', artist: 'Chappell Roan', album: 'Good Luck, Babe!', thumbnail: 'https://i.ytimg.com/vi/1-SIG-r8318/hqdefault.jpg', duration: 218, genre: 'Pop' },
      { videoId: 'ic8j13gRBSY', title: 'Cruel Summer', artist: 'Taylor Swift', album: 'Lover', thumbnail: 'https://i.ytimg.com/vi/ic8j13gRBSY/hqdefault.jpg', duration: 178, genre: 'Pop' }
    ]
  },
  {
    id: 'genre-rap',
    title: 'Rap & Hip-Hop',
    genre: 'Rap/Hip-Hop',
    description: 'Bangers US et FR, punchlines et productions lourdes',
    color: 'from-amber-600 to-orange-800',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
    tracks: [
      { videoId: 'H58vbez_m4E', title: 'Not Like Us', artist: 'Kendrick Lamar', album: 'Not Like Us', thumbnail: 'https://i.ytimg.com/vi/H58vbez_m4E/hqdefault.jpg', duration: 274, genre: 'Rap' },
      { videoId: '6ONRf7h3Mdk', title: 'SICKO MODE', artist: 'Travis Scott', album: 'ASTROWORLD', thumbnail: 'https://i.ytimg.com/vi/6ONRf7h3Mdk/hqdefault.jpg', duration: 312, genre: 'Rap' },
      { videoId: 'BtyHYIHEaDA', title: 'Au DD', artist: 'PNL', album: 'Deux Frères', thumbnail: 'https://i.ytimg.com/vi/BtyHYIHEaDA/hqdefault.jpg', duration: 240, genre: 'Rap' },
      { videoId: '_CL6n0FJZpk', title: 'Still D.R.E.', artist: 'Dr. Dre ft. Snoop Dogg', album: '2001', thumbnail: 'https://i.ytimg.com/vi/_CL6n0FJZpk/hqdefault.jpg', duration: 271, genre: 'Rap' },
      { videoId: 'tvTRZJ-4EyI', title: 'HUMBLE.', artist: 'Kendrick Lamar', album: 'DAMN.', thumbnail: 'https://i.ytimg.com/vi/tvTRZJ-4EyI/hqdefault.jpg', duration: 177, genre: 'Rap' }
    ]
  },
  {
    id: 'genre-rock',
    title: 'Rock & Alternatives',
    genre: 'Rock',
    description: 'Riffs légendaires, solos de guitare et anthems rock',
    color: 'from-red-600 to-rose-900',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&auto=format&fit=crop&q=80',
    tracks: [
      { videoId: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg', duration: 354, genre: 'Rock' },
      { videoId: 'kXYiU_JCYtU', title: 'Numb', artist: 'Linkin Park', album: 'Meteora', thumbnail: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg', duration: 187, genre: 'Rock' },
      { videoId: 'hTWKbfoiklM', title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', thumbnail: 'https://i.ytimg.com/vi/hTWKbfoiklM/hqdefault.jpg', duration: 301, genre: 'Rock' },
      { videoId: '6hzrDeceEKc', title: 'Wonderwall', artist: 'Oasis', album: '(What\'s the Story) Morning Glory?', thumbnail: 'https://i.ytimg.com/vi/6hzrDeceEKc/hqdefault.jpg', duration: 258, genre: 'Rock' },
      { videoId: 'gEPmA31yH6w', title: 'Highway to Hell', artist: 'AC/DC', album: 'Highway to Hell', thumbnail: 'https://i.ytimg.com/vi/gEPmA31yH6w/hqdefault.jpg', duration: 208, genre: 'Rock' }
    ]
  },
  {
    id: 'genre-electro',
    title: 'Electro & Club',
    genre: 'Electro',
    description: 'French touch, synthwave et hymnes des plus grands festivals',
    color: 'from-cyan-600 to-blue-900',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    tracks: [
      { videoId: '5NV6Rdv1a3I', title: 'Get Lucky', artist: 'Daft Punk ft. Pharrell Williams', album: 'Random Access Memories', thumbnail: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/hqdefault.jpg', duration: 248, genre: 'Electro' },
      { videoId: 'FGBhQbmPwH8', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery', thumbnail: 'https://i.ytimg.com/vi/FGBhQbmPwH8/hqdefault.jpg', duration: 320, genre: 'Electro' },
      { videoId: 'IcrbM1l_BoI', title: 'Wake Me Up', artist: 'Avicii', album: 'True', thumbnail: 'https://i.ytimg.com/vi/IcrbM1l_BoI/hqdefault.jpg', duration: 247, genre: 'Electro' },
      { videoId: 'wNyk_7pPMkE', title: '360', artist: 'Charli xcx', album: 'BRAT', thumbnail: 'https://i.ytimg.com/vi/wNyk_7pPMkE/hqdefault.jpg', duration: 133, genre: 'Electro' },
      { videoId: 'JRfuAukYTKg', title: 'Titanium', artist: 'David Guetta ft. Sia', album: 'Nothing but the Beat', thumbnail: 'https://i.ytimg.com/vi/JRfuAukYTKg/hqdefault.jpg', duration: 245, genre: 'Electro' }
    ]
  },
  {
    id: 'genre-chill',
    title: 'Chill & Acoustic',
    genre: 'Chill',
    description: 'Titres apaisants, sessions acoustiques et ambiances de détente',
    color: 'from-emerald-600 to-teal-900',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    tracks: [
      { videoId: 'a7fzkqL_V8o', title: 'Too Sweet', artist: 'Hozier', album: 'Unheard', thumbnail: 'https://i.ytimg.com/vi/a7fzkqL_V8o/hqdefault.jpg', duration: 251, genre: 'Chill' },
      { videoId: 'TdrL3QxjyVw', title: 'Summertime Sadness', artist: 'Lana Del Rey', album: 'Born to Die', thumbnail: 'https://i.ytimg.com/vi/TdrL3QxjyVw/hqdefault.jpg', duration: 265, genre: 'Chill' },
      { videoId: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', album: '÷', thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg', duration: 233, genre: 'Chill' },
      { videoId: 'nlcIKh6sBtc', title: 'Royals', artist: 'Lorde', album: 'Pure Heroine', thumbnail: 'https://i.ytimg.com/vi/nlcIKh6sBtc/hqdefault.jpg', duration: 190, genre: 'Chill' }
    ]
  },
  {
    id: 'genre-sport',
    title: 'Sport & Workout',
    genre: 'Sport',
    description: 'Rythme élevé et énergie pure pour vos séances d\'entraînement',
    color: 'from-violet-600 to-indigo-900',
    cover: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    tracks: [
      { videoId: '_Yhyp-_hX2s', title: 'Lose Yourself', artist: 'Eminem', album: '8 Mile', thumbnail: 'https://i.ytimg.com/vi/_Yhyp-_hX2s/hqdefault.jpg', duration: 326, genre: 'Sport' },
      { videoId: 'btPJPFnesV4', title: 'Eye of the Tiger', artist: 'Survivor', album: 'Eye of the Tiger', thumbnail: 'https://i.ytimg.com/vi/btPJPFnesV4/hqdefault.jpg', duration: 245, genre: 'Sport' },
      { videoId: 'PsO6ZnUZI0g', title: 'Stronger', artist: 'Kanye West', album: 'Graduation', thumbnail: 'https://i.ytimg.com/vi/PsO6ZnUZI0g/hqdefault.jpg', duration: 312, genre: 'Sport' },
      { videoId: 'wmin5WkOuPw', title: 'Firestarter', artist: 'The Prodigy', album: 'The Fat of the Land', thumbnail: 'https://i.ytimg.com/vi/wmin5WkOuPw/hqdefault.jpg', duration: 285, genre: 'Sport' }
    ]
  }
];

export const SPOTIFY_TOP_50_GLOBAL = [
  { rank: 1, videoId: 'kPa7bsKwL-c', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', album: 'Die With A Smile', thumbnail: 'https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg', duration: 251, plays: '1.4B écoutes', popularity: 99 },
  { rank: 2, videoId: 'eVli-tstM5E', title: 'Espresso', artist: 'Sabrina Carpenter', album: 'Short n\' Sweet', thumbnail: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg', duration: 175, plays: '1.2B écoutes', popularity: 98 },
  { rank: 3, videoId: 'd5g4u0R2oY0', title: 'BIRDS OF A FEATHER', artist: 'Billie Eilish', album: 'HIT ME HARD AND SOFT', thumbnail: 'https://i.ytimg.com/vi/d5g4u0R2oY0/hqdefault.jpg', duration: 198, plays: '1.1B écoutes', popularity: 98 },
  { rank: 4, videoId: 'H58vbez_m4E', title: 'Not Like Us', artist: 'Kendrick Lamar', album: 'Not Like Us', thumbnail: 'https://i.ytimg.com/vi/H58vbez_m4E/hqdefault.jpg', duration: 274, plays: '980M écoutes', popularity: 97 },
  { rank: 5, videoId: 'ekr2nIex040', title: 'APT.', artist: 'ROSÉ & Bruno Mars', album: 'rosie', thumbnail: 'https://i.ytimg.com/vi/ekr2nIex040/hqdefault.jpg', duration: 169, plays: '940M écoutes', popularity: 97 },
  { rank: 6, videoId: '1-SIG-r8318', title: 'Good Luck, Babe!', artist: 'Chappell Roan', album: 'Good Luck, Babe!', thumbnail: 'https://i.ytimg.com/vi/1-SIG-r8318/hqdefault.jpg', duration: 218, plays: '890M écoutes', popularity: 96 },
  { rank: 7, videoId: 'wNyk_7pPMkE', title: '360', artist: 'Charli xcx', album: 'BRAT', thumbnail: 'https://i.ytimg.com/vi/wNyk_7pPMkE/hqdefault.jpg', duration: 133, plays: '820M écoutes', popularity: 95 },
  { rank: 8, videoId: '4NRXx6U8ABQ', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg', duration: 200, plays: '4.2B écoutes', popularity: 99 },
  { rank: 9, videoId: 'c38r-h8564o', title: 'Please Please Please', artist: 'Sabrina Carpenter', album: 'Short n\' Sweet', thumbnail: 'https://i.ytimg.com/vi/c38r-h8564o/hqdefault.jpg', duration: 186, plays: '780M écoutes', popularity: 94 },
  { rank: 10, videoId: 'Oa_RSwwpPaA', title: 'Beautiful Things', artist: 'Benson Boone', album: 'Fireworks & Rollerblades', thumbnail: 'https://i.ytimg.com/vi/Oa_RSwwpPaA/hqdefault.jpg', duration: 180, plays: '1.3B écoutes', popularity: 96 },
  { rank: 11, videoId: 'ic8j13gRBSY', title: 'Cruel Summer', artist: 'Taylor Swift', album: 'Lover', thumbnail: 'https://i.ytimg.com/vi/ic8j13gRBSY/hqdefault.jpg', duration: 178, plays: '2.1B écoutes', popularity: 95 },
  { rank: 12, videoId: 'a7fzkqL_V8o', title: 'Too Sweet', artist: 'Hozier', album: 'Unheard', thumbnail: 'https://i.ytimg.com/vi/a7fzkqL_V8o/hqdefault.jpg', duration: 251, plays: '870M écoutes', popularity: 93 },
  { rank: 13, videoId: 'GZ3zL7ApV_8', title: 'Lose Control', artist: 'Teddy Swims', album: 'I\'ve Tried Everything But Therapy', thumbnail: 'https://i.ytimg.com/vi/GZ3zL7ApV_8/hqdefault.jpg', duration: 210, plays: '1.1B écoutes', popularity: 94 },
  { rank: 14, videoId: 'MLlSSJ0z7xM', title: 'Dancing In The Flames', artist: 'The Weeknd', album: 'Hurry Up Tomorrow', thumbnail: 'https://i.ytimg.com/vi/MLlSSJ0z7xM/hqdefault.jpg', duration: 220, plays: '650M écoutes', popularity: 92 },
  { rank: 15, videoId: 'QeR_b5fD46w', title: 'LUNCH', artist: 'Billie Eilish', album: 'HIT ME HARD AND SOFT', thumbnail: 'https://i.ytimg.com/vi/QeR_b5fD46w/hqdefault.jpg', duration: 180, plays: '710M écoutes', popularity: 93 },
  { rank: 16, videoId: 'H5v3kku4y6Q', title: 'As It Was', artist: 'Harry Styles', album: 'Harry\'s House', thumbnail: 'https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg', duration: 167, plays: '3.3B écoutes', popularity: 96 },
  { rank: 17, videoId: 'G7KNmW9a75Y', title: 'Flowers', artist: 'Miley Cyrus', album: 'Endless Summer Vacation', thumbnail: 'https://i.ytimg.com/vi/G7KNmW9a75Y/hqdefault.jpg', duration: 200, plays: '2.2B écoutes', popularity: 95 },
  { rank: 18, videoId: 'ZIfF8T6kY7c', title: 'vampire', artist: 'Olivia Rodrigo', album: 'GUTS', thumbnail: 'https://i.ytimg.com/vi/ZIfF8T6kY7c/hqdefault.jpg', duration: 219, plays: '1.2B écoutes', popularity: 92 },
  { rank: 19, videoId: 'MSRcC62y338', title: 'Kill Bill', artist: 'SZA', album: 'SOS', thumbnail: 'https://i.ytimg.com/vi/MSRcC62y338/hqdefault.jpg', duration: 153, plays: '1.8B écoutes', popularity: 94 },
  { rank: 20, videoId: 'c5pE-kS-2S0', title: 'MILLION DOLLAR BABY', artist: 'Tommy Richman', album: 'MILLION DOLLAR BABY', thumbnail: 'https://i.ytimg.com/vi/c5pE-kS-2S0/hqdefault.jpg', duration: 155, plays: '810M écoutes', popularity: 91 }
];

export const SPOTIFY_TOP_50_FRANCE = [
  { rank: 1, videoId: 'bF2_N1l-n3k', title: 'SPIDER', artist: 'GIMS ft. Dystinct', album: 'SPIDER', thumbnail: 'https://i.ytimg.com/vi/bF2_N1l-n3k/hqdefault.jpg', duration: 188, plays: '140M écoutes', popularity: 97 },
  { rank: 2, videoId: 'BtyHYIHEaDA', title: 'Au DD', artist: 'PNL', album: 'Deux Frères', thumbnail: 'https://i.ytimg.com/vi/BtyHYIHEaDA/hqdefault.jpg', duration: 240, plays: '390M écoutes', popularity: 98 },
  { rank: 3, videoId: 'oiKj0Z_Xnjc', title: 'Papaoutai', artist: 'Stromae', album: 'Racine Carrée', thumbnail: 'https://i.ytimg.com/vi/oiKj0Z_Xnjc/hqdefault.jpg', duration: 232, plays: '750M écoutes', popularity: 96 },
  { rank: 4, videoId: 'kPa7bsKwL-c', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', album: 'Die With A Smile', thumbnail: 'https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg', duration: 251, plays: '1.4B écoutes', popularity: 99 },
  { rank: 5, videoId: 'eVli-tstM5E', title: 'Espresso', artist: 'Sabrina Carpenter', album: 'Short n\' Sweet', thumbnail: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg', duration: 175, plays: '1.2B écoutes', popularity: 98 },
  { rank: 6, videoId: 'pssIGfvlP40', title: 'Basique', artist: 'Orelsan', album: 'La fête est finie', thumbnail: 'https://i.ytimg.com/vi/pssIGfvlP40/hqdefault.jpg', duration: 164, plays: '190M écoutes', popularity: 93 },
  { rank: 7, videoId: 'Hi7Rx3En7-w', title: 'Balance ton quoi', artist: 'Angèle', album: 'Brol', thumbnail: 'https://i.ytimg.com/vi/Hi7Rx3En7-w/hqdefault.jpg', duration: 189, plays: '220M écoutes', popularity: 94 },
  { rank: 8, videoId: 'uU3xL0nE5y8', title: 'Caroline', artist: 'MC Solaar', album: 'Qui sème le vent', thumbnail: 'https://i.ytimg.com/vi/uU3xL0nE5y8/hqdefault.jpg', duration: 282, plays: '95M écoutes', popularity: 91 },
  { rank: 9, videoId: 'b00Lw727mB0', title: 'Petit frère', artist: 'IAM', album: 'L\'école du micro d\'argent', thumbnail: 'https://i.ytimg.com/vi/b00Lw727mB0/hqdefault.jpg', duration: 284, plays: '110M écoutes', popularity: 92 },
  { rank: 10, videoId: '5NV6Rdv1a3I', title: 'Get Lucky', artist: 'Daft Punk', album: 'Random Access Memories', thumbnail: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/hqdefault.jpg', duration: 248, plays: '1.2B écoutes', popularity: 96 },
  { rank: 11, videoId: 'v1pQk055e_Q', title: 'L\'aventurier', artist: 'Indochine', album: 'L\'aventurier', thumbnail: 'https://i.ytimg.com/vi/v1pQk055e_Q/hqdefault.jpg', duration: 229, plays: '85M écoutes', popularity: 90 },
  { rank: 12, videoId: 'vY6R9nQj5Gg', title: 'Un autre monde', artist: 'Téléphone', album: 'Un autre monde', thumbnail: 'https://i.ytimg.com/vi/vY6R9nQj5Gg/hqdefault.jpg', duration: 270, plays: '90M écoutes', popularity: 90 },
  { rank: 13, videoId: 'd5g4u0R2oY0', title: 'BIRDS OF A FEATHER', artist: 'Billie Eilish', album: 'HIT ME HARD AND SOFT', thumbnail: 'https://i.ytimg.com/vi/d5g4u0R2oY0/hqdefault.jpg', duration: 198, plays: '1.1B écoutes', popularity: 98 },
  { rank: 14, videoId: 'H58vbez_m4E', title: 'Not Like Us', artist: 'Kendrick Lamar', album: 'Not Like Us', thumbnail: 'https://i.ytimg.com/vi/H58vbez_m4E/hqdefault.jpg', duration: 274, plays: '980M écoutes', popularity: 97 },
  { rank: 15, videoId: '4GA2YI5aECA', title: 'La Tribu de Dana', artist: 'Manau', album: 'Panique celtique', thumbnail: 'https://i.ytimg.com/vi/4GA2YI5aECA/hqdefault.jpg', duration: 287, plays: '75M écoutes', popularity: 88 }
];

export function getSpotifyTop50(chart = 'global') {
  return chart === 'france' ? SPOTIFY_TOP_50_FRANCE : SPOTIFY_TOP_50_GLOBAL;
}

export const TRENDING_TRACKS = [

  {
    videoId: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    duration: 200,
    source: 'youtube',
    popularity: 99
  },
  {
    videoId: '5NV6Rdv1a3I',
    title: 'Get Lucky',
    artist: 'Daft Punk ft. Pharrell Williams',
    album: 'Random Access Memories',
    thumbnail: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/hqdefault.jpg',
    duration: 248,
    source: 'youtube',
    popularity: 96
  },
  {
    videoId: 'DyDfgMOUjCI',
    title: 'bad guy',
    artist: 'Billie Eilish',
    album: 'WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?',
    thumbnail: 'https://i.ytimg.com/vi/DyDfgMOUjCI/hqdefault.jpg',
    duration: 194,
    source: 'youtube',
    popularity: 94
  },
  {
    videoId: 'FGBhQbmPwH8',
    title: 'One More Time',
    artist: 'Daft Punk',
    album: 'Discovery',
    thumbnail: 'https://i.ytimg.com/vi/FGBhQbmPwH8/hqdefault.jpg',
    duration: 320,
    source: 'youtube',
    popularity: 96
  },
  {
    videoId: 'Zi_XLOBDo_Y',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    album: 'Thriller',
    thumbnail: 'https://i.ytimg.com/vi/Zi_XLOBDo_Y/hqdefault.jpg',
    duration: 294,
    source: 'youtube',
    popularity: 98
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    duration: 354,
    source: 'youtube',
    popularity: 97
  },
  {
    videoId: 'kXYiU_JCYtU',
    title: 'Numb',
    artist: 'Linkin Park',
    album: 'Meteora',
    thumbnail: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg',
    duration: 187,
    source: 'youtube',
    popularity: 93
  },
  {
    videoId: 'oiKj0Z_Xnjc',
    title: 'Papaoutai',
    artist: 'Stromae',
    album: 'Racine Carrée',
    thumbnail: 'https://i.ytimg.com/vi/oiKj0Z_Xnjc/hqdefault.jpg',
    duration: 232,
    source: 'youtube',
    popularity: 95
  }
];

export function getArtistAvatar(artistName) {
  if (!artistName) return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
  const searchName = getMainArtistName(artistName);
  const match = FEATURED_ARTISTS.find(a => isArtistMatch(a.name, searchName));
  if (match && match.avatar) return match.avatar;

  // Collection de rechange de portraits de concerts et scènes musicales réelles
  const musicBackdrops = [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1487180142328-054b783fc471?w=600&auto=format&fit=crop&q=80'
  ];

  let sum = 0;
  for (let i = 0; i < searchName.length; i++) {
    sum += searchName.charCodeAt(i);
  }
  const index = Math.abs(sum) % musicBackdrops.length;
  return musicBackdrops[index];
}

/**
 * Recherche locale hors-ligne ultra-rapide basée sur IndexedDB (Dexie).
 * Interroge les morceaux téléchargés (offlineTracks), les favoris (likes) et l'historique (tracks).
 * Applique le fuzzy matching et la tolérance aux fautes de frappe.
 */
export async function searchOfflineDexie(query, audioMode = 'studio') {
  if (!query || !query.trim()) {
    return { tracks: [], artists: [], albums: [], isOffline: true };
  }
  const clean = query.trim();
  const tracksMap = new Map();

  try {
    // 1. Charger depuis db.offlineTracks (morceaux téléchargés complets avec audio)
    if (db && db.offlineTracks) {
      const downloaded = await db.offlineTracks.toArray().catch(() => []);
      for (const rawT of downloaded) {
        if (!rawT) continue;
        const t = classifyTrack(rawT) || rawT;
        const key = t.videoId || t.id || `${t.title}_${t.artist}`;
        tracksMap.set(key, {
          ...t,
          id: t.videoId || t.id || key,
          videoId: t.videoId || t.id || key,
          isOfflineDownloaded: true,
          isOffline: true
        });
      }
    }

    // 2. Charger depuis db.likes (favoris)
    if (db && db.likes) {
      const liked = await db.likes.toArray().catch(() => []);
      for (const rawT of liked) {
        if (!rawT) continue;
        const t = classifyTrack(rawT) || rawT;
        const key = t.videoId || t.id || `${t.title}_${t.artist}`;
        if (!tracksMap.has(key)) {
          tracksMap.set(key, {
            ...t,
            id: t.videoId || t.id || key,
            videoId: t.videoId || t.id || key,
            isLiked: true,
            isOffline: true
          });
        }
      }
    }

    // 3. Charger depuis db.tracks (historique et cache local)
    if (db && db.tracks) {
      const history = await db.tracks.toArray().catch(() => []);
      for (const rawT of history) {
        if (!rawT) continue;
        const t = classifyTrack(rawT) || rawT;
        const key = t.videoId || t.id || `${t.title}_${t.artist}`;
        if (!tracksMap.has(key)) {
          tracksMap.set(key, {
            ...t,
            id: t.videoId || t.id || key,
            videoId: t.videoId || t.id || key,
            isOffline: true
          });
        }
      }
    }

    const allLocalTracks = Array.from(tracksMap.values());
    const scoredTracks = [];

    for (const t of allLocalTracks) {
      const titleSim = calcFuzzySimilarity(clean, t.title || '');
      const artistSim = calcFuzzySimilarity(clean, t.artist || '');
      const albumSim = calcFuzzySimilarity(clean, t.album || '');

      // Ne retenir que les éléments qui correspondent au texte recherché
      const isMatch = titleSim > 0 || artistSim > 0 || albumSim > 0;
      if (!isMatch) continue;

      let score = (titleSim * 2) + (artistSim * 1.5) + albumSim;
      if (t.isOfflineDownloaded) score += 800; // Priorité absolue aux fichiers audio stockés localement
      if (t.isLiked) score += 300;

      // Filtre de pertinence minimale
      if (score > 150) {
        scoredTracks.push({ ...t, relevanceScore: score });
      }
    }

    const sortedLocalTracks = sortTracksByPriority(scoredTracks, audioMode);

    // Extraire les artistes et albums locaux
    const artistsMap = new Map();
    const albumsMap = new Map();

    for (const t of scoredTracks) {
      if (t.artist && t.artist !== 'Artiste inconnu') {
        const artName = getMainArtistName(t.artist);
        const artKey = normalizeArtistKey(artName);
        if (artKey) {
          if (!artistsMap.has(artKey)) {
            artistsMap.set(artKey, {
              id: `offline_art_${artKey}`,
              name: artName,
              avatar: t.thumbnail || getArtistAvatar(artName),
              trackCount: 1,
              isOffline: true
            });
          } else {
            artistsMap.get(artKey).trackCount++;
          }
        }
      }

      if (t.album && t.album.trim().length > 1) {
        const albName = t.album.trim();
        const albKey = `${albName.toLowerCase()}___${(t.artist || '').toLowerCase()}`;
        if (!albumsMap.has(albKey)) {
          albumsMap.set(albKey, {
            id: `offline_alb_${albKey}`,
            title: albName,
            artist: t.artist || 'Artiste inconnu',
            artwork: t.thumbnail || '',
            trackCount: 1,
            isOffline: true
          });
        } else {
          albumsMap.get(albKey).trackCount++;
        }
      }
    }

    return {
      tracks: sortedLocalTracks,
      artists: Array.from(artistsMap.values()).slice(0, 10),
      albums: Array.from(albumsMap.values()).slice(0, 12),
      isOffline: true
    };
  } catch (err) {
    console.error('[OfflineSearch] Erreur recherche locale:', err);
    return { tracks: [], artists: [], albums: [], isOffline: true };
  }
}

