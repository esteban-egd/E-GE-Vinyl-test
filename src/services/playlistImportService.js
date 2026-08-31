
import { searchUnified } from './musicDataService';

/**
 * Service to import playlists from Spotify and Deezer.
 * Uses public endpoints and parsing strategies to avoid complex OAuth for simple imports.
 */

export async function parsePlaylistUrl(url) {
  if (!url) return null;
  
  // 1. Nettoyage basique et direct de l'URL
  const clean = url.trim().split('?')[0].split('#')[0];
  
  // 2. Récupère le dernier segment de l'URL comme ID
  // On filtre les segments vides pour éviter les problèmes avec les slashs traînants
  const segments = clean.split('/').filter(Boolean);
  const playlistId = segments[segments.length - 1]; 
  
  if (!playlistId) return null;

  console.log("ID de playlist extrait de force :", playlistId);

  // 3. Détermination du type (Spotify par défaut, Deezer si présent)
  const type = clean.includes('deezer') ? 'deezer' : 'spotify';
  
  return { type, id: playlistId };
}

export async function fetchPlaylistMetadata(url) {
  const info = await parsePlaylistUrl(url);
  // On ne bloque plus, on essaie l'import avec ce qu'on a trouvé
  // Si on n'a pas pu extraire d'ID propre, on utilise l'URL brute
  const id = (info && info.id) ? info.id : url.trim().split('/').pop();
  const type = (url.includes('deezer')) ? 'deezer' : 'spotify';

  if (type === 'spotify') {
    return fetchSpotifyPlaylist(id);
  } else {
    return fetchDeezerPlaylist(id);
  }
}

async function fetchSpotifyPlaylist(playlistId) {
  try {
    const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    let response;
    let html;

    try {
      // 1. Try local server proxy first
      response = await fetch(`/api/playlist-import?type=spotify&url=${encodeURIComponent(embedUrl)}`);
      if (!response.ok) throw new Error(`Local proxy failed (${response.status})`);
      html = await response.text();
    } catch (localErr) {
      console.warn('[AudioEngine] Local proxy failed, attempting public CORS proxy:', localErr);
      // 2. Fallback to public CORS proxy (allorigins)
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(embedUrl)}`;
      response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Public proxy failed (${response.status})`);
      html = await response.text();
    }
    
    // Extract JSON from script tag
    const match = html.match(/<script id="initial-state" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) {
       const resourceMatch = html.match(/<script id="resource" type="application\/json">([\s\S]*?)<\/script>/);
       if (resourceMatch) {
         const data = JSON.parse(resourceMatch[1]);
         return {
           title: data.name || 'Playlist Spotify',
           cover: data.images?.[0]?.url || '',
           tracks: data.tracks?.items?.map(item => ({
             title: item.track.name,
             artist: item.track.artists.map(a => a.name).join(', '),
             duration: Math.round(item.track.duration_ms / 1000),
             thumbnail: item.track.album?.images?.[0]?.url || ''
           })) || []
         };
       }
       // On ne bloque plus, on renvoie un objet par défaut
       return {
         title: 'Playlist Spotify importée',
         cover: '',
         tracks: []
       };
    }
    
    const data = JSON.parse(decodeURIComponent(match[1]));
    const playlistData = data.entities?.items?.[`spotify:playlist:${playlistId}`] || data.playlist;
    
    return {
      title: playlistData?.name || 'Playlist Spotify',
      cover: playlistData?.images?.[0]?.url || '',
      tracks: playlistData?.tracks?.items?.map(item => ({
        title: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        duration: Math.round(item.track.duration_ms / 1000),
        thumbnail: item.track.album?.images?.[0]?.url || ''
      })) || []
    };
  } catch (err) {
    console.error('[AudioEngine] Error fetching Spotify playlist:', err);
    // Sauvegarde de secours : on renvoie une playlist vide pour permettre la création en BDD
    return {
      title: 'Playlist Spotify importée',
      cover: '',
      tracks: []
    };
  }
}

async function fetchDeezerPlaylist(playlistId) {
  try {
    const apiUrl = `https://api.deezer.com/playlist/${playlistId}`;
    let data;

    try {
      // 1. Try local server proxy
      const response = await fetch(`/api/playlist-import?type=deezer&url=${encodeURIComponent(apiUrl)}`);
      if (!response.ok) throw new Error(`Local proxy failed (${response.status})`);
      data = await response.json();
    } catch (localErr) {
      console.warn('[AudioEngine] Local Deezer proxy failed, attempting public CORS proxy:', localErr);
      // 2. Fallback to public CORS proxy
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Public proxy failed (${response.status})`);
      const proxyData = await response.json();
      data = JSON.parse(proxyData.contents);
    }
    
    return {
      title: data.title || 'Playlist Deezer',
      cover: data.picture_xl || data.picture_big || data.picture_medium || data.picture || '',
      tracks: data.tracks?.data?.map(track => ({
        title: track.title,
        artist: track.artist?.name || 'Artiste inconnu',
        duration: track.duration,
        thumbnail: track.album?.cover_xl || track.album?.cover_big || track.album?.cover_medium || track.album?.cover || ''
      })) || []
    };
  } catch (err) {
    console.error('[AudioEngine] Error fetching Deezer playlist:', err);
    // Sauvegarde de secours : on renvoie une playlist vide pour permettre la création en BDD
    return {
      title: 'Playlist Deezer importée',
      cover: '',
      tracks: []
    };
  }
}

/**
 * Resolves imported tracks to YouTube video IDs using the unified search.
 */
export async function resolveTracks(tracks, onProgress) {
  const resolved = [];
  let count = 0;
  
  for (const track of tracks) {
    try {
      const query = `${track.artist} - ${track.title}`;
      const results = await searchUnified(query);
      
      if (results.tracks && results.tracks.length > 0) {
        const bestMatch = results.tracks[0];
        resolved.push({
          ...track,
          videoId: bestMatch.videoId || bestMatch.id
        });
      }
    } catch (err) {
      console.warn(`Failed to resolve track: ${track.title}`, err);
    }
    
    count++;
    if (onProgress) onProgress(Math.round((count / tracks.length) * 100));
  }
  
  return resolved;
}
