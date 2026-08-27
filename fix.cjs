const fs = require('fs');
const files = [
  'Lyra-Source-Code/electron-build/src/electron.js',
  'Lyra-Source-Code/electron-build/src/electron.cjs',
  'Lyra-Source-Code/electron-build/electron-main.js',
  'Lyra-Source-Code/electron-build/electron-main.cjs'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // We need to find `});\n  .whenReady()` and look at the line above it to guess the prefix if we can't...
  // Actually, wait, the original `electron-main.cjs` had multiple `.whenReady()`. 
  // Let's just find `.whenReady().then` that is preceded by just spaces, and prefix it with the right app variable.
  // In `electron-main.cjs`, the variables are like `import_electron20.app` or `import_electron16.app`.
  
  // A much simpler fix: just use `require('electron').app` directly!
  content = content.replace(/^(\s*)\.whenReady\(\)\.then/gm, "$1require('electron').app.whenReady().then");
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
});
