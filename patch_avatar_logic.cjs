const fs = require('fs');
let code = fs.readFileSync('src/services/musicDataService.js', 'utf8');

const oldFindBest = `    const findBestArtistArtwork = (artName, defaultPic = null) => {
      if (isValidArtwork(defaultPic)) return defaultPic;

      const featured = FEATURED_ARTISTS.find(f => normalizeArtistKey(getMainArtistName(f.name)) === normalizeArtistKey(getMainArtistName(artName)));
      if (featured && isValidArtwork(featured.avatar)) return featured.avatar;

      const trackMatch = rawTracks.find(t => 
        normalizeArtistKey(getMainArtistName(t.artist)) === normalizeArtistKey(getMainArtistName(artName)) && isValidArtwork(t.thumbnail)
      );
      if (trackMatch) return trackMatch.thumbnail;

      if (albumsData.results && Array.isArray(albumsData.results)) {
        const albumMatch = albumsData.results.find(alb => 
          normalizeArtistKey(getMainArtistName(alb.artistName)) === normalizeArtistKey(getMainArtistName(artName)) && alb.artworkUrl100
        );
        if (albumMatch) return getHdArtwork(albumMatch.artworkUrl100);
      }

      return null;
    };`;

const newFindBest = `    const findBestArtistArtwork = (artName, defaultPic = null) => {
      if (isValidArtwork(defaultPic)) return defaultPic;

      const featured = FEATURED_ARTISTS.find(f => normalizeArtistKey(getMainArtistName(f.name)) === normalizeArtistKey(getMainArtistName(artName)));
      if (featured && isValidArtwork(featured.avatar)) return featured.avatar;

      // EXPLICITEMENT AUCUN FALLBACK SUR LES COVERS D'ALBUM OU DE TRACK
      return null;
    };`;

if (code.includes(oldFindBest)) {
  code = code.replace(oldFindBest, newFindBest);
}

const oldTrkFallback = `const artwork = findBestArtistArtwork(mainName, t.thumbnail);`;
const newTrkFallback = `const artwork = findBestArtistArtwork(mainName, null);`; // Never pass track thumbnail as artist avatar

if (code.includes(oldTrkFallback)) {
  code = code.replace(oldTrkFallback, newTrkFallback);
}

fs.writeFileSync('src/services/musicDataService.js', code);
console.log("Patched musicDataService.js avatar logic");
