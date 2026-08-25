import { searchLyraTracks } from './src/services/lyraSearch.js';
(async () => {
  const tracks = await searchLyraTracks("Eminem Lose Yourself");
  console.log("Found", tracks.length, "tracks");
  if (tracks.length > 0) {
    console.log("First track:", tracks[0]);
  }
})();
