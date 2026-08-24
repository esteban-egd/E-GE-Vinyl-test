export function getHdArtwork(url, fallbackVideoId = null) {
  if (!url) {
    if (fallbackVideoId) {
      return `https://i.ytimg.com/vi/${fallbackVideoId}/maxresdefault.jpg`;
    }
    return '';
  }

  // Si c'est iTunes, on force l'ultra HD
  if (url.includes('mzstatic.com')) {
    return url.replace(/\/[0-9]+x[0-9]+[a-zA-Z]*\./, '/1000x1000bb.');
  }

  // Si c'est YouTube
  if (url.includes('i.ytimg.com') || url.includes('ytimg.com')) {
    return url.replace('/hqdefault.jpg', '/maxresdefault.jpg').replace('/mqdefault.jpg', '/maxresdefault.jpg').replace('/default.jpg', '/maxresdefault.jpg');
  }

  return url;
}
