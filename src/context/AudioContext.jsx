import { createContext, useContext } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

const AudioCtx = createContext(null);

export function AudioProvider({ children }) {
  const player = useAudioPlayer();

  return (
    <AudioCtx.Provider value={player}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioCtx);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
