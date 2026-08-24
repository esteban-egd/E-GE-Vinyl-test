"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Side-effect import of core's shared Spotify <webview> preload. The bridge
 * between the main-world fetch interceptor and `ipcRenderer.sendToHost`
 * lives in `core/src/adapters/electron-renderer/spotifyWebviewPreload`.
 */
require("core/src/adapters/electron-renderer/spotifyWebviewPreload");
