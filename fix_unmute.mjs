import fs from 'fs';
let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

const oldCode = `        try {
          if (typeof iframePlayerRef.current.unMute === 'function') {
            iframePlayerRef.current.unMute();
          }
          if (typeof iframePlayerRef.current.setVolume === 'function') {
            iframePlayerRef.current.setVolume(Math.round(volume * 100));
          }
          
          if (trackMeta.videoId && trackMeta.videoId.length === 11) {`;

const newCode = `        try {
          try {
            if (typeof iframePlayerRef.current.unMute === 'function') {
              iframePlayerRef.current.unMute();
            }
            if (typeof iframePlayerRef.current.setVolume === 'function') {
              iframePlayerRef.current.setVolume(Math.round(volume * 100));
            }
          } catch(e) {}
          
          if (trackMeta.videoId && trackMeta.videoId.length === 11) {`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
