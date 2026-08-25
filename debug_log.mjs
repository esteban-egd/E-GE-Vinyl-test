import fs from 'fs';
let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');
content = content.replace(
  "const state = iframePlayerRef.current.getPlayerState?.();",
  "const state = iframePlayerRef.current.getPlayerState?.();\n            // console.log('[DEBUG] getPlayerState:', state);"
);
fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
