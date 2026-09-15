const fs = require('fs');
let code = fs.readFileSync('src/context/SocialContext.jsx', 'utf8');
code = code.replace("recipient_id: targetUserId,", "receiver_id: targetUserId,");
fs.writeFileSync('src/context/SocialContext.jsx', code);
