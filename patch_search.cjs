const fs = require('fs');
let code = fs.readFileSync('src/services/musicDataService.js', 'utf8');

const targetStr = `    // e) Calcul de la dominance et classement ultime des artistes
    for (const a of rawArtists) {
      const simScore = calcArtistSimilarity(cleanQuery, a.name);
      const artistTracks = uniqueScoredTracks.filter(t => isArtistMatch(a.name, t.artist));
      const trackCount = artistTracks.length;
      const trackScoreSum = artistTracks.reduce((acc, trk) => acc + (trk.relevanceScore || 0), 0);
      const isFeatured = FEATURED_ARTISTS.some(f => normalizeArtistKey(f.name) === normalizeArtistKey(a.name));

      let score = simScore;
      score += trackCount * 3000;
      score += trackScoreSum * 5;
      if (isFeatured) score += 4000;
      if (a.nbFans) score += Math.min(3000, Math.round(a.nbFans / 1000));
      if (isValidArtwork(a.artwork)) score += 500;

      a.dominanceScore = score;
    }

    rawArtists.sort((a, b) => b.dominanceScore - a.dominanceScore);
    const artists = rawArtists.slice(0, 10);`;

const replacementStr = `    // e) Nettoyage, Dédoublonnage et Scoring (Filtre Strict)
    const uniqueArtistsMap = new Map();
    for (const a of rawArtists) {
      const mainNameKey = normalizeArtistKey(a.name);
      if (!mainNameKey) continue;
      
      const isExactMatch = mainNameKey === normalizeArtistKey(cleanQuery);
      const isIncluded = mainNameKey.includes(normalizeArtistKey(cleanQuery)) || normalizeArtistKey(cleanQuery).includes(mainNameKey);
      
      // Strict filter: must at least contain the search query somewhat, unless it's a related feature
      if (!isIncluded && !isExactMatch) continue;
      
      const hasSignificantFans = (a.nbFans || 0) >= 1000;
      // Exclude obscure homonyms unless exact match or significant fanbase
      if (!isExactMatch && !hasSignificantFans && !a.isOfficial) continue;
      
      const existing = uniqueArtistsMap.get(mainNameKey);
      if (!existing) {
        uniqueArtistsMap.set(mainNameKey, a);
      } else {
        if ((a.nbFans || 0) > (existing.nbFans || 0)) existing.nbFans = a.nbFans;
        if (a.deezerId && !existing.deezerId) existing.deezerId = a.deezerId;
        if (isValidArtwork(a.artwork) && !isValidArtwork(existing.artwork)) existing.artwork = a.artwork;
      }
    }
    
    let filteredArtists = Array.from(uniqueArtistsMap.values());

    for (const a of filteredArtists) {
      const simScore = calcArtistSimilarity(cleanQuery, a.name);
      const artistTracks = uniqueScoredTracks.filter(t => isArtistMatch(a.name, t.artist));
      const trackCount = artistTracks.length;
      const trackScoreSum = artistTracks.reduce((acc, trk) => acc + (trk.relevanceScore || 0), 0);
      const isFeatured = FEATURED_ARTISTS.some(f => normalizeArtistKey(f.name) === normalizeArtistKey(a.name));
      const isExactMatch = normalizeArtistKey(a.name) === normalizeArtistKey(cleanQuery);

      let score = simScore;
      // L'artiste principal certifié (exact match) doit TOUJOURS sortir en #1
      if (isExactMatch) {
        score += 50000; // Massive boost for exact matches
        if (a.nbFans) score += a.nbFans; // Break ties with actual fan count
      } else {
        score += trackCount * 3000;
        score += trackScoreSum * 5;
        if (isFeatured) score += 4000;
        if (a.nbFans) score += Math.min(10000, Math.round(a.nbFans / 100)); // Cap fan boost for non-exact matches
        if (isValidArtwork(a.artwork)) score += 500;
      }

      a.dominanceScore = score;
    }

    filteredArtists.sort((a, b) => b.dominanceScore - a.dominanceScore);
    const artists = filteredArtists.slice(0, 10);`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/services/musicDataService.js', code);
  console.log("Patched artist sorting and deduplication");
} else {
  console.log("artist sort logic not found");
}
