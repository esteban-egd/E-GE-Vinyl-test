const fs = require('fs');
let code = fs.readFileSync('src/components/player/VinylPlayer.jsx', 'utf8');

if (!code.includes("import DownloadBadge from '../common/DownloadBadge';")) {
    code = code.replace(
        "import AddToPlaylistModal from '../common/AddToPlaylistModal';",
        "import AddToPlaylistModal from '../common/AddToPlaylistModal';\nimport DownloadBadge from '../common/DownloadBadge';"
    );
}

const oldTitle = `{currentTrack?.title || "Aucun vinyle sélectionné"}`;
const newTitle = `<span className="flex items-center gap-2">
                  {currentTrack?.title || "Aucun vinyle sélectionné"}
                  {currentTrack && <DownloadBadge videoId={currentTrack.videoId || currentTrack.id} />}
                </span>`;

if (code.includes(oldTitle)) {
    code = code.replace(oldTitle, newTitle);
}

fs.writeFileSync('src/components/player/VinylPlayer.jsx', code);
console.log("Patched VinylPlayer");
