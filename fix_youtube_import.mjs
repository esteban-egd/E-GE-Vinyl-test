import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');
content = content.replace("import { useAudio } from './AudioProvider';", "import { useAudio } from '../../hooks/AudioProvider';");
fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
