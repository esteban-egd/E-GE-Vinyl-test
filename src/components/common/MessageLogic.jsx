import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { useLikes } from '../../context/LikesContext';
import { useMessage } from '../../context/MessageContext';

export default function MessageLogic() {
  const { user, profile, loading: authLoading } = useAuth();
  const { currentTrack, isPlaying } = useAudio();
  const { isLiked } = useLikes();
  const { showMessage } = useMessage();

  const prevUserRef = useRef(null);
  const prevTrackRef = useRef(null);
  const lastMessageTimeRef = useRef(0);
  const recentArtistsRef = useRef([]);

  const playMessageTimeoutRef = useRef(null);

  // 1. A LA CONNEXION / DEMARRAGE
  useEffect(() => {
    if (authLoading) return; // Attente du chargement de l'état authentifié
    const isGuest = user ? !!user.is_guest : false;
    
    // Attendre que le profil soit chargé pour les vrais utilisateurs
    if (user && !isGuest && !profile) return;

    // Detect login or initial load if user is present
    if (user && user.id !== prevUserRef.current?.id) {
      
      // Détection stricte de l'identité
      const rawDisplayName = profile?.full_name?.trim() || user?.user_metadata?.full_name?.trim() || user?.displayName?.trim() || user?.name?.trim();
      const rawUsername = profile?.username?.trim() || user?.user_metadata?.username?.trim() || user?.username?.trim();
      const userTitle = rawDisplayName || rawUsername || "Mélomane";

      const userName = (!isGuest && user) ? userTitle : "Invité";
      
      if (isGuest) {
        // Slight delay for smoother UX on startup - 2s as requested
        setTimeout(() => {
          showMessage(`Bienvenue en Mode Démo ! Explorez nos mixes et notre catalogue.`, '👋', 6000);
        }, 2000);
      } else {
        const hour = new Date().getHours();
        let greeting = 'Bonjour';
        if (hour >= 18 || hour < 4) greeting = 'Bonsoir';

        // 2s delay as requested
        setTimeout(() => {
          showMessage(`${greeting} ${userName} ! Ravi de te revoir sur E-GE VINYL 🎵`, '✨', 5000);
        }, 2000);
      }
    }
    prevUserRef.current = user;
  }, [user, profile, authLoading, showMessage]);

  // 2. LORS DU LANCEMENT D'UN MORCEAU
  useEffect(() => {
    if (!currentTrack || !isPlaying) return;
    
    // Only trigger on track change
    if (currentTrack.id === prevTrackRef.current?.id) return;

    const now = Date.now();
    // Anti-spam: wait at least 15s between track messages, except first track
    const isSpam = (now - lastMessageTimeRef.current) < 15000;
    
    if (!isSpam || !prevTrackRef.current) {
      const trackTitle = currentTrack.title || 'Ce titre';
      const artistName = currentTrack.artist || 'cet artiste';
      
      const isGuest = !!user?.is_guest;
      
      const rawDisplayName = profile?.full_name?.trim() || user?.user_metadata?.full_name?.trim() || user?.displayName?.trim() || user?.name?.trim();
      const rawUsername = profile?.username?.trim() || user?.user_metadata?.username?.trim() || user?.username?.trim();
      const userTitle = rawDisplayName || rawUsername || "Mélomane";
      
      const userName = (!isGuest && user) ? userTitle : "Invité";
      
      const namePrefix = (!isGuest && userName && userName !== 'Invité') ? ` ${userName}` : '';

      let message = '';
      let icon = '🎶';

      if (isLiked(currentTrack)) {
        message = `Ah, '${trackTitle}' ! Je vois que c'est l'un de tes titres préférés 🎧`;
        icon = '❤️';
      } else if (recentArtistsRef.current.includes(artistName) && prevTrackRef.current?.artist !== artistName) {
        message = `De retour sur du ${artistName} ? Excellent choix !`;
        icon = '🔥';
      } else {
        message = `Bonne découverte${namePrefix} ! Tu écoutes '${trackTitle}' par ${artistName}.`;
        icon = '✨';
      }

      // Update recent artists limit to last 5 unique
      recentArtistsRef.current = [artistName, ...recentArtistsRef.current.filter(a => a !== artistName)].slice(0, 5);
      
      if (playMessageTimeoutRef.current) {
        clearTimeout(playMessageTimeoutRef.current);
      }
      
      // Show message slightly after playback starts
      playMessageTimeoutRef.current = setTimeout(() => {
        showMessage(message, icon, 5000);
        lastMessageTimeRef.current = Date.now();
      }, 800);
    }

    prevTrackRef.current = currentTrack;
  }, [currentTrack, isPlaying, isLiked, user, profile, showMessage]);

  return null;
}
