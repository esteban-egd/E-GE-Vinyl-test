import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');

content = content.replace(
  "isInitializingRef.current = true;\n      if (!window.YT || !window.YT.Player) return;\n      if (!containerRef.current) return;",
  "if (!window.YT || !window.YT.Player) return;\n      if (!containerRef.current) return;\n      isInitializingRef.current = true;"
);

fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
