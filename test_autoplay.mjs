import fs from 'fs';
let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');
content = content.replace(
  "setIsLoading(true);\n    setCurrentTrack(trackMeta);",
  "setIsLoading(true);\n    setCurrentTrack(trackMeta);\n    console.log('[DEBUG] Testing audio autoplay...');\n    try { const testAudio = new Audio(); testAudio.src = 'data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'; testAudio.play().then(()=>console.log('[DEBUG] Audio unlocked!')).catch(e => console.error('[DEBUG] Audio unlock failed:', e)); } catch(e){}"
);
fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
