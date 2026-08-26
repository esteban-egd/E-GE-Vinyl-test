import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import db from '../lib/db';

export function useSearchHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
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
          const { data, error } = await supabase
            .from('search_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (!error && data && data.length > 0) {
            setHistory(data);
            return;
          }
        } catch (supaErr) {
          console.warn('Supabase search history fetch error:', supaErr?.message);
        }
      }

      setHistory(
        localItems.map(item => ({
          id: item.id,
          query: item.query,
          created_at: item.createdAt
        }))
      );
    } catch (err) {
      console.error('Error fetching search history:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addSearch = useCallback(async (query) => {
    if (!query || !query.trim()) return;

    const cleanQuery = query.trim();
    
    // Éviter les doublons consécutifs dans l'historique affiché
    if (history.length > 0 && history[0].query?.toLowerCase() === cleanQuery.toLowerCase()) {
      return;
    }

    try {
      if (db?.searchHistory) {
        const existing = await db.searchHistory
          .filter(item => item.query?.toLowerCase() === cleanQuery.toLowerCase())
          .toArray();
        for (const ex of existing) {
          await db.searchHistory.delete(ex.id);
        }
        await db.searchHistory.add({
          userId: user ? user.id : 'guest',
          query: cleanQuery,
          createdAt: new Date().toISOString()
        });
      }

      if (user) {
        await supabase
          .from('search_history')
          .insert({
            user_id: user.id,
            query: cleanQuery
          });
      }

      fetchHistory();
    } catch (err) {
      console.error('Error adding search history:', err);
    }
  }, [user, history, fetchHistory]);

  const deleteSearch = useCallback(async (id) => {
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

      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting search history:', err);
    }
  }, [user]);

  const clearHistory = useCallback(async () => {
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
      setHistory([]);
    } catch (err) {
      console.error('Error clearing search history:', err);
    }
  }, [user]);

  return {
    history,
    loading,
    addSearch,
    deleteSearch,
    clearHistory,
    refreshHistory: fetchHistory
  };
}
