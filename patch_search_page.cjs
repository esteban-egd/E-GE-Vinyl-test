const fs = require('fs');
let code = fs.readFileSync('src/pages/SearchPage.jsx', 'utf8');

const oldBubbles = `  const artistBubbles = useMemo(() => {
    if (query.trim() && results.artists?.length > 0) {
      const seen = new Set();
      const clean = [];
      for (const a of results.artists) {
        const cleanName = getMainArtistName(a.name);
        const key = normalizeArtistKey(cleanName);
        if (key && !seen.has(key)) {
          seen.add(key);
          clean.push({ ...a, name: cleanName });
        }
      }
      return clean.slice(0, 10);
    }`;

const newBubbles = `  const artistBubbles = useMemo(() => {
    if (query.trim() && results.artists?.length > 0) {
      // 1. Filtrer les faux artistes/homonymes parasites
      const cleanedArtists = results.artists.filter(artist => {
        const name = getMainArtistName(artist.name).trim().toLowerCase();
        const q = query.trim().toLowerCase();
        const isExactMatch = name === q || normalizeArtistKey(name) === normalizeArtistKey(q);
        
        return isExactMatch || 
               artist.isVerified || 
               artist.isOfficial || 
               (artist.popularity && artist.popularity > 50) ||
               (artist.nbFans && artist.nbFans > 1000);
      });

      // 2. Dédoublonnage du tableau via un Map
      const uniqueArtistsMap = new Map();
      for (const item of cleanedArtists) {
        const cleanName = getMainArtistName(item.name);
        const key = cleanName.toLowerCase();
        if (!uniqueArtistsMap.has(key)) {
          uniqueArtistsMap.set(key, { ...item, name: cleanName });
        } else {
          // Keep the one with the valid artwork if the existing doesn't have it
          const existing = uniqueArtistsMap.get(key);
          if (!existing.artwork && item.artwork) {
            uniqueArtistsMap.set(key, { ...item, name: cleanName });
          }
        }
      }
      
      return Array.from(uniqueArtistsMap.values()).slice(0, 10);
    }`;

if (code.includes(oldBubbles)) {
  code = code.replace(oldBubbles, newBubbles);
  fs.writeFileSync('src/pages/SearchPage.jsx', code);
  console.log("Patched artistBubbles in SearchPage.jsx");
} else {
  console.log("Could not find oldBubbles in SearchPage.jsx");
}
