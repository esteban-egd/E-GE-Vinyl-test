import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');
content = content.replace("opacity: '1',", "opacity: '1',");
content = content.replace("pointerEvents: 'none',", "pointerEvents: 'auto',");
content = content.replace("zIndex: -100,", "zIndex: 9999,");
content = content.replace("transform: 'translateY(100%)',", "/* transform: 'translateY(100%)', */");
fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
