import { Innertube } from 'youtubei.js';

(async () => {
  try {
    console.log("Initializing Innertube...");
    const yt = await Innertube.create();
    console.log("Getting info for video dQw4w9WgXcQ...");
    const info = await yt.getInfo('dQw4w9WgXcQ');
    console.log("Title:", info.basic_info.title);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    console.log("Format found:", format?.mime_type, format?.bitrate, "has url/decipher:", !!format?.decipher);
    const streamUrl = format?.decipher ? format.decipher(yt.session.player) : format?.url;
    console.log("Direct Stream URL:", streamUrl?.substring(0, 100));
  } catch (e) {
    console.error("Innertube error:", e);
  }
})();
