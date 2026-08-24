import ytdl from "@distube/ytdl-core";
async function run() {
  try {
    const info = await ytdl.getInfo("dQw4w9WgXcQ");
    console.log("Success");
  } catch (e) {
    console.error(e);
  }
}
run();
