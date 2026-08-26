const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistPage.jsx', 'utf8');

// Replace the isLoading return block with a Skeleton loader
const loadingSection = `  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div 
          className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mb-4"
          style={{ borderColor: \`\${currentTheme?.primary || '#1ED760'}30\`, borderTopColor: currentTheme?.primary || '#1ED760' }}
        />
        <p className="text-gray-400 text-sm tracking-wider uppercase">Chargement de l'artiste...</p>
      </div>
    );
  }`;

const newLoadingSection = `  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full pb-32 bg-[#121212] animate-pulse">
        {/* Skeleton Hero Header */}
        <div className="relative w-full h-[360px] md:h-[420px] bg-[#181818]">
          <div className="absolute bottom-10 left-4 md:left-8 right-8 z-20 flex flex-col justify-end gap-4">
            <div className="w-32 h-6 bg-white/10 rounded-full"></div>
            <div className="w-2/3 h-16 md:h-24 bg-white/10 rounded-xl"></div>
            <div className="w-48 h-5 bg-white/10 rounded-md"></div>
          </div>
        </div>
        {/* Skeleton Main Content */}
        <div className="px-4 md:px-8 max-w-[1400px] mx-auto w-full relative z-20 mt-8">
          <div className="flex gap-4 mb-8">
            <div className="w-16 h-16 bg-white/10 rounded-full"></div>
            <div className="w-12 h-12 bg-white/10 rounded-full mt-2"></div>
            <div className="w-24 h-12 bg-white/10 rounded-full mt-2"></div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <div className="w-48 h-8 bg-white/10 rounded-md mb-6"></div>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex gap-4 items-center mb-4 p-2">
                  <div className="w-12 h-12 bg-white/10 rounded-md shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-1/2 h-5 bg-white/10 rounded-md"></div>
                    <div className="w-1/3 h-4 bg-white/10 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="xl:col-span-1">
              <div className="w-32 h-8 bg-white/10 rounded-md mb-6"></div>
              <div className="w-full aspect-square bg-white/10 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }`;

if (code.includes(loadingSection)) {
  code = code.replace(loadingSection, newLoadingSection);
  console.log("Patched isLoading");
} else {
  console.log("isLoading section not found");
}

fs.writeFileSync('src/pages/ArtistPage.jsx', code);
