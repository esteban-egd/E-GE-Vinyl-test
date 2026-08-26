const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistPage.jsx', 'utf8');

// Replace currentDiscoList logic
const oldDisco = `  const albums = artist.albums?.filter(a => a.recordType === 'album') || [];
  const singles = artist.albums?.filter(a => a.recordType === 'single' || a.recordType === 'ep') || [];
  const compilations = artist.albums?.filter(a => a.recordType === 'compilation') || [];
  
  const currentDiscoList = discoFilter === 'albums' ? albums : discoFilter === 'singles' ? singles : compilations;`;

const newDisco = `  const albums = artist.albums?.filter(a => a.recordType === 'album') || [];
  const singles = artist.albums?.filter(a => a.recordType === 'single' || a.recordType === 'ep') || [];
  const compilations = artist.albums?.filter(a => a.recordType === 'compilation') || [];
  
  let currentDiscoList = [];
  let activeFilter = discoFilter;
  
  if (discoFilter === 'albums') {
    if (albums.length > 0) currentDiscoList = albums;
    else if (singles.length > 0) { currentDiscoList = singles; activeFilter = 'singles'; }
    else if (compilations.length > 0) { currentDiscoList = compilations; activeFilter = 'compilations'; }
  } else if (discoFilter === 'singles') {
    if (singles.length > 0) currentDiscoList = singles;
    else if (albums.length > 0) { currentDiscoList = albums; activeFilter = 'albums'; }
  } else if (discoFilter === 'compilations') {
    if (compilations.length > 0) currentDiscoList = compilations;
    else if (albums.length > 0) { currentDiscoList = albums; activeFilter = 'albums'; }
  }`;

if (code.includes(oldDisco)) {
  code = code.replace(oldDisco, newDisco);
  console.log("Patched disco list logic");
} else {
  console.log("oldDisco not found");
}

fs.writeFileSync('src/pages/ArtistPage.jsx', code);
