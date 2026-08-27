"use strict";

// ../../StreamingCore-Client/src/adapters/electron-renderer/spotifyWebviewPreload.js
var { ipcRenderer } = require("electron");
(function() {
  if (window.__spotifyPreloadInitialized)
    return;
  window.__spotifyPreloadInitialized = true;
  document.addEventListener("__spotify_to_app", (e) => {
    if (!e.detail)
      return;
    try {
      ipcRenderer.sendToHost("spotify-message", e.detail);
    } catch (_err) {
    }
  });
})();
