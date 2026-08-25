import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    }
  };

  useEffect(() => {
    // Check local guest session
    const guestUser = localStorage.getItem('ege_guest_user');
    if (guestUser) {
      try {
        const parsed = JSON.parse(guestUser);
        setUser(parsed);
        setProfile({ full_name: 'Invité E-GE', username: 'guest' });
        setLoading(false);
        return;
      } catch {}
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchProfile(currentUser.id);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Listen for changes on auth state (signed in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      if (currentUser) {
        localStorage.removeItem('ege_guest_user');
        setUser(currentUser);
        fetchProfile(currentUser.id);
      } else if (!localStorage.getItem('ege_guest_user')) {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe?.();
  }, []);

  const signInAsGuest = () => {
    const guest = { id: 'guest-local-user', email: 'guest@ege-vinyl.local', is_guest: true };
    localStorage.setItem('ege_guest_user', JSON.stringify(guest));
    setUser(guest);
    setProfile({ full_name: 'Invité E-GE', username: 'guest' });
  };

  const value = {
    user,
    profile,
    fetchProfile,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signInAsGuest,
    signOut: async () => {
      localStorage.removeItem('ege_guest_user');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    },
    updateProfile: async (updates) => {
      if (!user) throw new Error('No user logged in');
      if (user.is_guest) {
        setProfile((prev) => ({ ...prev, ...updates }));
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      await fetchProfile(user.id);
    },
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
