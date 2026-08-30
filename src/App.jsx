import { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AudioProvider, useAudio } from './context/AudioContext';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { LikesProvider } from './context/LikesContext';
import { MessageProvider } from './context/MessageContext';
import { SocialProvider } from './context/SocialContext';
import ShareTrackModal from './components/social/ShareTrackModal';

import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import Header from './components/layout/Header';
import MiniPlayer from './components/player/MiniPlayer';
import YouTubeIframe from './components/player/YouTubeIframe';

import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ArtistPage from './pages/ArtistPage';
import LibraryPage from './pages/LibraryPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import VinylPlayer from './components/player/VinylPlayer';
import LandingPage from './pages/LandingPage';
import PresentationPage from './pages/PresentationPage';
import NotFoundPage from './pages/NotFoundPage';
import OfflineNotice from './components/common/OfflineNotice';
import OfflineSyncBar from './components/common/OfflineSyncBar';
import ContextBanner from './components/common/ContextBanner';
import MessageLogic from './components/common/MessageLogic';
import { MOCK_VINYLS } from './data/mockVinyls';

function AppContent() {
  const { user, loading, signInAsGuest } = useAuth();
  const { currentTrack, setQueueAndPlay, play, resetPlayer } = useAudio();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginOnWeb, setShowLoginOnWeb] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prevUserRef = useRef(user);
  const prevUserIdRef = useRef(user?.id || (user?.is_guest ? 'guest' : null));

  // Reset audio playback whenever user switches account or logs in/out
  useEffect(() => {
    const currentUserId = user?.id || (user?.is_guest ? 'guest' : null);
    const prevUserId = prevUserIdRef.current;
    if (prevUserId !== undefined && prevUserId !== currentUserId) {
      console.log('[App] User session changed from', prevUserId, 'to', currentUserId, '- Resetting player');
      resetPlayer();
    }
    prevUserIdRef.current = currentUserId;
  }, [user, resetPlayer]);

  useEffect(() => {
    if (user) {
      setShowLoginOnWeb(false);
      if (!prevUserRef.current) {
        navigate('/');
      }
    }
    prevUserRef.current = user;
  }, [user, navigate]);

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handler for entering guest mode with mock vinyls preload
  const handleEnterGuestMode = () => {
    signInAsGuest();
    toast.success("Bienvenue ! Mode Invité & Démo activé.", {
      icon: '✨',
      duration: 4000
    });
    // If no track is playing yet, pre-load mock vinyls queue so the turntable is ready to spin immediately
    if (!currentTrack && MOCK_VINYLS && MOCK_VINYLS.length > 0) {
      setTimeout(() => {
        setQueueAndPlay(MOCK_VINYLS, 0);
      }, 200);
    }
  };

  // Auto-detection of Native Platform Target (Electron / Capacitor)
  const isNativeApp = import.meta.env.VITE_IS_APP === 'true' || 
                      !!window.ipcRenderer || 
                      !!window.Capacitor || 
                      !!window.android || 
                      (window.process && window.process.versions && !!window.process.versions.electron);

  if (loading) return <div className="h-dvh flex items-center justify-center bg-[#0d0c0b] text-[#e6dfd5]">Chargement...</div>;
  if (!user) {
    if (isNativeApp || showLoginOnWeb) {
      return (
        <>
          <OfflineNotice />
          <LandingPage 
            onLoginSuccess={() => {
              setShowLoginOnWeb(false);
              navigate('/');
            }}
            onBackToPresentation={!isNativeApp ? () => setShowLoginOnWeb(false) : null} 
          />
        </>
      );
    } else {
      return (
        <>
          <OfflineNotice />
          <PresentationPage 
            onEnterWebPlayer={() => setShowLoginOnWeb(true)} 
            onOpenLogin={() => setShowLoginOnWeb(true)} 
            onEnterAsGuest={handleEnterGuestMode} 
          />
        </>
      );
    }
  }

  const hasActiveTrack = !!currentTrack && location.pathname !== '/player';
  const paddingBottomClass = hasActiveTrack 
    ? "pb-44 md:pb-24" 
    : "pb-24 md:pb-6";

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--color-canvas)] text-[var(--color-charcoal)] font-sans flex-col">
      <MessageLogic />
      <ContextBanner />
      <OfflineNotice />
      <OfflineSyncBar />
      <div className="flex flex-1 w-full overflow-hidden relative">
        {/* Lecteur Audio Direct Permanent */}
        <audio
          id="global-player"
          playsInline
          webkit-playsinline="true"
          preload="auto"
          className="hidden"
        />

        {/* Moteur YouTube Iframe Player Unique et Permanent */}
        <YouTubeIframe />

        {/* Sidebar (Desktop Fixed & Mobile Drawer) */}
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        {/* Main Content Area - with desktop left offset for 260px fixed sidebar */}
        <div className="flex flex-1 flex-col relative w-full h-full max-w-full md:pl-[260px]">
          {/* Global Header */}
          <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

          {/* Main Content Area with Dynamic Padding Bottom */}
          <main className={`flex-1 overflow-y-auto overflow-x-hidden safe-top safe-bottom ${paddingBottomClass}`}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/player" element={<VinylPlayer />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/artist/:artistName" element={<ArtistPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/accueil" element={<Navigate to="/" replace />} />
              <Route path="/acceuil" element={<Navigate to="/" replace />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {/* Mini Player */}
          <div className="absolute bottom-0 left-0 right-0 z-40 md:left-[260px] transition-all duration-300 transform translate-y-[calc(-100%-var(--safe-bottom))] md:translate-y-0">
            <MiniPlayer />
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="md:hidden z-50">
            <BottomNav />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppProvidersWithAuth({ children }) {
  return (
    <AudioProvider>
      <SearchProvider>
        <SocialProvider>
          <OfflineProvider>
            <LikesProvider>
              <MessageProvider>
                {children}
              </MessageProvider>
            </LikesProvider>
          </OfflineProvider>
        </SocialProvider>
      </SearchProvider>
    </AudioProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppProvidersWithAuth>
          <Toaster position="top-center" toastOptions={{
            style: {
              background: '#1c1815',
              color: '#e6dfd5',
              borderRadius: '12px',
              border: '1px solid #302116',
            }
          }} />
          <ShareTrackModal />
          <Router>
            <AppContent />
          </Router>
        </AppProvidersWithAuth>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
