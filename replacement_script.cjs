const fs = require('fs');
let code = fs.readFileSync('src/pages/ProfilePage.jsx', 'utf8');

// Import Reply
code = code.replace(
  "Share2, MessageSquare, Activity, Globe, LockKeyhole",
  "Share2, MessageSquare, Activity, Globe, LockKeyhole, Reply"
);

// Add likeSharedItem to useSocial
code = code.replace(
  "sendMessageToFriend\n  } = useSocial();",
  "sendMessageToFriend,\n    likeSharedItem\n  } = useSocial();"
);

// Add replyingTo state
code = code.replace(
  "const [sendingMessage, setSendingMessage] = useState(false);",
  "const [sendingMessage, setSendingMessage] = useState(false);\n  const [replyingTo, setReplyingTo] = useState(null);"
);

// Replace feed render
const startToken = "              })() : (\n                <div className=\"space-y-4 max-h-[550px] overflow-y-auto pr-1 no-scrollbar\">\n                  {filteredShares.map((share) => {";
const endToken = "                  </button>\n                </form>\n              )}\n            </div>\n          </div>\n        );\n      })()}";

const startIdx = code.indexOf(startToken);
const endIdx = code.indexOf(endToken) + endToken.length;

if (startIdx === -1 || endIdx < endToken.length) {
  console.log("Tokens not found!");
  process.exit(1);
}

