const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistPage.jsx', 'utf8');

const targetStr = `{/* DISCOGRAPHY SECTION */}
        {!selectedAlbum && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Discographie</h2>
            </div>
            
            <div className="flex gap-3 mb-8">
              {albums.length > 0 && (
                <button 
                  onClick={() => setDiscoFilter('albums')}
                  className={\`px-5 py-2 rounded-full text-sm font-semibold transition-colors \${discoFilter === 'albums' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}\`}
                >
                  Albums
                </button>
              )}
              {singles.length > 0 && (
                <button 
                  onClick={() => setDiscoFilter('singles')}
                  className={\`px-5 py-2 rounded-full text-sm font-semibold transition-colors \${discoFilter === 'singles' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}\`}
                >
                  Singles et EP
                </button>
              )}
              {compilations.length > 0 && (
                <button 
                  onClick={() => setDiscoFilter('compilations')}
                  className={\`px-5 py-2 rounded-full text-sm font-semibold transition-colors \${discoFilter === 'compilations' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}\`}
                >
                  Compilations
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {currentDiscoList.map((album) => (
                <div
                  key={album.id}
                  onClick={() => handlePlayAlbum(album)}
                  className="p-4 rounded-xl bg-[#181818] hover:bg-[#282828] transition-all duration-300 group cursor-pointer flex flex-col hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="relative aspect-square rounded-md overflow-hidden mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                    <img 
                      src={album.artwork} 
                      alt={album.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = artist.banner || artist.avatar; }}
                    />
                    <div className="absolute right-2 bottom-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-black shadow-xl"
                        style={{ backgroundColor: currentTheme?.primary || '#1ED760' }}
                      >
                        <Play size={24} fill="currentColor" className="ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-base truncate mb-1 group-hover:underline decoration-white/50">{album.title}</h3>
                  <div className="flex items-center text-sm text-gray-400 truncate gap-2">
                    <span className="capitalize">{album.year}</span>
                    <span>•</span>
                    <span className="uppercase text-xs tracking-wider font-semibold">{album.recordType || 'Album'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}`;

const replacementStr = `{/* DISCOGRAPHY SECTION */}
        {!selectedAlbum && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Discographie</h2>
            </div>
            
            {albums.length === 0 && singles.length === 0 && compilations.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun album répertorié pour cet artiste.</p>
            ) : (
              <>
                <div className="flex gap-3 mb-8">
                  {albums.length > 0 && (
                    <button 
                      onClick={() => setDiscoFilter('albums')}
                      className={\`px-5 py-2 rounded-full text-sm font-semibold transition-colors \${activeFilter === 'albums' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}\`}
                    >
                      Albums
                    </button>
                  )}
                  {singles.length > 0 && (
                    <button 
                      onClick={() => setDiscoFilter('singles')}
                      className={\`px-5 py-2 rounded-full text-sm font-semibold transition-colors \${activeFilter === 'singles' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}\`}
                    >
                      Singles et EP
                    </button>
                  )}
                  {compilations.length > 0 && (
                    <button 
                      onClick={() => setDiscoFilter('compilations')}
                      className={\`px-5 py-2 rounded-full text-sm font-semibold transition-colors \${activeFilter === 'compilations' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}\`}
                    >
                      Compilations
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {currentDiscoList.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => handlePlayAlbum(album)}
                      className="p-4 rounded-xl bg-[#181818] hover:bg-[#282828] transition-all duration-300 group cursor-pointer flex flex-col hover:shadow-2xl hover:-translate-y-1"
                    >
                      <div className="relative aspect-square rounded-md overflow-hidden mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                        <img 
                          src={album.artwork} 
                          alt={album.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = artist.banner || artist.avatar; }}
                        />
                        <div className="absolute right-2 bottom-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-black shadow-xl"
                            style={{ backgroundColor: currentTheme?.primary || '#1ED760' }}
                          >
                            <Play size={24} fill="currentColor" className="ml-1" />
                          </div>
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-base truncate mb-1 group-hover:underline decoration-white/50">{album.title}</h3>
                      <div className="flex items-center text-sm text-gray-400 truncate gap-2">
                        <span className="capitalize">{album.year}</span>
                        <span>•</span>
                        <span className="uppercase text-xs tracking-wider font-semibold">{album.recordType || 'Album'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  console.log("Patched rendering of albums");
} else {
  console.log("Album rendering section not found");
}

fs.writeFileSync('src/pages/ArtistPage.jsx', code);
