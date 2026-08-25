const query = "Eminem Lose Yourself";
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://pipedapi.mha.fi',
  'https://pipedapi.adminforge.de'
];
(async () => {
  for (const inst of PIPED_INSTANCES) {
    try {
      console.log("Trying", inst);
      const targetUrl = `${inst}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
      const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxiedUrl, { signal: AbortSignal.timeout(3500) });
      console.log(inst, res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log("Items:", data.items?.length);
        if (data.items?.length > 0) return;
      }
    } catch(e) {
      console.log("Failed", e.message);
    }
  }
})();
