const query = "Eminem Lose Yourself";
const INVIDIOUS_INSTANCES = [
  'https://vid.puffyan.us',
  'https://invidious.nerdvpn.de',
  'https://invidious.slipfox.xyz',
  'https://invidious.lunar.icu'
];
(async () => {
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      console.log("Trying", inst);
      const targetUrl = `${inst}/api/v1/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(3500) });
      console.log(inst, res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log("Items:", data.length);
        if (data.length > 0) return;
      }
    } catch(e) {
      console.log("Failed", e.message);
    }
  }
})();
