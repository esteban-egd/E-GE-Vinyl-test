const fs = require('fs');
let code = fs.readFileSync('src/components/player/MiniPlayer.jsx', 'utf8');

if (!code.includes("import DownloadBadge from '../common/DownloadBadge';")) {
    code = code.replace(
        "import TrackImage from '../common/TrackImage';",
        "import TrackImage from '../common/TrackImage';\nimport DownloadBadge from '../common/DownloadBadge';"
    );
}

const oldTitle = `<p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>`;
const newTitle = `<p className="text-sm font-bold text-white truncate flex items-center gap-2">
            {currentTrack.title}
            <DownloadBadge videoId={currentTrack.videoId || currentTrack.id} />
          </p>`;

if (code.includes(oldTitle)) {
    code = code.replace(oldTitle, newTitle);
}

fs.writeFileSync('src/components/player/MiniPlayer.jsx', code);
console.log("Patched MiniPlayer");
