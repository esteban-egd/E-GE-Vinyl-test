import { Innertube } from 'youtubei.js';

(async () => {
  try {
    const yt = await Innertube.create();
    const stream = await yt.download('dQw4w9WgXcQ', {
      type: 'audio',
      quality: 'best'
    });
    console.log("Stream successfully obtained:", !!stream);
    const reader = stream.getReader();
    const chunk = await reader.read();
    console.log("Chunk read bytes:", chunk.value?.length, "done:", chunk.done);
  } catch (e) {
    console.error("Innertube download error:", e);
  }
})();
