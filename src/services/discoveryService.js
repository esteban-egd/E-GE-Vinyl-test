/**
 * Service Officiel de Découvertes et Tendances Deezer
 * Utilise l'endpoint https://api.deezer.com/chart/0 via JSONP (CORS-free)
 * et proxys de secours pour garantir 100% de pochettes officielles HD Deezer.
 */

import { fetchDeezerJsonp } from './artistService';

// Fallback de haute qualité avec de vrais hashes Deezer officiels
const FALLBACK_DEEZER_ALBUMS = [
  {
    id: 587391292,
    deezerId: 587391292,
    title: 'HIT ME HARD AND SOFT',
    artist: 'Billie Eilish',
    cover: 'https://e-cdns-images.dzcdn.net/images/cover/03f273295988e0b6732f7a942512f5a0/1000x1000-000000-80-0-0.jpg',
    cover_big: 'https://e-cdns-images.dzcdn.net/images/cover/03f273295988e0b6732f7a942512f5a0/500x500-000000-80-0-0.jpg',
    type: 'Album'
  },
  {
    id: 622319461,
    deezerId: 622319461,
    title: 'Short n\' Sweet',
    artist: 'Sabrina Carpenter',
    cover: 'https://e-cdns-images.dzcdn.net/images/cover/e006692c813824058e5d0f666f7f2b96/1000x1000-000000-80-0-0.jpg',
    cover_big: 'https://e-cdns-images.dzcdn.net/images/cover/e006692c813824058e5d0f666f7f2b96/500x500-000000-80-0-0.jpg',
    type: 'Album'
  },
  {
    id: 583492812,
    deezerId: 583492812,
    title: 'BRAT',
    artist: 'Charli xcx',
    cover: 'https://e-cdns-images.dzcdn.net/images/cover/6c97a82743818e97f562b774623158e2/1000x1000-000000-80-0-0.jpg',
    cover_big: 'https://e-cdns-images.dzcdn.net/images/cover/6c97a82743818e97f562b774623158e2/500x500-000000-80-0-0.jpg',
    type: 'Album'
  },
  {
    id: 569103982,
    deezerId: 569103982,
    title: 'Radical Optimism',
    artist: 'Dua Lipa',
    cover: 'https://e-cdns-images.dzcdn.net/images/cover/f0e38600d8d08432b4b455648c660421/1000x1000-000000-80-0-0.jpg',
    cover_big: 'https://e-cdns-images.dzcdn.net/images/cover/f0e38600d8d08432b4b455648c660421/500x500-000000-80-0-0.jpg',
    type: 'Album'
  },
  {
    id: 641882991,
    deezerId: 641882991,
    title: 'CHROMAKOPIA',
    artist: 'Tyler, The Creator',
    cover: 'https://e-cdns-images.dzcdn.net/images/cover/433f4a01c4568e64c2357a79624564c2/1000x1000-000000-80-0-0.jpg',
    cover_big: 'https://e-cdns-images.dzcdn.net/images/cover/433f4a01c4568e64c2357a79624564c2/500x500-000000-80-0-0.jpg',
    type: 'Album'
  },
  {
    id: 468502395,
    deezerId: 468502395,
    title: 'Utopia',
    artist: 'Travis Scott',
    cover: 'https://e-cdns-images.dzcdn.net/images/cover/354d242636a0ed7d6c65b53d162f4c9a/1000x1000-000000-80-0-0.jpg',
    cover_big: 'https://e-cdns-images.dzcdn.net/images/cover/354d242636a0ed7d6c65b53d162f4c9a/500x500-000000-80-0-0.jpg',
    type: 'Album'
  },
  {
    id: 618492019,
    deezerId: 618492019,
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    cover: 'https://e-cdns-images.dzcdn.net/images/cover/8ec7491cf278d655f0b5aa9fb13df65d/1000x1000-000000-80-0-0.jpg',
    cover_big: 'https://e-cdns-images.dzcdn.net/images/cover/8ec7491cf278d655f0b5aa9fb13df65d/500x500-000000-80-0-0.jpg',
    type: 'Single'
  },
  {
    id: 580193821,
    deezerId: 580193821,
    title: 'Not Like Us',
    artist: 'Kendrick Lamar',
    cover: 'https://e-cdns-images.dzcdn.net/images/cover/b43b678f1412030f0f8a846114b0b12f/1000x1000-000000-80-0-0.jpg',
    cover_big: 'https://e-cdns-images.dzcdn.net/images/cover/b43b678f1412030f0f8a846114b0b12f/500x500-000000-80-0-0.jpg',
    type: 'Single'
  }
];

/**
 * Récupère les albums tendance du moment depuis Deezer Chart
 */
export async function getDeezerChartAlbums(limit = 24) {
  try {
    // 1. Appel JSONP direct (ultra-rapide, sans CORS)
    const data = await fetchDeezerJsonp(`https://api.deezer.com/chart/0/albums?limit=${limit}`);
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map(item => {
        const cover = item.cover_xl || item.cover_big || item.cover_medium || item.cover;
        return {
          id: item.id,
          deezerId: item.id,
          title: item.title,
          artist: item.artist?.name || 'Artiste',
          artistId: item.artist?.id,
          cover: cover,
          cover_big: item.cover_big || cover,
          cover_medium: item.cover_medium || cover,
          type: item.record_type === 'single' ? 'Single' : 'Album',
          tracklist: item.tracklist
        };
      });
    }
  } catch (err) {
    console.warn('[DiscoveryService] Erreur JSONP chart albums:', err);
  }

  // 2. Appel serveur proxy de secours
  try {
    const res = await fetch('/api/deezer-new-releases');
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[DiscoveryService] Erreur proxy chart albums:', err);
  }

  return FALLBACK_DEEZER_ALBUMS;
}

/**
 * Récupère les titres du top tendances du moment depuis Deezer Chart
 */
export async function getDeezerChartTracks(limit = 30) {
  try {
    const data = await fetchDeezerJsonp(`https://api.deezer.com/chart/0/tracks?limit=${limit}`);
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map(item => {
        const cover = item.album?.cover_xl || item.album?.cover_big || item.album?.cover_medium || item.album?.cover || item.cover_xl || item.cover_big;
        return {
          id: `dz_${item.id}`,
          deezerId: item.id,
          videoId: `dz_${item.id}`,
          title: item.title || item.title_short,
          artist: item.artist?.name || 'Artiste',
          artistId: item.artist?.id,
          album: item.album?.title || item.title,
          thumbnail: cover,
          cover: cover,
          cover_big: item.album?.cover_big || cover,
          duration: item.duration || 210,
          preview: item.preview,
          source: 'deezer'
        };
      });
    }
  } catch (err) {
    console.warn('[DiscoveryService] Erreur JSONP chart tracks:', err);
  }

  return [];
}

/**
 * Récupère les artistes du top chart Deezer
 */
export async function getDeezerChartArtists(limit = 15) {
  try {
    const data = await fetchDeezerJsonp(`https://api.deezer.com/chart/0/artists?limit=${limit}`);
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map(item => ({
        id: item.id,
        deezerId: item.id,
        name: item.name,
        avatar: item.picture_xl || item.picture_big || item.picture_medium || item.picture,
        picture_big: item.picture_big || item.picture_xl || item.picture,
        nbFans: item.nb_fan || 0,
        radio: item.radio
      }));
    }
  } catch (err) {
    console.warn('[DiscoveryService] Erreur JSONP chart artists:', err);
  }

  return [];
}
