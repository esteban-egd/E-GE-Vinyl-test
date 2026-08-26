/**
 * Utility to generate a deterministic, realistic duration (in seconds)
 * when no duration is provided by external APIs.
 * Returns a number between 140 seconds (2:20) and 285 seconds (4:45).
 */
export function getRealisticDuration(title = '', artist = '', id = '') {
  const seed = `${title}_${artist}_${id}`.toLowerCase().trim();
  if (!seed) return 215;

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const range = 145; // 285 - 140
  const duration = 140 + (Math.abs(hash) % range);
  return duration;
}

/**
 * Parses any duration input (seconds number, seconds string, "MM:SS", "HH:MM:SS", ISO 8601)
 * into seconds as an integer.
 */
export function parseDurationToSeconds(val, fallbackSeed = '') {
  if (val === null || val === undefined || val === '') {
    return getRealisticDuration(fallbackSeed);
  }

  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) {
      return getRealisticDuration(fallbackSeed);
    }
    return Math.round(val);
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return getRealisticDuration(fallbackSeed);

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(p => parseInt(p, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
      }
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }

    const isoMatch = trimmed.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
    if (isoMatch && (isoMatch[1] || isoMatch[2] || isoMatch[3])) {
      const h = parseInt(isoMatch[1] || 0, 10);
      const m = parseInt(isoMatch[2] || 0, 10);
      const s = parseInt(isoMatch[3] || 0, 10);
      return h * 3600 + m * 60 + s;
    }

    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }

  return getRealisticDuration(fallbackSeed);
}

/**
 * Formats duration into a clean "M:SS" or "H:MM:SS" string.
 */
export function formatDuration(val, fallbackSeed = '') {
  if (typeof val === 'string' && /^\d{1,2}:\d{2}$/.test(val.trim())) {
    // Standardize leading zeroes in minutes if needed, e.g. "03:45" -> "3:45"
    const parts = val.trim().split(':');
    return `${parseInt(parts[0], 10)}:${parts[1]}`;
  }

  const seconds = parseDurationToSeconds(val, fallbackSeed);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hours > 0) {
    const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hours}:${formattedMins}:${formattedSecs}`;
  }

  return `${mins}:${formattedSecs}`;
}

/**
 * Formats total duration for playlists/albums (e.g., "45 min", "1 h 12 min")
 */
export function formatTotalDuration(tracks = []) {
  if (!tracks || !tracks.length) return '0 min';
  const totalSecs = tracks.reduce((acc, t) => {
    const seed = `${t.title || ''}_${t.artist || ''}_${t.id || ''}`;
    return acc + parseDurationToSeconds(t.duration, seed);
  }, 0);

  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);

  if (hours > 0) {
    return `${hours} h ${mins} min`;
  }
  return `${mins} min`;
}
