const INNERTUBE_CONTEXT = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20231214.00.00",
    gl: "FR",
    hl: "fr"
  }
};
(async () => {
  try {
    const res = await fetch('https://corsproxy.io/?' + encodeURIComponent('https://music.youtube.com/youtubei/v1/search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: INNERTUBE_CONTEXT,
        query: "Eminem Lose Yourself",
        params: "egWKAQIIAAWoAAMB" // Filtre strict YouTube Music "Chansons"
      })
    });
    console.log("corsproxy.io", res.ok);
    const data = await res.json();
    console.log("has contents:", !!data.contents);
  } catch(e) {
    console.log("Failed", e.message);
  }
})();
