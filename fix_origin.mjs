import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');
content = content.replace("origin: window.location.origin,", "");
fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
