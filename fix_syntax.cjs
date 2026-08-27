const fs = require('fs');

function fixSyntax(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/await\s+\}\);\n\}\);\nimport_electron9\.app\.whenReady\(\);/g, 'await import_electron9.app.whenReady();');
  content = content.replace(/await\s+\}\);\n\}\);\nimport_electron\S*\.app\.whenReady\(\);/g, 'await import_electron9.app.whenReady();'); // fallback just in case
  content = content.replace(/await\s+\}\);\n\}\);\n/g, 'await ');
  fs.writeFileSync(file, content, 'utf8');
}

fixSyntax('Lyra-Source-Code/electron-build/electron-main.cjs');
fixSyntax('Lyra-Source-Code/electron-build/electron-main.js');
