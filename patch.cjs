const fs = require('fs');
let code = fs.readFileSync('src/services/musicDataService.js', 'utf8');

const targetSection = `
    // 1. Recherche de l'artiste officiel sur Deezer
    let dzArtist = null;
    let dzTopTracks = [];
    let dzAlbums = [];
    let dzRelated = [];

    try {
      const dzArtistRes = await fetch(\`/api/deezer-artist?q=\${encodeURIComponent(cleanName)}\`, {
        signal: AbortSignal.timeout(5000)
      });
      if (dzArtistRes.ok) {
        const dzArtistData = await dzArtistRes.json();
        if (dzArtistData && Array.isArray(dzArtistData.data) && dzArtistData.data.length > 0) {
          dzArtist = dzArtistData.data.find(a => matchFn(a.name)) || dzArtistData.data[0];

          if (dzArtist && dzArtist.id) {
            const [topRes, albRes, relatedRes] = await Promise.all([
              fetch(\`/api/deezer-artist-top?id=\${dzArtist.id}\`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({ data: [] })),
              fetch(\`/api/deezer-artist-albums?id=\${dzArtist.id}\`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({ data: [] })),
              fetch(\`/api/deezer-artist-related?id=\${dzArtist.id}\`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({ data: [] }))
            ]);
            dzTopTracks = topRes?.data || [];
            dzAlbums = albRes?.data || [];
            dzRelated = relatedRes?.data || [];
          }
        }
      }
    } catch (e) {
      console.warn('[MusicDataService] Erreur Deezer artist:', e);
    }

    // 2. Deezer Search direct pour trouver tous les morceaux de l'artiste
    let dzSearchTracks = [];
    try {
      const dzSearchRes = await fetch(\`/api/deezer-search?q=artist:"\${encodeURIComponent(cleanName)}"\`, {
        signal: AbortSignal.timeout(5000)
      });
      if (dzSearchRes.ok) {
        const data = await dzSearchRes.json();
        if (data && Array.isArray(data.data)) {
          dzSearchTracks = data.data;
        }
      }
    } catch (_) {}

    // Si la recherche ciblée artiste n'a rien donné, recherche générale
    if (dzSearchTracks.length === 0) {
      try {
        const dzGeneralRes = await fetch(\`/api/deezer-search?q=\${encodeURIComponent(cleanName)}\`, {
          signal: AbortSignal.timeout(5000)
        });
        if (dzGeneralRes.ok) {
          const data = await dzGeneralRes.json();
          if (data && Array.isArray(data.data)) {
            dzSearchTracks = data.data;
          }
        }
      } catch (_) {}
    }`;

const newSection = `
    // 1. Recherche de l'artiste officiel sur Deezer
    let dzArtist = null;
    let dzTopTracks = [];
    let dzAlbums = [];
    let dzRelated = [];
    let dzSearchTracks = [];

    try {
      // 1a. Recherche exacte de l'artiste
      const dzArtistRes = await fetch(\`/api/deezer-artist?q=\${encodeURIComponent(cleanName)}\`, {
        signal: AbortSignal.timeout(5000)
      }).catch(() => null);
      
      if (dzArtistRes && dzArtistRes.ok) {
        const dzArtistData = await dzArtistRes.json();
        if (dzArtistData && Array.isArray(dzArtistData.data) && dzArtistData.data.length > 0) {
          dzArtist = dzArtistData.data.find(a => matchFn(a.name)) || dzArtistData.data[0];
        }
      }

      // 1b. Récupérer des pistes pour fallback
      const dzSearchRes = await fetch(\`/api/deezer-search?q=artist:"\${encodeURIComponent(cleanName)}"\`, {
        signal: AbortSignal.timeout(5000)
      }).catch(() => null);
      if (dzSearchRes && dzSearchRes.ok) {
        const data = await dzSearchRes.json();
        if (data && Array.isArray(data.data)) dzSearchTracks = data.data;
      }

      if (dzSearchTracks.length === 0) {
        const dzGeneralRes = await fetch(\`/api/deezer-search?q=\${encodeURIComponent(cleanName)}\`, {
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

      // 1d. Récupérer Top, Albums, Related
      if (dzArtist && dzArtist.id) {
        const [topRes, albRes, relatedRes] = await Promise.all([
          fetch(\`/api/deezer-artist-top?id=\${dzArtist.id}\`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(\`/api/deezer-artist-albums?id=\${dzArtist.id}\`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(\`/api/deezer-artist-related?id=\${dzArtist.id}\`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({ data: [] }))
        ]);
        dzTopTracks = topRes?.data || [];
        dzAlbums = albRes?.data || [];
        dzRelated = relatedRes?.data || [];
      }

      // 1e. Fallback Albums
      if (dzAlbums.length === 0) {
        const fallbackAlbRes = await fetch(\`/api/deezer-search-album?q=\${encodeURIComponent(cleanName)}\`, {
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
    }`;

if (code.includes(targetSection.trim())) {
  code = code.replace(targetSection.trim(), newSection.trim());
  fs.writeFileSync('src/services/musicDataService.js', code);
  console.log("Successfully patched musicDataService.js");
} else {
  console.error("Target section not found!");
}
