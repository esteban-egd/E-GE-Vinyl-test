import { createClient } from '@supabase/supabase-js';
import db from './db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'PLACEHOLDER' && supabaseAnonKey !== 'PLACEHOLDER' &&
  !supabaseUrl.startsWith('YOUR_') && !supabaseAnonKey.startsWith('YOUR_');

let supabaseInstance;

if (isConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error("Failed to initialize real Supabase client:", err);
  }
}

if (!supabaseInstance) {
  console.warn("Supabase is unconfigured or failed to load. Falling back to robust local IndexedDB storage.");

  // Helper for mock query execution using Dexie db
  const executeMockQuery = async (query) => {
    const { table, operation, payload, filters, orderBy, limitVal, isSingle } = query;

    try {
      if (table === 'profiles') {
        const userIdFilter = filters.find(f => f.field === 'id')?.value;
        if (operation === 'select') {
          const stored = localStorage.getItem(`mock_profile_${userIdFilter}`);
          if (stored) {
            const data = JSON.parse(stored);
            return { data: isSingle ? data : [data], error: null };
          }
          const defaultProfile = {
            id: userIdFilter || 'mock-user',
            full_name: 'Invité E-GE',
            username: 'guest',
            avatar_url: ''
          };
          return { data: isSingle ? defaultProfile : [defaultProfile], error: null };
        } else if (operation === 'upsert' || operation === 'insert' || operation === 'update') {
          if (userIdFilter && payload) {
            const stored = localStorage.getItem(`mock_profile_${userIdFilter}`);
            const current = stored ? JSON.parse(stored) : {};
            const next = { ...current, ...payload, id: userIdFilter };
            localStorage.setItem(`mock_profile_${userIdFilter}`, JSON.stringify(next));
            return { data: next, error: null };
          }
          return { data: payload, error: null };
        }
      }

      if (table === 'likes') {
        if (operation === 'select') {
          const localLikes = await db.likes.toArray();
          const userId = filters.find(f => f.field === 'user_id')?.value || 'mock-user';
          let data = localLikes.map(item => ({
            id: item.videoId,
            video_id: item.videoId,
            user_id: userId,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            created_at: item.likedAt || new Date().toISOString()
          }));
          if (orderBy) {
            const { field, ascending } = orderBy;
            data.sort((a, b) => {
              const valA = a[field] || '';
              const valB = b[field] || '';
              return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
          }
          return { data, error: null };
        } else if (operation === 'insert') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item) {
            await db.likes.put({
              videoId: item.video_id || item.videoId,
              title: item.title,
              artist: item.artist,
              thumbnail: item.thumbnail,
              likedAt: new Date().toISOString()
            });
          }
          return { data: payload, error: null };
        } else if (operation === 'delete') {
          const videoId = filters.find(f => f.field === 'video_id')?.value;
          if (videoId) {
            await db.likes.delete(videoId);
          }
          return { data: null, error: null };
        }
      }

      if (table === 'playlists') {
        if (operation === 'select') {
          const localPlaylists = await db.playlists.toArray();
          const userId = filters.find(f => f.field === 'user_id')?.value || 'mock-user';
          let data = localPlaylists.map(p => ({
            id: p.id,
            user_id: userId,
            name: p.name,
            cover: p.cover || null,
            created_at: p.createdAt || new Date().toISOString(),
            updated_at: p.updatedAt || new Date().toISOString()
          }));
          
          const playlistId = filters.find(f => f.field === 'id')?.value;
          if (playlistId) {
            data = data.filter(p => p.id === Number(playlistId));
          }

          if (orderBy) {
            const { field, ascending } = orderBy;
            data.sort((a, b) => {
              const valA = a[field] || '';
              const valB = b[field] || '';
              return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
          }
          return { data: isSingle ? (data[0] || null) : data, error: null };
        } else if (operation === 'insert') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item) {
            const id = await db.playlists.add({
              name: item.name,
              cover: item.cover || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            const newPlaylist = {
              id,
              user_id: item.user_id || 'mock-user',
              name: item.name,
              cover: item.cover || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            return { data: isSingle ? newPlaylist : [newPlaylist], error: null };
          }
        } else if (operation === 'update') {
          const playlistId = filters.find(f => f.field === 'id')?.value;
          if (playlistId && payload) {
            const updates = {};
            if (payload.cover !== undefined) updates.cover = payload.cover;
            if (payload.name !== undefined) updates.name = payload.name;
            updates.updatedAt = new Date().toISOString();
            await db.playlists.update(Number(playlistId), updates);
            return { data: payload, error: null };
          }
        } else if (operation === 'delete') {
          const playlistId = filters.find(f => f.field === 'id')?.value;
          if (playlistId) {
            await db.playlists.delete(Number(playlistId));
            await db.playlistTracks.where('playlistId').equals(Number(playlistId)).delete();
          }
          return { data: null, error: null };
        }
      }

      if (table === 'playlist_tracks') {
        if (operation === 'select') {
          const playlistIdFilter = filters.find(f => f.field === 'playlist_id')?.value;
          let localTracks = await db.playlistTracks.toArray();
          if (playlistIdFilter) {
            localTracks = localTracks.filter(t => t.playlistId === Number(playlistIdFilter));
          }
          if (orderBy) {
            const { field, ascending } = orderBy;
            localTracks.sort((a, b) => {
              const valA = a[field] || 0;
              const valB = b[field] || 0;
              return ascending ? valA - valB : valB - valA;
            });
          }
          if (limitVal) {
            localTracks = localTracks.slice(0, limitVal);
          }
          const data = localTracks.map(t => ({
            id: t.id,
            playlist_id: t.playlistId,
            video_id: t.videoId,
            title: t.title,
            artist: t.artist,
            thumbnail: t.thumbnail,
            position: t.position
          }));
          return { data, error: null };
        } else if (operation === 'insert') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item) {
            const id = await db.playlistTracks.add({
              playlistId: Number(item.playlist_id),
              videoId: item.video_id,
              title: item.title,
              artist: item.artist,
              thumbnail: item.thumbnail,
              position: item.position || 0
            });
            const newTrack = {
              id,
              playlist_id: item.playlist_id,
              video_id: item.video_id,
              title: item.title,
              artist: item.artist,
              thumbnail: item.thumbnail,
              position: item.position || 0
            };
            return { data: isSingle ? newTrack : [newTrack], error: null };
          }
        } else if (operation === 'delete') {
          const trackId = filters.find(f => f.field === 'id')?.value;
          if (trackId) {
            await db.playlistTracks.delete(Number(trackId));
          }
          return { data: null, error: null };
        }
      }

      if (table === 'followed_artists') {
        if (operation === 'select') {
          const localArtists = await db.followedArtists.toArray();
          const userId = filters.find(f => f.field === 'user_id')?.value || 'mock-user';
          let data = localArtists.map(a => ({
            user_id: userId,
            name: a.name,
            avatar: a.avatar,
            genre: a.genre,
            created_at: a.followedAt || new Date().toISOString()
          }));
          if (orderBy) {
            const { field, ascending } = orderBy;
            data.sort((a, b) => {
              const valA = a[field] || '';
              const valB = b[field] || '';
              return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
          }
          return { data, error: null };
        } else if (operation === 'upsert' || operation === 'insert') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item) {
            await db.followedArtists.put({
              name: item.name,
              avatar: item.avatar || '',
              genre: item.genre || 'Artiste',
              followedAt: new Date().toISOString()
            });
            return { data: item, error: null };
          }
        } else if (operation === 'delete') {
          const name = filters.find(f => f.field === 'name')?.value;
          if (name) {
            await db.followedArtists.delete(name);
          }
          return { data: null, error: null };
        }
      }

      return { data: [], error: null };
    } catch (err) {
      console.error(`Mock database query error on table ${table}:`, err);
      return { data: null, error: err };
    }
  };

  const createQueryBuilder = (tableName) => {
    const query = {
      table: tableName,
      operation: 'select',
      selectFields: '*',
      filters: [],
      orderBy: null,
      limitVal: null,
      isSingle: false,
      payload: null
    };

    const builder = {
      select(fields = '*') {
        query.operation = 'select';
        query.selectFields = fields;
        return builder;
      },
      insert(data) {
        query.operation = 'insert';
        query.payload = data;
        return builder;
      },
      update(data) {
        query.operation = 'update';
        query.payload = data;
        return builder;
      },
      upsert(data) {
        query.operation = 'upsert';
        query.payload = data;
        return builder;
      },
      delete() {
        query.operation = 'delete';
        return builder;
      },
      eq(field, value) {
        query.filters.push({ field, value });
        return builder;
      },
      order(field, options = {}) {
        query.orderBy = { field, ascending: options.ascending !== false };
        return builder;
      },
      limit(val) {
        query.limitVal = val;
        return builder;
      },
      single() {
        query.isSingle = true;
        return builder;
      },
      async then(onfulfilled) {
        const result = await executeMockQuery(query);
        return onfulfilled ? onfulfilled(result) : result;
      }
    };

    return builder;
  };

  supabaseInstance = {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange(callback) {
        // Simple mock subscription
        setTimeout(() => {
          callback('INITIAL_SESSION', null);
        }, 0);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signInWithPassword({ email }) {
        const user = {
          id: 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, ''),
          email: email,
          is_mock: true
        };
        return {
          data: { user, session: { user } },
          error: null
        };
      },
      async signUp({ email }) {
        const user = {
          id: 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, ''),
          email: email,
          is_mock: true
        };
        return {
          data: { user, session: { user } },
          error: null
        };
      },
      async signOut() {
        return { error: null };
      }
    },
    from(tableName) {
      return createQueryBuilder(tableName);
    }
  };
}

export const supabase = supabaseInstance;
