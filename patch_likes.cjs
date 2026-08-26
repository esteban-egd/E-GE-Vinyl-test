const fs = require('fs');
let code = fs.readFileSync('src/context/LikesContext.jsx', 'utf8');

if (!code.includes('import { useOffline } from')) {
  code = code.replace(
    `import db from '../lib/db';\n\nconst LikesContext`,
    `import db from '../lib/db';\nimport { useOffline } from './OfflineContext';\n\nconst LikesContext`
  );
}

if (!code.includes('const { handleTrackLiked, removeDownloadedTrack } = useOffline();')) {
  code = code.replace(
    `const { user } = useAuth();`,
    `const { user } = useAuth();\n  const { handleTrackLiked, removeDownloadedTrack } = useOffline();`
  );
}

const oldInsert = `        toast.success('Ajouté aux favoris');`;
const newInsert = `        toast.success('Ajouté aux favoris');
        // Trigger offline sync if enabled
        handleTrackLiked({ ...localItem, video_id: trackId, id: trackId });`;
        
if (code.includes(oldInsert) && !code.includes('handleTrackLiked({ ...localItem')) {
  code = code.replace(oldInsert, newInsert);
}

const oldDelete = `        toast.success('Retiré des favoris');`;
const newDelete = `        toast.success('Retiré des favoris');
        // Optionally remove from offline if unliked? Actually, wait, let's just leave it in offline storage unless explicitly deleted, or we can delete it. 
        // Let's delete it from offline storage if they unlike it? The prompt says "auto-download", maybe they want to keep it? The user didn't specify. Let's remove it to save space.
        removeDownloadedTrack(trackId);`;

if (code.includes(oldDelete) && !code.includes('removeDownloadedTrack(trackId);')) {
  code = code.replace(oldDelete, newDelete);
}

const oldDeps = `  }, [user, isLiked, fetchLikes]);`;
const newDeps = `  }, [user, isLiked, fetchLikes, handleTrackLiked, removeDownloadedTrack]);`;

if (code.includes(oldDeps)) {
  code = code.replace(oldDeps, newDeps);
}

fs.writeFileSync('src/context/LikesContext.jsx', code);
console.log("Patched LikesContext");
