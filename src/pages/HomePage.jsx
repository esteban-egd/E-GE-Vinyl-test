import VinylPlayer from '../components/player/VinylPlayer';
import { useAudio } from '../context/AudioContext';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const { currentTrack } = useAudio();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full fade-in">
      {currentTrack ? (
        <VinylPlayer />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
           <div className="w-32 h-32 rounded-full border-2 border-dashed border-[#333] flex items-center justify-center mb-6">
              <div className="text-equinox text-4xl text-[#333]">E GE</div>
           </div>
           
           <h2 className="text-2xl font-bold text-white mb-2">Prêt à écouter ?</h2>
           <p className="text-gray-400 mb-8 max-w-xs">
             Recherchez un morceau ou explorez votre bibliothèque pour lancer le lecteur vinyle.
           </p>
           
           <button 
             onClick={() => navigate('/search')}
             className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-full font-medium transition-colors neon-purple"
           >
             <Search size={20} />
             <span>Rechercher</span>
           </button>
        </div>
      )}
    </div>
  );
}
