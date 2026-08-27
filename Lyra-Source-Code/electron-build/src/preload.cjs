"use strict";

// ../../StreamingCore-Client/src/adapters/electron-main/desktopPreload.ts
var import_electron = require("electron");
var exposeDesktopElectronAPI = () => {
  import_electron.contextBridge.exposeInMainWorld("electronAPI", {
    // Spotify WebView preload path
    getSpotifyWebviewPreloadPath: () => import_electron.ipcRenderer.invoke("getSpotifyWebviewPreloadPath"),
    // YouTube embed <webview> preload path. Its presence is also what
    // BloomEmbed's ElectronWebView uses to detect "we are on desktop".
    getEmbedWebviewPreloadPath: () => import_electron.ipcRenderer.invoke("getEmbedWebviewPreloadPath"),
    // Park the embed's bootstrap in the main process so the guest preload can
    // re-run it on every navigation, not just the first page.
    setEmbedWebviewBootstrap: (code) => import_electron.ipcRenderer.invoke("setEmbedWebviewBootstrap", code),
    // Window minimised / hidden. The embed guest cannot work this out for
    // itself — we deliberately make it believe it is always visible — so the
    // main process is the only honest source, and the embed needs the truth to
    // defend its playback (see BloomEmbed's electronWebviewPreload).
    onWindowHiddenChanged: (callback) => {
      import_electron.ipcRenderer.on("windowHiddenChanged", callback);
      return () => import_electron.ipcRenderer.removeListener("windowHiddenChanged", callback);
    },
    // Distribution
    getDistribution: () => import_electron.ipcRenderer.invoke("getDistribution"),
    getIsPackaged: () => import_electron.ipcRenderer.invoke("getIsPackaged"),
    getAppVersion: () => import_electron.ipcRenderer.invoke("getAppVersion"),
    // Deep linking
    onDeepLinkReceived: (callback) => {
      import_electron.ipcRenderer.on("onDeepLinkReceived", callback);
    },
    // Window controls
    closeWindow: () => import_electron.ipcRenderer.invoke("closeWindow"),
    minimizeWindow: () => import_electron.ipcRenderer.invoke("minimizeWindow"),
    maximizeWindow: () => import_electron.ipcRenderer.invoke("maximizeWindow"),
    unmaximizeWindow: () => import_electron.ipcRenderer.invoke("unmaximizeWindow"),
    focusWindow: () => import_electron.ipcRenderer.invoke("focusWindow"),
    setFullscreenWindow: (fullscreen) => import_electron.ipcRenderer.invoke("setFullscreenWindow", fullscreen),
    isWindowMaximized: () => import_electron.ipcRenderer.invoke("isWindowMaximized"),
    isWindowFullscreen: () => import_electron.ipcRenderer.invoke("isWindowFullscreen"),
    // Window events
    onWindowResize: (callback) => {
      import_electron.ipcRenderer.on("onWindowResize", callback);
    },
    onThemeChanged: (callback) => {
      import_electron.ipcRenderer.on("onThemeChanged", callback);
    },
    // File system operations
    writeFile: (filePath, content, encoding) => import_electron.ipcRenderer.invoke("writeFile", filePath, content, encoding),
    readFile: (filePath, options) => import_electron.ipcRenderer.invoke("readFile", filePath, options),
    fileExists: (filePath) => import_electron.ipcRenderer.invoke("fileExists", filePath),
    readDirectory: (dirPath, options) => import_electron.ipcRenderer.invoke("readDirectory", dirPath, options),
    readDirectoryWithStats: (dirPath) => import_electron.ipcRenderer.invoke("readDirectoryWithStats", dirPath),
    makeDirectory: (dirPath, options) => import_electron.ipcRenderer.invoke("makeDirectory", dirPath, options),
    unlinkFile: (filePath) => import_electron.ipcRenderer.invoke("unlinkFile", filePath),
    unlinkFiles: (filePaths) => import_electron.ipcRenderer.invoke("unlinkFiles", filePaths),
    unlinkDirectory: (dirPath) => import_electron.ipcRenderer.invoke("unlinkDirectory", dirPath),
    copyFile: (src, dest) => import_electron.ipcRenderer.invoke("copyFile", src, dest),
    renameFile: (oldPath, newPath) => import_electron.ipcRenderer.invoke("renameFile", oldPath, newPath),
    fileStat: (filePath) => import_electron.ipcRenderer.invoke("fileStat", filePath),
    // Downloads
    downloadFile: (url, filePath, headers) => import_electron.ipcRenderer.invoke("downloadFile", url, filePath, headers),
    downloadFileChunked: (opts) => import_electron.ipcRenderer.invoke("downloadFileChunked", opts),
    stopDownload: (filePath) => import_electron.ipcRenderer.invoke("stopDownload", filePath),
    readFileBase64: (filePath) => import_electron.ipcRenderer.invoke("readFileBase64", filePath),
    onDownloadProgress: (callback) => {
      import_electron.ipcRenderer.on("downloadProgress", callback);
    },
    // Cookies
    setCookie: (cookie) => import_electron.ipcRenderer.invoke("setCookie", cookie),
    removeCookie: (url, name) => import_electron.ipcRenderer.invoke("removeCookie", url, name),
    getCookies: (filter) => import_electron.ipcRenderer.invoke("getCookies", filter),
    // Inline YouTube sign-in (top-level WebContentsView overlay). Used by the
    // YouTube account screen on desktop, where Google blocks <webview> sign-in.
    ytLogin: {
      open: (bounds) => import_electron.ipcRenderer.invoke("ytLogin:open", bounds),
      setBounds: (bounds) => import_electron.ipcRenderer.invoke("ytLogin:setBounds", bounds),
      close: () => import_electron.ipcRenderer.invoke("ytLogin:close"),
      clearCookies: () => import_electron.ipcRenderer.invoke("ytLogin:clearCookies"),
      onResult: (callback) => {
        import_electron.ipcRenderer.on("ytLogin:result", callback);
        return () => {
          import_electron.ipcRenderer.removeListener("ytLogin:result", callback);
        };
      },
      onNavigate: (callback) => {
        import_electron.ipcRenderer.on("ytLogin:navigate", callback);
        return () => {
          import_electron.ipcRenderer.removeListener("ytLogin:navigate", callback);
        };
      }
    },
    // System info
    getLocale: () => import_electron.ipcRenderer.invoke("getLocale"),
    getPath: (type) => import_electron.ipcRenderer.invoke("getPath", type),
    getMachineId: () => import_electron.ipcRenderer.invoke("getMachineId"),
    getShouldUseDarkColors: () => import_electron.ipcRenderer.invoke("getShouldUseDarkColors"),
    getProcessBrief: () => import_electron.ipcRenderer.invoke("getProcessBrief"),
    // Media metadata
    getMusicMetadata: (filePath) => import_electron.ipcRenderer.invoke("getMusicMetadata", filePath),
    // Zoom
    setZoomLevel: (level) => import_electron.ipcRenderer.invoke("setZoomLevel", level),
    getZoomLevel: () => import_electron.ipcRenderer.invoke("getZoomLevel"),
    // Media controls
    setControls: (options) => import_electron.ipcRenderer.invoke("setControls", options),
    dismissControls: () => import_electron.ipcRenderer.invoke("dismissControls"),
    onCommand: (callback) => {
      import_electron.ipcRenderer.on("onCommand", callback);
    },
    // OS hardware media keys (F7/F8/F9, BT headset buttons) bounced from the
    // main process via globalShortcut → 'mediaKey' channel. Returns the
    // unsubscribe to remove the listener; the subscribed channel mirrors
    // mediaKeys.ts:bindMediaKeyShortcuts so the event names stay in sync.
    onMediaKey: (callback) => {
      import_electron.ipcRenderer.on("mediaKey", callback);
      return () => {
        import_electron.ipcRenderer.removeListener("mediaKey", callback);
      };
    },
    // Desktop menus
    setApplicationMenu: (template) => import_electron.ipcRenderer.invoke("setApplicationMenu", template),
    onMenuAction: (callback) => {
      import_electron.ipcRenderer.on("onMenuAction", callback);
    },
    setWindowTitle: (title) => import_electron.ipcRenderer.invoke("setWindowTitle", title),
    // Dock menu (macOS)
    setDockMenu: (template) => import_electron.ipcRenderer.invoke("setDockMenu", template),
    // System tray
    createTray: (options) => import_electron.ipcRenderer.invoke("createTray", options),
    updateTray: (options) => import_electron.ipcRenderer.invoke("updateTray", options),
    destroyTray: () => import_electron.ipcRenderer.invoke("destroyTray"),
    // Thumbnail toolbar (Windows)
    setThumbarButtons: (buttons) => import_electron.ipcRenderer.invoke("setThumbarButtons", buttons),
    clearThumbarButtons: () => import_electron.ipcRenderer.invoke("clearThumbarButtons"),
    // Power save
    togglePowerSaveBlocker: (enable) => import_electron.ipcRenderer.invoke("togglePowerSaveBlocker", enable),
    // External links
    openLink: (url) => import_electron.ipcRenderer.invoke("openLink", url),
    openAuthWindow: (args) => import_electron.ipcRenderer.invoke("openAuthWindow", args),
    showOpenDialog: (options) => import_electron.ipcRenderer.invoke("showOpenDialog", options),
    // Auto-update
    checkForUpdates: () => import_electron.ipcRenderer.invoke("checkForUpdates"),
    downloadAutoUpdate: () => import_electron.ipcRenderer.invoke("downloadAutoUpdate"),
    installAutoUpdate: () => import_electron.ipcRenderer.invoke("installAutoUpdate"),
    onUpdateAvailable: (callback) => {
      import_electron.ipcRenderer.on("updateAvailable", callback);
    },
    onUpdateDownloaded: (callback) => {
      import_electron.ipcRenderer.on("updateDownloaded", callback);
    },
    onUpdateError: (callback) => {
      import_electron.ipcRenderer.on("updateError", callback);
    },
    onUpdateProgress: (callback) => {
      import_electron.ipcRenderer.on("updateProgress", callback);
    },
    // App controls
    reloadApp: () => import_electron.ipcRenderer.invoke("reloadApp"),
    quitApp: () => import_electron.ipcRenderer.invoke("quitApp"),
    setAppIcon: (iconPath) => import_electron.ipcRenderer.invoke("setAppIcon", iconPath),
    resetAppIcon: () => import_electron.ipcRenderer.invoke("resetAppIcon"),
    // FCM push (desktop). Main process speaks Google MCS via @aracna/fcm; the
    // renderer drives the lifecycle and registers the token with the server.
    fcm: {
      register: (config) => import_electron.ipcRenderer.invoke("fcm:register", config),
      connect: () => import_electron.ipcRenderer.invoke("fcm:connect"),
      disconnect: () => import_electron.ipcRenderer.invoke("fcm:disconnect"),
      getToken: () => import_electron.ipcRenderer.invoke("fcm:get-token"),
      isRegistered: () => import_electron.ipcRenderer.invoke("fcm:is-registered"),
      setBackgroundMode: (enabled) => import_electron.ipcRenderer.invoke("fcm:set-background-mode", enabled),
      showConfirmation: (n) => import_electron.ipcRenderer.invoke("fcm:show-confirmation", n),
      onMessageData: (callback) => {
        import_electron.ipcRenderer.on("fcm:message-data", callback);
        return () => {
          import_electron.ipcRenderer.removeListener("fcm:message-data", callback);
        };
      }
    },
    // ==========================================
    // Native Services Bridge
    // ==========================================
    services: {
      // SQL Storage
      sql: {
        open: (database) => import_electron.ipcRenderer.invoke("service:sql:open", database),
        execute: (request) => import_electron.ipcRenderer.invoke("service:sql:execute", request),
        close: (database) => import_electron.ipcRenderer.invoke("service:sql:close", database)
      },
      // Key-Value Storage
      kv: {
        create: (storage) => import_electron.ipcRenderer.invoke("service:kv:create", storage),
        set: (request) => import_electron.ipcRenderer.invoke("service:kv:set", request),
        get: (request) => import_electron.ipcRenderer.invoke("service:kv:get", request),
        delete: (storage, key) => import_electron.ipcRenderer.invoke("service:kv:delete", { storage, key }),
        deleteStorage: (storage) => import_electron.ipcRenderer.invoke("service:kv:deleteStorage", storage)
      },
      // NoSQL Storage
      nosql: {
        createCollection: (database, collection) => import_electron.ipcRenderer.invoke("service:nosql:createCollection", { database, collection }),
        set: (database, collection, id, record) => import_electron.ipcRenderer.invoke("service:nosql:set", { database, collection, id, record }),
        bulkSet: (database, collection, records) => import_electron.ipcRenderer.invoke("service:nosql:bulkSet", { database, collection, records }),
        getById: (database, collection, id) => import_electron.ipcRenderer.invoke("service:nosql:getById", { database, collection, id }),
        getByIds: (database, collection, ids) => import_electron.ipcRenderer.invoke("service:nosql:getByIds", { database, collection, ids }),
        remove: (database, collection, id) => import_electron.ipcRenderer.invoke("service:nosql:remove", { database, collection, id }),
        bulkRemove: (database, collection, ids, filters) => import_electron.ipcRenderer.invoke("service:nosql:bulkRemove", { database, collection, ids, filters }),
        clear: (database, collection) => import_electron.ipcRenderer.invoke("service:nosql:clear", { database, collection }),
        query: (request) => import_electron.ipcRenderer.invoke("service:nosql:query", request),
        count: (database, collection, filters) => import_electron.ipcRenderer.invoke("service:nosql:count", { database, collection, filters })
      },
      // Crypto
      crypto: {
        hash: (data, algorithm) => import_electron.ipcRenderer.invoke("service:crypto:hash", { data, algorithm }),
        xxhash: (data, algorithm) => import_electron.ipcRenderer.invoke("service:crypto:xxhash", { data, algorithm }),
        randomBytes: (size) => import_electron.ipcRenderer.invoke("service:crypto:randomBytes", size),
        decryptAES256: (data, keyString, ivString) => import_electron.ipcRenderer.invoke("service:crypto:decryptAES256", { data, keyString, ivString })
      },
      // Discord Rich Presence
      discord: {
        setPresence: (data) => import_electron.ipcRenderer.invoke("service:discord:setPresence", data),
        clearPresence: () => import_electron.ipcRenderer.invoke("service:discord:clearPresence"),
        destroy: () => import_electron.ipcRenderer.invoke("service:discord:destroy")
      },
      // File System
      fs: {
        writeFile: (request) => import_electron.ipcRenderer.invoke("service:fs:writeFile", request),
        appendFile: (request) => import_electron.ipcRenderer.invoke("service:fs:appendFile", request),
        readFile: (request) => import_electron.ipcRenderer.invoke("service:fs:readFile", request),
        fileExists: (path) => import_electron.ipcRenderer.invoke("service:fs:fileExists", path),
        readDir: (path) => import_electron.ipcRenderer.invoke("service:fs:readDir", path),
        makeDir: (path) => import_electron.ipcRenderer.invoke("service:fs:makeDir", path),
        unlinkFile: (path) => import_electron.ipcRenderer.invoke("service:fs:unlinkFile", path),
        unlinkFiles: (paths) => import_electron.ipcRenderer.invoke("service:fs:unlinkFiles", paths),
        copyFile: (request) => import_electron.ipcRenderer.invoke("service:fs:copyFile", request),
        fileStat: (path) => import_electron.ipcRenderer.invoke("service:fs:fileStat", path),
        getMediaTags: (path) => import_electron.ipcRenderer.invoke("service:fs:getMediaTags", path),
        encodeBase64: (data) => import_electron.ipcRenderer.invoke("service:fs:encodeBase64", data),
        decodeBase64: (data) => import_electron.ipcRenderer.invoke("service:fs:decodeBase64", data),
        downloadFile: (request) => import_electron.ipcRenderer.invoke("service:fs:downloadFile", request),
        stopDownload: (request) => import_electron.ipcRenderer.invoke("service:fs:stopDownload", request),
        onDownloadBegin: (callback) => {
          const listener = (_e, data) => callback(data);
          import_electron.ipcRenderer.on("service:fs:downloadBegin", listener);
          return () => import_electron.ipcRenderer.removeListener("service:fs:downloadBegin", listener);
        },
        onDownloadProgress: (callback) => {
          const listener = (_e, data) => callback(data);
          import_electron.ipcRenderer.on("service:fs:downloadProgress", listener);
          return () => import_electron.ipcRenderer.removeListener("service:fs:downloadProgress", listener);
        }
      },
      // Chunked downloader: HTTP Range-based, bypasses per-connection throttles.
      chunked: {
        download: (request) => import_electron.ipcRenderer.invoke("service:chunked:download", request),
        stopDownload: (request) => import_electron.ipcRenderer.invoke("service:chunked:stopDownload", request),
        onDownloadProgress: (callback) => {
          const listener = (_e, data) => callback(data);
          import_electron.ipcRenderer.on("service:chunked:downloadProgress", listener);
          return () => import_electron.ipcRenderer.removeListener("service:chunked:downloadProgress", listener);
        }
      },
      // File picker — native OS dialog via main (electron-main filePicker adapter).
      // The renderer adapter (electron-renderer/filePicker) requires this bridge
      // and throws if it's missing, breaking avatar / artwork / import pickers.
      filePicker: {
        pickImage: (opts) => import_electron.ipcRenderer.invoke("service:filePicker:pickImage", opts),
        pickMediaFiles: () => import_electron.ipcRenderer.invoke("service:filePicker:pickMediaFiles"),
        pickFile: (opts) => import_electron.ipcRenderer.invoke("service:filePicker:pickFile", opts)
      },
      // Image color extraction — nativeImage in main (electron-main images adapter).
      // Without this bridge getColorPalette resolves null and album-art tinting
      // silently never works on desktop.
      images: {
        getColorPalette: (imageUrl) => import_electron.ipcRenderer.invoke("service:images:getColorPalette", imageUrl)
      },
      // Auto-update — maps to the top-level channels the desktop main process
      // registers via bindDesktopWindowEvents (checkForUpdates / downloadAutoUpdate
      // / installAutoUpdate + updateAvailable/Downloaded/Error/Progress events).
      // The renderer adapter (electron-renderer/updates) reads services.updates;
      // without it the update banner never appears and Reload no-ops.
      updates: {
        check: () => import_electron.ipcRenderer.invoke("checkForUpdates"),
        download: () => import_electron.ipcRenderer.invoke("downloadAutoUpdate"),
        install: () => import_electron.ipcRenderer.invoke("installAutoUpdate"),
        onAvailable: (callback) => {
          import_electron.ipcRenderer.on("updateAvailable", callback);
        },
        onDownloaded: (callback) => {
          import_electron.ipcRenderer.on("updateDownloaded", callback);
        },
        onError: (callback) => {
          import_electron.ipcRenderer.on("updateError", callback);
        },
        onProgress: (callback) => {
          import_electron.ipcRenderer.on("updateProgress", callback);
        }
      }
    }
  });
};

// src/preload.ts
exposeDesktopElectronAPI();
