"use strict";
/**
 * Desktop FCM push receiver (main process).
 *
 * Stock Electron can't receive remote push, so we speak Google's MCS protocol
 * directly via `@aracna/fcm` (the maintained successor of `push-receiver`):
 * the main process opens a persistent socket to Google MTalk, registers an FCM
 * token, and receives data messages even while the renderer is hidden / the
 * window is closed (as long as the process stays alive — see the tray /
 * close-to-tray wiring). Received messages are shown as native OS
 * notifications and forwarded to the renderer.
 *
 * The renderer drives the lifecycle over IPC (it owns the Firebase config, the
 * auth state and the Settings toggle):
 *   • `fcm:register`  — one-time registration with the Firebase web config.
 *   • `fcm:connect` / `fcm:disconnect` — open / close the MCS socket.
 *   • `fcm:get-token` — the token to POST to /devices/register.
 *   • `fcm:is-registered` — whether credentials are already persisted.
 *
 * Credentials (ACG id/securityToken as bigint + ECE auth secret / ECDH private
 * key as Buffers) are persisted with v8 serialization, which — unlike JSON —
 * round-trips bigint and Buffer. Mirrors aracna's official Electron example.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDesktopFcm = void 0;
const core_1 = require("@aracna/core");
const fcm_1 = require("@aracna/fcm");
const electron_1 = require("electron");
const node_v8_1 = require("node:v8");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const electron_2 = require("./electron");
// ACG application id — an arbitrary stable identifier for this app's MCS
// registration (not a Firebase value). Never change it: it's baked into the
// persisted ACG credentials.
const APP_ID = 'app.lyramusic.desktop';
const STORAGE_KEY = 'fcm';
// v8-serialized single-file store in userData. Path resolved lazily so it works
// before `app.whenReady()` isn't required (getPath('userData') is available
// once the app object exists).
const storageFile = () => node_path_1.default.join(electron_1.app.getPath('userData'), 'fcm-credentials.v8');
const readStore = async () => {
    try {
        return (0, node_v8_1.deserialize)(await (0, promises_1.readFile)(storageFile()));
    }
    catch {
        return {}; // missing/corrupt file → empty store
    }
};
const writeStore = async (store) => {
    await (0, promises_1.writeFile)(storageFile(), (0, node_v8_1.serialize)(store));
};
const diskStorage = new core_1.AsyncStorage('LyraFcmStorage', async () => writeStore({}), async (key) => {
    const store = await readStore();
    // aracna's Storage base surfaces a returned Error as a miss; callers
    // (FcmClient) check `instanceof Error`. Cast to satisfy the generic param.
    return (key in store ? store[key] : new Error('not_found'));
}, async (key) => key in (await readStore()), async (key) => {
    const store = await readStore();
    delete store[key];
    await writeStore(store);
}, async (key, item) => {
    const store = await readStore();
    store[key] = item;
    await writeStore(store);
});
// The client persists its own received-message ids under its DEFAULT storage
// key ('aracna_fcm_client'); we keep credentials under STORAGE_KEY ('fcm') in
// the same store. Don't pass `key` here or the client would clobber the creds.
const client = new fcm_1.FcmClient({ storage: { instance: diskStorage } });
let listenersBound = false;
// Reconnection state. The MCS socket drops on network changes / sleep-wake; we
// must reconnect or push silently stops. `shouldStayConnected` distinguishes a
// real drop from an intentional disconnect (notifications turned off).
let shouldStayConnected = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
const RECONNECT_BASE_MS = 5000;
const RECONNECT_CAP_MS = 120000;
const connectClient = async () => {
    if (!(await loadCredentialsIntoClient()))
        throw new Error('fcm_not_registered');
    const connected = await client.connect();
    if (connected instanceof Error)
        throw connected;
    reconnectAttempts = 0;
};
const scheduleReconnect = () => {
    if (!shouldStayConnected || reconnectTimer)
        return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_CAP_MS);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!shouldStayConnected)
            return;
        void connectClient().catch(() => scheduleReconnect());
    }, delay);
};
const showNativeNotification = (data) => {
    if (!electron_1.Notification.isSupported())
        return; // no notification server (e.g. bare Linux)
    const title = data.notification?.title ?? data.data?.title ?? '';
    const body = data.notification?.body ?? data.data?.body ?? '';
    if (!title && !body)
        return;
    const notification = new electron_1.Notification({ title: title || body, body: title ? body : undefined });
    notification.on('click', () => {
        const win = (0, electron_2.getMainWindow)();
        if (win && !win.isDestroyed()) {
            if (win.isMinimized())
                win.restore();
            if (!win.isVisible())
                win.show();
            win.focus();
        }
        const deeplink = data.data?.deeplink;
        if (deeplink && win && !win.isDestroyed()) {
            // Reuse the renderer's existing deep-link route (brand linking handler).
            win.webContents.send('onDeepLinkReceived', deeplink);
        }
    });
    notification.show();
};
const bindClientListeners = () => {
    if (listenersBound)
        return;
    listenersBound = true;
    client.on('message-data', (data) => {
        try {
            showNativeNotification(data);
        }
        catch {
            /* a malformed message must not crash the receiver */
        }
        const win = (0, electron_2.getMainWindow)();
        win?.webContents.send('fcm:message-data', data);
    });
    // Socket dropped (network change, server close). Reconnect with backoff
    // unless the disconnect was intentional (notifications turned off).
    client.on('close', () => { scheduleReconnect(); });
    // Laptop wake: the socket is usually dead — force an immediate reconnect
    // instead of waiting for the next backoff tick.
    electron_1.powerMonitor.on('resume', () => {
        if (!shouldStayConnected)
            return;
        reconnectAttempts = 0;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        void connectClient().catch(() => scheduleReconnect());
    });
};
const loadCredentialsIntoClient = async () => {
    const item = (await readStore())[STORAGE_KEY];
    if (!item)
        return false;
    client
        .setAcgID(item.acg.id)
        .setAcgSecurityToken(item.acg.securityToken)
        .setAuthSecret(item.ece.authSecret)
        .setEcdhPrivateKey(item.ece.privateKey);
    return true;
};
/**
 * Register IPC handlers + client listeners. Call once from the main entry.
 * Safe to call before `app.whenReady()` — ipcMain.handle and event binding
 * don't need the app to be ready.
 */
