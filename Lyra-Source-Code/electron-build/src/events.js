"use strict";
/**
 * Thin wrapper around `core/src/adapters/electron-main`'s shared desktop
 * IPC handlers. The handler bodies live in core (`bindDesktopAppEvents` /
 * `bindDesktopWindowEvents`) — this file only injects tenant pieces:
 *   - Lyra's auth-window chrome (title, background, partition)
 *   - the auto-updater (electron-updater), node-machine-id, music-metadata
 *     modules; core doesn't ship these directly to keep its dep set lean.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindEvents = bindEvents;
exports.bindWindowEvents = bindWindowEvents;
const mm = __importStar(require("music-metadata"));
const electron_updater_1 = require("electron-updater");
const node_machine_id_1 = require("node-machine-id");
const electron_main_1 = require("core/src/adapters/electron-main");
function bindEvents() {
    (0, electron_main_1.bindDesktopAppEvents)({
        authWindow: {
            title: 'Sign in to Lyra',
            backgroundColor: '#121116',
            partition: 'persist:lyra-auth'
        },
        autoUpdater: electron_updater_1.autoUpdater,
        getMachineId: node_machine_id_1.machineId,
        musicMetadata: mm
    });
}
function bindWindowEvents(win) {
    (0, electron_main_1.bindDesktopWindowEvents)(win, { autoUpdater: electron_updater_1.autoUpdater });
}
