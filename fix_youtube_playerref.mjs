import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');
content = content.replace("new window.YT.Player(containerRef.current,", "playerRef.current = new window.YT.Player(containerRef.current,");
fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
