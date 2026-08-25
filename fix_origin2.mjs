import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');
content = content.replace(
  "enablejsapi: 1,\n                      },",
  "enablejsapi: 1,\n            origin: window.location.origin,\n          },"
);
fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
