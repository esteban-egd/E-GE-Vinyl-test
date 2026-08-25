import fs from 'fs';
let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

content = content.replace(
  "if (streamUrl && audioRef.current) {",
  "if (streamUrl && audioRef.current) {"
); // Let's check how many times this occurs.
