import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { searchOfflineDexie } from '../services/musicDataService';
import { searchDeezerUnified } from '../services/searchService';
import { classifyTrack, sortTracksByPriority } from '../utils/trackClassifier';
import { supabase } from '../lib/supabaseClient';
import db from '../lib/db';
import { useAuth } from './AuthContext';

export const SearchCtx = createContext(null);

const DEFAULT_SUGGESTIONS = [
  'Daft Punk',
  'Téléphone',
  'The Weeknd',
  'PNL',
  'Dua Lipa',
  'Lynyrd Skynyrd',
  'Queen',
  'Stromae',
  'Billie Eilish',
  'David Bowie'
];

// Cache mémoire pour des résultats de recherche instantanés à la frappe
const searchMemoryCache = new Map();

export function SearchProvider({ children }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ tracks: [], artists: [], albums: [], isOffline: false });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'tracks', 'artists', 'albums'
  const [audioMode, setAudioModeState] = useState(() => {
    try {
      return localStorage.getItem('ege_audio_mode') || 'studio';
    } catch {
      return 'studio';
    }
  }); // 'studio' (défaut) | 'live'
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const searchTimeoutRef = useRef(null);
  const activeSearchIdRef = useRef(0);
  const audioModeRef = useRef(audioMode);
  const activeAbortControllerRef = useRef(null);

  useEffect(() => {
    audioModeRef.current = audioMode;
  }, [audioMode]);

  const setAudioMode = useCallback((newMode) => {
    const validMode = newMode === 'live' ? 'live' : 'studio';
    setAudioModeState(validMode);
    audioModeRef.current = validMode;
    try {
      localStorage.setItem('ege_audio_mode', validMode);
    } catch (_) {}

    // Réordonne instantanément les résultats actuels
    setResults(prev => {
      if (!prev || !prev.tracks || prev.tracks.length === 0) return prev;
      return {
        ...prev,
        tracks: sortTracksByPriority(prev.tracks, validMode)
      };
    });
  }, []);

  // Écouter les changements d'état réseau
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Chargement de l'historique (Dexie local + Supabase si connecté)
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      let localItems = [];
      try {
        if (db?.searchHistory) {
          localItems = await db.searchHistory
            .orderBy('createdAt')
            .reverse()
            .limit(10)
            .toArray();
        }
      } catch (dexieErr) {
        console.warn('Dexie search history fetch error:', dexieErr);
      }

      if (user) {
        try {
          const { data, error: supaErr } = await supabase
            .from('search_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (!supaErr && data && data.length > 0) {
            setRecentSearches(data);
            return;
          }
        } catch (supaErr) {
          console.warn('Supabase search history fetch error:', supaErr?.message);
        }
      }

      // Mode invité ou fallback local
      setRecentSearches(
        localItems.map(item => ({
          id: item.id,
          query: item.query,
          created_at: item.createdAt
        }))
      );
    } catch (err) {
      console.error('Error fetching search history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addRecentSearch = useCallback(async (term) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    
    // Éviter les doublons consécutifs
    if (recentSearches.length > 0 && recentSearches[0].query?.toLowerCase() === clean.toLowerCase()) {
      return;
    }

    try {
      // 1. Enregistrement local Dexie
      if (db?.searchHistory) {
        const existing = await db.searchHistory
          .filter(item => item.query?.toLowerCase() === clean.toLowerCase())
          .toArray();
        for (const ex of existing) {
          await db.searchHistory.delete(ex.id);
        }
        await db.searchHistory.add({
          userId: user ? user.id : 'guest',
          query: clean,
          createdAt: new Date().toISOString()
        });
      }

      // 2. Synchronisation Supabase si connecté
      if (user) {
        await supabase
          .from('search_history')
          .insert({
            user_id: user.id,
            query: clean
          });
      }

      fetchHistory();
    } catch (err) {
      console.warn('Error adding search history:', err);
    }
  }, [user, recentSearches, fetchHistory]);

  const removeRecentSearch = useCallback(async (id) => {
    try {
      if (db?.searchHistory && typeof id === 'number') {
        await db.searchHistory.delete(id);
      } else if (db?.searchHistory) {
        await db.searchHistory.where('id').equals(id).delete().catch(() => {});
      }

      if (user) {
        await supabase
          .from('search_history')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      }

      setRecentSearches((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error deleting search history:', err);
    }
  }, [user]);

  const clearRecentSearches = useCallback(async () => {
    try {
      if (db?.searchHistory) {
        await db.searchHistory.clear();
      }
      if (user) {
        await supabase
          .from('search_history')
          .delete()
          .eq('user_id', user.id);
      }
      setRecentSearches([]);
    } catch (err) {
      console.error('Error clearing search history:', err);
    }
  }, [user]);

  // Exécution optimisée de la recherche avec cache instantané & mode Offline-First
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      setResults({ tracks: [], artists: [], albums: [], isOffline: false });
      setIsSearching(false);
      return;
    }

    const clean = searchQuery.trim();
    const currentMode = audioModeRef.current || 'studio';
    const cacheKey = `${clean.toLowerCase()}_${currentMode}`;

    // 0. Si hors-ligne (mode avion ou réseau coupé), exécuter directement la recherche locale Dexie
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsSearching(true);
      setError(null);
      try {
        const offlineResults = await searchOfflineDexie(clean, currentMode);
        setResults({ ...offlineResults, isOffline: true });
      } catch (offlineErr) {
        console.error('[SearchContext] Offline search error:', offlineErr);
        setError('Erreur lors de la recherche hors-ligne.');
      } finally {
        setIsSearching(false);
      }
      return;
    }

    // Si déjà en cache avec des résultats, affichage 0ms
    if (searchMemoryCache.has(cacheKey)) {
      const cached = searchMemoryCache.get(cacheKey);
      if (cached && (cached.tracks?.length > 0 || cached.artists?.length > 0 || cached.albums?.length > 0)) {
        setResults({ ...cached, isOffline: false });
        setIsSearching(false);
        setError(null);
        return;
      } else {
        searchMemoryCache.delete(cacheKey);
      }
    }

    // Annuler la requête précédente en cours si l'utilisateur continue de taper
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    const currentSearchId = ++activeSearchIdRef.current;
    setIsSearching(true);
    setError(null);

    try {
      // 1. Appeler le service de recherche Deezer unifié ultra-rapide
      const finalUnified = await searchDeezerUnified(clean, controller.signal);

      // Si l'utilisateur a tapé une autre recherche entre-temps, ignorer
      if (activeSearchIdRef.current !== currentSearchId || controller.signal.aborted) {
        return;
      }

      // Décorer les morceaux avec le statut téléchargé en local si présent dans Dexie
      let downloadedSet = new Set();
      try {
        if (db?.offlineTracks) {
          const downloaded = await db.offlineTracks.toArray().catch(() => []);
          downloadedSet = new Set(downloaded.map(d => d.videoId || d.id));
        }
      } catch (_) {}

      const decoratedTracks = (finalUnified.tracks || []).map(t => {
        const id = t.videoId || t.id;
        const classified = classifyTrack(t) || t;
        return {
          ...classified,
          isOfflineDownloaded: downloadedSet.has(id) || Boolean(t.isOfflineDownloaded)
        };
      });

      // Tri par ordre de priorité selon le mode sélectionné
      const prioritizedTracks = sortTracksByPriority(decoratedTracks, currentMode);

      const newResults = {
        tracks: prioritizedTracks,
        artists: finalUnified.artists || [],
        albums: finalUnified.albums || [],
        bestMatch: finalUnified.bestMatch || null,
        bestArtist: finalUnified.bestArtist || null,
        bestArtistTracks: finalUnified.bestArtistTracks || [],
        isOffline: false
      };

      if (prioritizedTracks.length > 0 || newResults.artists.length > 0 || newResults.albums.length > 0) {
        searchMemoryCache.set(cacheKey, newResults);
      }
      setResults(newResults);

      if (clean.length >= 2) {
        addRecentSearch(clean);
      }
    } catch (err) {
      console.warn('[SearchContext] Erreur recherche en ligne:', err);
      try {
        const fallbackResults = await searchOfflineDexie(clean, currentMode);
        if (activeSearchIdRef.current === currentSearchId) {
          setResults({
            ...fallbackResults,
            bestArtist: null,
            bestArtistTracks: [],
            isOffline: false
          });
        }
      } catch (_) {
        if (activeSearchIdRef.current === currentSearchId) {
          setError('Impossible de charger les résultats.');
        }
      }
    } finally {
      if (activeSearchIdRef.current === currentSearchId) {
        setIsSearching(false);
        activeAbortControllerRef.current = null;
      }
    }
  }, [addRecentSearch]);

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!newQuery.trim()) {
      setIsSearching(false);
      setResults({ tracks: [], artists: [], albums: [] });
      return;
    }

    const currentMode = audioModeRef.current || 'studio';
    const cacheKey = `${newQuery.trim().toLowerCase()}_${currentMode}`;
    if (searchMemoryCache.has(cacheKey)) {
      const cached = searchMemoryCache.get(cacheKey);
      if (cached && (cached.tracks?.length > 0 || cached.artists?.length > 0 || cached.albums?.length > 0)) {
        setResults(cached);
        setIsSearching(false);
        return;
      } else {
        searchMemoryCache.delete(cacheKey);
      }
    }

    setIsSearching(true);
    // Debounce réactif 300ms
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, 300);
  }, [performSearch]);

  // Déclenchement instantané (ex: appui sur Entrée ou clic sur tag/suggestion)
  const searchImmediately = useCallback((term) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setQuery(term);
    performSearch(term);
  }, [performSearch]);

  const resetSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setQuery('');
    setResults({ tracks: [], artists: [], albums: [] });
    setIsSearching(false);
    setError(null);
  }, []);

  const value = {
    query,
    setQuery: handleQueryChange,
    searchImmediately,
    results,
    activeFilter,
    setActiveFilter,
    audioMode,
    setAudioMode,
    isSearching,
    isOffline,
    historyLoading,
    error,
    recentSearches,
    suggestions: DEFAULT_SUGGESTIONS,
    performSearch,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    resetSearch
  };

  return <SearchCtx.Provider value={value}>{children}</SearchCtx.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchCtx);
  if (!ctx) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return ctx;
}

