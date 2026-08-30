import Dexie from 'dexie';

const db = new Dexie('EGEVinylDB');

db.version(1).stores({
  // Track metadata for recently played, search history etc.
  tracks: 'videoId, title, artist, thumbnail, addedAt',

  // Audio blob cache for offline playback
  audioCache: 'videoId, mimeType, cachedAt',

  // Liked/favorited tracks
  likes: 'videoId, title, artist, thumbnail, likedAt',

  // User playlists
  playlists: '++id, name, createdAt, updatedAt',

  // Tracks within playlists (junction table)
  playlistTracks: '++id, playlistId, videoId, title, artist, thumbnail, position',
});

db.version(2).stores({
  playlists: '++id, name, cover, createdAt, updatedAt',
  followedArtists: 'name, avatar, genre, followedAt',
});

db.version(3).stores({
  offlineTracks: 'videoId, title, artist, album, thumbnail, downloadedAt',
  searchHistory: '++id, userId, query, createdAt'
});

db.version(4).stores({
  profiles: 'id, full_name, username, email, avatar_url, updated_at',
  friendships: '++id, user_id, friend_id, status, created_at',
  sharedTracks: '++id, sender_id, recipient_id, videoId, title, artist, thumbnail, duration, message, created_at'
});

db.version(5).stores({
  listening_history: '++id, user_id, track_id, video_id, played_at',
  search_history: '++id, user_id, query, created_at, searched_at',
  likes: '++id, user_id, video_id, videoId, created_at, likedAt',
  playlists: '++id, user_id, name, cover, createdAt, updatedAt, created_at, updated_at',
  user_queue: 'user_id, updated_at'
});

// Auto-recovery for schema/version upgrade mismatches
db.open().catch(async (err) => {
  console.error('[Dexie] Failed to open database:', err);
  const isSchemaError = err.name === 'SchemaError' || 
                        err.name === 'VersionError' || 
                        err.name === 'UpgradeError' ||
                        err.message?.toLowerCase().includes('primary key') ||
                        err.message?.toLowerCase().includes('schema') ||
                        err.message?.toLowerCase().includes('version') ||
                        err.message?.toLowerCase().includes('index');
  if (isSchemaError) {
    console.warn('[Dexie] Schema or version mismatch detected. Purging database to apply new schema...');
    try {
      await Dexie.delete('EGEVinylDB');
      console.log('[Dexie] Database purged successfully. Reloading page...');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (purgeErr) {
      console.error('[Dexie] Failed to purge database:', purgeErr);
    }
  }
});

export default db;

