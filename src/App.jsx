import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AudioProvider } from './context/AudioContext';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import Header from './components/layout/Header';
import MiniPlayer from './components/player/MiniPlayer';
import YouTubeIframe from './components/player/YouTubeIframe';

// Page placeholders
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <AudioProvider>
      <Router>
        <div className="flex h-dvh w-full overflow-hidden bg-[#000000] text-white">
          {/* Lecteur Audio Direct Permanent */}
          <audio
            id="global-player"
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            className="hidden"
          />

          {/* Moteur YouTube Iframe Player Unique et Permanent */}
          <YouTubeIframe />

          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          <div className="flex flex-1 flex-col relative w-full h-full max-w-full">
            {/* Mobile Header */}
            <div className="md:hidden">
              <Header />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden safe-top safe-bottom pb-24 md:pb-0">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
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
      </Router>
    </AudioProvider>
  );
}

export default App;
