import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching profile:', error.message);
      }

      if (data) {
        setProfile(data);

        // 2. SCRIPT DE RESYNCHRONISATION AUTOMATIQUE (MIGRATION DE SECOURS)
        // Remplit la colonne Display name dans Supabase Auth pour les anciens comptes
        if (data.full_name) {
          try {
            await supabase.auth.updateUser({
              data: {
                full_name: data.full_name,
                username: data.username || data.full_name
              }
            });
          } catch (syncErr) {
            console.warn('[AuthContext] Automatic resync of auth metadata failed:', syncErr?.message);
          }
        }
        return data;
      }
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    }
    return null;
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

    let lastUserId = null;

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        lastUserId = currentUser.id;
        fetchProfile(currentUser.id);
      }
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
      
      const currentUserId = currentUser?.id || null;
      if (currentUserId !== lastUserId) {
        lastUserId = currentUserId;
        try {
          window.dispatchEvent(new CustomEvent('lyra:auth_changed', { detail: { user: currentUser } }));
          window.dispatchEvent(new CustomEvent('lyra:reset_player'));
        } catch (_) {}
      }
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
    const guestProfile = { 
      id: guest.id,
      full_name: fullNameStr, 
      username: usernameStr,
      email: emailStr,
      avatar_url: avatarStr
    };
    try {
      localStorage.setItem('ege_guest_user', JSON.stringify(guest));
      localStorage.setItem('ege_guest_profile', JSON.stringify(guestProfile));
      supabase.from('profiles').upsert(guestProfile).catch(() => {});
    } catch (err) {
      console.warn('[Auth] LocalStorage error for guest user:', err);
    }
    setUser(guest);
    setProfile(guestProfile);
    try {
      window.dispatchEvent(new CustomEvent('lyra:auth_changed', { detail: { user: guest } }));
      window.dispatchEvent(new CustomEvent('lyra:reset_player'));
    } catch (_) {}
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
          try {
            window.dispatchEvent(new CustomEvent('lyra:auth_changed', { detail: { user: res.data.user } }));
            window.dispatchEvent(new CustomEvent('lyra:reset_player'));
          } catch (_) {}
        }
        return res;
      } catch (err) {
        return { data: null, error: err };
      }
    },
    signUp: async (email, password, metadata = {}) => {
      try {
        const fullName = metadata.displayName || metadata.full_name || metadata.username || email.split('@')[0];
        const username = metadata.username ? metadata.username.replace('@', '') : email.split('@')[0];
        const avatarUrl = metadata.avatar_url || '';

        const res = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              username: username,
              avatar_url: avatarUrl
            }
          }
        });

        // Set initial optimistic profile immediately
        const initialProfile = {
          full_name: fullName,
          username: username,
          avatar_url: avatarUrl
        };

        if (!res.error && res.data?.user) {
          localStorage.removeItem('ege_guest_user');
          setUser(res.data.user);
          setProfile(initialProfile);

          if (res.data.user.id) {
            // Persist into Supabase profiles table directly
            try {
              await supabase.from('profiles').upsert({
                id: res.data.user.id,
                full_name: fullName,
                username: username,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
              });
            } catch (_) {}
            fetchProfile(res.data.user.id);
          }

          try {
            window.dispatchEvent(new CustomEvent('lyra:auth_changed', { detail: { user: res.data.user } }));
            window.dispatchEvent(new CustomEvent('lyra:reset_player'));
          } catch (_) {}
        }
        return res;
      } catch (err) {
        return { data: null, error: err };
      }
    },
    signInAsGuest,
    signOut: async () => {
      localStorage.removeItem('ege_guest_user');
      try {
        window.dispatchEvent(new CustomEvent('lyra:reset_player'));
      } catch (_) {}
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      try {
        window.dispatchEvent(new CustomEvent('lyra:auth_changed', { detail: { user: null } }));
        window.dispatchEvent(new CustomEvent('lyra:reset_player'));
      } catch (_) {}
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
