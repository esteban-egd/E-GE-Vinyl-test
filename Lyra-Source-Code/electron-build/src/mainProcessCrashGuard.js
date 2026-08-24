"use strict";
// Early main-process crash guard for the Electron entry point.
//
// WHY THIS EXISTS (ClickUp 86ca2hc9h):
// The website (NSIS) installer build occasionally shipped an app.asar that
// was missing a *transitive* runtime dependency — e.g. electron-store →
// conf → atomically, or a native bit of discord-rpc / music-metadata. These
// flat npm packages stay an external `require()` in the esbuild output (they
// live in `dependencies`, not inlined like `core/…`), so a missing one throws
// synchronously while the module graph is still loading. That throw happens
// BEFORE `src/electron.ts` gets a chance to register `electron-unhandled`,
// so nothing intercepts it and Electron pops its raw, untranslated
// "A JavaScript error occurred in the main process" dialog with a bare stack.
// To the end user the app is simply bricked (the Microsoft Store / APPX build
// uses a different update channel and was unaffected, which is why only the
// website installer reported it).
//
// Marco's esbuild bundling (c6d8d5ec) fixed the `core/src/adapters/...`
// specifier crash, but it does NOT cover the externalised flat deps above:
// those are still required from the asar at runtime. This guard closes that
// remaining gap by installing the very FIRST thing the bundled main process
// runs — before any external require — so a fatal load-time error is logged
// to a file the user can send us and replaced with a controlled, actionable
// dialog instead of Electron's default one.
//
// This is intentionally dependency-free (only `node:` builtins + electron,
// both of which are guaranteed present) so the guard itself can never be the
// thing that fails to load.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installMainProcessCrashGuard = void 0;
const electron_1 = require("electron");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
let alreadyHandledFatal = false;
let installed = false;
/** Best-effort path to a crash log inside the per-user app data dir. */
const crashLogPath = () => {
    // `app.getPath('userData')` can itself throw if called before the app name
    // is resolved; fall back to the OS temp dir so we always have somewhere to
    // write. We do NOT swallow silently — any failure here is rethrown to the
    // caller's try/catch, which then degrades to a console log.
    try {
        return node_path_1.default.join(electron_1.app.getPath('userData'), 'lyra-main-crash.log');
    }
    catch {
        // userData not available this early (very rare) — temp dir is always safe.
        return node_path_1.default.join(node_os_1.default.tmpdir(), 'lyra-main-crash.log');
    }
};
const persistCrash = (label, error) => {
    const detail = error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
        : String(error);
    const entry = `[${new Date().toISOString()}] ${label}\n${detail}\n\n`;
    try {
        node_fs_1.default.appendFileSync(crashLogPath(), entry);
    }
    catch (writeErr) {
        // If we cannot even write the crash log, there is nothing left to do but
        // surface it on the console (visible when launched from a terminal / when
        // a dev attaches). Swallowing would hide a double failure — log instead.
        console.error('[crash-guard] failed to persist crash log', writeErr);
        console.error('[crash-guard] original crash was', entry);
    }
};
const showFatalDialog = (error) => {
    // Surface the underlying error message (not the full stack) so a user can
    // quote it in a support thread — this is exactly the detail that was missing
    // from the original "A JavaScript error occurred in the main process" dialog.
    const reason = error instanceof Error ? error.message : String(error);
    const message = 'Lyra could not start because a required component failed to load.\n\n' +
        'This usually means the last update did not install completely. ' +
        'Please reinstall Lyra from lyramusic.app — your library and settings are kept.\n\n' +
        `Technical detail: ${reason}\n\n` +
        'A diagnostic log was saved to:\n' +
        crashLogPath();
    try {
        // showErrorBox works even before app `ready`, unlike the async dialogs.
        electron_1.dialog.showErrorBox('Lyra failed to start', message);
    }
    catch (dialogErr) {
        // Showing UI is best-effort: if even the dialog module is unusable we have
        // already written the log above, so just note the secondary failure.
        console.error('[crash-guard] could not show fatal dialog', dialogErr);
    }
};
/**
 * Install global handlers that turn an otherwise-fatal main-process throw
 * (most importantly a missing-module error during the initial require graph)
 * into a logged, user-readable failure instead of Electron's default
 * "A JavaScript error occurred in the main process" dialog.
 *
 * Call this as the FIRST statement of the main-process entry, before any
 * other import that could pull in an external runtime dependency.
 */
const installMainProcessCrashGuard = () => {
    // Idempotent: importing this module auto-installs once (see bottom of file),
    // and electron-main.ts also calls it explicitly for readability. The second
    // call must be a no-op so we don't stack duplicate handlers.
    if (installed)
        return;
    installed = true;
    process.on('uncaughtException', (error) => {
        persistCrash('uncaughtException', error);
        // Only the first fatal error gets the dialog + forced exit. A later,
        // already-running app may emit non-fatal uncaught errors that other
        // handlers (electron-unhandled) deal with; we don't want to hijack those
        // or pop a second dialog. The startup require crash is always the first.
        if (alreadyHandledFatal)
            return;
        alreadyHandledFatal = true;
        showFatalDialog(error);
        // Exit non-zero so updaters / shells see the failure. We must exit: the
        // module graph is half-initialised, so continuing would only crash again
        // somewhere less diagnosable.
        electron_1.app.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
        // Rejections are logged but NOT treated as fatal: most are recoverable
        // async paths (e.g. an update check that timed out). Logging them keeps
        // them diagnosable without bricking a working app.
        persistCrash('unhandledRejection', reason);
    });
};
exports.installMainProcessCrashGuard = installMainProcessCrashGuard;
// Auto-install on import so the handlers exist before any later external
// require() in the bundle can throw. The explicit call in electron-main.ts is
// then a documented no-op.
(0, exports.installMainProcessCrashGuard)();
