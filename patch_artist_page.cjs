const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistPage.jsx', 'utf8');

// 1. Add isBioExpanded state
if (!code.includes('const [isBioExpanded, setIsBioExpanded]')) {
  code = code.replace(
    'const [artist, setArtist] = useState(null);',
    'const [artist, setArtist] = useState(null);\n  const [isBioExpanded, setIsBioExpanded] = useState(false);'
  );
}

// 2. Replace the About section layout
const oldAbout = `            {/* RIGHT COLUMN: About */}
            <div className="xl:col-span-1">
              <h2 className="text-2xl font-bold text-white mb-6">À Propos</h2>
              <div className="relative rounded-2xl overflow-hidden group h-64 md:h-auto md:aspect-square bg-[#282828]">
                <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6">
                  <div className="text-white font-bold text-lg mb-2">{new Intl.NumberFormat('fr-FR').format(artist.monthlyListeners || 0)} auditeurs</div>
                  <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
                    {artist.bio}
                  </p>
                </div>
              </div>
            </div>`;

const newAbout = `            {/* RIGHT COLUMN: About */}
            <div className="xl:col-span-1 flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-6">À Propos</h2>
              <div className="relative rounded-2xl overflow-hidden bg-[#181818] border border-white/5 flex flex-col w-full shadow-lg">
                <div className="relative h-48 sm:h-64 md:h-56 w-full shrink-0 overflow-hidden group bg-black/40">
                  <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />
                  <div className="absolute bottom-4 left-6">
                    <div className="text-white font-bold text-xl drop-shadow-md">{new Intl.NumberFormat('fr-FR').format(artist.monthlyListeners || 0)} auditeurs</div>
                  </div>
                </div>
                
                <div className="px-6 pb-6 pt-2 flex-grow bg-[#181818]">
                   <div 
                     className={\`relative transition-all duration-700 ease-in-out overflow-hidden \${isBioExpanded ? 'max-h-[2000px]' : 'max-h-[72px]'}\`}
                   >
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line text-justify">
                        {artist.bio}
                      </p>
                      
                      {/* Gradient for fading out text when collapsed */}
                      {!isBioExpanded && artist.bio?.length > 150 && (
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#181818] to-transparent pointer-events-none" />
                      )}
                   </div>
                   
                   {artist.bio?.length > 150 && (
                     <button 
                       onClick={() => setIsBioExpanded(!isBioExpanded)}
                       className="mt-4 text-sm font-bold text-white hover:text-amber-300 transition-colors w-full text-left focus:outline-none"
                     >
                       {isBioExpanded ? 'Voir moins' : 'En savoir plus'}
                     </button>
                   )}
                </div>
              </div>
            </div>`;

if (code.includes('line-clamp-3')) {
  code = code.replace(oldAbout, newAbout);
  fs.writeFileSync('src/pages/ArtistPage.jsx', code);
  console.log("Patched About section in ArtistPage.jsx");
} else {
  console.log("About section not found or already patched.");
}
