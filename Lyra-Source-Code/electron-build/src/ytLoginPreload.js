"use strict";
// Preload for the inline YouTube sign-in WebContentsView (runs in the page's
// MAIN world — the view is created with contextIsolation:false — BEFORE Google's
// scripts execute).
//
// The sign-in flow requires the page to see a complete desktop browser
// environment. A WebContentsView leaves several standard properties of
// navigator and window unset or incomplete compared with a normal Chrome
// window, which the flow does not handle. This preload fills them in so the
// page runs as intended.
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = window;
const nav = navigator;
const VERSION = '146';
const FULL_VERSION = '146.0.7680.179';
const UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${VERSION}.0.0.0 Safari/537.36`;
const safe = (fn) => { try {
    fn();
}
catch { /* best-effort */ } };
// --- navigator.webdriver ---
safe(() => { Object.defineProperty(nav, 'webdriver', { get: () => false, configurable: true }); });
safe(() => { delete Navigator.prototype.webdriver; });
// --- User-Agent string + Client Hints (navigator.userAgentData) ---
const brands = [
    { brand: 'Chromium', version: VERSION },
    { brand: 'Google Chrome', version: VERSION },
    { brand: 'Not.A/Brand', version: '24' }
];
const fullVersionList = [
    { brand: 'Chromium', version: FULL_VERSION },
    { brand: 'Google Chrome', version: FULL_VERSION },
    { brand: 'Not.A/Brand', version: '24.0.0.0' }
];
safe(() => {
    const uaData = {
        brands,
        mobile: false,
        platform: 'macOS',
        getHighEntropyValues: () => Promise.resolve({
            architecture: 'arm64', bitness: '64', brands, fullVersionList,
            mobile: false, model: '', platform: 'macOS', platformVersion: '14.5.0',
            uaFullVersion: FULL_VERSION, wow64: false
        }),
        toJSON: () => ({ brands, mobile: false, platform: 'macOS' })
    };
    Object.defineProperty(nav, 'userAgentData', { get: () => uaData, configurable: true });
});
safe(() => { Object.defineProperty(nav, 'userAgent', { get: () => UA, configurable: true }); });
safe(() => { Object.defineProperty(nav, 'appVersion', { get: () => UA.replace('Mozilla/', ''), configurable: true }); });
safe(() => { Object.defineProperty(nav, 'vendor', { get: () => 'Google Inc.', configurable: true }); });
safe(() => { Object.defineProperty(nav, 'platform', { get: () => 'MacIntel', configurable: true }); });
// --- navigator.languages ---
safe(() => { Object.defineProperty(nav, 'languages', { get: () => ['en-US', 'en'], configurable: true }); });
// --- navigator.hardwareConcurrency / deviceMemory ---
safe(() => { Object.defineProperty(nav, 'hardwareConcurrency', { get: () => 8, configurable: true }); });
safe(() => { Object.defineProperty(nav, 'deviceMemory', { get: () => 8, configurable: true }); });
// --- window.chrome (runtime/app/csi/loadTimes) ---
safe(() => {
    if (!w.chrome)
        w.chrome = {};
    const noop = () => { };
    w.chrome.app = w.chrome.app || {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        getDetails: () => null,
        getIsInstalled: () => false
    };
    w.chrome.runtime = w.chrome.runtime || {
        OnInstalledReason: {}, OnRestartRequiredReason: {}, PlatformArch: {}, PlatformOs: {},
        connect: noop, sendMessage: noop, id: undefined
    };
    w.chrome.csi = w.chrome.csi || function () { return { onloadT: Date.now(), startE: Date.now(), pageT: 0, tran: 15 }; };
    w.chrome.loadTimes = w.chrome.loadTimes || function () {
        return { commitLoadTime: 0, connectionInfo: 'h2', finishDocumentLoadTime: 0, finishLoadTime: 0, firstPaintAfterLoadTime: 0, firstPaintTime: 0, navigationType: 'Other', npnNegotiatedProtocol: 'h2', requestTime: 0, startLoadTime: 0, wasAlternateProtocolAvailable: false, wasFetchedViaSpdy: true, wasNpnNegotiated: true };
    };
});
// --- navigator.plugins / mimeTypes (real Chrome PDF set) ---
safe(() => {
    const pdfPlugins = [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
    ];
    const mimeTypes = [
        { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
    ];
    const makeArrayLike = (items) => {
        const arr = Object.create(null);
        items.forEach((it, i) => { arr[i] = it; arr[it.name || it.type] = it; });
        arr.length = items.length;
        arr.item = (i) => items[i];
        arr.namedItem = (n) => items.find(x => (x.name || x.type) === n) || null;
        arr.refresh = () => { };
        return arr;
    };
    Object.defineProperty(nav, 'plugins', { get: () => makeArrayLike(pdfPlugins), configurable: true });
    Object.defineProperty(nav, 'mimeTypes', { get: () => makeArrayLike(mimeTypes), configurable: true });
});
// --- navigator.permissions.query (notifications consistency) ---
safe(() => {
    const orig = nav.permissions && nav.permissions.query ? nav.permissions.query.bind(nav.permissions) : null;
    if (orig) {
        nav.permissions.query = (params) => params && params.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission, onchange: null })
            : orig(params);
    }
});
// --- WebGL vendor/renderer (avoid SwiftShader/Google default tell) ---
safe(() => {
    const patch = (proto) => {
        if (!proto)
            return;
        const getParameter = proto.getParameter;
        proto.getParameter = function (param) {
            if (param === 37445)
                return 'Google Inc. (Apple)'; // UNMASKED_VENDOR_WEBGL
            if (param === 37446)
                return 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)'; // UNMASKED_RENDERER_WEBGL
            return getParameter.apply(this, arguments);
        };
    };
    patch(window.WebGLRenderingContext && window.WebGLRenderingContext.prototype);
    patch(window.WebGL2RenderingContext && window.WebGL2RenderingContext.prototype);
});
