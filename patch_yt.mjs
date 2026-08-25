import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');
content = content.replace(
  "iv_load_policy: 3,",
  "iv_load_policy: 3,\n            enablejsapi: 1,\n            origin: window.location.origin,"
);
fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
