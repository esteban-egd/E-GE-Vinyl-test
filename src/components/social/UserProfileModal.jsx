import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Heart, Disc, Sparkles, Send, MessageSquare, Lock, EyeOff, Play, 
  Search, Check, Music, Radio, Activity, Globe, Users, LockKeyhole, UserPlus
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSocial } from '../../context/SocialContext';
import { useAudio } from '../../context/AudioContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function UserProfileModal({ friend, isOpen, onClose }) {
  const { currentTheme } = useTheme();
  const { friends, shareTrackWithFriend, sendFriendRequest, pendingRequests } = useSocial();
  const { play } = useAudio();

  const [activeTab, setActiveTab] = useState('likes'); // 'likes' | 'playlists' | 'artists'
  
  // Data states
  const [likedTracks, setLikedTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // Send song states
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Determine friendship status
  const isFriend = friends.some(f => (f.id === friend?.id || f.uid === friend?.id || f.id === friend?.uid || f.uid === friend?.uid));
  const isRequested = pendingRequests.some(r => (r.user?.id || r.user?.uid) === (friend?.id || friend?.uid));

  // Actual profile to use (prefer freshly fetched)
  const activeProfile = profileData || friend;

  // Action Button logic
  const canShare = isFriend;

  // Privacy evaluations
  // Defaults: 'friends' for likes, playlists, and artists
  const privacyLikes = activeProfile?.privacy_likes || 'friends';
  const privacyPlaylists = activeProfile?.privacy_playlists || 'friends';
  const privacyArtists = activeProfile?.privacy_artists || 'friends';

  const canSeeLikes = privacyLikes === 'public' || (privacyLikes === 'friends' && isFriend);
  const canSeePlaylists = privacyPlaylists === 'public' || (privacyPlaylists === 'friends' && isFriend);
  const canSeeTopArtists = privacyArtists === 'public' || (privacyArtists === 'friends' && isFriend);

  useEffect(() => {
    if (!friend || !isOpen) {
      setProfileData(null);
      setLikedTracks([]);
      setPlaylists([]);
      setTopArtists([]);
      return;
    }

    const loadFriendProfileData = async () => {
      if (!isOpen || !friend) return;
      
      setLoading(true);
      const targetId = friend.id || friend.uid || friend.user_id;
      const currentUserId = supabase.auth.getUser()?.id;
      
      console.log("[UserProfileModal] Chargement des données pour targetId:", targetId);
      console.log("[UserProfileModal] Liste de mes amis (IDs):", friends.map(f => f.id || f.uid));
      
      try {
        // 0. Fetch latest profile data to get privacy settings
        const { data: latestProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();
        
        if (profileError) {
          console.warn("[UserProfileModal] Erreur récupération profil:", profileError);
        }

        if (latestProfile) {
          setProfileData(latestProfile);
        }

        // Determine permissions locally to avoid stale state issues from setProfileData
        const pLikes = latestProfile?.privacy_likes || friend?.privacy_likes || 'friends';
        const pPlaylists = latestProfile?.privacy_playlists || friend?.privacy_playlists || 'friends';
        const pArtists = latestProfile?.privacy_artists || friend?.privacy_artists || 'friends';

        // Re-calculate isFriend locally to be extra sure
        const isCurrentlyFriend = friends.some(f => 
          (f.id === targetId || f.uid === targetId || f.user_id === targetId)
        );

        const canSeeL = pLikes === 'public' || (pLikes === 'friends' && isCurrentlyFriend);
        const canSeeP = pPlaylists === 'public' || (pPlaylists === 'friends' && isCurrentlyFriend);
        const canSeeA = pArtists === 'public' || (pArtists === 'friends' && isCurrentlyFriend);

        console.log("[UserProfileModal] Autorisations calculées:", { 
          targetId, 
          isFriend: isCurrentlyFriend, 
          canSeeLikes: canSeeL, 
          privacySetting: pLikes 
        });

        let finalLikes = [];

        // 1. Load Liked Tracks if permitted
        if (canSeeL) {
          const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('*')
            .eq('user_id', targetId)
            .order('created_at', { ascending: false });

          if (likesError) {
            console.error("[UserProfileModal] Erreur chargement likes:", likesError);
          }

          if (!likesError && likesData) {
            console.log(`[UserProfileModal] ${likesData.length} likes trouvés.`);
            finalLikes = likesData.map(item => ({
              ...item,
              videoId: item.video_id || item.videoId || item.id,
              id: item.video_id || item.videoId || item.id,
              title: item.title || 'Titre inconnu',
              artist: item.artist || 'Artiste inconnu',
              thumbnail: item.thumbnail || ''
            }));
            setLikedTracks(finalLikes);
          } else {
            setLikedTracks([]);
          }
        } else {
          console.log("[UserProfileModal] Accès aux likes refusé (Confidentialité)");
          setLikedTracks([]);
        }

        // 2. Load Playlists if permitted
        if (canSeeP) {
          const { data: playlistsData, error: playlistsError } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', targetId)
            .order('updated_at', { ascending: false });

          if (!playlistsError && playlistsData) {
            setPlaylists(playlistsData || []);
          } else {
            setPlaylists([]);
          }
        } else {
          setPlaylists([]);
        }

        // 3. Load Listening History & Calculate Top Artists
        if (canSeeA) {
          const { data: historyData } = await supabase
            .from('listening_history')
            .select('*')
            .eq('user_id', targetId)
            .order('played_at', { ascending: false })
            .limit(40);

          let likesForArtists = finalLikes;
          if (!canSeeL) {
            const { data: fallbackLikes } = await supabase
              .from('likes')
              .select('artist')
              .eq('user_id', targetId);
            likesForArtists = fallbackLikes || [];
          }

          const artistCounts = {};
          (historyData || []).forEach(t => {
            const artName = t.artist || t.artist_name;
            if (artName) {
              artistCounts[artName] = (artistCounts[artName] || 0) + 1;
            }
          });
          likesForArtists.forEach(t => {
            if (t.artist) {
              artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
            }
          });

          const sortedArtists = Object.entries(artistCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          setTopArtists(sortedArtists);
        } else {
          setTopArtists([]);
        }
      } catch (err) {
        console.warn("[UserProfileModal] Erreur globale chargement:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFriendProfileData();
  }, [friend, isOpen, isFriend]);

  // Search tracks to share
  const handleTrackSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data?.tracks || data || []);
    } catch (err) {
      console.error("Error searching tracks in modal:", err);
      toast.error("Erreur de recherche.");
    } finally {
      setSearching(false);
    }
  };

  // Share track
  const handleShareTrack = async () => {
    if (!selectedTrack) return;
    setSending(true);
    try {
      const targetId = friend.id || friend.uid;
      await shareTrackWithFriend(targetId, selectedTrack, message);
      toast.success(`"${selectedTrack.title}" partagé avec succès !`);
      setSelectedTrack(null);
      setMessage('');
      setShowSharePanel(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const getPrivacyIcon = (setting) => {
    if (setting === 'public') return <Globe size={10} className="text-emerald-400" />;
    if (setting === 'friends') return <Users size={10} className="text-blue-400" />;
    return <Lock size={10} className="text-amber-400" />;
  };

  const getPrivacyLabel = (setting) => {
    if (setting === 'public') return 'Public';
    if (setting === 'friends') return 'Amis';
    return 'Privé';
  };

  if (!isOpen || !friend) return null;

  const displayUser = activeProfile || friend;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
          style={{ backgroundColor: currentTheme.cardBg }}
        >
          {/* Top Bar for Close Button */}
          <div className="flex justify-end p-2 border-b border-white/5 bg-white/5 shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {/* Header section */}
            <div className="p-6 md:p-8 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent relative">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                <img 
                  src={displayUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                  alt={displayUser.full_name} 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white/10 shadow-xl"
                />
                <span 
                  className={`absolute bottom-1 right-1 w-4.5 h-4.5 rounded-full border-4 border-black ${
                    displayUser.status === 'online' || displayUser.status === 'listening' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
                  }`}
                />
              </div>

              <div className="text-center md:text-left space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h2 className="text-xl md:text-2xl font-black text-white truncate">{displayUser.full_name || displayUser.username}</h2>
                  {isFriend && (
                    <span 
                      className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-black self-center shadow-sm shrink-0"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      Ami
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono">@{displayUser.username}</p>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs mt-1">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Activity size={13} style={{ color: currentTheme.primary }} />
                    <span className="capitalize">{displayUser.status === 'listening' ? 'En écoute' : displayUser.status === 'online' ? 'En ligne' : 'Hors-ligne'}</span>
                  </span>
                  
                  {displayUser.current_track && (
                    <span className="text-emerald-400 font-medium flex items-center gap-1.5 animate-pulse truncate max-w-[250px]">
                      <Radio size={13} />
                      <span className="truncate">Écoute : <strong>{displayUser.current_track}</strong></span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full md:w-auto shrink-0 mt-2 md:mt-0 flex flex-col gap-2">
                {canShare ? (
                  <button
                    onClick={() => setShowSharePanel(!showSharePanel)}
                    className="w-full md:w-auto px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary, color: '#000000' }}
                  >
                    <Send size={14} />
                    <span>{showSharePanel ? 'Fermer le partage' : 'Envoyer un morceau'}</span>
                  </button>
                ) : (
                  <>
                    {isRequested ? (
                      <div 
                        className="w-full md:w-auto px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-white/10 text-gray-400 border border-white/10"
                      >
                        <Check size={14} />
                        <span>Demande envoyée</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(displayUser)}
                        className="w-full md:w-auto px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                        style={{ backgroundColor: currentTheme.primary, color: '#000000' }}
                      >
                        <UserPlus size={14} />
                        <span>Ajouter en ami</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick Share Panel (Inline) */}
            <AnimatePresence>
              {showSharePanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 p-4 rounded-2xl bg-black/50 border border-white/10 overflow-hidden space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Music size={13} style={{ color: currentTheme.primary }} />
                      <span>Recommander un morceau à {displayUser.full_name || displayUser.username}</span>
                    </h3>
                  </div>

                  {!selectedTrack ? (
                    <form onSubmit={handleTrackSearch} className="flex gap-2">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Rechercher un titre ou artiste..."
                          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={searching}
                        className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/15 transition-all cursor-pointer"
                      >
                        {searching ? '...' : 'Chercher'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                          <img 
                            src={selectedTrack.thumbnail} 
                            alt={selectedTrack.title} 
                            className="w-10 h-10 rounded-lg object-cover border border-white/15"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-white">{selectedTrack.title}</h4>
                            <p className="text-[10px] text-gray-400">{selectedTrack.artist}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedTrack(null)}
                          className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
                        >
                          Changer
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-gray-400">Ajouter un court message :</label>
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Écris un message sympa..."
                          className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setSelectedTrack(null); setShowSharePanel(false); }}
                          className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-bold cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleShareTrack}
                          disabled={sending}
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                          style={{ backgroundColor: currentTheme.primary, color: '#000000' }}
                        >
                          <Send size={12} />
                          <span>{sending ? 'Envoi...' : 'Envoyer'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!selectedTrack && searchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                      {searchResults.slice(0, 4).map((track) => (
                        <div
                          key={track.id || track.videoId}
                          onClick={() => setSelectedTrack(track)}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img 
                              src={track.thumbnail} 
                              alt={track.title} 
                              className="w-8 h-8 rounded object-cover"
                            />
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-white truncate">{track.title}</h5>
                              <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-gray-500 uppercase">Sélectionner</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 px-6 py-2 bg-black/20 overflow-x-auto no-scrollbar gap-1">
            {[
              { id: 'likes', label: `Titres Likés (${likedTracks.length})`, icon: Heart, privacy: privacyLikes },
              { id: 'playlists', label: `Playlists (${playlists.length})`, icon: Disc, privacy: privacyPlaylists },
              { id: 'artists', label: 'Top Artistes', icon: Sparkles, privacy: privacyArtists }
            ].map(({ id, label, icon: Icon, privacy }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-b-2 shrink-0 ${
                  activeTab === id
                    ? 'text-white border-white'
                    : 'text-gray-400 hover:text-white border-transparent'
                }`}
                style={activeTab === id ? { color: currentTheme.primary, borderColor: currentTheme.primary } : {}}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} />
                    <span>{label}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-60">
                    {getPrivacyIcon(privacy)}
                    <span className="text-[8px] font-mono lowercase tracking-normal">{getPrivacyLabel(privacy)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-6 min-h-[250px] max-h-[50vh] space-y-4 no-scrollbar">
            {loading ? (
              <div className="py-12 text-center text-xs text-gray-400">
                <Music size={24} className="animate-spin mx-auto mb-2 opacity-55" />
                Chargement des données...
              </div>
            ) : (
              <>
                {/* 1. LIKES TAB */}
                {activeTab === 'likes' && (
                  <div>
                    {!canSeeLikes ? (
                      <div className="py-12 text-center space-y-2">
                        <Lock size={28} className="mx-auto text-gray-600" />
                        <p className="text-xs text-gray-400 font-bold">Titres likés masqués par cet utilisateur</p>
                        <p className="text-[10px] text-gray-500">Ce contenu est privé ou réservé aux amis selon les choix de l'utilisateur.</p>
                      </div>
                    ) : likedTracks.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-400">
                        Aucun titre liké trouvé sur le profil.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {likedTracks.map((track) => (
                          <div 
                            key={track.id || track.videoId}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img 
                                src={track.thumbnail} 
                                alt={track.title} 
                                className="w-10 h-10 rounded-lg object-cover border border-white/10"
                              />
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                                <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => play(track)}
                              className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              title="Écouter"
                            >
                              <Play size={13} fill="currentColor" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PLAYLISTS TAB */}
                {activeTab === 'playlists' && (
                  <div>
                    {!canSeePlaylists ? (
                      <div className="py-12 text-center space-y-2">
                        <Lock size={28} className="mx-auto text-gray-600" />
                        <p className="text-xs text-gray-400 font-bold">Playlists masquées par cet utilisateur</p>
                        <p className="text-[10px] text-gray-500">Ce contenu est privé ou réservé aux amis selon les choix de l'utilisateur.</p>
                      </div>
                    ) : playlists.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-400">
                        Aucune playlist publique ou partagée.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {playlists.map((playlist) => (
                          <div
                            key={playlist.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                          >
                            <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-gray-400 shrink-0">
                              <Disc size={20} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{playlist.name}</h4>
                              <p className="text-[9px] font-mono text-gray-500 mt-0.5">Playlist</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. TOP ARTISTS TAB */}
                {activeTab === 'artists' && (
                  <div>
                    {!canSeeTopArtists ? (
                      <div className="py-12 text-center space-y-2">
                        <Lock size={28} className="mx-auto text-gray-600" />
                        <p className="text-xs text-gray-400 font-bold">Top artistes masqués par cet utilisateur</p>
                        <p className="text-[10px] text-gray-500">Ce contenu est privé ou réservé aux amis selon les choix de l'utilisateur.</p>
                      </div>
                    ) : topArtists.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-400">
                        Données d'écoutes insuffisantes pour calculer le Top Artistes.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {topArtists.map((artist, idx) => (
                          <div
                            key={artist.name + idx}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-black border border-white/15">
                                <span>{artist.name.charAt(0)}</span>
                              </div>
                              <h4 className="text-xs font-bold text-white">{artist.name}</h4>
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                              {artist.count} écoutes
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
);
}
