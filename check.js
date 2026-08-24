const fs = require('fs');
const code = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');
try {
  new Function(code);
} catch (e) {
  console.log(e);
}
