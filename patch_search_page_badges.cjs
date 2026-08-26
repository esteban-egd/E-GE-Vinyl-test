const fs = require('fs');
let code = fs.readFileSync('src/pages/SearchPage.jsx', 'utf8');

if (!code.includes("import DownloadBadge from '../components/common/DownloadBadge';")) {
    code = code.replace(
        "import TrackImage from '../components/common/TrackImage';",
        "import TrackImage from '../components/common/TrackImage';\nimport DownloadBadge from '../components/common/DownloadBadge';"
    );
}

// Top track (Hero Card)
const oldTopTrackTitle = `<h2 className="text-3xl md:text-5xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-md">
                            {topTrack.cleanTitle || topTrack.title}
                          </h2>`;
const newTopTrackTitle = `<h2 className="text-3xl md:text-5xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-md flex items-center gap-3">
                            {topTrack.cleanTitle || topTrack.title}
                            <DownloadBadge videoId={topTrack.videoId || topTrack.id} className="w-8 h-8" />
                          </h2>`;

if (code.includes(oldTopTrackTitle)) code = code.replace(oldTopTrackTitle, newTopTrackTitle);

// top5Tracks
const oldTop5Title = `<p className={\`font-bold text-sm truncate \${isThisActive ? 'text-white' : 'text-gray-100 group-hover:text-white'}\`}
                                style={isThisActive ? { color: currentTheme?.primary || '#1ED760' } : {}}
                              >
                                {track.cleanTitle || track.title}
                              </p>`;
const newTop5Title = `<div className={\`font-bold text-sm truncate flex items-center gap-2 \${isThisActive ? 'text-white' : 'text-gray-100 group-hover:text-white'}\`}
                                style={isThisActive ? { color: currentTheme?.primary || '#1ED760' } : {}}
                              >
                                <span className="truncate">{track.cleanTitle || track.title}</span>
                                <DownloadBadge videoId={track.videoId || track.id} />
                              </div>`;
                              
if (code.includes(oldTop5Title)) code = code.replace(oldTop5Title, newTop5Title);


// moreTracks and liveTracks titles usually have the same code pattern
const oldMoreTitle = `<p className={\`font-bold text-sm truncate \${isThisActive ? 'text-white' : 'text-gray-100 group-hover:text-white'}\`}
                              style={isThisActive ? { color: currentTheme?.primary || '#1ED760' } : {}}
                            >
                              {track.cleanTitle || track.title}
                            </p>`;
const newMoreTitle = `<div className={\`font-bold text-sm truncate flex items-center gap-2 \${isThisActive ? 'text-white' : 'text-gray-100 group-hover:text-white'}\`}
                              style={isThisActive ? { color: currentTheme?.primary || '#1ED760' } : {}}
                            >
                              <span className="truncate">{track.cleanTitle || track.title}</span>
                              <DownloadBadge videoId={track.videoId || track.id} />
                            </div>`;
                            
// Replace globally for moreTracks and liveTracks if they match the same string
code = code.split(oldMoreTitle).join(newMoreTitle);

fs.writeFileSync('src/pages/SearchPage.jsx', code);
console.log("Patched SearchPage for badges");
