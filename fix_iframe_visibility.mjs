import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');

content = content.replace(
  "opacity: '0.001',\n        pointerEvents: 'none',\n        zIndex: -1,\n        overflow: 'hidden',\n        transform: 'translateY(100%)',",
  "opacity: '1',\n        pointerEvents: 'none',\n        zIndex: -1,\n        overflow: 'hidden',\n        transform: 'translateX(-9999px)',"
);

fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
