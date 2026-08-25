import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');

content = content.replace(
  "opacity: '1',\n        pointerEvents: 'none',\n        zIndex: -1,\n        overflow: 'hidden',\n        transform: 'translateX(-9999px)',",
  "opacity: '0.01',\n        pointerEvents: 'none',\n        zIndex: -100,\n        overflow: 'hidden',\n        transform: 'none',"
);

fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
