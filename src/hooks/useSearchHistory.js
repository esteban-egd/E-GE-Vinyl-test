import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import db from '../lib/db';

export function useSearchHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const userId = user?.id || user?.uid;

  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setHistory(data);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Error fetching search history:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      if (userId) {
        await supabase
          .from('search_history')
          .insert({
            user_id: userId,
            query: cleanQuery
          });
      }

      fetchHistory();
    } catch (err) {
      console.error('Error adding search history:', err);
    }
  }, [userId, history, fetchHistory]);

  const deleteSearch = useCallback(async (id) => {
    if (!userId) return;
    try {
      await supabase
        .from('search_history')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting search history:', err);
    }
  }, [userId]);

  const clearHistory = useCallback(async () => {
    if (!userId) return;
    try {
      await supabase
        .from('search_history')
        .delete()
        .eq('user_id', userId);

      setHistory([]);
    } catch (err) {
      console.error('Error clearing search history:', err);
    }
  }, [userId]);

  return {
    history,
    loading,
    addSearch,
    deleteSearch,
    clearHistory,
    refreshHistory: fetchHistory
  };
}
