import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');
content = content.replace("bottom: '0',", "bottom: '-500px',");
content = content.replace("right: '0',", "right: '-500px',");
content = content.replace("width: '1px',", "width: '200px',");
content = content.replace("height: '1px',", "height: '200px',");
fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
