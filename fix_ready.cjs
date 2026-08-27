const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/electron_1\.\s*\};\s*const serializeCookies/g, 
  `electron_1.app.on('ready', () => {
        const parseCookies = (cookieString = '') => {
            return cookieString.split(';').reduce((acc, pair) => {
                const [key, ...val] = pair.trim().split('=');
                if (key)
                    acc[key] = val.join('=');
                return acc;
            }, {});
        };
        const serializeCookies`);
  fs.writeFileSync(file, content, 'utf8');
}

fix('Lyra-Source-Code/electron-build/src/electron.cjs');
fix('Lyra-Source-Code/electron-build/src/electron.js');
