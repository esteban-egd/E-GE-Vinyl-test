import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');

content = content.replace(
  "style={{\n        position: 'fixed',\n        bottom: '0',\n        right: '0',\n        width: '300px',\n        height: '300px',\n        opacity: '1',\n        pointerEvents: 'auto',\n        zIndex: 9999,\n        overflow: 'hidden',\n        /* transform: 'translateY(100%)', */\n      }}",
  "style={{\n        position: 'fixed',\n        bottom: '0',\n        right: '0',\n        width: '1px',\n        height: '1px',\n        opacity: '0.001',\n        pointerEvents: 'none',\n        zIndex: -1,\n        overflow: 'hidden',\n      }}"
);

fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
