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
    const { table, operation, payload, filters, orderBy, limitVal, isSingle, orExpr } = query;

    try {
      if (table === 'profiles') {
        const userIdFilter = filters.find(f => f.field === 'id')?.value;
        let allProfiles = await db.profiles.toArray();

        if (allProfiles.length === 0) {
          // Seed initial real user database records if empty
          const sampleProfiles = [
            { id: 'user-clara', full_name: 'Clara Dupont', username: 'clara_vinyl', email: 'clara.dupont@ege.fr', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', privacy_likes: 'friends', privacy_playlists: 'friends', privacy_artists: 'friends', updated_at: new Date().toISOString() },
            { id: 'user-marc', full_name: 'Marc Melomane', username: 'marc_m', email: 'marc.melomane@ege.fr', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', privacy_likes: 'friends', privacy_playlists: 'friends', privacy_artists: 'friends', updated_at: new Date().toISOString() },
            { id: 'user-elena', full_name: 'Elena Jazz', username: 'elena_j', email: 'elena.jazz@ege.fr', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', privacy_likes: 'friends', privacy_playlists: 'friends', privacy_artists: 'friends', updated_at: new Date().toISOString() }
          ];
          await db.profiles.bulkPut(sampleProfiles);
          allProfiles = sampleProfiles;
        }

        if (operation === 'select') {
          let data = allProfiles;
          if (userIdFilter) {
            data = data.filter(p => p.id === userIdFilter);
            if (data.length === 0 && isSingle) {
              // Try local storage for guest / active user
              const stored = localStorage.getItem(`mock_profile_${userIdFilter}`) || localStorage.getItem('ege_guest_profile');
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  data = [{ ...parsed, id: userIdFilter }];
                } catch (_) {}
              }
            }
          }
          return { data: isSingle ? (data[0] || null) : data, error: null };
        } else if (operation === 'upsert' || operation === 'insert' || operation === 'update') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item) {
            const profileId = item.id || userIdFilter || 'mock-user';
            const existingProfile = await db.profiles.get(profileId).catch(() => null);
            const profileToSave = {
              ...(existingProfile || {}),
              id: profileId,
              full_name: item.full_name !== undefined ? item.full_name : (existingProfile?.full_name || item.displayName || 'Mélomane E-GE'),
              username: item.username !== undefined ? item.username : (existingProfile?.username || 'user'),
              email: item.email !== undefined ? item.email : (existingProfile?.email || ''),
              avatar_url: item.avatar_url !== undefined ? item.avatar_url : (existingProfile?.avatar_url || ''),
              privacy_likes: item.privacy_likes !== undefined ? item.privacy_likes : (existingProfile?.privacy_likes || 'friends'),
              privacy_playlists: item.privacy_playlists !== undefined ? item.privacy_playlists : (existingProfile?.privacy_playlists || 'friends'),
              privacy_artists: item.privacy_artists !== undefined ? item.privacy_artists : (existingProfile?.privacy_artists || 'friends'),
              updated_at: new Date().toISOString()
            };
            await db.profiles.put(profileToSave);
            localStorage.setItem(`mock_profile_${profileToSave.id}`, JSON.stringify(profileToSave));
            return { data: isSingle ? profileToSave : [profileToSave], error: null };
          }
          return { data: payload, error: null };
        }
      }

      if (table === 'friendships' || table === 'friends') {
        if (operation === 'select') {
          const userId = filters.find(f => f.field === 'user_id' || f.field === 'sender_id')?.value;
          const friendId = filters.find(f => f.field === 'friend_id' || f.field === 'receiver_id')?.value;
          const statusVal = filters.find(f => f.field === 'status')?.value;

          let data = await db.friendships.toArray();
          if (userId) {
            data = data.filter(f => f.user_id === userId || f.sender_id === userId || f.friend_id === userId || f.receiver_id === userId);
          }
          if (friendId) {
            data = data.filter(f => f.friend_id === friendId || f.receiver_id === friendId || f.user_id === friendId || f.sender_id === friendId);
          }
          if (statusVal) {
            data = data.filter(f => f.status === statusVal);
          }
          return { data, error: null };
        } else if (operation === 'insert' || operation === 'upsert') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item) {
            const senderId = item.sender_id || item.user_id;
            const receiverId = item.receiver_id || item.friend_id;
            const statusVal = item.status || 'pending';
            const createdAt = item.created_at || new Date().toISOString();

            if (!senderId || !receiverId) {
              const err = new Error("Identifiants utilisateur manquants (sender_id/receiver_id/user_id/friend_id)");
              console.error("Détails erreur d'ami:", err);
              return { data: null, error: err };
            }

            const recordToSave = {
              user_id: senderId,
              friend_id: receiverId,
              sender_id: senderId,
              receiver_id: receiverId,
              status: statusVal,
              created_at: createdAt
            };

            const newId = await db.friendships.add(recordToSave);
            const created = { id: newId, ...recordToSave };
            return { data: isSingle ? created : [created], error: null };
          }
        } else if (operation === 'update') {
          const idFilter = filters.find(f => f.field === 'id')?.value;
          if (idFilter && payload) {
            await db.friendships.update(Number(idFilter), payload);
            return { data: payload, error: null };
          }
        } else if (operation === 'delete') {
          const idFilter = filters.find(f => f.field === 'id')?.value;
          if (idFilter) {
            await db.friendships.delete(Number(idFilter));
          }
          return { data: null, error: null };
        }
      }

      if (table === 'shared_tracks' || table === 'sharedTracks') {
        if (operation === 'select') {
          const recipientId = filters.find(f => f.field === 'recipient_id' || f.field === 'receiver_id')?.value;
          const senderId = filters.find(f => f.field === 'sender_id')?.value;

          let data = await db.sharedTracks.toArray();
          if (orExpr) {
            const userIds = orExpr.match(/[\w-]+/g) || [];
            if (userIds.length > 0) {
              data = data.filter(s => 
                userIds.includes(s.sender_id) || 
                userIds.includes(s.recipient_id) || 
                userIds.includes(s.receiver_id)
              );
            }
          } else {
            if (recipientId) {
              data = data.filter(s => s.recipient_id === recipientId || s.receiver_id === recipientId);
            }
            if (senderId) {
              data = data.filter(s => s.sender_id === senderId);
            }
          }
          return { data, error: null };
        } else if (operation === 'insert') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item) {
            const newId = await db.sharedTracks.add({
              sender_id: item.sender_id,
              recipient_id: item.recipient_id || item.receiver_id,
              receiver_id: item.receiver_id || item.recipient_id,
              videoId: item.track?.videoId || item.videoId || item.video_id,
              video_id: item.video_id || item.track?.videoId || item.videoId,
              title: item.track?.title || item.title || item.title,
              artist: item.track?.artist || item.artist || 'Artiste inconnu',
              thumbnail: item.track?.thumbnail || item.thumbnail || '',
              duration: item.track?.duration || item.duration || '',
              message: item.message || '',
              created_at: new Date().toISOString()
            });
            const created = { id: newId, ...item, created_at: new Date().toISOString() };
            return { data: isSingle ? created : [created], error: null };
          }
        } else if (operation === 'delete') {
          const idFilter = filters.find(f => f.field === 'id')?.value;
          if (idFilter) {
            await db.sharedTracks.delete(Number(idFilter));
          }
          return { data: null, error: null };
        }
      }

      if (table === 'listening_history' || table === 'listeningHistory') {
        if (operation === 'select') {
          const userIdFilter = filters.find(f => f.field === 'user_id')?.value;
          let localItems = [];
          if (db?.listening_history) {
            localItems = await db.listening_history.toArray();
          }
          if (userIdFilter) {
            localItems = localItems.filter(item => item.user_id === userIdFilter || item.userId === userIdFilter);
          }
          const formatted = localItems.map(item => ({
            id: item.id || item.videoId || item.track_id,
            user_id: item.user_id || item.userId || userIdFilter,
            track_id: item.track_id || item.video_id || item.videoId,
            video_id: item.video_id || item.track_id || item.videoId,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            duration: item.duration || '',
            played_at: item.played_at || item.createdAt || new Date().toISOString()
          }));
          if (orderBy) {
            const { field, ascending } = orderBy;
            formatted.sort((a, b) => {
              const valA = a[field] || '';
              const valB = b[field] || '';
              return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
          }
          const resData = limitVal ? formatted.slice(0, limitVal) : formatted;
          return { data: resData, error: null };
        } else if (operation === 'insert' || operation === 'upsert') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item && db?.listening_history) {
            const trackId = item.track_id || item.video_id || item.videoId;
            const newRecord = {
              user_id: item.user_id,
              track_id: trackId,
              video_id: trackId,
              title: item.title,
              artist: item.artist,
              thumbnail: item.thumbnail,
              duration: item.duration || '',
              played_at: item.played_at || new Date().toISOString()
            };
            await db.listening_history.add(newRecord);
            return { data: isSingle ? newRecord : [newRecord], error: null };
          }
          return { data: payload, error: null };
        } else if (operation === 'delete') {
          const userIdFilter = filters.find(f => f.field === 'user_id')?.value;
          if (userIdFilter && db?.listening_history) {
            await db.listening_history.where('user_id').equals(userIdFilter).delete().catch(() => {});
          }
          return { data: null, error: null };
        }
      }

      if (table === 'search_history' || table === 'searchHistory') {
        if (operation === 'select') {
          const userIdFilter = filters.find(f => f.field === 'user_id')?.value;
          let localItems = [];
          if (db?.search_history) {
            localItems = await db.search_history.toArray();
          } else if (db?.searchHistory) {
            localItems = await db.searchHistory.toArray();
          }
          if (userIdFilter) {
            localItems = localItems.filter(item => item.user_id === userIdFilter || item.userId === userIdFilter);
          } else {
            localItems = [];
          }
          const formatted = localItems.map(item => ({
            id: item.id,
            user_id: item.user_id || item.userId || userIdFilter,
            query: item.query,
            created_at: item.created_at || item.searched_at || item.createdAt || new Date().toISOString(),
            searched_at: item.searched_at || item.created_at || item.createdAt || new Date().toISOString()
          }));
          if (orderBy) {
            const { field, ascending } = orderBy;
            formatted.sort((a, b) => {
              const valA = a[field] || '';
              const valB = b[field] || '';
              return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
          }
          const resData = limitVal ? formatted.slice(0, limitVal) : formatted;
          return { data: resData, error: null };
        } else if (operation === 'insert' || operation === 'upsert') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item) {
            const rec = {
              user_id: item.user_id,
              userId: item.user_id,
              query: item.query,
              created_at: new Date().toISOString(),
              searched_at: new Date().toISOString()
            };
            if (db?.search_history) {
              await db.search_history.add(rec);
            }
            if (db?.searchHistory) {
              await db.searchHistory.add({ userId: item.user_id, query: item.query, createdAt: rec.created_at });
            }
            return { data: isSingle ? rec : [rec], error: null };
          }
          return { data: payload, error: null };
        } else if (operation === 'delete') {
          const idFilter = filters.find(f => f.field === 'id')?.value;
          const userIdFilter = filters.find(f => f.field === 'user_id')?.value;
          if (idFilter) {
            if (db?.search_history) await db.search_history.delete(Number(idFilter)).catch(() => {});
            if (db?.searchHistory) await db.searchHistory.delete(Number(idFilter)).catch(() => {});
          } else if (userIdFilter) {
            if (db?.search_history) await db.search_history.where('user_id').equals(userIdFilter).delete().catch(() => {});
            if (db?.searchHistory) await db.searchHistory.where('userId').equals(userIdFilter).delete().catch(() => {});
          }
          return { data: null, error: null };
        }
      }

      if (table === 'user_queue' || table === 'userQueue') {
        if (operation === 'select') {
          const userIdFilter = filters.find(f => f.field === 'user_id')?.value;
          let queueRecord = null;
          if (userIdFilter && db?.user_queue) {
            queueRecord = await db.user_queue.get(userIdFilter).catch(() => null);
          }
          return { data: isSingle ? queueRecord : (queueRecord ? [queueRecord] : []), error: null };
        } else if (operation === 'upsert' || operation === 'insert' || operation === 'update') {
          const item = Array.isArray(payload) ? payload[0] : payload;
          if (item && item.user_id && db?.user_queue) {
            await db.user_queue.put(item);
            return { data: isSingle ? item : [item], error: null };
          }
          return { data: payload, error: null };
        } else if (operation === 'delete') {
          const userIdFilter = filters.find(f => f.field === 'user_id')?.value;
          if (userIdFilter && db?.user_queue) {
            await db.user_queue.delete(userIdFilter).catch(() => {});
          }
          return { data: null, error: null };
        }
      }

      if (table === 'likes') {
        if (operation === 'select') {
          const userId = filters.find(f => f.field === 'user_id')?.value;
          let localLikes = await db.likes.toArray();
          if (userId) {
            localLikes = localLikes.filter(item => item.user_id === userId || !item.user_id);
          } else {
            localLikes = [];
          }
          let data = localLikes.map(item => ({
            id: item.video_id || item.videoId,
            video_id: item.video_id || item.videoId,
            user_id: item.user_id || userId,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            created_at: item.created_at || item.likedAt || new Date().toISOString()
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
              user_id: item.user_id,
              video_id: item.video_id || item.videoId,
              videoId: item.video_id || item.videoId,
              title: item.title,
              artist: item.artist,
              thumbnail: item.thumbnail,
              created_at: new Date().toISOString(),
              likedAt: new Date().toISOString()
            });
          }
          return { data: payload, error: null };
        } else if (operation === 'delete') {
          const videoId = filters.find(f => f.field === 'video_id')?.value;
          const userId = filters.find(f => f.field === 'user_id')?.value;
          if (videoId) {
            const matching = await db.likes.filter(l => (l.video_id === videoId || l.videoId === videoId) && (!userId || l.user_id === userId)).toArray();
            for (const m of matching) {
              if (m.id) await db.likes.delete(m.id);
            }
          }
          return { data: null, error: null };
        }
      }

      if (table === 'playlists') {
        if (operation === 'select') {
          const localPlaylists = await db.playlists.toArray();
          const userId = filters.find(f => f.field === 'user_id')?.value;
          let data = localPlaylists
            .filter(p => !userId || p.user_id === userId || !p.user_id)
            .map(p => ({
              id: p.id,
              user_id: p.user_id || userId,
              name: p.name,
              cover: p.cover || null,
              created_at: p.createdAt || p.created_at || new Date().toISOString(),
              updated_at: p.updatedAt || p.updated_at || new Date().toISOString()
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
              user_id: item.user_id,
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
      or(expr) {
        query.orExpr = expr;
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
