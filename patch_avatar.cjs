const fs = require('fs');
let code = fs.readFileSync('src/components/common/ArtistAvatar.jsx', 'utf8');

// Replace handleError and currentSrc logic
const newCode = `import { useState, useEffect } from 'react';
import { fetchTheAudioDbArtistVisuals, isValidArtwork } from '../../services/musicDataService';

// Extract initials for the placeholder
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Generate a deterministic gradient color based on the name
function getGradient(name) {
  let hash = 0;
  const str = name || 'Artiste';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    ['#3a1c71', '#d76d77', '#ffaf7b'],
    ['#4ca1af', '#c4e0e5', '#c4e0e5'],
    ['#ff9966', '#ff5e62', '#ff5e62'],
    ['#00c6ff', '#0072ff', '#0072ff'],
    ['#11998e', '#38ef7d', '#38ef7d'],
    ['#fc4a1a', '#f7b733', '#f7b733'],
    ['#8E2DE2', '#4A00E0', '#4A00E0']
  ];
  const idx = Math.abs(hash) % colors.length;
  const c = colors[idx];
  return \`linear-gradient(135deg, \${c[0]}, \${c[1]})\`;
}

export default function ArtistAvatar({ artistName, fallbackSrc, className = '' }) {
  const [src, setSrc] = useState(null);
  const [hasErrored, setHasErrored] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!artistName) return;
    
    // Reset state when artist changes (Prevents showing previous artist's image)
    setHasErrored(false);
    setIsLoading(true);
    const initialSrc = isValidArtwork(fallbackSrc) ? fallbackSrc : null;
    setSrc(initialSrc);

    const cleanName = artistName.trim().toLowerCase();
    const cacheKey = \`artist_avatar_v21_\${cleanName}\`;
    const cached = localStorage.getItem(cacheKey);

    if (cached && isValidArtwork(cached)) {
      setSrc(cached);
      setIsLoading(false);
      return;
    }

    if (initialSrc) {
      setSrc(initialSrc);
    }

    fetchTheAudioDbArtistVisuals(artistName)
      .then(visuals => {
        if (active) {
          if (visuals && isValidArtwork(visuals.avatar)) {
            setSrc(visuals.avatar);
            try {
              localStorage.setItem(cacheKey, visuals.avatar);
            } catch (_) {}
          } else {
            setSrc(initialSrc); // Enforce fallback if no visuals found
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setSrc(initialSrc);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [artistName, fallbackSrc]);

  const handleError = () => {
    if (!hasErrored) setHasErrored(true);
  };

  const finalSrc = isValidArtwork(src) ? src : null;
  const showPlaceholder = !finalSrc || hasErrored;

  if (showPlaceholder) {
    return (
      <div 
        className={\`flex items-center justify-center font-bold text-white shadow-inner \${className}\`}
        style={{ 
          background: getGradient(artistName),
          fontSize: 'clamp(1rem, 30%, 3rem)' 
        }}
      >
        <span className="opacity-80 tracking-widest">{getInitials(artistName)}</span>
      </div>
    );
  }

  return (
    <img 
      src={finalSrc} 
      alt={artistName || 'Artiste'} 
      className={className} 
      onError={handleError}
      referrerPolicy="no-referrer"
    />
  );
}
`;

fs.writeFileSync('src/components/common/ArtistAvatar.jsx', newCode);
console.log("Patched ArtistAvatar");
