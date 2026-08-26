const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

if (!code.includes("import { getTrackAudioUrl } from '../services/offlineStorageService';")) {
    code = code.replace(
        "import db from '../lib/db';",
        "import db from '../lib/db';\nimport { getTrackAudioUrl, getCachedImageUrl } from '../services/offlineStorageService';"
    );
}

const oldBlock = `        const localTrack = await db.offlineTracks.get(trackMeta.videoId);
        if (localTrack && localTrack.audioBlob) {
          console.log('[AudioEngine] Local downloaded track found. Playing offline...', trackMeta.title);
          if (audioRef.current) {
            const localUrl = URL.createObjectURL(localTrack.audioBlob);
            activeEngineRef.current = 'audio';
            audioRef.current.src = localUrl;
            audioRef.current.volume = volume;
            if (localTrack.thumbnailBlob) {
              const localThumb = URL.createObjectURL(localTrack.thumbnailBlob);
              setCurrentTrack(prev => prev ? { ...prev, thumbnail: localThumb } : prev);
            }
            await audioRef.current.play();
            setIsPlaying(true);
            setIsLoading(false);
            return;
          }
        }`;

const newBlock = `        const localUrl = await getTrackAudioUrl(trackMeta.videoId);
        if (localUrl) {
          console.log('[AudioEngine] Local downloaded track found in Cache. Playing offline...', trackMeta.title);
          if (audioRef.current) {
            activeEngineRef.current = 'audio';
            audioRef.current.src = localUrl;
            audioRef.current.volume = volume;
            
            const localThumb = await getCachedImageUrl(trackMeta.videoId);
            if (localThumb) {
              setCurrentTrack(prev => prev ? { ...prev, thumbnail: localThumb } : prev);
            }
            
            await audioRef.current.play();
            setIsPlaying(true);
            setIsLoading(false);
            return;
          }
        }`;

if (code.includes(oldBlock)) {
    code = code.replace(oldBlock, newBlock);
}

fs.writeFileSync('src/hooks/useAudioPlayer.js', code);
console.log("Patched useAudioPlayer");
