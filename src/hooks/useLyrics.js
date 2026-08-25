import { useState, useEffect, useMemo } from 'react';
import { getMainArtistName } from '../services/musicDataService';

// Nettoyage intelligent du titre pour la recherche de paroles
function cleanTrackTitle(title) {
  if (!title) return '';
  return title
    .replace(/\s*[({\[].*?[)}\]]/g, '') // Enlève (Official Video), (feat. ...), [HD]
    .replace(/\b(official video|official music video|music video|official audio|audio|video|clip|clip officiel|lyric video|official lyric video|mv|m\/v|remastered|remaster)\b/gi, '')
    .replace(/\s+(ft\.?|feat\.?|featuring|with|x|&|vs\.?).*/i, '') // Enlève featuring dans le titre
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Détection automatique si le titre est instrumental
function checkIsInstrumental(title, artist, album) {
  const text = `${title || ''} ${artist || ''} ${album || ''}`.toLowerCase();
  return /\b(instrumental|instru|backing track|karaoke|sans paroles|no lyrics)\b/i.test(text);
}

// Fonction d'analyse de format LRC standard ([mm:ss.xx] Parole) avec support multi-horodatages
function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  
  for (const line of lines) {
    if (!line.trim() || line.startsWith('[ar:') || line.startsWith('[ti:') || line.startsWith('[al:') || line.startsWith('[by:') || line.startsWith('[offset:')) {
      continue;
    }

    const matches = [...line.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const rawMs = match[3] || '0';
          const ms = parseInt(rawMs.padEnd(3, '0').slice(0, 3), 10);
          const time = minutes * 60 + seconds + ms / 1000;
          parsed.push({ time, text });
        }
      }
    }
  }
  return parsed.sort((a, b) => a.time - b.time);
}

function generateFallbackLyrics(title, artist, trackDuration) {
  const d = trackDuration || 200;
  const cleanTitle = title || 'Morceau';
  const cleanArtist = artist || 'Artiste';
  return [
    { time: 0, text: `♪ [Intro Musicale • ${cleanArtist}] ♪` },
    { time: Math.min(12, d * 0.06), text: `${cleanTitle}` },
    { time: Math.min(25, d * 0.12), text: `Écoute de ${cleanTitle} en haute qualité` },
    { time: Math.min(42, d * 0.22), text: `♪ [Couplet & Mélodie Principale] ♪` },
    { time: Math.min(65, d * 0.35), text: `♪ [Refrain & Harmonies] ♪` },
    { time: Math.min(95, d * 0.50), text: `♪ [Solo & Arrangement Vokal] ♪` },
    { time: Math.min(130, d * 0.70), text: `♪ [Deuxième Refrain] ♪` },
    { time: Math.min(160, d * 0.85), text: `♪ [Outro & Final] ♪` }
  ];
}

// Générateur de jalons temporels pour les paroles non synchronisées
function parsePlain(plainText, trackDuration) {
  if (!plainText) return [];
  const lines = plainText.split('\n').map(l => l.trim()).filter(Boolean);
  const duration = trackDuration || 180;
  const startOffset = Math.min(12, duration * 0.1);
  const playableDuration = Math.max(30, duration * 0.85 - startOffset);
  const step = playableDuration / Math.max(1, lines.length);
  return lines.map((text, idx) => ({
    time: startOffset + idx * step,
    text
  }));
}

