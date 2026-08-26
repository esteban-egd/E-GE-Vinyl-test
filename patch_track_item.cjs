const fs = require('fs');
let code = fs.readFileSync('src/pages/LibraryPage.jsx', 'utf8');

if (!code.includes("import DownloadBadge from '../components/common/DownloadBadge';")) {
    code = code.replace(
        "import TrackImage from '../components/common/TrackImage';",
        "import TrackImage from '../components/common/TrackImage';\nimport DownloadBadge from '../components/common/DownloadBadge';"
    );
}

const oldTitle = `<p className={\`font-bold text-sm truncate \${isThisActive ? 'text-amber-400 font-bold' : 'text-white'}\`}>
          {track.title}
        </p>`;
        
const newTitle = `<p className={\`font-bold text-sm truncate flex items-center gap-2 \${isThisActive ? 'text-amber-400 font-bold' : 'text-white'}\`}>
          {track.title}
          <DownloadBadge videoId={track.videoId || track.id} />
        </p>`;

if (code.includes(oldTitle)) {
    code = code.replace(oldTitle, newTitle);
}

fs.writeFileSync('src/pages/LibraryPage.jsx', code);
console.log("Patched TrackItem in LibraryPage");
