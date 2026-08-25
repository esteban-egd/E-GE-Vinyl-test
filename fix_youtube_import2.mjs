import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');
content = content.replace("import { useAudio } from '../../hooks/AudioProvider';", "import { useAudio } from '../../context/AudioContext';");
fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
