/**
 * Ultra-Fast CORS-Free Search Service
 * Native Deezer JSONP with Intelligent Cross-Entity Arbitration (Track vs Artist) & Spotify-like Ranking
 */

function normalizeStr(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Native Deezer JSONP Fetcher (100% bypasses CORS in any iframe/browser)
 */
function fetchDeezerJsonp(query, limit = 50, timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const callbackName = 'deezerJsonpCallback_' + Math.round(1000000 * Math.random());
    const script = document.createElement('script');
    let isResolved = false;

    const cleanup = () => {
      try {
        delete window[callbackName];
      } catch (_) {
        window[callbackName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve(null);
      }
    }, timeoutMs);

    window[callbackName] = (data) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timer);
        cleanup();
        resolve(data);
      }
    };

    script.src = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&output=jsonp&callback=${callbackName}&limit=${limit}`;
    script.onerror = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timer);
        cleanup();
        resolve(null);
      }
    };

    document.body.appendChild(script);
  });
}

/**
 * Fallback to iTunes Search API (100% open CORS, fast)
 */
async function fetchItunesFallback(query) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=50`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (_) {
    return null;
  }
}

/**
 * Main Unified Search Function with Cross-Entity Arbitration (Track vs Artist)
 */
export async function searchDeezerUnified(query, _signal = null) {
  if (!query || !query.trim()) {
    return { tracks: [], artists: [], albums: [], bestMatch: null, bestArtist: null, bestArtistTracks: [] };
  }

  const cleanQuery = query.trim();
  const qNorm = normalizeStr(cleanQuery);

  // 1. Tenter Deezer en JSONP natif
  let rawResult = await fetchDeezerJsonp(cleanQuery, 50, 3500);

  // 2. Si échec ou timeout, fallback direct sur iTunes
  if (!rawResult || !Array.isArray(rawResult.data) || rawResult.data.length === 0) {
    const itunesData = await fetchItunesFallback(cleanQuery);
    if (itunesData && Array.isArray(itunesData.results) && itunesData.results.length > 0) {
      return parseItunesResults(itunesData.results, qNorm);
    }
    return { tracks: [], artists: [], albums: [], bestMatch: null, bestArtist: null, bestArtistTracks: [] };
  }

  const rawItems = rawResult.data;

  // 1. EXTRACTION ET SCORING DES TITRES (AVEC CALCUL DE PERTINENCE & POPULARITÉ)
  const seenTrackIds = new Set();
  const tracks = [];

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    if (!item || !item.id || seenTrackIds.has(item.id)) continue;
    seenTrackIds.add(item.id);

    const art = item.artist || {};
    const alb = item.album || {};
    const titleNorm = normalizeStr(item.title_short || item.title || '');
    const artistNorm = normalizeStr(art.name || '');

    const trackRank = item.rank || 0; // Rank Deezer de 0 à 1,000,000+

    // Multiplicateurs de correspondance
    let titleMultiplier = 0.8;
    if (titleNorm === qNorm) {
      titleMultiplier = 5.5; // Match exact sur le titre (ex: "Cendrillon")
    } else if (titleNorm.startsWith(qNorm)) {
      titleMultiplier = 3.2;
    } else if (titleNorm.includes(qNorm)) {
      titleMultiplier = 1.6;
    }

    let artistMultiplier = 0.5;
    if (artistNorm === qNorm) {
      artistMultiplier = 3.0;
    } else if (artistNorm.startsWith(qNorm)) {
      artistMultiplier = 2.0;
    } else if (artistNorm.includes(qNorm)) {
      artistMultiplier = 1.0;
    }

    // Position initiale dans la réponse Deezer
    const posBoost = Math.max(0, 100 - i) * 1000;

    // Score de pertinence du morceau
    const trackScore = (Math.max(trackRank, 20000) * titleMultiplier) + (artistMultiplier * 100000) + posBoost;

    tracks.push({
      id: `dz_${item.id}`,
      deezerId: item.id,
      videoId: `dz_${item.id}`,
      title: item.title_short || item.title || 'Sans titre',
      artist: art.name || 'Artiste inconnu',
      artistId: art.id,
      album: alb.title || '',
      albumId: alb.id,
      thumbnail: alb.cover_xl || alb.cover_big || alb.cover_medium || art.picture_xl || art.picture_big || art.picture_medium || '',
      duration: item.duration || 0,
      previewUrl: item.preview || '',
      rank: trackRank,
      relevanceScore: trackScore,
      source: 'deezer'
    });
  }

  // Tri des morceaux par score de pertinence et popularité décroissant
  tracks.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // 2. EXTRACTION ET SCORING DES ARTISTES
  const artistMap = new Map();

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const art = item.artist;
    if (!art || !art.id) continue;

    const artId = art.id;
    const trackRank = item.rank || 0;

    if (!artistMap.has(artId)) {
      artistMap.set(artId, {
        id: artId,
        name: art.name || 'Artiste',
        picture: art.picture_xl || art.picture_big || art.picture_medium || art.picture || '',
        nbFans: art.nb_fan || 0,
        type: 'artist',
        trackCount: 1,
        maxTrackRank: trackRank,
        totalRank: trackRank,
        firstSeenIndex: i
      });
    } else {
      const existing = artistMap.get(artId);
      existing.trackCount += 1;
      existing.totalRank += trackRank;
      if (trackRank > existing.maxTrackRank) {
        existing.maxTrackRank = trackRank;
      }
    }
  }

  const artists = Array.from(artistMap.values());

  for (const a of artists) {
    const artNorm = normalizeStr(a.name);
    let matchMultiplier = 0.5;

    if (artNorm === qNorm) {
      matchMultiplier = 3.5;
    } else if (artNorm.startsWith(qNorm)) {
      matchMultiplier = 2.8;
    } else if (artNorm.includes(qNorm)) {
      matchMultiplier = 1.4;
    }

    // Popularité réelle
    const popularityBase = Math.max(a.nbFans * 15, a.maxTrackRank, a.totalRank / Math.max(1, a.trackCount), 1000);
    const occurrenceBonus = a.trackCount * 40000;
    const posPenalty = a.firstSeenIndex * 1500;

    a.score = ((popularityBase + occurrenceBonus) * matchMultiplier) - posPenalty;
  }

  artists.sort((a, b) => b.score - a.score);

  // 3. ARBITRAGE CROISÉ INTELLIGENT : TITRE VS ARTISTE (SPOTIFY-LIKE)
  const topArtist = artists.length > 0 ? artists[0] : null;
  const topTrack = tracks.length > 0 ? tracks[0] : null;

  let bestMatch = null;

  if (topArtist && topTrack) {
    const topArtNorm = normalizeStr(topArtist.name);
    const topTrackTitleNorm = normalizeStr(topTrack.title);

    const isArtistExact = (topArtNorm === qNorm);
    const isArtistStarts = topArtNorm.startsWith(qNorm);
    const isTrackTitleExact = (topTrackTitleNorm === qNorm);

    // Cas 1 : Si l'artiste matchant la recherche est obscur (<10,000 fans ou rank <400k)
    // mais qu'il existe un titre très populaire du même nom (ex: "Cendrillon" par Téléphone)
    const isObscureArtist = (topArtist.nbFans < 10000 && topArtist.maxTrackRank < 400000);
    const isMajorTrack = (topTrack.rank > 400000 || topTrack.relevanceScore > 400000);

    if (isTrackTitleExact && isObscureArtist && isMajorTrack) {
      bestMatch = { type: 'track', data: topTrack };
    } 
    // Cas 2 : Artiste majeur officiel (ex: "Stromae", "Queen", "Téléphone", "Eminem", "PNL")
    else if (isArtistExact && topArtist.nbFans >= 10000) {
      bestMatch = { type: 'artist', data: topArtist };
    }
    // Cas 3 : Artiste superstar par préfixe (ex: "STROM" -> Stromae, "lynyrd" -> Lynyrd Skynyrd)
    else if (isArtistStarts && topArtist.nbFans >= 50000 && !isTrackTitleExact) {
      bestMatch = { type: 'artist', data: topArtist };
    }
    // Cas 4 : Comparaison globale pondérée
    else {
      if ((topTrack.relevanceScore || 0) >= (topArtist.score || 0) * 1.15) {
        bestMatch = { type: 'track', data: topTrack };
      } else {
        bestMatch = { type: 'artist', data: topArtist };
      }
    }
  } else if (topArtist) {
    bestMatch = { type: 'artist', data: topArtist };
  } else if (topTrack) {
    bestMatch = { type: 'track', data: topTrack };
  }

  // 4. EXTRACTION DES TITRES DU MEILLEUR RÉSULTAT
  let bestArtistTracks = [];
  if (bestMatch?.type === 'artist' && bestMatch.data) {
    bestArtistTracks = tracks.filter(t => t.artistId === bestMatch.data.id || normalizeStr(t.artist) === normalizeStr(bestMatch.data.name));
    if (bestArtistTracks.length === 0) {
      bestArtistTracks = tracks.slice(0, 5);
    }
  } else {
    // Si le meilleur résultat est un Titre, la liste de droite présente les meilleurs titres de la recherche
    bestArtistTracks = tracks.slice(0, 5);
  }

  // 5. EXTRACTION DES ALBUMS
  const albumMap = new Map();
  for (const item of rawItems) {
    const alb = item.album;
    if (!alb || !alb.id || albumMap.has(alb.id)) continue;

    albumMap.set(alb.id, {
      id: alb.id,
      title: alb.title || 'Album',
      artist: item.artist?.name || 'Artiste inconnu',
      artistId: item.artist?.id,
      artwork: alb.cover_xl || alb.cover_big || alb.cover_medium || alb.cover || '',
      type: 'album'
    });
  }

  const albums = Array.from(albumMap.values());

  return {
    tracks,
    artists,
    albums,
    bestMatch,
    bestArtist: topArtist,
    bestArtistTracks
  };
}

