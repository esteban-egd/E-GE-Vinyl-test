import fs from 'fs';
let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

const unlockCode = `
    // 0. Déblocage du contexte audio (Hack iOS/Safari)
    if (audioRef.current) {
      audioRef.current.src = 'data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
      const p = audioRef.current.play();
      if (p !== undefined) {
        p.then(() => {
          audioRef.current.pause();
        }).catch(() => {});
      }
    }
    
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try { navigator.audioSession.type = 'playback'; } catch {}
    }
`;

content = content.replace(
  "if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {\n      try { navigator.audioSession.type = 'playback'; } catch {}\n    }",
  unlockCode
);

fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