const initDesktopFcm = () => {
    bindClientListeners();
    electron_1.ipcMain.handle('fcm:is-registered', () => diskStorage.has(STORAGE_KEY));
    electron_1.ipcMain.handle('fcm:get-token', async () => {
        const item = (await readStore())[STORAGE_KEY];
        return item?.token;
    });
    electron_1.ipcMain.handle('fcm:register', async (_event, config) => {
        if (await diskStorage.has(STORAGE_KEY))
            return; // already registered — keep the token stable
        if (!config?.apiKey || !config?.appID || !config?.projectID || !config?.vapidKey) {
            throw new Error('fcm_register_missing_config');
        }
        const authSecret = (0, fcm_1.generateFcmAuthSecret)();
        const ecdh = (0, fcm_1.createFcmECDH)();
        const registration = await (0, fcm_1.registerToFCM)({
            appID: APP_ID,
            ece: { authSecret, publicKey: ecdh.getPublicKey() },
            firebase: { apiKey: config.apiKey, appID: config.appID, projectID: config.projectID },
            vapidKey: config.vapidKey,
        });
        if (registration instanceof Error)
            throw registration;
        const reg = registration;
        const store = await readStore();
        store[STORAGE_KEY] = {
            acg: { id: reg.acg.id, securityToken: reg.acg.securityToken },
            ece: { authSecret, privateKey: ecdh.getPrivateKey(), publicKey: ecdh.getPublicKey() },
            token: reg.token,
        };
        await writeStore(store);
    });
    electron_1.ipcMain.handle('fcm:connect', async () => {
        shouldStayConnected = true;
        await connectClient();
    });
    electron_1.ipcMain.handle('fcm:disconnect', async () => {
        shouldStayConnected = false;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        reconnectAttempts = 0;
        await client.disconnect();
    });
    // One-shot confirmation shown when the user turns notifications ON. Its real
    // job on macOS: post a notification from the main process *while the app is
    // focused*, so the OS authorization prompt appears at a clear moment instead
    // of on the first background push. Text is localized by the renderer.
    electron_1.ipcMain.handle('fcm:show-confirmation', (_event, n) => {
        if (!electron_1.Notification.isSupported())
            return;
        const title = n?.title || '';
        const body = n?.body || '';
        if (!title && !body)
            return;
        new electron_1.Notification({ title: title || body, body: title ? body : undefined }).show();
    });
};
exports.initDesktopFcm = initDesktopFcm;
