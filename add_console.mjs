import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

const debugComponent = `
import { useState, useEffect } from 'react';
function DebugConsole() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    console.log = (...args) => { setLogs(l => [...l, 'LOG: ' + args.join(' ')].slice(-10)); originalLog(...args); };
    console.warn = (...args) => { setLogs(l => [...l, 'WARN: ' + args.join(' ')].slice(-10)); originalWarn(...args); };
    console.error = (...args) => { setLogs(l => [...l, 'ERR: ' + args.join(' ')].slice(-10)); originalError(...args); };
    return () => { console.log = originalLog; console.warn = originalWarn; console.error = originalError; };
  }, []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 99999, background: 'rgba(0,0,0,0.8)', color: 'lime', fontSize: '10px', pointerEvents: 'none', padding: '5px' }}>
      {logs.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}
`;

content = content.replace("import { ThemeProvider }", debugComponent + "\nimport { ThemeProvider }");
content = content.replace("<AppContent />", "<AppContent />\n              <DebugConsole />");

fs.writeFileSync('src/App.jsx', content);
