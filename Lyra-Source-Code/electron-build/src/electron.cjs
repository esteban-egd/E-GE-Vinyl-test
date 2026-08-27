"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMainWindow = void 0;
const electron_1 = require("electron");
const electron_window_state_1 = __importDefault(require("electron-window-state"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const backgroundMode_1 = require("./backgroundMode");
globalThis.__DEV__ = electron_is_dev_1.default;
(() => {
    const userData = electron_1.app.getPath('userData');
    const oldDir = path_1.default.join(userData, 'databases');
    const newDir = path_1.default.join(userData, 'sql-data');
    if (!fs_1.default.existsSync(oldDir))
        return;
    try {
        const files = fs_1.default.readdirSync(oldDir).filter(f => f.endsWith('.db'));
        if (files.length === 0)
            return;
        fs_1.default.mkdirSync(newDir, { recursive: true });
        for (const file of files) {
            const src = path_1.default.join(oldDir, file);
            const dest = path_1.default.join(newDir, file);
            const srcSize = fs_1.default.statSync(src).size;
            const destSize = fs_1.default.existsSync(dest) ? fs_1.default.statSync(dest).size : 0;
            // Replace destination if source has more data
            if (srcSize > destSize) {
                fs_1.default.copyFileSync(src, dest);
            }
            fs_1.default.unlinkSync(src);
        }
    }
    catch { /* migration is best-effort */ }
})();
const events_1 = require("./events");
const electron_main_1 = require("core/src/adapters/electron-main");
const electron_main_2 = require("core/src/adapters/electron-main");
const electron_main_3 = require("core/src/adapters/electron-main");
const electron_unhandled_1 = __importDefault(require("electron-unhandled"));
const electron_context_menu_1 = __importDefault(require("electron-context-menu"));
// Opt into Chromium's MediaSessionService + HardwareMediaKeyHandling so OS
// media keys reach navigator.mediaSession in the renderer AND register Lyra
// with macOS MPNowPlayingInfoCenter. Must run before app.whenReady().
(0, electron_main_2.enableMediaKeyFeatures)();
let win;
let isQuitting = false;
let pendingDeepLink = null;
let platform = 'linux';
if (process?.platform === 'win32')
    platform = 'windows';
else if (process?.platform === 'darwin')
    platform = 'macOS';
// Windows taskbar pinning: the running process must advertise the SAME
// AppUserModelID as the shortcut electron-builder writes (its `appId`,
// com.musicapp.lyra). Without this, Windows treats the live window as a
// distinct app, so "Pin to taskbar" pins a shortcut that never re-associates
// with the running window. Must run before any window is created.
if (process.platform === 'win32') {
    try {
        electron_1.app.setAppUserModelId('com.musicapp.lyra');
    }
    catch { /* non-fatal */ }
}
// Linux taskbar/dock pinning: the running window's WM_CLASS (X11) / app_id
// (Wayland) MUST equal the .desktop file's basename ("lyra-desktop.desktop" →
// "lyra-desktop") for the WM to bind the live window to its launcher icon.
// Electron derives WM_CLASS from various places and it did NOT match our
// StartupWMClass, so right-click → "Pin to taskbar" pinned a dead shortcut.
// Force the class explicitly via Chromium's --class flag (sets X11 WM_CLASS
// and the Wayland app_id), and keep package.json's StartupWMClass = "lyra-desktop"
// in sync. Must be set before app 'ready'.
if (process.platform === 'linux') {
    electron_1.app.commandLine.appendSwitch('class', 'lyra-desktop');
}
// Keep hardware acceleration ON: the UI relies on GPU compositing for
// backdrop-filter / blur / mix-blend effects. Under software compositing
// (HW accel off) Chromium on Windows renders those as solid BLACK, so
// navigating to screens with blurred headers/backdrops turns the window
// black. Allow an explicit opt-out only for the rare GPU drivers that
// misbehave with acceleration enabled.
if (process.env.LYRA_DISABLE_HW_ACCEL === '1') {
    electron_1.app.disableHardwareAcceleration();
}
// A music player must keep playing while it is minimised or covered.
// Chromium backgrounds the renderer of a window it thinks nobody is looking
// at, and the audio does not "pause" — it freezes: the media element still
// reports playing while currentTime stops advancing, and it only resumes when
// the window comes back to the front. `backgroundThrottling: false` on the
// window is not enough on its own, the process-level switches are what turn
// the behaviour off (occluded windows included — on macOS a minimised window
// counts as occluded).
electron_1.app.commandLine.appendSwitch('disable-renderer-backgrounding');
electron_1.app.commandLine.appendSwitch('disable-background-timer-throttling');
electron_1.app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// And the media pipeline itself: with the window minimised Chromium
// suspends it outright — measured, the <video> drops to readyState 0 with
// duration null and playback only resumes when the window comes back.
// The page believing it is visible does not prevent this; only turning the
// feature off does.
electron_1.app.commandLine.appendSwitch('disable-background-media-suspend');
electron_1.app.commandLine.appendSwitch('disable-features', 'MediaSuspend,BackgroundVideoTrackOptimization,BackgroundVideoPauseOptimization,MacWebContentsOcclusion');
// The one that actually decides it: a backgrounded video WITH audio is
// paused unless this is on (Chromium's ShouldPausePlaybackWhenHidden).
electron_1.app.commandLine.appendSwitch('enable-features', 'ResumeBackgroundVideo');
// Windows post-OS-update black-screen mitigation (ClickUp 86ca2g7kg).
// After a Windows update, Chromium's GPU process can keep the angle/D3D
// device alive at boot (so the app loads) but then hand back EMPTY (black)
// compositor frames once the renderer swaps content during in-app
// navigation. We deliberately keep hardware acceleration ON (the UI's
// backdrop-filter/blur effects render as solid black under software
// compositing — see the block above), so the fix must NOT disable the GPU.
//
// Instead we harden the GPU path so a freshly-updated driver doesn't get
// pushed onto a stale Chromium workaround list, which is the usual trigger
// for the black-frame-on-repaint regression:
//   - disable-gpu-driver-bug-workarounds: stop Chromium applying cached,
//     pre-update driver quirks that no longer match the new driver and
//     leave the compositor surface blank after a content swap.
// This is paired with an explicit per-navigation repaint below
// (see createWindow → forceRepaint) so any frame that still comes back
// black is immediately re-requested from the compositor.
if (process.platform === 'win32') {
    electron_1.app.commandLine.appendSwitch('disable-gpu-driver-bug-workarounds');
}
// Register custom protocol for serving build files in production
// (must be called before app is ready)
if (!electron_is_dev_1.default) {
    electron_1.protocol.registerSchemesAsPrivileged([{
            scheme: 'app',
            privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
        }]);
}
if (!electron_is_dev_1.default) {
    (0, electron_unhandled_1.default)({ logger: () => { }, showDialog: false });
}
// Deep link protocol
const PROTOCOL = 'lyramusic';
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        electron_1.app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path_1.default.resolve(process.argv[1])]);
    }
}
else {
    electron_1.app.setAsDefaultProtocolClient(PROTOCOL);
}
const gotTheLock = electron_1.app.requestSingleInstanceLock();
// Bind IPC events
(0, events_1.bindEvents)();
// Context menu
(0, electron_context_menu_1.default)({
    showCopyImage: false,
    showSaveImage: false,
    showInspectElement: electron_is_dev_1.default,
    showServices: true
});
// Auto-play policy
electron_1.app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Resolve the renderer preload across dev and packaged builds. The naive
// `path.join(app.getAppPath(), 'electron-build', 'src', 'preload.js')` is WRONG
// in dev: Electron is launched as `electron electron-build/electron-main.js`, so
// app.getAppPath() is the MAIN SCRIPT's dir (`desktop/electron-build`), and the
// join double-counts `electron-build` → ENOENT. When the preload fails to load,
// `window.electronAPI` is never exposed, detectPlatform() falls back to 'web',
// and the desktop renderer silently renders the web layout + blocks external
// imports (WEB_CONTENT_UNAVAILABLE). In packaged builds app.getAppPath() is the
// asar root, where the join IS correct — which is why only dev was affected.
// `__dirname` is the bundled main's dir (`electron-build/`) in BOTH modes, so it
// is the stable anchor; we still probe candidates so any layout change is safe.
function resolvePreloadPath() {
    const candidates = [
        path_1.default.join(__dirname, 'src', 'preload.js'), // bundled main → electron-build/
        path_1.default.join(__dirname, 'preload.js'), // unbundled electron.js → electron-build/src/
        path_1.default.join(electron_1.app.getAppPath(), 'electron-build', 'src', 'preload.js') // packaged asar fallback
    ];
    const found = candidates.find(p => fs_1.default.existsSync(p));
    if (!found) {
        console.error('[electron] preload.js not found in any candidate:', candidates);
        return candidates[candidates.length - 1];
    }
    return found;
}
function createWindow() {
    const mainWindowState = (0, electron_window_state_1.default)({
        defaultWidth: 1200,
        defaultHeight: 800
    });
    win = new electron_1.BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        // The renderer always uses the desktop layout in Electron (header bar +
        // library/player sidebars). Those sidebars are fixed-width, so below ~900px
        // the centre content gets crushed. Keep the window wide enough that the
        // three-pane layout stays usable (the renderer also clamps panel widths as
        // a safety net). minHeight stays 600 for vertical-monitor / half-snap use.
        minWidth: 900,
        height: mainWindowState.height,
        minHeight: 600,
        autoHideMenuBar: true,
        backgroundColor: '#121116',
        darkTheme: true,
        frame: platform === 'linux',
        titleBarStyle: platform === 'linux' ? 'default' : (platform === 'windows' ? 'hidden' : 'hiddenInset'),
        ...(platform === 'windows' ? {
            titleBarOverlay: {
                color: '#121116',
                symbolColor: '#ffffff',
                height: 36
            }
        } : {}),
        trafficLightPosition: { x: 16, y: 16 },
        title: 'Lyra Music',
        webPreferences: {
            webSecurity: false,
            devTools: true,
            // See resolvePreloadPath(): app.getAppPath() is NOT stable across launch
            // modes, so we probe the real candidates and use the first that exists.
            preload: resolvePreloadPath(),
            spellcheck: true,
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            // This is a music player: a minimised window must keep running its
            // timers (progress, the embed engine's watchdogs), not be throttled to
            // once a minute like a background tab.
            backgroundThrottling: false
        }
    });
    (0, events_1.bindWindowEvents)(win);
    // The embed <webview> is where the audio actually comes from, and a guest
    // does not inherit the window's backgroundThrottling:false — it has to be
    // told directly, once it attaches.
    win.webContents.on('did-attach-webview', (_event, guest) => {
        try {
            guest.setBackgroundThrottling(false);
        }
        catch { /* older Electron */ }
    });
    // Strip YouTube's ad round trips from the embed — scoped to requests coming
    // from a youtube.com page, so nothing else the app loads is filtered
    // (see core's embedAdBlocker).
    // Guarded: this is a nicety, and nothing optional may be allowed to throw
    // here — an exception in createWindow leaves the window built but never
    // loaded, which the user sees as a black app with no error anywhere
    // (electron-unhandled swallows it in production).
    try {
        (0, electron_main_1.installEmbedAdBlocker)();
    }
    catch { /* ads stay, the app opens */ }
    // Tell the renderer (and through it the embed guest) when the window stops
    // being on screen. The guest is made to believe it is always visible so
    // YouTube won't stop the music, which means it can no longer tell for
    // itself — this is the honest signal it defends playback with.
    const sendWindowHidden = (hidden) => {
        try {
            win?.webContents.send('windowHiddenChanged', hidden);
        }
        catch { /* window gone */ }
    };
    win.on('minimize', () => sendWindowHidden(true));
    win.on('restore', () => sendWindowHidden(false));
    win.on('hide', () => sendWindowHidden(true));
    win.on('show', () => sendWindowHidden(false));
    bindYoutubeLoginIpc();
    win.on('closed', destroyYtLoginView);
    // Windows post-OS-update black-screen mitigation (ClickUp 86ca2g7kg).
    // The reported symptom is: app loads fine, but navigating between
    // sections turns the window black. That matches a GPU compositor that
    // returns an empty surface after the renderer repaints. webContents
    // .invalidate() forces Chromium to discard the current (black) frame and
    // request a fresh paint from the GPU process — the standard recovery for
    // this class of regression that does NOT require turning off hardware
    // acceleration (which would break the UI's blur/backdrop effects).
    //
    // We only do this on Windows (the only platform with the reported
    // regression) and only on the window-level moments where users actually
    // hit it: regaining focus, restoring/showing the window, and finishing a
    // load. invalidate() is cheap (one extra paint) and idempotent, so the
    // worst case on healthy machines is a single redundant repaint.
    if (process.platform === 'win32') {
        const forceRepaint = () => {
            if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.invalidate();
            }
        };
        win.on('focus', forceRepaint);
        win.on('restore', forceRepaint);
        win.on('show', forceRepaint);
        win.webContents.on('did-finish-load', forceRepaint);
    }
    // External links (Share to WhatsApp/X, OAuth pop-outs, etc.) must open in the
    // system browser, never in a child Electron window. The parent runs with
    // webSecurity:false and a frameless title bar, so an in-app popup would load
    // untrusted remote content with no chrome and no way back to Lyra.
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:/i.test(url))
            void electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    // Load the app
    
    win.webContents.openDevTools();
    if (electron_is_dev_1.default) {
        const startUrl = 'http://localhost:3000';
        const ses = win.webContents.session;
        Promise.all([
            ses.clearCache(),
            ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] }),
        ])
            .catch(() => { })
            .finally(() => { win?.loadURL(startUrl); });
    } else {
        const path = require('path');
        const indexPath = path.join(electron_1.app.getAppPath(), 'dist', 'index.html');
        win.loadFile(indexPath).catch(err => console.error('Erreur chargement index.html:', err));
    }
  
    // Send any pending deep link once the page is loaded
    win.webContents.on('did-finish-load', () => {
        if (pendingDeepLink && win) {
            win.webContents.send('onDeepLinkReceived', pendingDeepLink);
            pendingDeepLink = null;
        }
    });
    // Track window state
    mainWindowState.manage(win);
    // On macOS: hide instead of destroy so ipcMain handlers stay registered
    // and the window can be re-shown from the dock without a blank reload issue.
    // When background-receive mode is on (FCM push enabled), do the same on every
    // platform so closing the window keeps the process — and the MCS socket —
    // alive. Allow close when actually quitting (e.g. tray → Quit).
    win.on('close', (event) => {
        if ((process.platform === 'darwin' || (0, backgroundMode_1.isBackgroundModeEnabled)()) && !isQuitting) {
            event.preventDefault();
            win?.hide();
        }
    });
    win.on('closed', () => {
        win = undefined;
    });
}
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    // Cold-start deep link on Windows/Linux: the lyramusic:// URL arrives in
    // process.argv, not via 'open-url' (macOS only) nor 'second-instance' (only
    // fires for an already-running instance). Capture it here so the
    // did-finish-load drain forwards it once the renderer is ready.
    if (process.platform !== 'darwin') {
        const initialUrl = process.argv.find(arg => arg?.startsWith(`${PROTOCOL}://`));
        if (initialUrl)
            pendingDeepLink = initialUrl;
    }
    electron_1.app.on('second-instance', (_event, argv) => {
        if (win && !win.isDestroyed()) {
            if (win.isMinimized())
                win.restore();
            // Re-launching is how the user reopens after close-to-tray hid the window.
            if (!win.isVisible())
                win.show();
            win.focus();
        }
        const url = argv?.find(param => param?.startsWith(`${PROTOCOL}://`));
        if (url) {
            if (win && !win.isDestroyed()) {
                win.webContents.send('onDeepLinkReceived', url);
            }
            else {
                pendingDeepLink = url;
            }
        }
    });
    electron_1.app.on('open-url', (event, url) => {
        event.preventDefault();
        if (url && win && !win.isDestroyed()) {
            win.webContents.send('onDeepLinkReceived', url);
        }
        else if (url) {
            pendingDeepLink = url;
        }
    });
    electron_1.app.whenReady().then(() => {
        // Register protocol handler to serve build files in production
        if (!electron_is_dev_1.default) {
            // app.getAppPath() === the asar root in packaged builds; the renderer is
            // packed at app.asar/build. (Was __dirname/../../build, which only held
            // when this file ran unbundled from electron-build/src/.)
            const buildPath = path_1.default.join(electron_1.app.getAppPath(), 'build');
            electron_1.protocol.handle('app', async (request) => {
                const url = new URL(request.url);
                const filePath = path_1.default.normalize(path_1.default.join(buildPath, decodeURIComponent(url.pathname)));
                // A protected build stores the renderer's JavaScript encrypted; decrypt
                // on the way out. Anything not protected takes the original path
                // untouched, so this cannot change how a plain build behaves. See core's
                // rendererProtection for what this does and does not buy.
                try {
                    const raw = await fs_1.default.promises.readFile(filePath);
                    const plain = (0, electron_main_3.decryptRendererAsset)(raw, buildPath);
                    if (plain) {
                        return new Response(new Uint8Array(plain), {
                            headers: { 'content-type': (0, electron_main_3.rendererAssetContentType)(url.pathname) }
                        });
                    }
                }
                catch (e) {
                    // Only a protected asset we cannot open is fatal; a missing file falls
                    // through to net.fetch, which produces the usual 404.
                    if (e?.message?.includes('carries no key'))
                        throw e;
                }
                return electron_1.net.fetch(`file://${filePath}`);
            });
        }
        createWindow();
        // Register the four hardware-media-key globalShortcuts. We pass a getter
        // rather than the BrowserWindow itself: macOS hides instead of destroys
        // on close (see win.on('close') above), so the live window reference
        // can change across re-shows.
        (0, electron_main_2.bindMediaKeyShortcuts)(() => win ?? null);
        electron_1.app.on('activate', () => {
            if (win) {
                win.show();
                win.focus();
            }
            else if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
    electron_1.app.on('before-quit', () => {
        isQuitting = true;
    });
    electron_1.app.on('will-quit', () => {
        (0, electron_main_2.disposeDiscordRpcAdapter)();
    });
    electron_1.app.on('window-all-closed', () => {
        // Keep running when background-receive mode is on so FCM push keeps
        // arriving with no window (tray → Quit is the explicit exit).
        if (process.platform !== 'darwin' && !(0, backgroundMode_1.isBackgroundModeEnabled)()) {
            electron_1.app.quit();
        }
    });
    electron_1.app.on('ready', () => {
        const parseCookies = (cookieString = '') => {
            return cookieString.split(';').reduce((acc, pair) => {
                const [key, ...val] = pair.trim().split('=');
                if (key)
                    acc[key] = val.join('=');
                return acc;
            }, {});
        };
        const serializeCookies = (cookieObj) => {
            return Object.entries(cookieObj).map(([k, v]) => `${k}=${v}`).join('; ');
        };
        electron_1.session.defaultSession.webRequest.onBeforeSendHeaders(async (details, callback) => {
            if (!details.requestHeaders) {
                details.requestHeaders = {};
            }
            // Check if request explicitly wants to skip session cookies (for API auth flows like Ory Kratos)
            const skipSessionCookies = details.requestHeaders['X-Skip-Session-Cookies'] || details.requestHeaders['x-skip-session-cookies'];
            if (skipSessionCookies) {
                delete details.requestHeaders['X-Skip-Session-Cookies'];
                delete details.requestHeaders['x-skip-session-cookies'];
                // Only the SESSION's cookies are refused, not the caller's own. A
                // YouTube search asks for this so it stays signed out — the signed-in
                // session would file it in that account's search history — but it still
                // has to carry the consent cookie it assembled itself, or it meets the
                // consent wall instead of results. A caller that sent no cookies of its
                // own (Kratos) still ends up with no Cookie header, as before.
                const ownCookies = {
                    ...parseCookies(details.requestHeaders.Cookie || details.requestHeaders.cookie),
                    ...parseCookies(details.requestHeaders['X-Cookie'] || details.requestHeaders['x-cookie'])
                };
                delete details.requestHeaders.cookie;
                delete details.requestHeaders['X-Cookie'];
                delete details.requestHeaders['x-cookie'];
                if (Object.keys(ownCookies).length > 0) {
                    details.requestHeaders.Cookie = serializeCookies(ownCookies);
                }
                else {
                    delete details.requestHeaders.Cookie;
                }
            }
            else {
                const sessionCookie = await electron_1.session.defaultSession.cookies.get({ url: details.url });
                const requestCookie = details.requestHeaders.Cookie || details.requestHeaders.cookie;
                const requestRestrictedCookie = details.requestHeaders['X-Cookie'] || details.requestHeaders['x-cookie'];
                if (sessionCookie.length > 0 || !!requestCookie || !!requestRestrictedCookie) {
                    const sessionCookieParsed = sessionCookie.reduce((acc, cookie) => {
                        acc[cookie.name] = cookie.value;
                        return acc;
                    }, {});
                    const requestCookieParsed = parseCookies(requestCookie);
                    const requestRestrictedCookieParsed = parseCookies(requestRestrictedCookie);
                    details.requestHeaders.Cookie = serializeCookies({
                        ...sessionCookieParsed,
                        ...requestCookieParsed,
                        ...requestRestrictedCookieParsed
                    });
                    delete details.requestHeaders['X-Cookie'];
                    delete details.requestHeaders['x-cookie'];
                }
            }
            if (details.url.match(/music\.163\.com/)) {
                details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36';
                details.requestHeaders.Cookie = 'NMTID=';
            }
            else if (details.url.match(/c\.y\.qq\.com/)) {
                // details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 Edg/125.0.0.0'
                details.requestHeaders.Referrer = 'https://y.qq.com';
                details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9,hr;q=0.8,en-GB;q=0.7';
                details.requestHeaders['Content-Type'] = 'text/html; charset=utf-8';
                details.requestHeaders.Accept = 'application/json';
                details.requestHeaders['Cache-Control'] = 'no-cache';
                details.requestHeaders.Origin = 'https://y.qq.com';
                details.requestHeaders.Referer = 'https://y.qq.com';
                // details.requestHeaders['User-Agent'] = sessionUseragent
                details.requestHeaders['Accept-Encoding'] = 'gzip, deflate, br';
                details.referrer = 'https://y.qq.com/';
            }
            const restrictedHeaders = ['Origin', 'Referer', 'User-Agent', 'Sec-Fetch-Mode'];
            restrictedHeaders.forEach((restrictedHeader) => {
                const keys = [
                    `X-${restrictedHeader}`,
                    `x-${restrictedHeader.toLocaleLowerCase()}`,
                    restrictedHeader
                ];
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    const valueTmp = details.requestHeaders[key];
                    if (key !== restrictedHeader) {
                        delete details.requestHeaders[key];
                    }
                    if (valueTmp) {
                        details.requestHeaders[restrictedHeader] = valueTmp;
                        break;
                    }
                }
            });
            callback({
                cancel: false,
                requestHeaders: details.requestHeaders
            });
        });
    });
}
const getMainWindow = () => win ?? null;
exports.getMainWindow = getMainWindow;
// ---------------------------------------------------------------------------
// Inline YouTube sign-in (age-restricted playback)
// ---------------------------------------------------------------------------
// Google blocks its sign-in flow inside embedded <webview> guests
// ("This browser or app may not be secure"), regardless of the user-agent in
// use. A top-level WebContentsView is a real browser context (like a
// Chrome tab), so Google accepts it — and it can be attached *inline* over the
// renderer's central area instead of opening a separate window.
//
// The view runs in the DEFAULT session on purpose: the cookies it sets during
// login (incl. the HttpOnly SAPISID) then flow automatically into the YouTube
// extraction requests via the onBeforeSendHeaders forwarder, and are readable
// by the renderer's CookieManager bridge for SAPISIDHASH computation.
// Google rejects sign-in ("browser not secure") when the User-Agent and the
// User-Agent Client Hints disagree (e.g. UA says Chrome/131 but the real hints
// say Chromium/146 with no "Google Chrome" brand). Present a *consistent* real
// Chrome configuration: UA version == hints version, and include the "Google
// Chrome" brand. Keep the version aligned with the bundled Chromium.
const YT_CHROME_VERSION = '146';
const YT_CHROME_FULL_VERSION = '146.0.7680.179';
const YT_LOGIN_UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${YT_CHROME_VERSION}.0.0.0 Safari/537.36`;
const YT_UA_METADATA = {
    brands: [
        { brand: 'Chromium', version: YT_CHROME_VERSION },
        { brand: 'Google Chrome', version: YT_CHROME_VERSION },
        { brand: 'Not.A/Brand', version: '24' }
    ],
    fullVersionList: [
        { brand: 'Chromium', version: YT_CHROME_FULL_VERSION },
        { brand: 'Google Chrome', version: YT_CHROME_FULL_VERSION },
        { brand: 'Not.A/Brand', version: '24.0.0.0' }
    ],
    fullVersion: YT_CHROME_FULL_VERSION,
    platform: process.platform === 'win32' ? 'Windows' : (process.platform === 'darwin' ? 'macOS' : 'Linux'),
    platformVersion: '14.5.0',
    architecture: process.arch === 'arm64' ? 'arm64' : 'x86',
    model: '',
    mobile: false
};
const YT_LOGIN_URL = 'https://accounts.google.com/ServiceLogin?service=youtube';
// Scrapes the YouTube session identifiers Google embeds in the page HTML.
const YT_SCRAPE_SCRIPT = `(function () {
  try {
    var html = document.documentElement.innerHTML
    function pick (re) { var m = html.match(re); return m ? m[2] : undefined }
    return JSON.stringify({
      idToken: pick(/(["'])ID_TOKEN\\1[:,]\\s?"([^"]+)"/),
      visitorData: pick(/(["'])VISITOR_DATA\\1[:,]\\s?"([^"]+)"/),
      loginInfo: pick(/(["'])LOGIN_INFO\\1[:,]\\s?"([^"]+)"/),
      dataSyncId: (function () { var m = html.match(/(["'])DATASYNC_ID\\1[:,]\\s?"([^|"]+)(?:\\|[^"]*)?"/); return m ? m[2] : undefined })(),
      url: location.href
    })
  } catch (e) { return JSON.stringify({ err: String(e) }) }
})()`;
// Chrome Client-Hint request headers consistent with the configured
// User-Agent. The corresponding client-side value, navigator.userAgentData, is
// set by ytLoginPreload running in the page's main world.
const chList = (full) => YT_UA_METADATA[full ? 'fullVersionList' : 'brands']
    .map(b => `"${b.brand}";v="${b.version}"`).join(', ');
const YT_CLIENT_HINTS = {
    'Sec-CH-UA': chList(false),
    'Sec-CH-UA-Full-Version-List': chList(true),
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': `"${YT_UA_METADATA.platform}"`,
    'Sec-CH-UA-Platform-Version': `"${YT_UA_METADATA.platformVersion}"`,
    'Sec-CH-UA-Arch': `"${YT_UA_METADATA.architecture}"`,
    'Sec-CH-UA-Full-Version': `"${YT_CHROME_FULL_VERSION}"`,
    'Sec-CH-UA-Bitness': '"64"',
    'Sec-CH-UA-Model': '""'
};
const YT_LOGIN_PARTITION = 'persist:yt-login';
const YT_COOKIE_URLS = ['https://www.youtube.com', 'https://youtube.com', 'https://m.youtube.com', 'https://accounts.google.com', 'https://www.google.com', 'https://google.com'];
let ytLoginView = null;
let ytLoginPoll = null;
let ytLoginIpcBound = false;
let ytLoginSessionReady = false;
const roundBounds = (b) => ({
    x: Math.round(b?.x ?? 0),
    y: Math.round(b?.y ?? 0),
    width: Math.max(1, Math.round(b?.width ?? 1)),
    height: Math.max(1, Math.round(b?.height ?? 1))
});
// The login view runs in its own partition so we can rewrite its request
// headers (UA + Client Hints) to the desktop browser configuration without
// touching the default session's cookie forwarder. Configured once.
const getYtLoginSession = () => {
    const sess = electron_1.session.fromPartition(YT_LOGIN_PARTITION);
    if (!ytLoginSessionReady) {
        ytLoginSessionReady = true;
        sess.setUserAgent(YT_LOGIN_UA);
        sess.webRequest.onBeforeSendHeaders((details, callback) => {
            details.requestHeaders['User-Agent'] = YT_LOGIN_UA;
            for (const [k, v] of Object.entries(YT_CLIENT_HINTS))
                details.requestHeaders[k] = v;
            callback({ requestHeaders: details.requestHeaders });
        });
    }
    return sess;
};
// Copy the YouTube/Google cookies the user just obtained from the login
// partition into the default session, so the extraction path's cookie
// forwarder attaches them automatically.
const copyYtCookiesToDefault = async () => {
    const from = getYtLoginSession();
    for (const url of YT_COOKIE_URLS) {
        const cookies = await from.cookies.get({ url }).catch(() => []);
        for (const c of cookies) {
            const host = (c.domain || '').replace(/^\./, '');
            try {
                await electron_1.session.defaultSession.cookies.set({
                    url: `${c.secure === false ? 'http' : 'https'}://${host}${c.path || '/'}`,
                    name: c.name,
                    value: c.value,
                    domain: c.domain,
                    path: c.path,
                    secure: c.secure,
                    httpOnly: c.httpOnly,
                    expirationDate: c.expirationDate,
                    sameSite: c.sameSite
                });
            }
            catch { /* some cookies (host-only/__Host-) may reject — best-effort */ }
        }
    }
};
const destroyYtLoginView = () => {
    if (ytLoginPoll) {
        clearInterval(ytLoginPoll);
        ytLoginPoll = null;
    }
    const mainWin = (0, exports.getMainWindow)();
    if (ytLoginView) {
        try {
            mainWin?.contentView.removeChildView(ytLoginView);
        }
        catch { /* already gone */ }
        try {
            ytLoginView.webContents.destroy?.();
        }
        catch { /* ignore */ }
        ytLoginView = null;
    }
};
const bindYoutubeLoginIpc = () => {
    if (ytLoginIpcBound)
        return;
    ytLoginIpcBound = true;
    electron_1.ipcMain.handle('ytLogin:open', (_e, bounds) => {
        const mainWin = (0, exports.getMainWindow)();
        if (!mainWin)
            return false;
        destroyYtLoginView();
        const ytSession = getYtLoginSession();
        const view = new electron_1.WebContentsView({
            webPreferences: {
                session: ytSession,
                // contextIsolation:false so ytLoginPreload runs in the page's MAIN world
                // and can override navigator.userAgentData before Google's scripts read it.
                contextIsolation: false,
                nodeIntegration: false,
                sandbox: false,
                preload: path_1.default.join(__dirname, 'ytLoginPreload.js')
            }
        });
        ytLoginView = view;
        view.setBackgroundColor('#ffffff');
        view.webContents.setUserAgent(YT_LOGIN_UA);
        mainWin.contentView.addChildView(view);
        view.setBounds(roundBounds(bounds));
        let lastSent = '';
        const scrapeAndReport = () => {
            const w = (0, exports.getMainWindow)();
            if (!w || !ytLoginView || ytLoginView.webContents.isDestroyed())
                return;
            ytLoginView.webContents.executeJavaScript(YT_SCRAPE_SCRIPT, true).then(async (json) => {
                let data;
                try {
                    data = JSON.parse(json);
                }
                catch {
                    return;
                }
                if (!data)
                    return;
                w.webContents.send('ytLogin:navigate', { url: data.url });
                if (!data.dataSyncId)
                    return;
                const cookies = await ytSession.cookies.get({ url: 'https://www.youtube.com' }).catch(() => []);
                const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                if (!cookieString.includes('SAPISID='))
                    return;
                const payload = {
                    idToken: data.idToken,
                    visitorData: data.visitorData,
                    loginInfo: data.loginInfo,
                    dataSyncId: data.dataSyncId,
                    cookies: cookieString
                };
                const sig = JSON.stringify(payload);
                if (sig === lastSent)
                    return;
                lastSent = sig;
                await copyYtCookiesToDefault();
                w.webContents.send('ytLogin:result', payload);
            }).catch(() => { });
        };
        view.webContents.on('dom-ready', scrapeAndReport);
        view.webContents.on('did-navigate', scrapeAndReport);
        ytLoginPoll = setInterval(scrapeAndReport, 1000);
        view.webContents.loadURL(YT_LOGIN_URL);
        return true;
    });
    electron_1.ipcMain.handle('ytLogin:setBounds', (_e, bounds) => {
        if (ytLoginView) {
            try {
                ytLoginView.setBounds(roundBounds(bounds));
            }
            catch { /* ignore */ }
        }
        return true;
    });
    electron_1.ipcMain.handle('ytLogin:close', () => {
        destroyYtLoginView();
        return true;
    });
    electron_1.ipcMain.handle('ytLogin:clearCookies', async () => {
        const sessions = [getYtLoginSession(), electron_1.session.defaultSession];
        for (const sess of sessions) {
            for (const url of YT_COOKIE_URLS) {
                const cs = await sess.cookies.get({ url }).catch(() => []);
                for (const c of cs) {
                    const host = (c.domain || '').replace(/^\./, '');
                    const removalUrl = `${c.secure === false ? 'http' : 'https'}://${host}${c.path || '/'}`;
                    await sess.cookies.remove(removalUrl, c.name).catch(() => { });
                }
            }
        }
        return true;
    });
};
