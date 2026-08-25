import ytdl from '@distube/ytdl-core';

(async () => {
  try {
    console.log("Testing distube ytdl-core...");
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    console.log("Distube format url found:", format?.url ? format.url.substring(0, 80) : "none");
  } catch (e) {
    console.error("Distube error:", e.message);
  }
})();
