Tu es un développeur Web Senior spécialisé en Frontend (React / Next.js / Tailwind CSS / Web Audio API) et PWA.
Aide-moi à créer l'intégralité d'une application web de musique responsive (Mobile iOS/Android & PC) installable en PWA (Progressive Web App), nommée "E GE Vinyl".

---

### 🎯 1. BRANDING, CONCEPT & DESIGN GENERAL
- **Nom de l'application :** "E GE Vinyl".
- **Typographie :** Importe et utilise la police custom "Equinox" (stockée dans /public/fonts/equinox.otf) pour le logo/titre "E GE" dans le header.
- **Interface :** Dark Mode moderne (tons noir amoled #000000, charcoal #121212, accents néon/purple).
- **Multi-plateforme :** Responsive design parfait. Barre de navigation inférieure fixe pour mobile (iOS/Android) et barre latérale (Sidebar) rétractable pour écran PC/Tablette.
- **Configuration PWA complète :** Génère le fichier manifest.json, la configuration du Service Worker pour l'installation sur l'écran d'accueil iOS/Android sans barres de navigateur, et l'affichage du bouton d'installation.

---

### 🎛️ 2. LE LECTEUR VINYLE INTERACTIF (Composant Star)
Inspire-toi de l'esthétique du lecteur vinyle interactif (style eguillermin.vercel.app) :
1. **Disque Vinyle Central :**
   - Affiche la pochette de l'album au centre de la galette noire du vinyle.
   - **Rotation :** Le vinyle tourne quand la musique est en lecture (`play`), s'arrête de façon fluide avec de l'inertie en pause (`pause`).
2. **Le Bras de Lecture (Tonearm) :**
   - Positionné en haut à droite du plateau.
   - **Animation dynamique :** S'abaisse sur le bord du disque quand la lecture commence.
   - **Avancement :** L'angle du bras pivote progressivement vers le centre du disque selon la progression du morceau (`currentTime / duration`).
   - Se relève et revient à sa position initiale en cas de pause/fin.
3. **Effets Lumineux Néo-Rétro :**
   - **Anneau lumineux (LED Ring) :** Un cercle néon réactif entoure le plateau du vinyle.
   - **Lumière d'ambiance à l'arrière (Ambilight) :** Effet de halo flouté en arrière-plan qui extrait ou adapte la couleur dominante de la pochette d'album.
   - **Battement de cœur (Heartbeat glow) :** La lumière d'arrière-plan bat doucement le rythme quand la musique joue (pulsation CSS fluide ou via l'AudioContext pour réagir au son).

---

### 📡 3. BACKEND & FLUX AUDIO (YouTube API / Piped)
- Interroge l'API publique Piped (`https://pipedapi.kavin.rocks/streams/{videoId}`) pour récupérer le flux sans pub.
- **Sélection automatique de la qualité max :** Filtre et trie les `audioStreams` pour sélectionner le bitrate le plus élevé (ex: Opus ~160 kbps en `audio/webm`).
- **Smart Streaming (Direct Client) :** Transmets l'URL du flux directement à la balise `<audio>` du navigateur pour que l'audio soit téléchargé directement par le téléphone de l'utilisateur (0 Mo de transit sur le serveur Vercel).

---

### 💾 4. FONCTIONNALITÉS CLÉS (Gestion Musique & Mode Hors-Ligne)
1. **Système de "Likes" (Favoris) :** Bouton cœur sur le lecteur pour sauvegarder les morceaux aimés dans le stockage local.
2. **Gestionnaire de Playlists :** Création, édition et suppression de playlists personnalisées.
3. **Mode "Téléchargement" Hors-Ligne :**
   - Bouton "Télécharger" sur chaque morceau.
   - Stockage du fichier audio binaire (`Blob`) directement dans le navigateur via l'API IndexedDB (avec la librairie `dexie.js`).
   - Mode Hors-Ligne automatique : si l'utilisateur n'a pas de réseau, l'app permet de lire les sons enregistrés en local.

---

### 🧱 5. STACK TECHNIQUE STRUCTURÉE
- **Framework :** Next.js (App Router) ou React + Vite.
- **Styling & Animations :** Tailwind CSS + Framer Motion.
- **Stockage Local :** `dexie.js` (IndexedDB) pour l'audio offline + playlists.
- **Icônes :** Lucide React.

Livre-moi le code complet et structuré par fichiers :
1. Fichier de config PWA + IndexedDB (`db.js`).
2. Le composant `VinylPlayer.jsx` (Vinyle, Bras, Anneau LED, Ambilight battement de cœur, Titre en police Equinox).
3. Le hook custom `useAudioPlayer.js` (fetch Piped API, lecture direct audio, switch vers cache offline).