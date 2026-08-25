import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AudioProvider, useAudio } from './context/AudioContext';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { LikesProvider } from './context/LikesContext';
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
import VinylPlayer from './components/player/VinylPlayer';
import LandingPage from './pages/LandingPage';
import OfflineNotice from './components/common/OfflineNotice';
import OfflineSyncBar from './components/common/OfflineSyncBar';

function AppContent() {
  const { user, loading } = useAuth();
  const { currentTrack } = useAudio();
  const location = useLocation();

  if (loading) return <div className="h-dvh flex items-center justify-center bg-[#0d0c0b] text-[#e6dfd5]">Chargement...</div>;
  if (!user) return (
    <>
      <OfflineNotice />
      <LandingPage />
    </>
  );

  const hasActiveTrack = !!currentTrack && location.pathname !== '/player';
  const paddingBottomClass = hasActiveTrack 
    ? "pb-44 md:pb-24" 
    : "pb-24 md:pb-6";

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--color-canvas)] text-[var(--color-charcoal)] font-sans flex-col">
      <OfflineNotice />
      <OfflineSyncBar />
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Lecteur Audio Direct Permanent */}
        <audio
          id="global-player"
          playsInline
          preload="auto"
          className="hidden"
        />

        {/* Moteur YouTube Iframe Player Unique et Permanent */}
        <YouTubeIframe />

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <div className="flex flex-1 flex-col relative w-full h-full max-w-full">
          {/* Global Header */}
          <Header />

          {/* Main Content Area with Dynamic Padding Bottom */}
          <main className={`flex-1 overflow-y-auto overflow-x-hidden safe-top safe-bottom ${paddingBottomClass}`}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/player" element={<VinylPlayer />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/artist/:artistName" element={<ArtistPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>

          {/* Mini Player */}
          <div className="absolute bottom-0 w-full z-40 md:bottom-0 transition-all duration-300 transform translate-y-[calc(-100%-var(--safe-bottom))] md:translate-y-0">
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

function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <SearchProvider>
          <AuthProvider>
            <OfflineProvider>
              <LikesProvider>
                <Toaster position="top-center" toastOptions={{
                  style: {
                    background: '#1c1815',
                    color: '#e6dfd5',
                    borderRadius: '12px',
                    border: '1px solid #302116',
                  }
                }} />
                <Router>
                  <AppContent />
                </Router>
              </LikesProvider>
            </OfflineProvider>
          </AuthProvider>
        </SearchProvider>
      </AudioProvider>
    </ThemeProvider>
  );
}

export default App;
