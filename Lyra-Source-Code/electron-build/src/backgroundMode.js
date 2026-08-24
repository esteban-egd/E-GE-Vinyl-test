"use strict";
/**
 * Background-receive mode for desktop FCM push.
 *
 * To receive push while the window is closed, the main process must keep
 * running. macOS already keeps the app alive on window close; on Windows/Linux
 * the app quits with its last window. When the user enables notifications, the
 * renderer turns this mode on (via `fcm:set-background-mode`), which:
 *   • registers the app to launch at login (hidden), so push resumes after a
 *     reboot, and
 *   • keeps a system-tray icon + close-to-tray so closing the window hides it
 *     (process stays alive) instead of quitting.
 *
 * Turning notifications off reverts all of it. State is intentionally not
 * persisted in main — the renderer re-asserts it on every boot from the
 * settings flag, so there's a single source of truth.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBackgroundMode = exports.isBackgroundModeEnabled = void 0;
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const electron_2 = require("./electron");
let backgroundModeEnabled = false;
let tray = null;
/** True while close-to-tray / background receive is active. Read by electron.ts
 *  to decide whether window close should hide (keep alive) or quit. */
const isBackgroundModeEnabled = () => backgroundModeEnabled;
exports.isBackgroundModeEnabled = isBackgroundModeEnabled;
const iconDir = () => electron_1.app.isPackaged
    ? node_path_1.default.join(process.resourcesPath, 'icons')
    : node_path_1.default.join(__dirname, '..', 'src', 'assets', 'icons');
const showMainWindow = () => {
    const win = (0, electron_2.getMainWindow)();
    if (!win || win.isDestroyed())
        return;
    if (win.isMinimized())
        win.restore();
    win.show();
    win.focus();
};
const createTray = () => {
    if (tray)
        return;
    const icon = electron_1.nativeImage.createFromPath(node_path_1.default.join(iconDir(), 'logo.png'));
    if (process.platform === 'darwin')
        icon.setTemplateImage(true);
    tray = new electron_1.Tray(icon);
    tray.setToolTip('Lyra Music');
    tray.setContextMenu(electron_1.Menu.buildFromTemplate([
        { label: 'Open Lyra', click: () => showMainWindow() },
        { type: 'separator' },
        { label: 'Quit', click: () => electron_1.app.quit() }
    ]));
    tray.on('click', () => showMainWindow());
};
const destroyTray = () => {
    if (tray) {
        tray.destroy();
        tray = null;
    }
};
const applyBackgroundMode = (enabled) => {
    backgroundModeEnabled = enabled;
    // Launch at login, hidden — so push resumes after a reboot without showing a
    // window. setLoginItemSettings is a no-op on unsupported platforms.
    try {
        electron_1.app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
    }
    catch {
        /* login-item registration is best-effort */
    }
    if (enabled)
        createTray();
    else
        destroyTray();
};
/** Register the IPC the renderer uses to toggle background-receive mode. */
const initBackgroundMode = () => {
    electron_1.ipcMain.handle('fcm:set-background-mode', (_event, enabled) => {
        applyBackgroundMode(!!enabled);
    });
};
exports.initBackgroundMode = initBackgroundMode;
