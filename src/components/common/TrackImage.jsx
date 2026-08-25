import { useState, useEffect } from 'react';

/**
 * Image de secours haute définition générique pour la musique
 */
export const DEFAULT_MUSIC_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80';

/**
 * Hook ou helper pour obtenir une cascade de URLs pour les miniatures YouTube
 * hqdefault.jpg -> mqdefault.jpg -> default.jpg -> fallback par défaut
 */
export function getThumbnailFallbackChain(originalSrc, fallback = DEFAULT_MUSIC_COVER) {
  if (!originalSrc || typeof originalSrc !== 'string') return [fallback];

  // Si c'est une image YouTube i.ytimg.com ou ytimg.com
  if (originalSrc.includes('i.ytimg.com') || originalSrc.includes('ytimg.com')) {
    const isHq = originalSrc.includes('hqdefault.jpg');
    const isMq = originalSrc.includes('mqdefault.jpg');
    const isMaxRes = originalSrc.includes('maxresdefault.jpg');

    if (isMaxRes) {
      return [
        originalSrc,
        originalSrc.replace('maxresdefault.jpg', 'hqdefault.jpg'),
        originalSrc.replace('maxresdefault.jpg', 'mqdefault.jpg'),
        originalSrc.replace('maxresdefault.jpg', 'default.jpg'),
        fallback
      ];
    }

    if (isHq) {
      return [
        originalSrc,
        originalSrc.replace('hqdefault.jpg', 'mqdefault.jpg'),
        originalSrc.replace('hqdefault.jpg', 'default.jpg'),
        fallback
      ];
    }

    if (isMq) {
      return [
        originalSrc,
        originalSrc.replace('mqdefault.jpg', 'default.jpg'),
        fallback
      ];
    }
  }

  return [originalSrc, fallback];
}

/**
 * Composant TrackImage sécurisé avec fallback automatique en cascade :
 * 1. Teste la source originale (ex: hqdefault.jpg)
 * 2. En cas d'erreur 404 (onError), bascule vers mqdefault.jpg
 * 3. En cas d'erreur, bascule vers default.jpg
 * 4. Enfin, bascule sur une image de secours élégante
 */
export default function TrackImage({
  src,
  alt = 'Pochette',
  className = 'w-full h-full object-cover',
  fallbackSrc = DEFAULT_MUSIC_COVER,
  loading = 'lazy',
  ...props
}) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const [attemptIndex, setAttemptIndex] = useState(0);

  const fallbackChain = getThumbnailFallbackChain(src, fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setAttemptIndex(0);
  }, [src, fallbackSrc]);

  const handleError = () => {
    const nextIndex = attemptIndex + 1;
    if (nextIndex < fallbackChain.length) {
      setAttemptIndex(nextIndex);
      setCurrentSrc(fallbackChain[nextIndex]);
    } else {
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading={loading}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}
