import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function useSearchHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching search history:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addSearch = useCallback(async (query) => {
    if (!user || !query || !query.trim()) return;

    const cleanQuery = query.trim();
    
    // Éviter les doublons consécutifs dans l'historique affiché
    if (history.length > 0 && history[0].query.toLowerCase() === cleanQuery.toLowerCase()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          query: cleanQuery
        });

      if (error) throw error;
      fetchHistory();
    } catch (err) {
      console.error('Error adding search history:', err.message);
    }
  }, [user, history, fetchHistory]);

  const deleteSearch = useCallback(async (id) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting search history:', err.message);
    }
  }, [user]);

  const clearHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setHistory([]);
    } catch (err) {
      console.error('Error clearing search history:', err.message);
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
