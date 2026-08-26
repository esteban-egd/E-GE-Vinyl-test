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
        const savedGuestProfile = localStorage.getItem('ege_guest_profile');
        let initialProfile = { full_name: 'Invité E-GE', username: 'guest', avatar_url: '' };
        if (savedGuestProfile) {
          try {
            initialProfile = { ...initialProfile, ...JSON.parse(savedGuestProfile) };
          } catch {}
        }
        setProfile(initialProfile);
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

  const signInAsGuest = (guestEmail, guestUsername, guestFullName, guestAvatarUrl) => {
    const emailStr = (typeof guestEmail === 'string' && guestEmail.trim()) ? guestEmail.trim() : 'guest@ege-vinyl.local';
    const usernameStr = (typeof guestUsername === 'string' && guestUsername.trim()) ? guestUsername.trim() : 'guest';
    const fullNameStr = (typeof guestFullName === 'string' && guestFullName.trim()) ? guestFullName.trim() : 'Invité E-GE';
    const avatarStr = (typeof guestAvatarUrl === 'string' && guestAvatarUrl.trim()) ? guestAvatarUrl.trim() : '';

    const guest = { 
      id: 'guest-' + (usernameStr || 'local-user'), 
      email: emailStr, 
      is_guest: true 
    };
    try {
      localStorage.setItem('ege_guest_user', JSON.stringify(guest));
    } catch (err) {
      console.warn('[Auth] LocalStorage error for guest user:', err);
    }
    setUser(guest);
    setProfile({ 
      full_name: fullNameStr, 
      username: usernameStr,
      avatar_url: avatarStr
    });
  };

  const value = {
    user,
    profile,
    fetchProfile,
    signIn: async (email, password) => {
      try {
        const res = await supabase.auth.signInWithPassword({ email, password });
        if (!res.error && res.data?.user) {
          localStorage.removeItem('ege_guest_user');
          setUser(res.data.user);
          if (res.data.user.id) {
            fetchProfile(res.data.user.id);
          }
        }
        return res;
      } catch (err) {
        return { data: null, error: err };
      }
    },
    signUp: async (email, password) => {
      try {
        const res = await supabase.auth.signUp({ email, password });
        if (!res.error && res.data?.user && res.data?.session) {
          localStorage.removeItem('ege_guest_user');
          setUser(res.data.user);
          if (res.data.user.id) {
            fetchProfile(res.data.user.id);
          }
        }
        return res;
      } catch (err) {
        return { data: null, error: err };
      }
    },
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
        setProfile((prev) => {
          const next = { ...prev, ...updates };
          try {
            localStorage.setItem('ege_guest_profile', JSON.stringify(next));
          } catch {}
          return next;
        });
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
