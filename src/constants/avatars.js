import capybaraImg from '../assets/images/capybara_avatar_1787780827335.jpg';
import cyberCatImg from '../assets/images/cyber_cat_avatar_1787780841357.jpg';
import raccoonImg from '../assets/images/raccoon_avatar_1787780854828.jpg';
import redPandaImg from '../assets/images/red_panda_avatar_1787780868202.jpg';
import polarFoxImg from '../assets/images/polar_fox_avatar_1787780879370.jpg';

export const PRESET_AVATARS = [
  {
    id: 'capybara-chill',
    name: 'Capybara Chill',
    subtitle: 'Casque Lo-Fi & Vibe Zen',
    tag: 'Chill',
    url: capybaraImg,
    fallback: 'https://api.dicebear.com/7.x/bottts/svg?seed=CapybaraChill&backgroundColor=1db954'
  },
  {
    id: 'cyber-cat',
    name: 'Chat Cyberpunk',
    subtitle: 'Visière Néon & Rétrofutur',
    tag: 'Cyberpunk',
    url: cyberCatImg,
    fallback: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberCat&backgroundColor=00f2fe'
  },
  {
    id: 'raccoon-vinyl',
    name: 'Raton Laveur Mélomane',
    subtitle: 'Vinyle Collector sous le bras',
    tag: 'Vinyl',
    url: raccoonImg,
    fallback: 'https://api.dicebear.com/7.x/bottts/svg?seed=RaccoonVinyl&backgroundColor=c29e5a'
  },
  {
    id: 'red-panda-dj',
    name: 'Panda Roux DJ',
    subtitle: 'Mix Kawaii & Platines',
    tag: 'Kawaii',
    url: redPandaImg,
    fallback: 'https://api.dicebear.com/7.x/bottts/svg?seed=RedPandaDJ&backgroundColor=ff4e50'
  },
  {
    id: 'polar-fox',
    name: 'Renard Polaire Audiophile',
    subtitle: 'Acoustique Crystal 320 kbps',
    tag: 'Audiophile',
    url: polarFoxImg,
    fallback: 'https://api.dicebear.com/7.x/bottts/svg?seed=PolarFox&backgroundColor=8a2be2'
  }
];
