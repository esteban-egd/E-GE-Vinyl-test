import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import db from '../lib/db';
import { updateUserStatus } from '../services/userBddService';

const SocialContext = createContext({});

export const SocialProvider = ({ children }) => {
  const { user, profile } = useAuth();

  // 1. Friends State (purged of all mock data)
  const [friends, setFriends] = useState([]);

  // 2. Pending Requests State (purged of all mock data)
  const [pendingRequests, setPendingRequests] = useState([]);

  // 3. Shared Recommendations State (purged of all mock data)
  const [sharedTracks, setSharedTracks] = useState([]);

  // 4. Privacy Settings State
  const [privacySettings, setPrivacySettings] = useState(() => {
    try {
      const saved = localStorage.getItem('ege_social_privacy');
      return saved ? JSON.parse(saved) : {
        likedTracks: 'friends', // 'public' | 'friends' | 'private'
        playlists: 'friends',
        topArtists: 'friends'
      };
    } catch {
      return {
        likedTracks: 'friends',
        playlists: 'friends',
        topArtists: 'friends'
      };
    }
  });

  // 5. Global Share Modal State
  const [shareModalState, setShareModalState] = useState({
    isOpen: false,
    track: null
  });

  const notifiedLoginRef = useRef(null);
  const processedEventIds = useRef(new Set());

  // Save Privacy Settings locally
  useEffect(() => {
    try {
      localStorage.setItem('ege_social_privacy', JSON.stringify(privacySettings));
    } catch (_) {}
  }, [privacySettings]);

  // Trigger haptic feedback if available
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate([100, 50, 100]);
      } catch (_) {}
    }
  }, []);

  // Load Social Data from DB (friendships, profiles, shared_tracks)
  const loadSocialData = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setPendingRequests([]);
      setSharedTracks([]);
      return;
    }

    try {
      // Load all user profiles to resolve display details
      const { data: allProfiles } = await supabase.from('profiles').select('*');
      const profileMap = new Map((allProfiles || []).map(p => [p.id, p]));

      // Fetch friendships where current user is requester or addressee
      const currentUserId = user?.id || user?.uid;

      // Extract and synchronize current user's DB privacy preferences if present
      const myDbProfile = (allProfiles || []).find(p => p.id === currentUserId);
      if (myDbProfile) {
        setPrivacySettings({
          likedTracks: myDbProfile.privacy_likes || 'friends',
          playlists: myDbProfile.privacy_playlists || 'friends',
          topArtists: myDbProfile.privacy_artists || 'friends'
        });
      }

      // Also make sure current user profile is in the map if missing
      if (user && !profileMap.has(user.id)) {
        const fallbackSelf = {
          id: user.id,
          full_name: profile?.full_name || myDbProfile?.full_name || user.user_metadata?.full_name || 'Mon Profil',
          username: profile?.username || myDbProfile?.username || user.user_metadata?.username || 'me',
          email: user.email || '',
          avatar_url: profile?.avatar_url || myDbProfile?.avatar_url || ''
        };
        profileMap.set(user.id, fallbackSelf);
      }

      const { data: userFriendships } = await supabase
        .from('friendships')
        .select('*');

      const userRelations = (userFriendships || []).filter(
        f => {
          const uId = f.user_id || f.sender_id;
          const fId = f.friend_id || f.receiver_id;
          return uId === currentUserId || fId === currentUserId;
        }
      );

      const activeFriendsList = [];
      const pendingReqsList = [];

      userRelations.forEach(f => {
        const uId = f.user_id || f.sender_id;
        const fId = f.friend_id || f.receiver_id;

        if (f.status === 'accepted') {
          const friendId = uId === currentUserId ? fId : uId;
          const friendProfile = profileMap.get(friendId) || {
            id: friendId,
            full_name: 'Membre Audiophile',
            username: 'audiophile',
            avatar_url: ''
          };
          if (!activeFriendsList.some(a => (a.id || a.uid) === friendId)) {
            activeFriendsList.push(friendProfile);
          }
        } else if (f.status === 'pending') {
          if (fId === currentUserId) {
            // Incoming request to currentUser
            const senderProfile = profileMap.get(uId) || {
              id: uId,
              full_name: 'Utilisateur',
              username: 'user',
              avatar_url: ''
            };
            pendingReqsList.push({
              id: f.id,
              user: senderProfile,
              type: 'incoming',
              createdAt: f.created_at || new Date().toISOString()
            });
          } else if (uId === currentUserId) {
            // Outgoing request sent by currentUser
            const recipientProfile = profileMap.get(fId) || {
              id: fId,
              full_name: 'Utilisateur',
              username: 'user',
              avatar_url: ''
            };
            pendingReqsList.push({
              id: f.id,
              user: recipientProfile,
              type: 'outgoing',
              createdAt: f.created_at || new Date().toISOString()
            });
          }
        }
      });

      setFriends(activeFriendsList);
      setPendingRequests(pendingReqsList);

      // Fetch both sent and received shared tracks (bidirectional messages)
      let sharesData = [];
      try {
        const { data, error } = await supabase
          .from('shared_tracks')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
        
        if (error) {
          // Fallback to recipient_id
          const { data: fallbackData } = await supabase
            .from('shared_tracks')
            .select('*')
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
          sharesData = fallbackData || [];
        } else {
          sharesData = data || [];
        }
      } catch (err) {
        console.warn("[SocialContext] Error fetching shared_tracks via or filter, trying fallback:", err);
        try {
          const { data } = await supabase
            .from('shared_tracks')
            .select('*')
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
          sharesData = data || [];
        } catch (_) {}
      }

      const parsedShares = (sharesData || []).map(s => {
        const senderProfile = profileMap.get(s.sender_id) || {
          id: s.sender_id,
          full_name: 'Ami Mélomane',
          username: 'ami',
          avatar_url: ''
        };
        const rId = s.receiver_id || s.recipient_id;
        const receiverProfile = profileMap.get(rId) || {
          id: rId,
          full_name: 'Ami Mélomane',
          username: 'ami',
          avatar_url: ''
        };
        return {
          id: s.id,
          sender: senderProfile,
          receiver: receiverProfile,
          senderId: s.sender_id,
          receiverId: rId,
          track: {
            videoId: s.video_id || s.videoId || s.id,
            title: s.title,
            artist: s.artist,
            thumbnail: s.thumbnail,
            duration: s.duration || ''
          },
          message: s.message || '',
          createdAt: s.created_at || new Date().toISOString()
        };
      });

      setSharedTracks(parsedShares);

      const receivedCount = parsedShares.filter(s => s.receiverId === currentUserId).length;
      if (receivedCount > 0 && notifiedLoginRef.current !== currentUserId) {
        notifiedLoginRef.current = currentUserId;
        setTimeout(() => {
          toast(`📬 Vous avez reçu ${receivedCount} nouveau(x) morceau(x) de musique !`, { 
            duration: 6000,
            icon: '🎵',
            position: 'top-center'
          });
          triggerHaptic();
        }, 1400);
      }
    } catch (err) {
      console.warn("Erreur chargement données sociales:", err);
    }
  }, [user, triggerHaptic, profile]);

  // Accept Friend Request in DB
  const acceptFriendRequest = useCallback(async (requestId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      await loadSocialData();
      toast.success("Demande d'ami acceptée !");
    } catch (err) {
      console.error("Erreur acceptation demande:", err);
      toast.error("Erreur lors de l'acceptation.");
    }
  }, [loadSocialData]);

  useEffect(() => {
    loadSocialData();

    const currentUserId = user?.id || user?.uid;
    if (!currentUserId) return;

    // Periodic "Ping" to keep status as 'online'
    updateUserStatus(currentUserId, 'online');
    const pingInterval = setInterval(() => {
      updateUserStatus(currentUserId, 'online');
    }, 60000); // Every minute

    // Supabase Realtime listener for live friend requests and shared tracks
    const channelName = `social-realtime-${currentUserId}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'friendships'
      }, async (payload) => {
        const newRow = payload.new;
        if (processedEventIds.current.has(newRow.id)) return;
        processedEventIds.current.add(newRow.id);

        const recId = newRow.receiver_id || newRow.friend_id;
        const sendId = newRow.sender_id || newRow.user_id;

        if (recId === currentUserId && newRow.status === 'pending') {
          // Fetch sender profile details for the toast
          let senderName = 'Un utilisateur';
          try {
            const { data: senderProf } = await supabase.from('profiles').select('*').eq('id', sendId).maybeSingle();
            if (senderProf) {
              senderName = senderProf.full_name || (senderProf.username ? `@${senderProf.username}` : 'Un utilisateur');
            }
          } catch (_) {}

          // Toast banner for incoming friend request
          triggerHaptic();
          toast((t) => (
            <div className="flex items-center justify-between gap-3 min-w-[280px]">
              <div className="flex flex-col text-xs">
                <span className="font-bold text-white flex items-center gap-1.5 uppercase tracking-tighter">
                  📩 Demande d'ami
                </span>
                <span className="text-neutral-400 mt-0.5">
                  <strong>{senderName}</strong> veut devenir votre ami.
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    toast.dismiss(t.id);
                    await acceptFriendRequest(newRow.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[10px] uppercase tracking-wider shrink-0 shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  Accepter
                </button>
              </div>
            </div>
          ), {
            duration: 10000,
            position: 'top-center',
            style: {
              background: '#0a0a0a',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '12px 16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }
          });

          loadSocialData();
        } else if (sendId === currentUserId || recId === currentUserId) {
          loadSocialData();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'friendships'
      }, (payload) => {
        const row = payload.new;
        const recId = row.receiver_id || row.friend_id;
        const sendId = row.sender_id || row.user_id;
        if (sendId === currentUserId || recId === currentUserId) {
          if (row.status === 'accepted' && sendId === currentUserId) {
            triggerHaptic();
            toast.success("Votre demande d'ami a été acceptée ! 🎉", { position: 'top-center' });
          }
          loadSocialData();
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'shared_tracks'
      }, async (payload) => {
        const newRow = payload.new;
        if (processedEventIds.current.has(newRow.id)) return;
        processedEventIds.current.add(newRow.id);

        const targetId = newRow.receiver_id || newRow.recipient_id;
        const senderId = newRow.sender_id;
        
        if (targetId === currentUserId) {
          triggerHaptic();
          let senderName = 'Un ami';
          try {
            const { data: senderProf } = await supabase.from('profiles').select('*').eq('id', newRow.sender_id).maybeSingle();
            if (senderProf) {
              senderName = senderProf.full_name || senderProf.username || 'Un ami';
            }
          } catch (_) {}

          const trackObj = {
            videoId: newRow.video_id || newRow.videoId,
            title: newRow.title,
            artist: newRow.artist,
            thumbnail: newRow.thumbnail,
            duration: newRow.duration || ''
          };

          toast((t) => (
            <div className="flex items-center justify-between gap-3 min-w-[280px]">
              <div className="flex flex-col text-xs">
                <span className="font-bold text-white flex items-center gap-1.5 uppercase tracking-tighter">
                  🎵 Musique partagée
                </span>
                <span className="text-neutral-400 mt-0.5 line-clamp-2">
                  <strong>{senderName}</strong> vous conseille <strong>{newRow.title}</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  window.dispatchEvent(new CustomEvent('lyra:play_track', { detail: trackObj }));
                }}
                className="px-3 py-1.5 rounded-xl bg-[#c29e5a] hover:bg-[#d6b068] text-black font-extrabold text-[10px] uppercase tracking-wider shrink-0 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                Écouter
              </button>
            </div>
          ), {
            duration: 10000,
            position: 'top-center',
            style: {
              background: '#0a0a0a',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '12px 16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }
          });

          loadSocialData();
        } else if (senderId === currentUserId) {
          loadSocialData();
        }
      })
      .subscribe();

    return () => {
      clearInterval(pingInterval);
      supabase.removeChannel(channel);
    };
  }, [user, loadSocialData, triggerHaptic, acceptFriendRequest]);

  // Multi-criteria real-time user search (full_name, username, email)
  const searchUsers = useCallback(async (query) => {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim().replace(/^@/, '');

    try {
      const { data: profilesList } = await supabase.from('profiles').select('*');
      if (!profilesList) return [];

      return profilesList.filter(p => {
        // Exclude currently logged in user
        if (user && p.id === user.id) return false;

        const fullNameMatch = (p.full_name || '').toLowerCase().includes(q);
        const usernameMatch = (p.username || '').toLowerCase().includes(q);
        const emailMatch = (p.email || '').toLowerCase().includes(q);

        return fullNameMatch || usernameMatch || emailMatch;
      });
    } catch (err) {
      console.error("Erreur recherche utilisateurs:", err);
      return [];
    }
  }, [user]);

  // Send Friend Request in DB
  const sendFriendRequest = async (targetUser) => {
    if (!user) {
      toast.error('Veuillez vous connecter pour envoyer une demande d\'ami.');
      return;
    }

    const currentUserId = user?.id || user?.uid;
    const targetUserId = targetUser?.id || targetUser?.uid;

    if (!currentUserId || !targetUserId) {
      const err = new Error(`Identifiants utilisateur non valides: sender=${currentUserId}, receiver=${targetUserId}`);
      console.error("Détails erreur d'ami:", err);
      toast.error("Erreur lors de l'envoi de la demande d'ami.");
      return;
    }

    if (currentUserId === targetUserId) {
      toast.error("Vous ne pouvez pas vous ajouter vous-même.");
      return;
    }

    if (friends.some(f => (f.id || f.uid) === targetUserId)) {
      toast.error(`Vous êtes déjà ami avec ${targetUser.full_name || targetUser.username || 'cet utilisateur'}`);
      return;
    }

    const isAlreadyPending = pendingRequests.some(r => {
      const rId = r.user?.id || r.user?.uid;
      return rId === targetUserId;
    });

    if (isAlreadyPending) {
      toast('Demande déjà envoyée', { icon: '⏳' });
      return;
    }

    try {
      const payload = {
        sender_id: currentUserId,
        receiver_id: targetUserId,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('friendships').insert(payload);

      if (error) {
        console.error("Détails erreur d'ami:", error);
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already')) {
          toast('Demande déjà envoyée', { icon: '⏳' });
          return;
        }
        throw error;
      }

      await loadSocialData();
      toast.success(`Demande d'ami envoyée à ${targetUser.full_name || targetUser.username || 'cet utilisateur'} !`);
    } catch (err) {
      console.error("Détails erreur d'ami:", err);
      toast.error("Erreur lors de l'envoi de la demande d'ami.");
    }
  };

  // Decline Friend Request in DB
  const declineFriendRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      await loadSocialData();
      toast("Demande d'ami refusée", { icon: '🚫' });
    } catch (err) {
      console.error("Erreur refus demande:", err);
      toast.error("Erreur lors du refus.");
    }
  };

  // Remove Friend in DB
  const removeFriend = async (friendId) => {
    if (!user) return;
    try {
      const { data: allFriendships } = await supabase.from('friendships').select('*');
      const target = (allFriendships || []).find(f => 
        (f.user_id === user.id && f.friend_id === friendId) ||
        (f.user_id === friendId && f.friend_id === user.id)
      );

      if (target) {
        await supabase.from('friendships').delete().eq('id', target.id);
      }

      await loadSocialData();
      toast("Ami retiré de votre liste", { icon: '🗑️' });
    } catch (err) {
      console.error("Erreur suppression ami:", err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  // Update Privacy Settings
  const updatePrivacySettings = async (key, value) => {
    setPrivacySettings(prev => {
      const next = { ...prev, [key]: value };
      toast.success('Paramètre de confidentialité mis à jour');
      return next;
    });

    if (user) {
      const currentUserId = user.id;
      const dbKey = key === 'likedTracks' ? 'privacy_likes' : (key === 'playlists' ? 'privacy_playlists' : 'privacy_artists');
      try {
        await supabase.from('profiles').update({
          [dbKey]: value,
          updated_at: new Date().toISOString()
        }).eq('id', currentUserId);
      } catch (err) {
        console.warn("[SocialContext] Error syncing privacy to Supabase profile:", err);
      }
    }
  };

  // Share track with a friend in DB
  const shareTrackWithFriend = async (friendId, track, message) => {
    if (!user) {
      toast.error('Veuillez vous connecter pour partager un morceau.');
      return;
    }
    if (!track) return;

    const currentUserId = user.id;
    const targetUserId = friendId;

    if (!currentUserId || !targetUserId) {
      console.error("[SocialContext] Identifiants de partage manquants :", { currentUserId, targetUserId });
      toast.error("Erreur : Impossible d'identifier l'expéditeur ou le destinataire.");
      return;
    }

    try {
      const cleanPayload = {
        sender_id: currentUserId,
        receiver_id: targetUserId,
        video_id: String(track.id || track.video_id || track.videoId),
        title: track.title,
        artist: track.artist || 'Artiste inconnu',
        thumbnail: track.thumbnail || track.cover || '',
        message: message || ''
      };

      console.log("[SocialContext] Insertion dans shared_tracks :", cleanPayload);

      const { error } = await supabase
        .from('shared_tracks')
        .insert([cleanPayload]);

      if (error) {
        console.error("Erreur insertion shared_tracks :", error.message || error);
        throw error;
      }

      toast.success('Morceau recommandé avec succès ! 🎵');
      loadSocialData();
      closeShareModal();
    } catch (err) {
      console.error("Erreur partage morceau:", err.message || err);
      toast.error(err.message ? `Erreur : ${err.message}` : "Erreur lors du partage du morceau.");
    }
  };

  // Modal helpers
  const openShareModal = (track) => {
    setShareModalState({ isOpen: true, track });
  };

  const closeShareModal = () => {
    setShareModalState({ isOpen: false, track: null });
  };

  const incomingRequestsCount = pendingRequests.filter(r => r.type === 'incoming').length;
  const receivedTracksCount = sharedTracks.length;
  const totalUnreadCount = incomingRequestsCount;

  const value = {
    friends,
    pendingRequests,
    incomingRequestsCount,
    receivedTracksCount,
    totalUnreadCount,
    privacySettings,
    sharedTracks,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    updatePrivacySettings,
    shareTrackWithFriend,
    shareModalState,
    openShareModal,
    closeShareModal,
    loadSocialData
  };

  return (
    <SocialContext.Provider value={value}>
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => useContext(SocialContext);
