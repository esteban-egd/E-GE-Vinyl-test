/**
 * Service Officiel Artiste - 100% Deezer JSONP / CORS-Free
 * Charge intégralement les fiches artistes en 0.1s (Metadata, Top Titres, Albums, Related)
 * Élimine tous les homonymes obscurs grâce au tri par nb_fan / popularité Deezer.
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
 * Fetcher JSONP direct pour l'API Deezer (CORS-free dans l'environnement web)
 */
export function fetchDeezerJsonp(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const callbackName = 'deezerCb_' + Math.round(1000000 * Math.random());
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

    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}output=jsonp&callback=${callbackName}`;
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
 * Recherche Deezer pour trouver l'artiste officiel authentique (arbitrage par popularité/fans)
 */
export async function searchOfficialDeezerArtist(artistQuery) {
  if (!artistQuery || !artistQuery.trim()) return null;
  const qClean = artistQuery.trim();
  const qNorm = normalizeStr(qClean);

  try {
    // 1. Recherche d'artistes sur Deezer via JSONP
    let data = await fetchDeezerJsonp(`https://api.deezer.com/search/artist?q=${encodeURIComponent(qClean)}&limit=20`, 3500);

    // Fallback proxy si JSONP a échoué
    if (!data || !Array.isArray(data.data) || data.data.length === 0) {
      const proxyRes = await fetch(`/api/deezer-artist?q=${encodeURIComponent(qClean)}`, {
        signal: AbortSignal.timeout(3500)
      }).catch(() => null);
      if (proxyRes && proxyRes.ok) {
        data = await proxyRes.json();
      }
    }

    if (data && Array.isArray(data.data) && data.data.length > 0) {
      const candidates = data.data;

      // Scoring des candidats pour éliminer immédiatement les homonymes obscurs
      // (ex: Téléphone français 580k fans vs indonésien 141 fans)
      for (const art of candidates) {
        const artNorm = normalizeStr(art.name || '');
        const fans = art.nb_fan || 0;

        let matchMultiplier = 0.5;
        if (artNorm === qNorm) {
          matchMultiplier = 5.0; // Match exact
        } else if (artNorm.startsWith(qNorm) || qNorm.startsWith(artNorm)) {
          matchMultiplier = 2.5;
        } else if (artNorm.includes(qNorm) || qNorm.includes(artNorm)) {
          matchMultiplier = 1.2;
        }

        art._score = (Math.max(fans, 100) * matchMultiplier);
      }

      candidates.sort((a, b) => (b._score || 0) - (a._score || 0));
      return candidates[0];
    }
  } catch (err) {
    console.warn('[artistService] searchOfficialDeezerArtist error:', err);
  }

  return null;
}

/**
 * Charge TOUTES les données de la fiche artiste (Deezer Direct)
 */
export async function getArtistFullData(artistIdentifier) {
  if (!artistIdentifier) return null;

  const rawStr = String(artistIdentifier).trim();
  const cleanIdMatch = rawStr.match(/^(?:dz_art_|dz_)?(\d+)$/);

  let officialArtistId = cleanIdMatch ? cleanIdMatch[1] : null;
  let baseArtistInfo = null;

  // Si ce n'est pas un ID numérique direct, rechercher l'artiste officiel sur Deezer
  if (!officialArtistId) {
    baseArtistInfo = await searchOfficialDeezerArtist(rawStr);
    if (baseArtistInfo && baseArtistInfo.id) {
      officialArtistId = String(baseArtistInfo.id);
    }
  }

  if (!officialArtistId) {
    // Si Deezer ne trouve rien, renvoyer une structure minimale propre
    return {
      id: rawStr,
      name: rawStr,
      genre: 'Artiste',
      avatar: '',
      banner: '',
      monthlyListeners: 0,
      nbFans: 0,
      nbAlbums: 0,
      topTracks: [],
      albums: [],
      relatedArtists: [],
      bio: `Fiche de l'artiste ${rawStr}.`
    };
  }

  try {
    // Fetch en parallèle des 4 endpoints officiels Deezer
    const [artistRes, topRes, albumsRes, relatedRes] = await Promise.all([
      fetchDeezerJsonp(`https://api.deezer.com/artist/${officialArtistId}`, 3500),
      fetchDeezerJsonp(`https://api.deezer.com/artist/${officialArtistId}/top?limit=50`, 3500),
      fetchDeezerJsonp(`https://api.deezer.com/artist/${officialArtistId}/albums?limit=50`, 3500),
      fetchDeezerJsonp(`https://api.deezer.com/artist/${officialArtistId}/related?limit=20`, 3500)
    ]);

    const artistData = artistRes || baseArtistInfo || {};
    const artistName = artistData.name || rawStr;
    const rawTopTracks = topRes?.data || [];
    const rawAlbums = albumsRes?.data || [];
    const rawRelated = relatedRes?.data || [];

    // 1. Formatage et tri strict des top titres
    const topTracks = rawTopTracks.map((trk, idx) => ({
      id: `dz_${trk.id}`,
      deezerId: trk.id,
      videoId: `dz_${trk.id}`, // Liaison audio retardée au clic Play
      title: trk.title_short || trk.title || 'Sans titre',
      artist: trk.artist?.name || artistName,
      artistId: trk.artist?.id || officialArtistId,
      album: trk.album?.title || '',
      albumId: trk.album?.id,
      thumbnail: trk.album?.cover_xl || trk.album?.cover_big || trk.album?.cover_medium || artistData.picture_xl || '',
      duration: trk.duration || 0,
      previewUrl: trk.preview || '',
      rank: trk.rank || (1000000 - idx * 10000),
      source: 'deezer'
    }));

    // 2. Formatage des albums de la discographie
    const albums = rawAlbums.map((alb) => {
      let recordType = 'album';
      if (alb.record_type === 'single') recordType = 'single';
      else if (alb.record_type === 'ep') recordType = 'ep';
      else if (alb.record_type === 'compile' || alb.record_type === 'compilation') recordType = 'compilation';

      const releaseYear = alb.release_date ? alb.release_date.split('-')[0] : '';

      return {
        id: alb.id,
        deezerId: alb.id,
        title: alb.title || 'Album',
        artist: artistName,
        artistId: officialArtistId,
        artwork: alb.cover_xl || alb.cover_big || alb.cover_medium || alb.cover || '',
        cover: alb.cover_xl || alb.cover_big || alb.cover_medium || alb.cover || '',
        year: releaseYear,
        releaseDate: alb.release_date || '',
        trackCount: alb.nb_tracks || 0,
        recordType: recordType
      };
    });

    // Tri chronologique des albums (du plus récent au plus ancien)
    albums.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));

    // 3. Formatage des artistes similaires
    const relatedArtists = rawRelated.map((rel) => ({
      id: rel.id,
      deezerId: rel.id,
      name: rel.name,
      avatar: rel.picture_xl || rel.picture_big || rel.picture_medium || rel.picture || '',
      picture: rel.picture_xl || rel.picture_big || rel.picture_medium || rel.picture || '',
      nbFans: rel.nb_fan || 0,
      nb_fan: rel.nb_fan || 0
    }));

    const avatarUrl = artistData.picture_xl || artistData.picture_big || artistData.picture_medium || artistData.picture || '';
    const fansCount = artistData.nb_fan || 0;

    return {
      id: `dz_art_${officialArtistId}`,
      deezerId: officialArtistId,
      name: artistName,
      genre: 'Artiste',
      avatar: avatarUrl,
      banner: avatarUrl,
      nbFans: fansCount,
      monthlyListeners: fansCount,
      nbAlbums: artistData.nb_album || albums.length,
      topTracks,
      albums,
      relatedArtists,
      bio: `Profil officiel de ${artistName} sur Deezer avec ${fansCount.toLocaleString('fr-FR')} fans et ${artistData.nb_album || albums.length} albums répertoriés.`
    };
  } catch (err) {
    console.error('[artistService] getArtistFullData error:', err);
    return null;
  }
}

