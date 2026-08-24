import https from 'https';

async function testPiped() {
  const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacydev.net',
    'https://invidious.nerdvpn.de'
  ];
  for (const instance of PIPED_INSTANCES) {
    try {
      const pipedRes = await fetch(`${instance}/streams/dQw4w9WgXcQ`);
      if (!pipedRes.ok) continue;
      const data = await pipedRes.json();
      const audioStreams = data.audioStreams?.filter(s => s.mimeType?.includes('audio/m4a') || s.mimeType?.includes('audio/webm'));
      if (audioStreams && audioStreams.length > 0) {
        audioStreams.sort((a, b) => b.bitrate - a.bitrate);
        console.log("Found stream on", instance, audioStreams[0].url);
        return;
      }
    } catch (e) {}
  }
}
testPiped();
