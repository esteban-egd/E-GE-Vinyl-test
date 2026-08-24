import { Innertube } from 'youtubei.js';
async function run() {
  const yt = await Innertube.create({ generate_session_locally: true });
  const info = await yt.getBasicInfo("dQw4w9WgXcQ");
  console.log(info.streaming_data);
}
run();
