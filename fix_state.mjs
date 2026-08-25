import fs from 'fs';
let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

content = content.replace(
  "trackMeta.thumbnail = bestMatch.thumbnail;\n            }",
  "trackMeta.thumbnail = bestMatch.thumbnail;\n            }\n            setCurrentTrack({...trackMeta});"
);

fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
