import { useState, useEffect } from 'react';
import { fetchTheAudioDbArtistVisuals, isValidArtwork } from '../../services/musicDataService';

export default function ArtistAvatar({ artistName, fallbackSrc, className = '' }) {
  const validInitial = isValidArtwork(fallbackSrc) ? fallbackSrc : null;
  const [src, setSrc] = useState(validInitial);
  const [hasErrored, setHasErrored] = useState(false);

  useEffect(() => {
    let active = true;
    if (!artistName) return;

    setHasErrored(false);

    const cleanName = artistName.trim().toLowerCase();
    const cacheKey = `artist_avatar_v20_${cleanName}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached && isValidArtwork(cached)) {
      setSrc(cached);
      return;
    }

    if (isValidArtwork(fallbackSrc)) {
      setSrc(fallbackSrc);
    }

    fetchTheAudioDbArtistVisuals(artistName)
      .then(visuals => {
        if (active && visuals && isValidArtwork(visuals.avatar)) {
          setSrc(visuals.avatar);
          try {
            localStorage.setItem(cacheKey, visuals.avatar);
          } catch (_) {}
        } else if (active && isValidArtwork(fallbackSrc)) {
          setSrc(fallbackSrc);
        }
      })
      .catch(() => {
        if (active && isValidArtwork(fallbackSrc)) {
          setSrc(fallbackSrc);
        }
      });

    return () => {
      active = false;
    };
  }, [artistName, fallbackSrc]);

  const handleError = () => {
    if (hasErrored) return;
    setHasErrored(true);

    // Collection de secours d'ambiance scénique et musiciens professionnels
    const fallbackAvatars = [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80'
    ];

    let hash = 0;
    const name = artistName || 'Music';
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % fallbackAvatars.length;
    setSrc(fallbackAvatars[idx]);
  };

  const currentSrc = isValidArtwork(src) ? src : (
    isValidArtwork(fallbackSrc) ? fallbackSrc : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'
  );

  return (
    <img 
      src={currentSrc} 
      alt={artistName || 'Artiste'} 
      className={className} 
      onError={handleError}
      referrerPolicy="no-referrer"
    />
  );
}
