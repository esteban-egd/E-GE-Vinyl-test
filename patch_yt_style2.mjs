import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');

content = content.replace(
  "style={{\n        position: 'fixed',\n        bottom: '-500px',\n        right: '-500px',\n        width: '200px',\n        height: '200px',\n        opacity: '0.001',\n        pointerEvents: 'none',\n        zIndex: -1,\n        overflow: 'hidden',\n      }}",
  "style={{\n        position: 'fixed',\n        bottom: '0',\n        right: '0',\n        width: '300px',\n        height: '300px',\n        opacity: '1',\n        pointerEvents: 'none',\n        zIndex: -100,\n        overflow: 'hidden',\n        transform: 'translateY(100%)',\n      }}"
);

fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
