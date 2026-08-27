"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Side-effect import of BloomEmbed's embed <webview> preload. It installs the
 * `window.ReactNativeWebView` bridge and runs the "before content loaded"
 * bootstrap inside the YouTube guest page — the desktop equivalent of
 * react-native-webview's injectedJavaScriptBeforeContentLoaded.
 */
require("@bloomembed/react-native/src/electronWebviewPreload");
