import play from "play-dl";
async function run() {
  try {
    const stream = await play.stream("dQw4w9WgXcQ");
    console.log(stream.url);
  } catch (e) {
    console.error(e);
  }
}
run();
