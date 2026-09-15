import Dexie from 'dexie';
const db = new Dexie('test2');
db.version(1).stores({ test: '++id' }); // No is_liked in index
async function test() {
  try {
    await db.test.add({ is_liked: false, reply_to_id: null });
    console.log("Success");
  } catch (err) {
    console.error("Failed:", err.name, err.message);
  }
}
test();
