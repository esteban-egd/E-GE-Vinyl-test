const INSTANCES = [
  'https://pipedapi.adminforge.de',
  'https://api.piped.privacydev.net',
  'https://pipedapi.mha.fi',
  'https://pipedapi.kavin.rocks',
  'https://inv.riverside.rocks',
  'https://api.invidious.io'
];

async function testSearch(query) {
  console.log('Testing search for:', query);
  for (const instance of INSTANCES) {
    try {
      const isPiped = instance.includes('piped');
      const url = isPiped 
        ? `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`
        : `${instance}/api/v1/search?q=${encodeURIComponent(query)}`;
        
      console.log('Fetching:', url);
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      console.log('Status:', res.status);
      
      if (!res.ok) continue;

      const data = await res.json();
      const items = isPiped ? data.items : data;
      console.log('Items length:', items ? items.length : 'undefined');
      
      if (items && items.length > 0) {
        console.log('SUCCESS on', instance);
        return;
      }
    } catch (err) {
      console.log('ERROR on', instance, err.message);
    }
  }
}

testSearch('Daft Punk');
