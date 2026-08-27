const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/Must run before \s*\}\);\n\}\);\napp\.whenReady\(\)\./g, 'Must run before electron_1.app.whenReady().');
  content = content.replace(/Must run before \s*\}\);\n\}\);\nelectron_1\.app\.whenReady\(\)\./g, 'Must run before electron_1.app.whenReady().');
  
  // Actually let's just do a manual replace
  content = content.replace(/\/\/ with macOS MPNowPlayingInfoCenter\. Must run before [\s\S]*?\(0, electron_main_2\.enableMediaKeyFeatures\)\(\);/g, 
  "// with macOS MPNowPlayingInfoCenter. Must run before electron_1.app.whenReady().\n(0, electron_main_2.enableMediaKeyFeatures)();");

  fs.writeFileSync(file, content, 'utf8');
}

fix('Lyra-Source-Code/electron-build/src/electron.cjs');
fix('Lyra-Source-Code/electron-build/src/electron.js');