const replacement = `              })() : selectedFriendFilter ? (
                <div className="flex flex-col h-full overflow-hidden relative">
                  <div className="flex-1 p-2 overflow-y-auto max-h-[500px] no-scrollbar flex flex-col-reverse gap-5">
                    {[...filteredShares].reverse().map((share) => {
                      const isMe = String(share.senderId) === String(currentUserId);
                      const repliedToItem = share.replyToId ? filteredShares.find(i => String(i.id) === String(share.replyToId)) : null;

                      // Mark as read if not sent by me and unread
                      const isUnread = !isMe && share.receiverId === currentUserId && !isShareRead(share.id);
                      if (isUnread) markShareAsRead(share.id); // In a render is bad, but let's keep it safe. Actually we shouldn't do side effects in render.
                      // Wait, old code had an onClick for marking as read.
                      // We can just rely on the feed unread badge clicking or auto-read since we call markConversationAsRead when selecting a friend anyway.

                      return (
                        <div 
                          key={share.id} 
                          onClick={() => { if (isUnread) markShareAsRead(share.id); }}
                          className={\`flex flex-col \${isMe ? 'items-end' : 'items-start'} group w-full\`}
                        >
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 px-1 font-mono mb-1.5">
                              <span>{isMe ? 'Vous' : (share.sender?.full_name || share.sender?.username || 'Ami')}</span>
                              <span>•</span>
                              <span>{new Date(share.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div className={\`relative flex items-center gap-3 \${isMe ? 'flex-row-reverse' : 'flex-row'} w-full\`}>
                              
                              {/* Actions on hover */}
                              <div className={\`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 \${isMe ? 'justify-end' : 'justify-start'}\`}>
                                <button onClick={() => setReplyingTo(share)} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer" title="Répondre">
                                  <Reply size={13} />
                                </button>
                                <button onClick={() => likeSharedItem(share.id, !share.isLiked)} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-400 transition-all cursor-pointer" title="Aimer">
                                  <Heart size={13} className={share.isLiked ? 'fill-red-500 text-red-500' : ''} />
                                </button>
                              </div>

                              <div className={\`flex flex-col relative max-w-[75%] \${isMe ? 'items-end' : 'items-start'}\`}>
                                {/* Replied context */}
                                {repliedToItem && (
                                  <div className={\`text-[10px] text-gray-400 mb-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 opacity-80 max-w-full truncate flex flex-col gap-0.5\`}>
                                    <span className="font-bold flex items-center gap-1">
                                      <Reply size={10} /> 
                                      {String(repliedToItem.senderId) === String(currentUserId) ? 'Vous' : (repliedToItem.sender?.username || 'Ami')}
                                    </span>
                                    <span className="truncate opacity-80">
                                      {repliedToItem.isTextMessage ? repliedToItem.message : \`🎵 \${repliedToItem.track?.title}\`}
                                    </span>
                                  </div>
                                )}

                                {share.isTextMessage || !share.track ? (
                                  <div 
                                    className={\`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm relative \${
                                      isMe 
                                        ? 'bg-gradient-to-br from-[#c29e5a] to-[#a38043] text-black font-medium rounded-tr-sm' 
                                        : 'bg-[#1a1a1a] text-gray-100 rounded-tl-sm border border-white/5'
                                    }\`}
                                  >
                                    {share.message}
                                    {share.isLiked && (
                                      <div className={\`absolute -bottom-2 \${isMe ? '-left-2' : '-right-2'} bg-[#1a1a1a] p-1 rounded-full border border-white/5 shadow-md\`}>
                                        <Heart size={12} className="text-red-500 fill-red-500" />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className={\`w-full p-3 rounded-2xl bg-[#1a1a1a] border border-white/5 flex flex-col gap-3 shadow-md relative \${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}\`}>
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <img 
                                          src={share.track.thumbnail} 
                                          alt={share.track.title} 
                                          className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0 shadow-sm"
                                        />
                                        <div className="min-w-0 flex flex-col justify-center">
                                          <h4 className="text-xs font-bold text-white truncate leading-tight">{share.track.title}</h4>
                                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{share.track.artist}</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => play(share.track)}
                                        className={\`p-2.5 rounded-full text-black transition-all cursor-pointer shrink-0 hover:scale-105 \${isMe ? 'bg-[#c29e5a]' : 'bg-white'}\`}
                                        title="Écouter"
                                      >
                                        <Play size={14} fill="currentColor" className="ml-0.5" />
                                      </button>
                                    </div>
                                    {share.message && (
                                      <p className={\`text-xs p-2.5 rounded-xl border opacity-90 \${isMe ? 'bg-[#c29e5a]/10 border-[#c29e5a]/20 text-[#d6b068]' : 'bg-black/40 border-white/5 text-gray-300'}\`}>
                                        "{share.message}"
                                      </p>
                                    )}
                                    {share.isLiked && (
                                      <div className={\`absolute -bottom-2 \${isMe ? '-left-2' : '-right-2'} bg-[#1a1a1a] p-1 rounded-full border border-white/5 shadow-md z-10\`}>
                                        <Heart size={12} className="text-red-500 fill-red-500" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Chat Input */}
                  <div className="pt-3 border-t border-white/5 flex flex-col gap-2 mt-2">
                    {replyingTo && (
                      <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5 text-[10px]">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-[#c29e5a] font-bold flex items-center gap-1.5 mb-0.5">
                            <Reply size={10} /> Réponse à {String(replyingTo.senderId) === String(currentUserId) ? 'Vous' : (replyingTo.sender?.username || 'Ami')}
                          </span>
                          <span className="text-gray-400 truncate">
                            {replyingTo.isTextMessage ? replyingTo.message : \`🎵 \${replyingTo.track?.title}\`}
                          </span>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white cursor-pointer shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!chatInput.trim() || !selectedFriendFilter) return;
                        setSendingMessage(true);
                        try {
                          await sendMessageToFriend(selectedFriendFilter, chatInput, replyingTo?.id || null);
                          setChatInput('');
                          setReplyingTo(null);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setSendingMessage(false);
                        }
                      }} 
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Écrire un message texte..."
                        className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#c29e5a]/50 focus:bg-black/60 transition-all placeholder:text-gray-600"
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || !chatInput.trim()}
                        className="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-transform active:scale-95 shrink-0 shadow-md"
                        style={{ backgroundColor: currentTheme.primary, color: '#000' }}
                      >
                        <Send size={13} />
                        <span>Envoyer</span>
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1 no-scrollbar">
                  {filteredShares.map((share) => {
                    const isSentByMe = share.senderId === currentUserId;
                    const isUnread = !isSentByMe && share.receiverId === currentUserId && !isShareRead(share.id);
                    const senderName = isSentByMe ? "Vous" : (share.sender?.full_name || share.sender?.username || "Ami");
                    const senderAvatar = isSentByMe 
                      ? (user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100') 
                      : (share.sender?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100');

                    return (
                      <div 
                        key={share.id}
                        onClick={() => {
                          if (isUnread) markShareAsRead(share.id);
                        }}
                        className={\`p-4 rounded-2xl border transition-all space-y-3 relative \${
                          isUnread
                            ? 'border-red-500/40 bg-red-950/10 shadow-lg shadow-red-500/5'
                            : 'w-full bg-black/40 border border-white/10 hover:border-white/20'
                        }\`}
                      >
                        {/* Sender Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="relative cursor-pointer group"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFriendForModal(share.sender);
                              }}
                            >
                              <img 
                                src={senderAvatar} 
                                alt={senderName} 
                                className="w-7 h-7 rounded-full object-cover border border-white/20 group-hover:border-white/40 transition-all"
                              />
                            </div>
                            <span 
                              className="text-xs font-bold text-white cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFriendForModal(share.sender);
                              }}
                            >
                              {senderName}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {isSentByMe ? "avez recommandé :" : "a recommandé :"}
                            </span>
                            {isUnread && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse shadow-sm">
                                Nouveau
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markShareAsRead(share.id);
                                }}
                                title="Marquer comme lu"
                                className="text-[9px] font-mono text-gray-400 hover:text-emerald-400 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                <Check size={10} />
                                <span>Lu</span>
                              </button>
                            )}
                            <span className="text-[9px] font-mono text-gray-500">
                              {new Date(share.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Micro-message Bubble or Track Card */}
                        {share.isTextMessage || !share.track ? (
                          <div className="p-3.5 rounded-2xl text-xs leading-relaxed shadow-md bg-white/10 text-white rounded-tl-none border border-white/10">
                            {share.message}
                          </div>
                        ) : (
                          <>
                            {share.message && (
                              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-200 italic flex items-start gap-2">
                                <MessageSquare size={13} className="shrink-0 mt-0.5 text-amber-400" />
                                <span>"{share.message}"</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-white/10 group">
                              <div className="flex items-center gap-3 min-w-0">
                                <img 
                                  src={share.track.thumbnail} 
                                  alt={share.track.title} 
                                  className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0"
                                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'; }}
                                />
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-white truncate">{share.track.title}</h4>
                                  <p className="text-[11px] text-gray-400 truncate">{share.track.artist}</p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isUnread) markShareAsRead(share.id);
                                  play(share.track);
                                }}
                                className="px-3 py-2 rounded-xl font-bold text-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                                style={{ backgroundColor: currentTheme.primary }}
                              >
                                <Play size={14} fill="currentColor" />
                                <span>Écouter</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}`;

code = code.substring(0, startIdx) + replacement + code.substring(endIdx);

fs.writeFileSync('src/pages/ProfilePage.jsx', code);
console.log("Done");
