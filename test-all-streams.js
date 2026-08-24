const INSTANCES = [
  'https://invidious.flokinet.to',
  'https://vid.puffyan.us',
  'https://invidious.projectsegfau.lt',
  'https://pipedapi.adminforge.de',
  'https://api.piped.privacydev.net',
  'https://pipedapi.mha.fi',
  'https://pipedapi.kavin.rocks',
  'https://inv.riverside.rocks',
  'https://api.invidious.io'
];

async function testAllStreams() {
  const videoId = 'FGBhQbmPwH8'; // Daft punk one more time
  for (const instance of INSTANCES) {
    console.log('Testing', instance);
    try {
      const isPiped = instance.includes('piped');
      if (isPiped) {
        const res = await fetch(`${instance}/streams/${videoId}`, { signal: AbortSignal.timeout(8000) });
        console.log(res.status);
        if (res.ok) {
           const data = await res.json();
           if (data.audioStreams && data.audioStreams.length > 0) {
              console.log('WORKING PIPED STREAM:', instance);
              return;
           }
        }
      } else {
        const res = await fetch(`${instance}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(8000) });
        console.log(res.status);
        if (res.ok) {
           const data = await res.json();
           if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
              console.log('WORKING INVIDIOUS STREAM:', instance);
              return;
           }
        }
      }
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
}
testAllStreams();
