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

export default db;

