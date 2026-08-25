import fs from 'fs';
let content = fs.readFileSync('src/components/player/YouTubeIframe.jsx', 'utf8');

if (!content.includes('isInitializingRef')) {
    content = content.replace(
        "const playerRef = useRef(null);",
        "const playerRef = useRef(null);\n  const isInitializingRef = useRef(false);"
    );
    content = content.replace(
        "if (playerRef.current) return;",
        "if (playerRef.current || isInitializingRef.current) return;\n      isInitializingRef.current = true;"
    );
    content = content.replace(
        "if (setIframePlayer) {",
        "isInitializingRef.current = false;\n              if (setIframePlayer) {"
    );
    content = content.replace(
        "console.warn('[YouTubeIframeEngine] Erreur initialisation:', err);",
        "isInitializingRef.current = false;\n        console.warn('[YouTubeIframeEngine] Erreur initialisation:', err);"
    );
    fs.writeFileSync('src/components/player/YouTubeIframe.jsx', content);
    console.log("Added isInitializingRef.");
}
