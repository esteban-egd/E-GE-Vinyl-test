async function test() {
  const instance = 'https://invidious.flokinet.to';
  const videoId = 'FGBhQbmPwH8'; // Daft punk one more time
  try {
    const res = await fetch(`${instance}/api/v1/videos/${videoId}`);
    console.log(res.status);
    const data = await res.json();
    console.log('adaptiveFormats?', !!data.adaptiveFormats);
    if (data.adaptiveFormats) {
      const streams = data.adaptiveFormats.filter(s => s.type && s.type.includes('audio'));
      console.log('streams count:', streams.length);
      if (streams.length > 0) {
        console.log('first stream url:', streams[0].url.substring(0, 100));
        // Test if the stream URL is accessible (CORS/403)
        const streamRes = await fetch(streams[0].url, { method: 'HEAD' });
        console.log('Stream HEAD status:', streamRes.status);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
test();
