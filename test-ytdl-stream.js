import ytdl from "@distube/ytdl-core";
const stream = ytdl("dQw4w9WgXcQ", { filter: "audioonly", quality: "highestaudio" });
stream.on("error", (e) => console.error(e));
stream.on("info", (i) => console.log("info"));
