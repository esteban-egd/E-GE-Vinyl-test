const fs = require('fs');

// 1. Fix sendMessageToFriend in SocialContext
let socialCode = fs.readFileSync('src/context/SocialContext.jsx', 'utf8');
socialCode = socialCode.replace(
  "receiver_id: targetUserId,",
  "recipient_id: targetUserId,"
);
fs.writeFileSync('src/context/SocialContext.jsx', socialCode);

// 2. Fix ProfilePage.jsx buttons
let profileCode = fs.readFileSync('src/pages/ProfilePage.jsx', 'utf8');
profileCode = profileCode.replace(
  "onClick={() => setReplyingTo(share)}",
  "onClick={(e) => { e.stopPropagation(); setReplyingTo(share); }}"
);
profileCode = profileCode.replace(
  "onClick={() => likeSharedItem(share.id, !share.isLiked)}",
  "onClick={(e) => { e.stopPropagation(); likeSharedItem(share.id, !share.isLiked); }}"
);
// Make sure reply box clears properly and button sends correctly
fs.writeFileSync('src/pages/ProfilePage.jsx', profileCode);

console.log("Fixes applied.");