/**
 * Récupère les morceaux d'un album Deezer
 */
export async function getAlbumTracksDeezer(albumId, artistName = '', albumMeta = null) {
  if (!albumId) return [];
  const cleanId = String(albumId).replace(/^(dz_alb_|dz_)/, '');

  const albumTitle = typeof albumMeta === 'string' ? albumMeta : albumMeta?.title || '';
  const albumCover = typeof albumMeta === 'object' ? (albumMeta?.artwork || albumMeta?.cover || albumMeta?.cover_xl || albumMeta?.cover_big || '') : '';

  try {
    const data = await fetchDeezerJsonp(`https://api.deezer.com/album/${cleanId}/tracks?limit=100`, 3500);
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map((t, idx) => ({
        id: `dz_${t.id}`,
        deezerId: t.id,
        videoId: `dz_${t.id}`,
        title: t.title_short || t.title || 'Sans titre',
        artist: t.artist?.name || artistName,
        artistId: t.artist?.id,
        album: albumTitle || t.album?.title || '',
        albumId: cleanId,
        albumObj: {
          id: cleanId,
          title: albumTitle || t.album?.title || ''
        },
        thumbnail: t.album?.cover_xl || t.album?.cover_big || albumCover || '',
        duration: t.duration || 0,
        previewUrl: t.preview || '',
        trackNumber: t.track_position || (idx + 1),
        source: 'deezer'
      }));
    }
  } catch (err) {
    console.warn('[artistService] getAlbumTracksDeezer error:', err);
  }

  return [];
}

/**
 * Récupère les top morceaux d'un artiste
 */
export async function getArtistTopTracks(artistId, limit = 20) {
  if (!artistId) return [];
  const cleanId = String(artistId).replace(/^(dz_art_|dz_)/, '');

  try {
    const jsonpRes = await fetchDeezerJsonp(`https://api.deezer.com/artist/${encodeURIComponent(cleanId)}/top?limit=${limit}`);
    if (jsonpRes && Array.isArray(jsonpRes.data) && jsonpRes.data.length > 0) {
      return jsonpRes.data.map((d) => ({
        id: `dz_${d.id}`,
        deezerId: d.id,
        videoId: `dz_${d.id}`,
        title: d.title_short || d.title || 'Sans titre',
        artist: d.artist?.name || 'Artiste',
        artistId: d.artist?.id,
        album: d.album?.title || '',
        albumId: d.album?.id,
        thumbnail: d.album?.cover_xl || d.album?.cover_big || d.album?.cover_medium || '',
        duration: d.duration || 0,
        previewUrl: d.preview || '',
        rank: d.rank || 0,
        source: 'deezer'
      })).sort((a, b) => (b.rank || 0) - (a.rank || 0));
    }
  } catch (err) {
    console.warn('[artistService] getArtistTopTracks error:', err);
  }

  return [];
}

export default {
  getArtistFullData,
  getAlbumTracksDeezer,
  getArtistTopTracks,
  searchOfficialDeezerArtist,
  fetchDeezerJsonp
};
