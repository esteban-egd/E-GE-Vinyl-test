import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');

content = content.replace(
  "videoId: '',\n          playerVars:",
  "videoId: 'Wch3gJG2IG4',\n          playerVars:"
);

fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
