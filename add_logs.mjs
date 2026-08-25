import fs from 'fs';
let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

content = content.replace(
  "const trackMeta = {",
  "console.log('[DEBUG] play() called with rawTrack:', rawTrack); console.log('[DEBUG] initialVideoId:', initialVideoId);\n    const trackMeta = {"
);

content = content.replace(
  "// Sécurisation finale du videoId avant transmission aux moteurs",
  "console.log('[DEBUG] before final extract, videoId is:', trackMeta.videoId);\n    // Sécurisation finale du videoId avant transmission aux moteurs"
);

content = content.replace(
  "trackMeta.videoId = extractYouTubeId(trackMeta.videoId);",
  "trackMeta.videoId = extractYouTubeId(trackMeta.videoId);\n    console.log('[DEBUG] final videoId:', trackMeta.videoId);"
);

content = content.replace(
  "if (trackMeta.videoId && trackMeta.videoId.length === 11) {",
  "console.log('[DEBUG] Iframe block triggered, videoId:', trackMeta.videoId);\n    if (trackMeta.videoId && trackMeta.videoId.length === 11) {"
);

fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
