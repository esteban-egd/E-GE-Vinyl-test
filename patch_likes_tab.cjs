const fs = require('fs');
let code = fs.readFileSync('src/pages/LibraryPage.jsx', 'utf8');

const oldTab = `function LikesTab() {
  const { likedTracks, toggleLike, loading } = useLikes();
  const { play, setQueueAndPlay, currentTrack } = useAudio();
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);`;

const newTab = `function LikesTab() {
  const { likedTracks, toggleLike, loading } = useLikes();
  const { play, setQueueAndPlay, currentTrack } = useAudio();
  const { isSyncEnabled, toggleSync, downloadProgress } = useOffline();
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);`;

if (code.includes(oldTab)) {
  code = code.replace(oldTab, newTab);
}

const oldButtons = `        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePlayAll(false)}`;

const newButtons = `        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => toggleSync(likedTracks)}
            className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors \${isSyncEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}\`}
          >
            <CloudOff size={14} /> 
            {isSyncEnabled ? 'Synchro Auto ON' : 'Télécharger tout'}
            {downloadProgress && (
              <span className="ml-1 opacity-70">({downloadProgress.current}/{downloadProgress.total})</span>
            )}
          </button>
          <button
            onClick={() => handlePlayAll(false)}`;

if (code.includes(oldButtons)) {
  code = code.replace(oldButtons, newButtons);
}

fs.writeFileSync('src/pages/LibraryPage.jsx', code);
console.log("Patched LikesTab in LibraryPage.jsx");
