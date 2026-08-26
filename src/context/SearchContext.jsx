import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { searchUnified } from '../services/musicDataService';
import { searchLyraTracks } from '../services/lyraSearch';
import { supabase } from '../lib/supabaseClient';
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
  const [results, setResults] = useState({ tracks: [], artists: [], albums: [] });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'tracks', 'artists', 'albums'
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const searchTimeoutRef = useRef(null);
  const activeSearchIdRef = useRef(0);

  // Chargement de l'historique Supabase
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setRecentSearches([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentSearches(data || []);
    } catch (err) {
      console.error('Error fetching search history:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addRecentSearch = useCallback(async (term) => {
    if (!term || !term.trim() || !user) return;
    const clean = term.trim();
    
    // Éviter les doublons consécutifs
    if (recentSearches.length > 0 && recentSearches[0].query.toLowerCase() === clean.toLowerCase()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          query: clean
        });

      if (error) throw error;
      fetchHistory();
    } catch (err) {
      console.error('Error adding search history:', err.message);
    }
  }, [user, recentSearches, fetchHistory]);

  const removeRecentSearch = useCallback(async (id) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setRecentSearches((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error deleting search history:', err.message);
    }
  }, [user]);

  const clearRecentSearches = useCallback(async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setRecentSearches([]);
    } catch (err) {
      console.error('Error clearing search history:', err.message);
    }
  }, [user]);

  // Exécution optimisée de la recherche avec cache instantané
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      setResults({ tracks: [], artists: [], albums: [] });
      setIsSearching(false);
      return;
    }

    const clean = searchQuery.trim();
    const cacheKey = clean.toLowerCase();

    // Si déjà en cache, affichage 0ms
    if (searchMemoryCache.has(cacheKey)) {
      setResults(searchMemoryCache.get(cacheKey));
      setIsSearching(false);
      setError(null);
      return;
    }

    const currentSearchId = ++activeSearchIdRef.current;
    setIsSearching(true);
    setError(null);

    try {
      // Recherche parallèle ultra-rapide
      const [lyraTracks, unifiedData] = await Promise.allSettled([
        searchLyraTracks(clean),
        searchUnified(clean)
      ]);

      // Si l'utilisateur a tapé une autre recherche entre-temps, ignorer les anciens résultats
      if (activeSearchIdRef.current !== currentSearchId) {
        return;
      }

      const finalLyraTracks = lyraTracks.status === 'fulfilled' ? lyraTracks.value : [];
      const finalUnified = unifiedData.status === 'fulfilled' ? unifiedData.value : { tracks: [], artists: [], albums: [] };

      // Fusion intelligente : privilégier les morceaux unifiés enrichis, triés et filtrés (studio vs live)
      const combinedTracks = (finalUnified.tracks && finalUnified.tracks.length > 0)
        ? finalUnified.tracks
        : finalLyraTracks;

      const newResults = {
        tracks: combinedTracks || [],
        artists: finalUnified.artists || [],
        albums: finalUnified.albums || []
      };

      searchMemoryCache.set(cacheKey, newResults);
      setResults(newResults);

      if (clean.length >= 2) {
        addRecentSearch(clean);
      }
    } catch (err) {
      console.error('[SearchContext] Erreur recherche:', err);
      if (activeSearchIdRef.current === currentSearchId) {
        setError('Impossible de charger les résultats. Réessayez.');
      }
    } finally {
      if (activeSearchIdRef.current === currentSearchId) {
        setIsSearching(false);
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

    const cacheKey = newQuery.trim().toLowerCase();
    if (searchMemoryCache.has(cacheKey)) {
      setResults(searchMemoryCache.get(cacheKey));
      setIsSearching(false);
      return;
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
    isSearching,
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