export function useLyrics(currentTrack, currentTime, duration) {
  const [lyricsData, setLyricsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRealSynced, setIsRealSynced] = useState(false);
  const [isInstrumental, setIsInstrumental] = useState(false);

  useEffect(() => {
    if (!currentTrack) {
      setLyricsData([]);
      setIsRealSynced(false);
      setIsInstrumental(false);
      return;
    }

    let active = true;
    const fetchLyrics = async () => {
      setLoading(true);
      setLyricsData([]);
      setIsRealSynced(false);
      setIsInstrumental(false);

      const rawArtist = currentTrack.artist || '';
      const rawTitle = currentTrack.title || '';
      const album = currentTrack.album || '';

      // Check si le titre est marqué instrumental
      if (checkIsInstrumental(rawTitle, rawArtist, album)) {
        if (active) {
          setIsInstrumental(true);
          setLoading(false);
        }
        return;
      }

      const mainArtist = getMainArtistName(rawArtist);
      const cleanTitle = cleanTrackTitle(rawTitle);

      let foundSynced = null;
      let foundPlain = null;
      let foundInstrumental = false;

      // Helper pour inspecter une réponse LRCLIB
      const processLrcData = (data) => {
        if (!data) return false;
        if (data.instrumental === true) {
          foundInstrumental = true;
          return true;
        }
        if (data.syncedLyrics) {
          foundSynced = data.syncedLyrics;
          return true;
        }
        if (data.plainLyrics) {
          foundPlain = data.plainLyrics;
          return true;
        }
        return false;
      };

      // 1. Essai direct LRCLIB avec artiste & titre nettoyés
      try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(mainArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const data = await res.json();
          processLrcData(data);
        }
      } catch (_) {}

      // 2. Essai direct avec titre & artiste d'origine
      if (!foundSynced && !foundPlain && !foundInstrumental && active) {
        try {
          const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(rawArtist)}&track_name=${encodeURIComponent(rawTitle)}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const data = await res.json();
            processLrcData(data);
          }
        } catch (_) {}
      }

      // 3. Essai par Recherche LRCLIB (recherche filtrée)
      if (!foundSynced && !foundPlain && !foundInstrumental && active) {
        try {
          const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(mainArtist)}`;
          const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(3500) });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (Array.isArray(searchData) && searchData.length > 0) {
              const bestMatch = searchData.find(item => item.syncedLyrics || item.instrumental) || searchData[0];
              processLrcData(bestMatch);
            }
          }
        } catch (_) {}
      }

      // 4. Essai par Recherche générale (q=Title Artist)
      if (!foundSynced && !foundPlain && !foundInstrumental && active) {
        try {
          const qUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle + ' ' + mainArtist)}`;
          const qRes = await fetch(qUrl, { signal: AbortSignal.timeout(3500) });
          if (qRes.ok) {
            const qData = await qRes.json();
            if (Array.isArray(qData) && qData.length > 0) {
              const bestMatch = qData.find(item => item.syncedLyrics || item.instrumental) || qData[0];
              processLrcData(bestMatch);
            }
          }
        } catch (_) {}
      }

      if (!active) return;

      if (foundInstrumental) {
        setIsInstrumental(true);
        setLoading(false);
        return;
      }

      if (foundSynced) {
        const parsed = parseLrc(foundSynced);
        if (parsed.length > 0) {
          setLyricsData(parsed);
          setIsRealSynced(true);
          setLoading(false);
          return;
        }
      }

      if (foundPlain) {
        setLyricsData(parsePlain(foundPlain, duration));
        setIsRealSynced(false);
        setLoading(false);
        return;
      }

      // Fallback si aucune parole trouvée en ligne : générer des jalons musicaux élégants
      setLyricsData(generateFallbackLyrics(rawTitle, mainArtist, duration));
      setIsRealSynced(false);
      setLoading(false);
    };

    fetchLyrics();

    return () => {
      active = false;
    };
  }, [currentTrack]);

  // Détection de l'index de la ligne active
  const activeIndex = useMemo(() => {
    if (lyricsData.length === 0) return -1;
    
    let activeIdx = -1;
    const timeOffset = isRealSynced ? 0.3 : 0;
    
    for (let i = 0; i < lyricsData.length; i++) {
      if ((currentTime + timeOffset) >= lyricsData[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return Math.max(0, activeIdx);
  }, [lyricsData, currentTime, isRealSynced]);

  const currentLineText = useMemo(() => {
    if (activeIndex === -1 || lyricsData.length === 0) return '';
    return lyricsData[activeIndex]?.text || '';
  }, [lyricsData, activeIndex]);

  const previewLines = useMemo(() => {
    if (lyricsData.length === 0) return [];
    if (lyricsData.length <= 3) return lyricsData.map(l => l.text);
    
    // Always return 3 lines: current line + 2 next lines (or end-buffered 3 lines)
    const maxStart = Math.max(0, lyricsData.length - 3);
    const start = Math.min(Math.max(0, activeIndex), maxStart);
    return lyricsData.slice(start, start + 3).map(l => l.text);
  }, [lyricsData, activeIndex]);

  return {
    lyricsData,
    loading,
    isRealSynced,
    isInstrumental,
    activeIndex,
    currentLineText,
    previewLines
  };
}
