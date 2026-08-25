import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');

content = content.replace(
  "playerRef.current = console.log('[DEBUG] Calling new window.YT.Player()'); playerRef.current = new window.YT.Player(",
  "playerRef.current = new window.YT.Player("
);

fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
