import React, { useRef, useState } from 'react';

export default function AudioDebugTool() {
  const audioRef = useRef(new Audio());
  const [debugLog, setDebugLog] = useState('');

  const runDebug = async () => {
    const testUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    setDebugLog(`Tentative de lecture : ${testUrl}`);
    
    try {
      const audio = audioRef.current;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.src = testUrl;
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      
      await audio.play();
      setDebugLog('Lecture réussie !');
    } catch (err) {
      setDebugLog(`Erreur de lecture : ${err.message}`);
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 10, right: 10, background: '#1c1917', padding: '10px', border: '1px solid #d4af37', borderRadius: '8px', zIndex: 10000 }}>
      <button onClick={runDebug} style={{ color: '#d4af37', border: '1px solid #d4af37', padding: '5px 10px', borderRadius: '4px' }}>
        Test Audio
      </button>
      {debugLog && <p style={{ fontSize: '10px', color: '#fff', marginTop: '5px' }}>{debugLog}</p>}
    </div>
  );
}