/**
 * Parser pour le fallback iTunes en cas de besoin
 */
function parseItunesResults(results, qNorm) {
  const tracks = [];
  const artistMap = new Map();
  const albumMap = new Map();

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const trackId = `it_${r.trackId}`;
    const artId = r.artistId || r.artistName;
    const artName = r.artistName || 'Artiste inconnu';
    const albName = r.collectionName || '';
    const artwork = (r.artworkUrl100 || '').replace('100x100bb', '600x600bb');
    const titleNorm = normalizeStr(r.trackName || '');
    const artistNorm = normalizeStr(artName);

    let titleMultiplier = 1.0;
    if (titleNorm === qNorm) titleMultiplier = 4.0;
    else if (titleNorm.startsWith(qNorm)) titleMultiplier = 2.5;

    let artistMultiplier = 0.5;
    if (artistNorm === qNorm) artistMultiplier = 3.0;
    else if (artistNorm.startsWith(qNorm)) artistMultiplier = 2.0;

    const trackScore = (titleMultiplier * 100000) + (artistMultiplier * 80000) - (i * 1000);

    tracks.push({
      id: trackId,
      videoId: trackId,
      title: r.trackName || 'Sans titre',
      artist: artName,
      artistId: artId,
      album: albName,
      albumId: r.collectionId,
      thumbnail: artwork,
      duration: Math.round((r.trackTimeMillis || 0) / 1000),
      previewUrl: r.previewUrl || '',
      relevanceScore: trackScore,
      source: 'itunes'
    });

    if (!artistMap.has(artId)) {
      let score = 0;
      if (artistNorm === qNorm) score += 100000;
      else if (artistNorm.startsWith(qNorm)) score += 50000;
      score += Math.max(0, 50 - i) * 1000;

      artistMap.set(artId, {
        id: artId,
        name: artName,
        picture: artwork,
        type: 'artist',
        score,
        trackCount: 1
      });
    } else {
      artistMap.get(artId).trackCount += 1;
    }

    if (r.collectionId && !albumMap.has(r.collectionId)) {
      albumMap.set(r.collectionId, {
        id: r.collectionId,
        title: albName,
        artist: artName,
        artistId: artId,
        artwork,
        type: 'album'
      });
    }
  }

  tracks.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  const artists = Array.from(artistMap.values()).sort((a, b) => b.score - a.score);
  const albums = Array.from(albumMap.values());

  const topArtist = artists.length > 0 ? artists[0] : null;
  const topTrack = tracks.length > 0 ? tracks[0] : null;

  let bestMatch = null;
  if (topTrack && normalizeStr(topTrack.title) === qNorm && (!topArtist || normalizeStr(topArtist.name) !== qNorm)) {
    bestMatch = { type: 'track', data: topTrack };
  } else if (topArtist) {
    bestMatch = { type: 'artist', data: topArtist };
  } else if (topTrack) {
    bestMatch = { type: 'track', data: topTrack };
  }

  const bestArtistTracks = bestMatch?.type === 'artist' && bestMatch.data
    ? tracks.filter(t => t.artistId === bestMatch.data.id || normalizeStr(t.artist) === normalizeStr(bestMatch.data.name)) 
    : tracks.slice(0, 5);

  return {
    tracks,
    artists,
    albums,
    bestMatch,
    bestArtist: topArtist,
    bestArtistTracks
  };
}

export const searchGlobal = searchDeezerUnified;
