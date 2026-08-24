import ytdl from "@distube/ytdl-core";
ytdl("dQw4w9WgXcQ", { filter: 'audioonly', quality: 'highestaudio' })
  .on("error", (e) => console.error("Error from ytdl:", e))
  .on("info", () => console.log("Info event!"))
  .on("data", () => process.stdout.write("."))
