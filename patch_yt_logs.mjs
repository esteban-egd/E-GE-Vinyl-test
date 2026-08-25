import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');

content = content.replace(
  "onReady: (event) => {",
  "onReady: (event) => {\n              console.log('[DEBUG] YT iframe onReady fired!');"
);

content = content.replace(
  "onStateChange: (event) => {",
  "onStateChange: (event) => {\n              console.log('[DEBUG] YT iframe onStateChange fired:', event.data);"
);

content = content.replace(
  "new window.YT.Player(",
  "console.log('[DEBUG] Calling new window.YT.Player()'); playerRef.current = new window.YT.Player("
);

fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
