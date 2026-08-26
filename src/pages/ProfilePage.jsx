import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Camera, Heart, Disc, Clock, Sparkles, Play, Trash2, 
  LogOut, Save, ShieldCheck, Music, Users, Radio, Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLikes } from '../hooks/useLikes';
import { usePlaylists } from '../hooks/usePlaylists';
import { useAudio } from '../context/AudioContext';
import { PRESET_AVATARS } from '../constants/avatars';
import ProfileModal from '../components/profile/ProfileModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import db from '../lib/db';

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { currentTheme } = useTheme();
  const { likedTracks } = useLikes();
  const { playlists } = usePlaylists();
  const { play, currentTrack, isPlaying } = useAudio();
  const navigate = useNavigate();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [recentTracks, setRecentTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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

  // Load listening history and calculate top artists from Dexie DB
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      try {
        const history = await db.tracks.orderBy('addedAt').reverse().limit(15).toArray();
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

          // Fallback if low history
          if (sorted.length < 5) {
            const defaultArtists = [
              { name: 'Miles Davis', count: 18 },
              { name: 'Pink Floyd', count: 14 },
              { name: 'Daft Punk', count: 12 },
              { name: 'Chet Baker', count: 9 },
              { name: 'Fleetwood Mac', count: 7 }
            ];
            sorted = [...sorted, ...defaultArtists].filter(
              (v, i, a) => a.findIndex(t => t.name.toLowerCase() === v.name.toLowerCase()) === i
            ).slice(0, 5);
          }

          setTopArtists(sorted);
        }
      } catch (err) {
        console.warn("Erreur chargement historique profil:", err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }

    loadHistory();
    return () => { isMounted = false; };
  }, [likedTracks]);

  const avatarUrl = profile?.avatar_url || PRESET_AVATARS[0].url;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Membre Audiophile';
  const displayUsername = profile?.username ? `@${profile.username.replace('@', '')}` : '@audiophile';

  // Calculate approximate listening hours (each played track ~3.5 minutes)
  const totalPlays = recentTracks.length + likedTracks.length;
  const estimatedHours = Math.max(1.5, (totalPlays * 3.5 / 60)).toFixed(1);

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

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-6 flex flex-col gap-8 box-border">
      
      {/* 1. SPOTIFY STYLE IMMERSIVE HEADER */}
      <div 
        className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-300"
        style={{ backgroundColor: currentTheme.cardBg }}
      >
        {/* Ambient Gradient Background Banner */}
        <div 
          className="absolute inset-0 opacity-40 blur-3xl pointer-events-none"
          style={{ 
            background: `radial-gradient(circle at 20% 20%, ${currentTheme.primary}80 0%, transparent 70%)` 
          }}
        />
        
        <div className="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          
          {/* Giant Profile Photo (128x128px = w-32 h-32) with Glow & Hover Overlay */}
          <div className="relative group shrink-0">
            <div 
              className="w-32 h-32 rounded-full overflow-hidden border-4 shadow-2xl relative transition-transform duration-300 group-hover:scale-105"
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
              
              {/* Change Avatar Button Overlay on Hover */}
              <button
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                <Camera size={24} style={{ color: currentTheme.primary }} />
                <span>Modifier</span>
              </button>
            </div>

            {/* Quick Change Badge */}
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
              {user?.is_guest && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-gray-300 border border-white/10">
                  Mode Invité
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight truncate">
              {displayName}
            </h1>

            <p className="text-xs sm:text-sm font-semibold text-gray-400">
              {displayUsername}
            </p>

            {/* Dynamic Key Stats Pills */}
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs font-bold text-white shadow-sm">
                <Heart size={14} className="text-red-400 fill-red-400" />
                <span><strong style={{ color: currentTheme.primary }}>{likedTracks.length}</strong> Titres likés</span>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs font-bold text-white shadow-sm">
                <Disc size={14} style={{ color: currentTheme.primary }} />
                <span><strong style={{ color: currentTheme.primary }}>{playlists.length}</strong> Playlists</span>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs font-bold text-white shadow-sm">
                <Clock size={14} style={{ color: currentTheme.primary }} />
                <span><strong style={{ color: currentTheme.primary }}>{estimatedHours}h</strong> d'écoute</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setIsAvatarModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Edit3 size={14} style={{ color: currentTheme.primary }} />
            <span>Changer d'avatar</span>
          </button>
        </div>
      </div>

      {/* 2. SECTIONS DU PROFIL (STATISTIQUES ET PRÉFÉRENCES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Top Artists & Recent Activity (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <h4 className="text-xs font-bold text-white truncate w-full group-hover:underline" style={{ color: undefined }}>
                    {artist.name}
                  </h4>
                  <span className="text-[9px] font-mono text-gray-400 mt-0.5">
                    {artist.count} écoutes
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dernières Activités */}
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
                  const isCurrent = currentTrack?.videoId === track.videoId;
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

                      <button
                        onClick={() => play(track, recentTracks)}
                        className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer shrink-0"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Account Information & Settings (1 col) */}
        <div className="space-y-8">
          
          {/* Account Information Form */}
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

      {/* Avatar Selector Modal */}
      <ProfileModal 
        isOpen={isAvatarModalOpen} 
        onClose={() => setIsAvatarModalOpen(false)} 
      />

    </div>
  );
}
