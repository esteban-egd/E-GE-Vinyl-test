import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Camera, Heart, Disc, Clock, Sparkles, Play, Trash2, 
  LogOut, Save, ShieldCheck, Music, Users, Radio, Edit3, Lock, LogIn,
  Search, UserPlus, UserCheck, Check, X, Send, Eye, EyeOff, Shield,
  Share2, MessageSquare, Activity, Globe, LockKeyhole
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocial } from '../context/SocialContext';
import { useLikes } from '../hooks/useLikes';
import { usePlaylists } from '../hooks/usePlaylists';
import { useAudio } from '../context/AudioContext';
import { PRESET_AVATARS } from '../constants/avatars';
import ProfileModal from '../components/profile/ProfileModal';
import ShareTrackModal from '../components/social/ShareTrackModal';
import UserProfileModal from '../components/social/UserProfileModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import db from '../lib/db';
import { fetchListeningHistory, getEffectiveStatus, formatListeningTime } from '../services/userBddService';
import { searchOfficialDeezerArtist } from '../services/artistService';

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { currentTheme } = useTheme();
  const { 
    friends, 
    pendingRequests, 
    privacySettings, 
    sharedTracks, 
    searchUsers, 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest, 
    cancelFriendRequest,
    removeFriend, 
    updatePrivacySettings,
    openShareModal,
    unreadReceivedTracksCount,
    isShareRead,
    markShareAsRead,
    markConversationAsRead,
    markAllReceivedAsRead,
    getUnreadCountForFriend,
    sendMessageToFriend
  } = useSocial();

  const { likedTracks, toggleLike } = useLikes();
  const { playlists } = usePlaylists();
  const { play, currentTrack, isPlaying, isCurrentTrack } = useAudio();
  const navigate = useNavigate();

  const isGuest = !user || user.is_guest;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'friends' | 'feed' | 'privacy'
  const [selectedFriendForModal, setSelectedFriendForModal] = useState(null);
  const [selectedFriendFilter, setSelectedFriendFilter] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [recentTracks, setRecentTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const currentUserId = user?.id || user?.uid;

  // Compute unique senders / friends for conversations
  const uniqueSenders = [];
  (sharedTracks || []).forEach(share => {
    const otherUser = share.senderId === currentUserId ? share.receiver : share.sender;
    if (otherUser && otherUser.id !== currentUserId && !uniqueSenders.some(s => s.id === otherUser.id)) {
      uniqueSenders.push(otherUser);
    }
  });
  (friends || []).forEach(friend => {
    if (friend.id !== currentUserId && !uniqueSenders.some(s => s.id === friend.id)) {
      uniqueSenders.push(friend);
    }
  });

  // Automatically select first friend when opening messages tab if none selected
  useEffect(() => {
    if (activeTab === 'feed' && !selectedFriendFilter && uniqueSenders.length > 0) {
      setSelectedFriendFilter(uniqueSenders[0].id);
    }
  }, [activeTab, selectedFriendFilter, uniqueSenders]);

  // Automatically mark conversation as read when viewing a specific friend's conversation
  useEffect(() => {
    if (activeTab === 'feed' && selectedFriendFilter) {
      markConversationAsRead(selectedFriendFilter);
    }
  }, [activeTab, selectedFriendFilter, markConversationAsRead]);

  // Search friends state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Form states for Account Information section
  const [fullNameInput, setFullNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullNameInput(profile.full_name || '');
      setUsernameInput(profile.username || '');
    }
  }, [profile]);

  // Handle Search Input Change with 300ms debounce
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results || []);
      } catch (_) {
        setSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Load listening history from BDD and calculate top artists
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      const userId = user?.id || user?.uid;
      if (!userId) {
        if (isMounted) {
          setRecentTracks([]);
          setTopArtists([]);
          setLoadingHistory(false);
        }
        return;
      }

      try {
        const history = await fetchListeningHistory(userId, 15);
        if (isMounted) {
          setRecentTracks(history || []);
          
          // Calculate top 5 artists from history or liked tracks
          const artistCounts = {};
          (history || []).forEach(t => {
            if (t.artist) {
              artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
            }
          });
          likedTracks.forEach(t => {
            if (t.artist) {
              artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
            }
          });

          // Sorted list of artists
          let sorted = Object.entries(artistCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          // Fetch images for top artists in parallel
          const enrichedArtists = await Promise.all(sorted.map(async (art) => {
            try {
              const info = await searchOfficialDeezerArtist(art.name);
              return { 
                ...art, 
                imageUrl: info?.picture_medium || info?.picture_big || info?.picture || '' 
              };
            } catch (err) {
              return { ...art, imageUrl: '' };
            }
          }));

          setTopArtists(enrichedArtists);
        }
      } catch (err) {
        console.warn('Erreur chargement historique profile:', err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }
    loadHistory();
    return () => { isMounted = false; };
  }, [user?.id, user?.uid, likedTracks]);

  const avatarUrl = profile?.avatar_url || PRESET_AVATARS[0].url;
  const displayName = profile?.full_name?.trim() || user?.user_metadata?.full_name?.trim() || profile?.username?.trim() || (user?.email ? user.email.split('@')[0] : 'Membre Audiophile');
  const displayUsername = profile?.username ? `@${profile.username.replace('@', '')}` : (user?.user_metadata?.username ? `@${user.user_metadata.username.replace('@', '')}` : (user?.email ? `@${user.email.split('@')[0]}` : '@audiophile'));

  // Real cumulative listening time calculation (Actual audio playback time accumulated in seconds)
  const totalPlays = (recentTracks.length || 0) + (likedTracks.length || 0);
  const [liveListeningSeconds, setLiveListeningSeconds] = useState(0);

  useEffect(() => {
    setLiveListeningSeconds(Number(profile?.total_listening_seconds || 0));
  }, [profile?.total_listening_seconds]);

  useEffect(() => {
    const handleListeningTimeUpdated = (e) => {
      const { userId, totalSeconds } = e.detail;
      const currentUserId = user?.id || user?.uid;
      if (userId === currentUserId) {
        setLiveListeningSeconds(totalSeconds);
      }
    };
    window.addEventListener('lyra:listening_time_updated', handleListeningTimeUpdated);
    return () => {
      window.removeEventListener('lyra:listening_time_updated', handleListeningTimeUpdated);
    };
  }, [user?.id, user?.uid]);

  const totalListeningSeconds = liveListeningSeconds;
  const formattedListeningTime = formatListeningTime(totalListeningSeconds);
  const listeningHoursExact = (totalListeningSeconds / 3600).toFixed(1);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullNameInput,
        username: usernameInput
      });
      toast.success('Informations du compte mises à jour !');
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Voulez-vous vraiment réinitialiser votre historique d\'écoute ?')) {
      try {
        await db.tracks.clear();
        setRecentTracks([]);
        toast.success('Historique d\'écoute réinitialisé avec succès');
      } catch (err) {
        toast.error('Erreur lors de la réinitialisation');
      }
    }
  };

  if (isGuest) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 box-border fade-in pb-28 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl border"
          style={{ 
            backgroundColor: `${currentTheme.primary}15`,
            borderColor: `${currentTheme.primary}30`,
            color: currentTheme.primary,
            boxShadow: `0 0 25px ${currentTheme.glow || `${currentTheme.primary}20`}`
          }}
        >
          <Lock size={38} />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter mb-3">
          Profil Restreint
        </h1>
        <p className="text-gray-400 max-w-md text-sm mb-8 leading-relaxed">
          Le mode Invité est restreint. Connectez-vous ou créez un compte pour accéder à votre profil, vos amis, vos recommandations et vos réglages de confidentialité.
        </p>
        <button
          onClick={() => signOut()}
          className="px-6 py-3.5 text-black font-black rounded-full text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
          style={{ 
            backgroundColor: currentTheme.primary,
            boxShadow: `0 0 20px ${currentTheme.glow || `${currentTheme.primary}30`}`
          }}
        >
          <LogIn size={15} />
          <span>Se connecter / Créer un compte</span>
        </button>
      </div>
    );
  }

  const incomingRequestsCount = pendingRequests.filter(r => r.type === 'incoming').length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8 box-border pb-32">
      
      {/* 1. SPOTIFY STYLE IMMERSIVE HEADER */}
      <div 
        className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-300"
        style={{ backgroundColor: currentTheme.cardBg }}
      >
        <div 
          className="absolute inset-0 opacity-40 blur-3xl pointer-events-none"
          style={{ 
            background: `radial-gradient(circle at 20% 20%, ${currentTheme.primary}80 0%, transparent 70%)` 
          }}
        />
        
        <div className="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div 
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 shadow-2xl relative transition-transform duration-300 group-hover:scale-105"
              style={{ 
                borderColor: currentTheme.primary, 
                boxShadow: `0 0 30px ${currentTheme.glow}` 
              }}
            >
              <img 
                src={avatarUrl} 
                alt={displayName} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = PRESET_AVATARS[0].fallback;
                }}
              />
              
              <button
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                <Camera size={24} style={{ color: currentTheme.primary }} />
                <span>Modifier</span>
              </button>
            </div>

            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="absolute bottom-1 right-1 p-2 rounded-full text-black shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              style={{ backgroundColor: currentTheme.primary }}
              title="Changer d'avatar"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* User Details & Stats */}
          <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border font-mono shadow-sm"
                style={{ backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary, borderColor: `${currentTheme.primary}40` }}
              >
                <ShieldCheck size={12} />
                <span>Membre Audiophile</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight truncate">
              {displayName}
            </h1>

            <p className="text-xs sm:text-sm font-semibold text-gray-400">
              {displayUsername}
            </p>

            {/* Dynamic Key Stats Pills */}
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 pt-2">
              <div 
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs font-bold text-white shadow-sm"
                title={`Temps d'écoute réel cumulé : ${totalListeningSeconds.toLocaleString('fr-FR')} secondes effectives de lecture musicale`}
              >
                <Clock size={14} style={{ color: currentTheme.primary }} />
                <span><strong style={{ color: currentTheme.primary }}>{formattedListeningTime}</strong> d'écoute réelle</span>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs font-bold text-white shadow-sm">
                <Users size={14} style={{ color: currentTheme.primary }} />
                <span><strong style={{ color: currentTheme.primary }}>{friends.length}</strong> Amis</span>
              </div>

              <button 
                onClick={() => setActiveTab('likes')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs font-bold text-white shadow-sm hover:border-white/30 transition-all cursor-pointer"
              >
                <Heart size={14} className="text-red-400 fill-red-400" />
                <span><strong style={{ color: currentTheme.primary }}>{likedTracks.length}</strong> Titres likés</span>
              </button>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs font-bold text-white shadow-sm">
                <Disc size={14} style={{ color: currentTheme.primary }} />
                <span><strong style={{ color: currentTheme.primary }}>{playlists.length}</strong> Playlists</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS (VUE D'ENSEMBLE, TITRES LIKÉS, AMIS, FEED & REÇUS, CONFIDENTIALITÉ) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'bg-white/15 text-white border border-white/20 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={activeTab === 'overview' ? { color: currentTheme.primary, borderColor: `${currentTheme.primary}40` } : {}}
        >
          <User size={15} />
          <span>Vue d'ensemble</span>
        </button>

        <button
          onClick={() => setActiveTab('likes')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'likes'
              ? 'bg-white/15 text-white border border-white/20 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={activeTab === 'likes' ? { color: currentTheme.primary, borderColor: `${currentTheme.primary}40` } : {}}
        >
          <Heart size={15} className="text-red-400 fill-red-400" />
          <span>Titres likés ({likedTracks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 relative ${
            activeTab === 'friends'
              ? 'bg-white/15 text-white border border-white/20 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={activeTab === 'friends' ? { color: currentTheme.primary, borderColor: `${currentTheme.primary}40` } : {}}
        >
          <Users size={15} />
          <span>Amis ({friends.length})</span>
          {incomingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold shadow-sm animate-pulse border border-red-400/40">
              {incomingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 relative ${
            activeTab === 'feed'
              ? 'bg-white/15 text-white border border-white/20 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={activeTab === 'feed' ? { color: currentTheme.primary, borderColor: `${currentTheme.primary}40` } : {}}
        >
          <Send size={15} />
          <span>MESSAGES</span>
          {unreadReceivedTracksCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold shadow-sm animate-pulse border border-red-400/40">
              {unreadReceivedTracksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'privacy'
              ? 'bg-white/15 text-white border border-white/20 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={activeTab === 'privacy' ? { color: currentTheme.primary, borderColor: `${currentTheme.primary}40` } : {}}
        >
          <Shield size={15} />
          <span>Confidentialité</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Real Cumulative Listening Time Breakdown Card */}
            <div 
              className="p-6 rounded-3xl border border-white/10 shadow-xl space-y-4 relative overflow-hidden"
              style={{ backgroundColor: currentTheme.cardBg }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 shadow-inner"
                    style={{ backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary }}
                  >
                    <Clock size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-tight">
                      Temps d'écoute réel cumulé
                    </h2>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Calculé uniquement sur la lecture audio active des morceaux
                    </p>
                  </div>
                </div>
                <span 
                  className="text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border font-mono shrink-0 flex items-center gap-1"
                  style={{ backgroundColor: `${currentTheme.primary}15`, color: currentTheme.primary, borderColor: `${currentTheme.primary}35` }}
                >
                  <Activity size={11} className="animate-pulse" />
                  <span>Sync BDD Profil</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Durée cumulée</span>
                  <div className="mt-2">
                    <div className="text-2xl font-black text-white tracking-tight" style={{ color: currentTheme.primary }}>
                      {formattedListeningTime}
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      ~{listeningHoursExact} heures totales
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Précision BDD</span>
                  <div className="mt-2">
                    <div className="text-2xl font-black text-white tracking-tight">
                      {totalListeningSeconds.toLocaleString('fr-FR')} <span className="text-xs font-mono text-gray-400 font-normal">sec</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Secondes réelles de lecture
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Titres explorés</span>
                  <div className="mt-2">
                    <div className="text-2xl font-black text-white tracking-tight">
                      {totalPlays} <span className="text-xs font-mono text-gray-400 font-normal">titres</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {recentTracks.length} récents • {likedTracks.length} likés
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-gray-300 flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                <span>
                  <strong>Garantie temps d'écoute réel :</strong> Seules les secondes où la musique est effectivement en cours de lecture sont comptabilisées et enregistrées dans la base de données de votre profil (le temps passé inactif ou en pause sur l'application n'est pas pris en compte).
                </span>
              </div>
            </div>

            {/* Top 5 Artists */}
            <div 
              className="p-6 rounded-3xl border border-white/10 shadow-xl space-y-4"
              style={{ backgroundColor: currentTheme.cardBg }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Sparkles size={18} style={{ color: currentTheme.primary }} />
                  <span>Artistes les plus écoutés</span>
                </h2>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Top 5 Favoris</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {topArtists.map((artist, idx) => (
                  <div 
                    key={artist.name + idx}
                    onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                    className="group flex flex-col items-center text-center p-3 rounded-2xl bg-black/30 hover:bg-white/5 border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div 
                      className="w-16 h-16 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/15 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-105 transition-transform overflow-hidden relative mb-2"
                      style={{ borderColor: `${currentTheme.primary}40` }}
                    >
                      <span className="relative z-10">{artist.name.charAt(0)}</span>
                      {artist.imageUrl && (
                        <img 
                          src={artist.imageUrl} 
                          alt={artist.name} 
                          className="absolute inset-0 w-full h-full object-cover z-20"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-30" />
                    </div>
                    <h4 className="text-xs font-bold text-white truncate w-full group-hover:underline">
                      {artist.name}
                    </h4>
                    <span className="text-[9px] font-mono text-gray-400 mt-0.5">
                      {artist.count} écoutes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div 
              className="p-6 rounded-3xl border border-white/10 shadow-xl space-y-4"
              style={{ backgroundColor: currentTheme.cardBg }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Clock size={18} style={{ color: currentTheme.primary }} />
                  <span>Dernières activités</span>
                </h2>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  {recentTracks.length} Morceaux récents
                </span>
              </div>

              {loadingHistory ? (
                <div className="py-8 text-center text-xs text-gray-400">Chargement de l'historique...</div>
              ) : recentTracks.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-gray-400">Aucun morceau joué récemment.</p>
                  <button 
                    onClick={() => navigate('/search')}
                    className="text-xs font-bold hover:underline"
                    style={{ color: currentTheme.primary }}
                  >
                    Explorer de la musique
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTracks.slice(0, 5).map((track, idx) => {
                    const isCurrent = isCurrentTrack(track);
                    return (
                      <div 
                        key={track.videoId || idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5 hover:border-white/20 transition-all group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/50 border border-white/10 relative shrink-0">
                            <img 
                              src={track.thumbnail} 
                              alt={track.title} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80';
                              }}
                            />
                            <button
                              onClick={() => play(track, recentTracks)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                            >
                              <Play size={16} fill="currentColor" />
                            </button>
                          </div>

                          <div className="min-w-0">
                            <h4 
                              className="text-xs font-bold truncate transition-colors"
                              style={{ color: isCurrent ? currentTheme.primary : 'white' }}
                            >
                              {track.title}
                            </h4>
                            <p className="text-[11px] text-gray-400 truncate">{track.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => openShareModal(track)}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                            title="Partager à un ami"
                          >
                            <Share2 size={14} />
                          </button>

                          <button
                            onClick={() => play(track, recentTracks)}
                            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
                          >
                            <Play size={14} fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Account Form */}
          <div className="space-y-8">
            <div 
              className="p-6 rounded-3xl border border-white/10 shadow-xl space-y-5"
              style={{ backgroundColor: currentTheme.cardBg }}
            >
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <User size={18} style={{ color: currentTheme.primary }} />
                  <span>Informations du compte</span>
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Préférences personnelles & Identité</p>
              </div>

              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                    Nom d'affichage
                  </label>
                  <input
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Ex: Jean Audiophile"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-white/30 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                    Nom d'utilisateur (@handle)
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Ex: jean_vinyl"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-white/30 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 text-black font-black uppercase tracking-wider text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  style={{ backgroundColor: currentTheme.primary }}
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Sauvegarde...' : 'Enregistrer'}</span>
                </button>
              </form>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <button
                  onClick={handleClearHistory}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 size={14} className="text-amber-400" />
                  <span>Réinitialiser l'historique</span>
                </button>

                <button
                  onClick={signOut}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 hover:text-red-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TITRES LIKÉS */}
      {activeTab === 'likes' && (
        <div 
          className="p-6 rounded-3xl border border-white/10 shadow-xl space-y-5"
          style={{ backgroundColor: currentTheme.cardBg }}
        >
          <div className="border-b border-white/10 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Heart size={18} className="text-red-400 fill-red-400" />
                <span>Mes Titres Likés</span>
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Vos coups de cœur enregistrés dans la table Supabase likes.
              </p>
            </div>

            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/10 text-white font-bold border border-white/10">
              {likedTracks.length} titre{likedTracks.length > 1 ? 's' : ''}
            </span>
          </div>

          {likedTracks.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Heart size={36} className="mx-auto text-gray-600 animate-pulse" />
              <p className="text-xs text-gray-400">Aucun titre liké pour le moment.</p>
              <button
                onClick={() => navigate('/search')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-black uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
                style={{ backgroundColor: currentTheme.primary }}
              >
                Découvrir des morceaux
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {likedTracks.map((track, idx) => {
                const isCurrent = isCurrentTrack(track);
                return (
                  <div 
                    key={track.videoId || track.id || idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/50 border border-white/10 relative shrink-0">
                        <img 
                          src={track.thumbnail} 
                          alt={track.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80';
                          }}
                        />
                        <button
                          onClick={() => play(track, likedTracks)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        >
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <h4 
                          className="text-xs font-bold truncate transition-colors"
                          style={{ color: isCurrent ? currentTheme.primary : 'white' }}
                        >
                          {track.title}
                        </h4>
                        <p className="text-[11px] text-gray-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openShareModal(track)}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                        title="Partager à un ami"
                      >
                        <Share2 size={14} />
                      </button>

                      <button
                        onClick={() => toggleLike(track)}
                        className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                        title="Retirer des favoris"
                      >
                        <Heart size={14} className="fill-red-400" />
                      </button>

                      <button
                        onClick={() => play(track, likedTracks)}
                        className="p-2.5 rounded-xl font-bold text-black text-xs flex items-center gap-1 shadow-md hover:scale-105 transition-all cursor-pointer"
                        style={{ backgroundColor: currentTheme.primary }}
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FRIENDS MANAGEMENT & SEARCH */}
      {activeTab === 'friends' && (
        <div className="space-y-8">
          
          {/* User Search Bar */}
          <div 
            className="p-6 rounded-3xl border border-white/10 shadow-xl space-y-4"
            style={{ backgroundColor: currentTheme.cardBg }}
          >
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Search size={18} style={{ color: currentTheme.primary }} />
                <span>Rechercher des membres</span>
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Recherchez par nom d'affichage ou par pseudo (@handle) pour envoyer une demande d'ami.
              </p>
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Entrez un nom ou @pseudo (ex: @alex_vinyl, Sophie)..."
                className="w-full pl-11 pr-12 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-white/30 font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchQuery.trim() !== '' && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>Résultats de recherche ({searchResults.length})</span>
                  {isSearchingUsers && <span className="text-amber-400 text-[9px] animate-pulse">Recherche BDD en cours...</span>}
                </p>

                {isSearchingUsers ? (
                  <p className="text-xs text-gray-400 italic p-3 animate-pulse">Recherche dans la base de données...</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-gray-500 italic p-3">Aucun utilisateur trouvé avec ce nom ou handle.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchResults.map((u) => {
                      const uId = u.id || u.uid;
                      const isAlreadyFriend = friends.some(f => (f.id || f.uid) === uId);
                      const isRequested = pendingRequests.some(r => (r.user?.id || r.user?.uid) === uId);

                      return (
                        <div 
                          key={u.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-black/30 border border-white/5 hover:border-white/20 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div 
                              className="relative cursor-pointer group"
                              onClick={() => setSelectedFriendForModal(u)}
                            >
                              <img 
                                src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                                alt={u.full_name} 
                                className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0 group-hover:border-white/30 transition-all"
                              />
                              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye size={12} className="text-white" />
                              </div>
                            </div>
                            <div 
                              className="min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedFriendForModal(u)}
                            >
                              <h4 className="text-xs font-bold text-white truncate">{u.full_name}</h4>
                              <p className="text-[10px] text-gray-400 truncate">@{u.username}</p>
                            </div>
                          </div>

                          {isAlreadyFriend ? (
                            <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold flex items-center gap-1 border border-white/10">
                              <UserCheck size={12} style={{ color: currentTheme.primary }} />
                              <span>Amis</span>
                            </span>
                          ) : isRequested ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/20">
                                En attente
                              </span>
                              {(() => {
                                const outReq = pendingRequests.find(r => (r.user?.id || r.user?.uid) === uId && r.type === 'outgoing');
                                if (outReq) {
                                  return (
                                    <button
                                      onClick={() => cancelFriendRequest(outReq.id)}
                                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                                      title="Annuler la demande d'ami"
                                    >
                                      <X size={13} />
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            <button
                              onClick={() => sendFriendRequest(u)}
                              className="px-3.5 py-1.5 rounded-xl font-bold text-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                              style={{ backgroundColor: currentTheme.primary }}
                            >
                              <UserPlus size={13} />
                              <span>Ajouter</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div 
              className="p-6 rounded-3xl border border-white/10 shadow-xl space-y-4"
              style={{ backgroundColor: currentTheme.cardBg }}
            >
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <UserPlus size={18} style={{ color: currentTheme.primary }} />
                  <span>Demandes d'amis en attente</span>
                </h2>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                  {pendingRequests.length} en attente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pendingRequests.map((req) => (
                  <div 
                    key={req.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={req.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                        alt={req.user.full_name} 
                        className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{req.user.full_name}</h4>
                        <p className="text-[10px] text-gray-400 truncate">@{req.user.username}</p>
                      </div>
                    </div>

                    {req.type === 'incoming' ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => acceptFriendRequest(req.id)}
                          className="p-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 transition-all cursor-pointer"
                          title="Accepter la demande d'ami"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => declineFriendRequest(req.id)}
                          className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                          title="Refuser la demande d'ami"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          Demande envoyée
                        </span>
                        <button
                          onClick={() => cancelFriendRequest(req.id)}
                          className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all cursor-pointer flex items-center justify-center"
                          title="Annuler la demande d'ami"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Friends List */}
          <div 
            className="p-6 rounded-3xl border border-white/10 shadow-xl space-y-4"
            style={{ backgroundColor: currentTheme.cardBg }}
          >
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Users size={18} style={{ color: currentTheme.primary }} />
                <span>Mes Amis</span>
              </h2>
              <span className="text-[10px] font-mono text-gray-400 uppercase">
                {friends.length} membre{friends.length > 1 ? 's' : ''}
              </span>
            </div>

            {friends.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-xs text-gray-400">Vous n'avez pas encore d'amis ajoutés.</p>
                <p className="text-[11px] text-gray-500">Utilisez la barre de recherche ci-dessus pour découvrir la communauté !</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {friends.map((friend) => (
                  <div 
                    key={friend.id}
                    onClick={() => setSelectedFriendForModal(friend)}
                    className="flex flex-col p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-white/15 transition-all space-y-3 relative overflow-hidden cursor-pointer hover:bg-white/5"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {(() => {
                          const friendStatus = getEffectiveStatus(friend);
                          const isLive = friendStatus === 'online' || friendStatus === 'listening';
                          return (
                            <>
                              <div className="relative shrink-0">
                                <img 
                                  src={friend.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                                  alt={friend.full_name} 
                                  className="w-12 h-12 rounded-full object-cover border-2 border-white/10 shadow-md"
                                />
                                <span 
                                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black ${
                                    isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
                                  }`}
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-black text-white truncate">{friend.full_name || friend.username}</h4>
                                  <span 
                                    className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider text-black shrink-0"
                                    style={{ backgroundColor: currentTheme.primary }}
                                  >
                                    Ami
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate">@{friend.username}</p>
                                <p className={`text-[9px] font-mono mt-0.5 flex items-center gap-1 ${isLive ? 'text-emerald-400/90' : 'text-gray-500'}`}>
                                  <Activity size={10} />
                                  <span>{friendStatus === 'online' ? 'En ligne' : friendStatus === 'listening' ? 'En écoute' : 'Hors ligne'}</span>
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); removeFriend(friend.id); }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-colors cursor-pointer shrink-0"
                        title="Retirer cet ami"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Current Listening Status or Shared Music */}
                    {friend.current_track && (
                      <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-[10px] text-gray-300">
                        <span className="truncate flex items-center gap-1.5">
                          <Radio size={12} className="text-emerald-400 animate-pulse" />
                          <span className="truncate">Écoute : <strong>{friend.current_track}</strong></span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: FEED & REÇUS */}
      {activeTab === 'feed' && (() => {
        const currentUserId = user?.id || user?.uid;

        // Compute conversations listing with bidirectional activity
        const uniqueSenders = [];
        sharedTracks.forEach(share => {
          const otherUser = share.senderId === currentUserId ? share.receiver : share.sender;
          if (otherUser && otherUser.id !== currentUserId && !uniqueSenders.some(s => s.id === otherUser.id)) {
            uniqueSenders.push(otherUser);
          }
        });
        friends.forEach(friend => {
          if (friend.id !== currentUserId && !uniqueSenders.some(s => s.id === friend.id)) {
            uniqueSenders.push(friend);
          }
        });

        // 1. REQUÊTE COMPLÈTE ENVOYÉS + REÇUS :
        // Click on a friend -> load all shared tracks with them.
        // Click on "Tous les morceaux reçus" -> show global received tracks, sorted newest to oldest.
        let filteredShares = [];
        if (selectedFriendFilter) {
          filteredShares = sharedTracks
            .filter(s => 
              (s.senderId === currentUserId && s.receiverId === selectedFriendFilter) ||
              (s.senderId === selectedFriendFilter && s.receiverId === currentUserId)
            )
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Chronological flow
        } else {
          filteredShares = sharedTracks
            .filter(s => s.receiverId === currentUserId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest to oldest
        }

        const totalReceivedCount = sharedTracks.filter(s => s.receiverId === currentUserId).length;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Conversations Sidebar List */}
            <div 
              className="lg:col-span-1 p-6 rounded-3xl border border-white/10 shadow-xl space-y-4"
              style={{ backgroundColor: currentTheme.cardBg }}
            >
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={14} style={{ color: currentTheme.primary }} />
                  <span>Amis & Discussions</span>
                </h3>
              </div>

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                {/* 2. RESTRUCTURATION DE LA COLONNE DE GAUCHE : "Tous les morceaux reçus" */}
                <button
                  onClick={() => setSelectedFriendFilter(null)}
                  className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                    selectedFriendFilter === null
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-black/30 border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={selectedFriendFilter === null ? { borderColor: `${currentTheme.primary}40` } : {}}
                >
                  <span className="text-xs font-bold">Tous les morceaux reçus</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadReceivedTracksCount > 0 && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse border border-red-400/40">
                        {unreadReceivedTracksCount}
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-gray-300">
                      {totalReceivedCount}
                    </span>
                  </div>
                </button>

                {uniqueSenders.length === 0 ? (
                  <p className="text-[10px] text-gray-500 py-6 text-center">Aucun ami disponible</p>
                ) : (
                  uniqueSenders.map((f) => {
                    const receivedCount = sharedTracks.filter(s => s.senderId === f.id && s.receiverId === currentUserId).length;
                    const unreadForFriend = getUnreadCountForFriend(f.id);

                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setSelectedFriendFilter(f.id);
                          markConversationAsRead(f.id);
                        }}
                        className={`w-full p-3 rounded-2xl border transition-all flex items-center gap-3 text-left cursor-pointer ${
                          selectedFriendFilter === f.id
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-black/30 border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                        style={selectedFriendFilter === f.id ? { borderColor: `${currentTheme.primary}40` } : {}}
                      >
                        <div className="relative shrink-0">
                          <img 
                            src={f.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                            alt={f.full_name || f.username} 
                            className="w-8 h-8 rounded-full object-cover border border-white/10"
                          />
                          {(() => {
                            const isLive = getEffectiveStatus(f) === 'online' || getEffectiveStatus(f) === 'listening';
                            return (
                              <span 
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${
                                  isLive ? 'bg-emerald-500' : 'bg-gray-500'
                                }`}
                              />
                            );
                          })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold truncate text-white">{f.full_name || f.username}</h4>
                          <p className="text-[9px] text-gray-500 font-mono truncate">@{f.username}</p>
                        </div>
                        {unreadForFriend > 0 ? (
                          <span 
                            className="text-[9px] font-mono px-2 py-0.5 rounded-full font-black text-white bg-red-500 shrink-0 animate-pulse border border-red-400/40"
                          >
                            {unreadForFriend}
                          </span>
                        ) : receivedCount > 0 ? (
                          <span 
                            className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold text-gray-400 bg-white/5 shrink-0"
                          >
                            {receivedCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recommendations Feed Area */}
            <div 
              className="lg:col-span-2 p-6 rounded-3xl border border-white/10 shadow-xl space-y-5"
              style={{ backgroundColor: currentTheme.cardBg }}
            >
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Send size={18} style={{ color: currentTheme.primary }} />
                    <span>
                      {selectedFriendFilter 
                        ? `Partages avec ${uniqueSenders.find(u => u.id === selectedFriendFilter)?.full_name || 'mon ami'}` 
                        : "Morceaux reçus"
                      }
                    </span>
                  </h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {selectedFriendFilter 
                      ? "Historique complet des morceaux partagés entre vous." 
                      : "Historique de toutes les recommandations reçues de vos amis."
                    }
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {unreadReceivedTracksCount > 0 && (
                    <button
                      onClick={() => {
                        if (selectedFriendFilter) {
                          markConversationAsRead(selectedFriendFilter);
                        } else {
                          markAllReceivedAsRead();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10 transition-all cursor-pointer shadow-sm"
                    >
                      <Check size={12} className="text-emerald-400" />
                      <span>Tout marquer comme lu</span>
                    </button>
                  )}

                  {selectedFriendFilter && (
                    <button
                      onClick={() => {
                        const targetFriend = uniqueSenders.find(u => u.id === selectedFriendFilter);
                        if (targetFriend) setSelectedFriendForModal(targetFriend);
                      }}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-transform hover:scale-105 active:scale-95"
                      style={{ backgroundColor: currentTheme.primary, color: '#000000' }}
                    >
                      <Send size={11} />
                      <span>Envoyer un morceau</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3. ADAPTATION DE LA BULLE D'ÉTAT VIDE */}
              {filteredShares.length === 0 ? (() => {
                const friendObj = uniqueSenders.find(u => u.id === selectedFriendFilter);
                const pseudo = friendObj ? (friendObj.full_name || friendObj.username) : 'cet ami';
                return (
                  <div className="py-16 text-center space-y-2">
                    <MessageSquare size={36} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-xs text-gray-400 font-bold">
                      {selectedFriendFilter 
                        ? `Aucun morceau échangé avec ${pseudo} pour le moment.`
                        : "Aucun morceau reçu pour le moment."
                      }
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {selectedFriendFilter 
                        ? "Engagez l'échange en lui recommandant un super son !"
                        : "Vos amis pourront vous partager des pépites musicales d'ici peu."
                      }
                    </p>
                  </div>
                );
              })() : (
                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1 no-scrollbar">
                  {filteredShares.map((share) => {
                    const isSentByMe = share.senderId === currentUserId;
                    const isUnread = !isSentByMe && share.receiverId === currentUserId && !isShareRead(share.id);
                    const senderName = isSentByMe ? "Vous" : (share.sender.full_name || share.sender.username);
                    const senderAvatar = isSentByMe 
                      ? (profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100') 
                      : (share.sender.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100');

                    return (
                      <div 
                        key={share.id}
                        onClick={() => {
                          if (isUnread) markShareAsRead(share.id);
                        }}
                        className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
                          isUnread
                            ? 'border-red-500/40 bg-red-950/10 shadow-lg shadow-red-500/5'
                            : selectedFriendFilter 
                              ? isSentByMe 
                                ? 'ml-auto max-w-[85%] sm:max-w-[75%] bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500/30' 
                                : 'mr-auto max-w-[85%] sm:max-w-[75%] bg-black/40 border-white/10 hover:border-white/20'
                              : 'w-full bg-black/40 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Sender Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="relative cursor-pointer group"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFriendForModal(share.sender);
                              }}
                            >
                              <img 
                                src={senderAvatar} 
                                alt={senderName} 
                                className="w-7 h-7 rounded-full object-cover border border-white/20 group-hover:border-white/40 transition-all"
                              />
                              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye size={10} className="text-white" />
                              </div>
                            </div>
                            <span 
                              className="text-xs font-bold text-white cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFriendForModal(share.sender);
                              }}
                            >
                              {senderName}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {isSentByMe ? "avez recommandé :" : "a recommandé :"}
                            </span>

                            {/* Direction Badge */}
                            {selectedFriendFilter && (
                              <span 
                                className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                  isSentByMe 
                                    ? 'bg-indigo-500/20 text-indigo-300' 
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {isSentByMe ? "Envoyé" : "Reçu"}
                              </span>
                            )}

                            {/* Unread Pill */}
                            {isUnread && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse shadow-sm">
                                Nouveau
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markShareAsRead(share.id);
                                }}
                                title="Marquer comme lu"
                                className="text-[9px] font-mono text-gray-400 hover:text-emerald-400 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                <Check size={10} />
                                <span>Lu</span>
                              </button>
                            )}
                            <span className="text-[9px] font-mono text-gray-500">
                              {new Date(share.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Micro-message Bubble or Track Card */}
                        {share.isTextMessage || !share.track ? (
                          <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                            isSentByMe 
                              ? 'bg-gradient-to-r from-[#c29e5a] to-[#d6b068] text-black font-medium rounded-tr-none' 
                              : 'bg-white/10 text-white rounded-tl-none border border-white/10'
                          }`}>
                            {share.message}
                          </div>
                        ) : (
                          <>
                            {share.message && (
                              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-200 italic flex items-start gap-2">
                                <MessageSquare size={13} className="shrink-0 mt-0.5 text-amber-400" />
                                <span>"{share.message}"</span>
                              </div>
                            )}

                            {/* Track Card with Play Action */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-white/10 group">
                              <div className="flex items-center gap-3 min-w-0">
                                <img 
                                  src={share.track.thumbnail} 
                                  alt={share.track.title} 
                                  className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0"
                                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'; }}
                                />
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-white truncate">{share.track.title}</h4>
                                  <p className="text-[11px] text-gray-400 truncate">{share.track.artist}</p>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isUnread) markShareAsRead(share.id);
                                  play(share.track);
                                }}
                                className="px-3 py-2 rounded-xl font-bold text-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                                style={{ backgroundColor: currentTheme.primary }}
                              >
                                <Play size={14} fill="currentColor" />
                                <span>Écouter</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Chat Input Form when a friend is selected */}
              {selectedFriendFilter && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!chatInput.trim() || !selectedFriendFilter) return;
                    setSendingMessage(true);
                    try {
                      await sendMessageToFriend(selectedFriendFilter, chatInput);
                      setChatInput('');
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setSendingMessage(false);
                    }
                  }} 
                  className="flex items-center gap-2 pt-4 border-t border-white/10 mt-4"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Écrire un message texte..."
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !chatInput.trim()}
                    className="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-transform active:scale-95 shrink-0 shadow-md"
                    style={{ backgroundColor: currentTheme.primary, color: '#000' }}
                  >
                    <Send size={13} />
                    <span>Envoyer</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 4: PRIVACY & VISIBILITY SETTINGS */}
      {activeTab === 'privacy' && (
        <div className="space-y-8">
          
          <div 
            className="p-6 rounded-3xl border border-white/10 shadow-xl space-y-6"
            style={{ backgroundColor: currentTheme.cardBg }}
          >
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Shield size={18} style={{ color: currentTheme.primary }} />
                <span>Paramètres de confidentialité & Visibilité</span>
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Contrôlez précisément qui peut consulter vos coups de cœur, vos playlists et vos écoutes.
              </p>
            </div>

            <div className="space-y-5">
              
              {/* 1. Titres Likés */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart size={18} className="text-red-400 fill-red-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Titres likés</h4>
                      <p className="text-[10px] text-gray-400">Visibilité de vos morceaux mis en favoris</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                    {privacySettings.likedTracks === 'public' ? 'Public' : privacySettings.likedTracks === 'friends' ? 'Amis uniquement' : 'Privé'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'public', label: 'Public', icon: Globe },
                    { id: 'friends', label: 'Amis', icon: Users },
                    { id: 'private', label: 'Privé', icon: LockKeyhole }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => updatePrivacySettings('likedTracks', id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        privacySettings.likedTracks === id
                          ? 'bg-white/15 text-white border-white/30 shadow-sm'
                          : 'bg-black/40 text-gray-400 border-white/5 hover:text-white'
                      }`}
                      style={privacySettings.likedTracks === id ? { color: currentTheme.primary, borderColor: `${currentTheme.primary}40` } : {}}
                    >
                      <Icon size={13} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Playlists */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Disc size={18} style={{ color: currentTheme.primary }} />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Playlists créées</h4>
                      <p className="text-[10px] text-gray-400">Visibilité par défaut de vos playlists</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                    {privacySettings.playlists === 'public' ? 'Public' : privacySettings.playlists === 'friends' ? 'Amis uniquement' : 'Privé'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'public', label: 'Public', icon: Globe },
                    { id: 'friends', label: 'Amis', icon: Users },
                    { id: 'private', label: 'Privé', icon: LockKeyhole }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => updatePrivacySettings('playlists', id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        privacySettings.playlists === id
                          ? 'bg-white/15 text-white border-white/30 shadow-sm'
                          : 'bg-black/40 text-gray-400 border-white/5 hover:text-white'
                      }`}
                      style={privacySettings.playlists === id ? { color: currentTheme.primary, borderColor: `${currentTheme.primary}40` } : {}}
                    >
                      <Icon size={13} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Artistes les plus écoutés */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} style={{ color: currentTheme.primary }} />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Top Artistes</h4>
                      <p className="text-[10px] text-gray-400">Visibilité de vos statistiques d'écoute</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                    {privacySettings.topArtists === 'public' ? 'Public' : privacySettings.topArtists === 'friends' ? 'Amis uniquement' : 'Privé'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'public', label: 'Public', icon: Globe },
                    { id: 'friends', label: 'Amis', icon: Users },
                    { id: 'private', label: 'Privé', icon: LockKeyhole }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => updatePrivacySettings('topArtists', id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        privacySettings.topArtists === id
                          ? 'bg-white/15 text-white border-white/30 shadow-sm'
                          : 'bg-black/40 text-gray-400 border-white/5 hover:text-white'
                      }`}
                      style={privacySettings.topArtists === id ? { color: currentTheme.primary, borderColor: `${currentTheme.primary}40` } : {}}
                    >
                      <Icon size={13} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Avatar Selector Modal */}
      <ProfileModal 
        isOpen={isAvatarModalOpen} 
        onClose={() => setIsAvatarModalOpen(false)} 
      />

      {/* User Profile Modal */}
      <UserProfileModal 
        friend={selectedFriendForModal}
        isOpen={selectedFriendForModal !== null}
        onClose={() => setSelectedFriendForModal(null)}
      />

    </div>
  );
}
