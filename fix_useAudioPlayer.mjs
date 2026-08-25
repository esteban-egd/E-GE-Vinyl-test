import fs from 'fs';

let content = fs.readFileSync('src/hooks/useAudioPlayer.js', 'utf8');

// 1. Remove the local definition of extractYouTubeId
const start = content.indexOf('export function extractYouTubeId(urlOrId) {');
if (start !== -1) {
    const end = content.indexOf('import { getLyraAudioStream }');
    if (end !== -1) {
        content = content.slice(0, start) + content.slice(end);
    }
}

// 2. Fix the imports
content = content.replace(
    "import { getHdArtwork, getMainArtistName, isLiveTrack, isClipTrack, scoreAudioTrack } from '../services/musicDataService';",
    "import { getHdArtwork, getMainArtistName, isLiveTrack, isClipTrack, scoreAudioTrack, extractYouTubeId } from '../services/musicDataService';"
);

// 3. Fix the return block
// It seems my edits messed up the return block of useAudioPlayer.js
// Let's replace the whole return block with the original one.
const returnStart = content.indexOf('return {');
if (returnStart !== -1) {
    content = content.slice(0, returnStart) + `return {
    // Fonctions et états essentiels du lecteur
    play,
    pause,
    resume,
    seekTo: seek,
    seek,
    currentTime,
    duration,
    isPlaying,
    isLoading,
    currentTrack,
    volume,
    setVolume,
    togglePlayPause,
    isCurrentTrack,
    isNative,

    // Gestion de file d'attente et navigation
    queue,
    queueIndex,
    shuffle,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setQueueAndPlay,
    toggleShuffle,
    toggleRepeat,

    // États et options audio vintage
    error,
    isOffline,
    isPlayerModalOpen,
    setIsPlayerModalOpen,
    audioRef,
    hifiMode,
    setHifiMode,
    vinylCrackle,
    setVinylCrackle,
    vinylCrackleVolume,
    setVinylCrackleVolume,
    pitch,
    setPitch,
    bassGain,
    setBassGain,
    midGain,
    setMidGain,
    trebleGain,
    setTrebleGain,
    tubeSaturation,
    setTubeSaturation,
    getAnalyserData,
    setIframePlayer,
    onIframeStateChange,
    onIframeError,
  };
}
`;
}

// Also need to restore addToQueue and setQueueAndPlay because I removed extractYouTubeId logic from them
content = content.replace(
    /const addToQueue = useCallback\(\(track\) => \{\s*const formatted = \{\s*\.\.\.track,\s*thumbnail: getHdArtwork\(track\.thumbnail, track\.videoId\)\s*\};\s*setQueue\(\(prev\) => \[\.\.\.prev, formatted\]\);\s*\}, \[\]\);/g,
    `const addToQueue = useCallback((track) => {
    const vId = extractYouTubeId(track.videoId || track.id || '');
    const formatted = {
      ...track,
      id: vId || track.id,
      videoId: vId,
      thumbnail: getHdArtwork(track.thumbnail, vId)
    };
    setQueue((prev) => [...prev, formatted]);
  }, []);`
);

content = content.replace(
    /const setQueueAndPlay = useCallback\(\(tracks, startIndex = 0\) => \{\s*const formattedTracks = tracks\.map\(t => \(\{\s*\.\.\.t,\s*thumbnail: getHdArtwork\(t\.thumbnail, t\.videoId\)\s*\}\)\);\s*setQueue\(formattedTracks\);/g,
    `const setQueueAndPlay = useCallback((tracks, startIndex = 0) => {
    const formattedTracks = tracks.map(t => {
      const vId = extractYouTubeId(t.videoId || t.id || '');
      return {
        ...t,
        id: vId || t.id,
        videoId: vId,
        thumbnail: getHdArtwork(t.thumbnail, vId)
      };
    });
    setQueue(formattedTracks);`
);

fs.writeFileSync('src/hooks/useAudioPlayer.js', content);
console.log("useAudioPlayer.js fixed.");
