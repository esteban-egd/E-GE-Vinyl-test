(async () => {
  try {
    const res = await fetch('https://api.codetabs.com/v1/proxy?quest=https://music.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20231214.00.00", gl: "FR", hl: "fr" } },
        query: "Eminem Lose Yourself",
        params: "egWKAQIIAAWoAAMB" 
      })
    });
    console.log("codetabs", res.ok);
    const text = await res.text();
    console.log(text.substring(0, 100));
  } catch(e) {
    console.log("Failed", e.message);
  }
})();
