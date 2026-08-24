const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.smnz.de',
  'https://pipedapi.syncpundit.io',
  'https://piped-api.lunar.icu',
  'https://pipedapi.privacydev.net',
  'https://pipedapi.drgns.space',
  'https://api.piped.projectsegfau.lt'
];

async function testSearch(query) {
  for (const instance of PIPED_INSTANCES) {
    console.log(`Testing instance: ${instance}`);
    try {
      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
        { signal: AbortSignal.timeout(8000) }
      );
      console.log(`Status: ${res.status}`);
      if (!res.ok) continue;

      const data = await res.json();
      console.log(`Items count: ${data.items ? data.items.length : 0}`);
      if (data.items && data.items.length > 0) {
          console.log(`Working instance found: ${instance}`);
          console.log(data.items[0].title);
          return instance;
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

testSearch('Daft Punk');
