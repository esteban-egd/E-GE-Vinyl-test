const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistPage.jsx', 'utf8');

if (!code.includes("import DownloadBadge from '../components/common/DownloadBadge';")) {
    code = code.replace(
        "import TrackImage from '../components/common/TrackImage';",
        "import TrackImage from '../components/common/TrackImage';\nimport DownloadBadge from '../components/common/DownloadBadge';"
    );
}

// Popular tracks (List)
const oldPopTitle = `<span className="text-base truncate font-medium" style={{ color: isCurrent ? currentTheme?.primary || '#1ED760' : 'white' }}>{track.title}</span>`;
const newPopTitle = `<span className="text-base truncate font-medium flex items-center gap-2" style={{ color: isCurrent ? currentTheme?.primary || '#1ED760' : 'white' }}>
                          <span className="truncate">{track.title}</span>
                          <DownloadBadge videoId={track.videoId || track.id} />
                        </span>`;
if (code.includes(oldPopTitle)) code = code.replace(oldPopTitle, newPopTitle);

// Singles/Albums (Grid)
const oldGridTitle1 = `<p className="font-bold text-sm text-white truncate w-full">
                          {track.title}
                        </p>`;
const newGridTitle1 = `<div className="font-bold text-sm text-white truncate w-full flex items-center gap-1.5">
                          <span className="truncate">{track.title}</span>
                          <DownloadBadge videoId={track.videoId || track.id} />
                        </div>`;
if (code.includes(oldGridTitle1)) code = code.replace(oldGridTitle1, newGridTitle1);

const oldGridTitle2 = `<h3 className="font-bold text-white text-sm truncate mb-1">{track.title}</h3>`;
const newGridTitle2 = `<h3 className="font-bold text-white text-sm truncate mb-1 flex items-center gap-1.5">
                    <span className="truncate">{track.title}</span>
                    <DownloadBadge videoId={track.videoId || track.id} />
                  </h3>`;
if (code.includes(oldGridTitle2)) code = code.replace(oldGridTitle2, newGridTitle2);


fs.writeFileSync('src/pages/ArtistPage.jsx', code);
console.log("Patched ArtistPage for badges");
