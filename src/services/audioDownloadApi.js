import { getAudioStreamUrl } from './audioResolver';

/**
 * audioDownloadApi.js
 * Resolver audio unifié cross-platform (EXE Electron + APK Mobile).
 */
export async function fetchFullAudioBlob(title, artist, videoId = null, targetDuration = 0) {
  try {
    const directStreamUrl = await getAudioStreamUrl(title, artist, videoId, targetDuration);
    if (!directStreamUrl) return null;
    
    let mimeType = 'audio/webm'; // fallback
    if (directStreamUrl.includes('.mp4') || directStreamUrl.includes('m4a')) mimeType = 'audio/mp4';
    if (directStreamUrl.includes('mp3')) mimeType = 'audio/mpeg';

    // 1. Electron Desktop (Main Process bypasses CORS)
    if (typeof window !== 'undefined' && window.electron && window.electron.downloadAudioBuffer) {
      console.log('[AudioDownloadAPI] Using Electron IPC to bypass CORS...');
      const buffer = await window.electron.downloadAudioBuffer(directStreamUrl);
      const blob = new Blob([buffer], { type: mimeType });
      if (blob && blob.size > 100000) {
        return { blob, mimeType };
      }
    }

    // 2. Capacitor / Cordova Native HTTP (Mobile) or Web Fetch
    console.log('[AudioDownloadAPI] Using standard fetch...');
    
    // For Web or when Electron is not available
    let response;
    // Check if Capacitor is available
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
      try {
        const { CapacitorHttp } = await import('@capacitor/core');
        const capRes = await CapacitorHttp.request({
          method: 'GET',
          url: directStreamUrl,
          responseType: 'blob'
        });
        
        // CapacitorHttp returns the blob as base64 in data
        if (capRes.status >= 200 && capRes.status < 300) {
          const resData = capRes.data;
          
          let blob;
          if (resData instanceof Blob) {
            blob = resData;
          } else {
            // Helper to convert base64 to Blob
            const bstr = atob(resData);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            blob = new Blob([u8arr], { type: capRes.headers['Content-Type'] || mimeType });
          }
          
          if (blob && blob.size > 100000) {
             return { blob, mimeType: capRes.headers['Content-Type'] || mimeType };
          }
        }
      } catch (e) {
        console.warn('[AudioDownloadAPI] CapacitorHttp failed, falling back to fetch', e);
      }
    }

    response = await fetch(directStreamUrl, {
      mode: 'cors',
      signal: AbortSignal.timeout(15000)
    });
    
    if (response.ok) {
      const blob = await response.blob();
      if (blob && blob.size > 100000) {
        return {
          blob,
          mimeType: response.headers.get('content-type') || mimeType
        };
      }
    }
  } catch (err) {
    console.error('[AudioDownloadAPI] All full-track resolvers failed:', err);
  }

  // 3. Fallback to /api/download if running on the web with our backend
  try {
    const query = encodeURIComponent(`${title} ${artist}`);
    const idParam = videoId ? `&id=${encodeURIComponent(videoId)}` : '';
    const serverUrl = `/api/download?query=${query}${idParam}`;
    
    console.log(`[AudioDownloadAPI] Fallback to backend proxy: ${serverUrl}`);
    
    const response = await fetch(serverUrl, {
      mode: 'cors',
      signal: AbortSignal.timeout(15000)
    });
    
    if (response.ok) {
      const blob = await response.blob();
      if (blob && blob.size > 100000) {
        return {
          blob,
          mimeType: response.headers.get('content-type') || 'audio/mpeg'
        };
      }
    }
  } catch (err) {
    console.warn('[AudioDownloadAPI] Backend proxy also failed', err);
  }

  return null;
}
