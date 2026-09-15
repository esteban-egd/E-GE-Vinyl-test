import db from './src/lib/db.js';
async function test() {
  try {
    const newId = await db.sharedTracks.add({
      sender_id: 'user1',
      recipient_id: 'user2',
      receiver_id: 'user2',
      videoId: 'text_msg',
      video_id: 'text_msg',
      title: 'Message texte',
      artist: '',
      thumbnail: '',
      duration: '',
      message: 'Hello',
      is_liked: false,
      reply_to_id: null,
      created_at: new Date().toISOString()
    });
    console.log("Success:", newId);
    
    // Test update
    await db.sharedTracks.update(Number(newId), { is_liked: true });
    console.log("Update success");
  } catch (err) {
    console.error("Failed:", err);
  }
}
test();
