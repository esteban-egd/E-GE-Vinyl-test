import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { updateUserStatus } from '../services/userBddService';

const AuthContext = createContext({});

const SAVED_ACCOUNTS_KEY = 'ege_saved_accounts';

const getSavedAccountsFromStorage = () => {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
};

const persistSavedAccount = (acc) => {
  if (!acc || !acc.id) return;
  try {
    const list = getSavedAccountsFromStorage();
    const existingIndex = list.findIndex(a => a.id === acc.id || (a.email && acc.email && a.email.toLowerCase() === acc.email.toLowerCase()));
    const accountEntry = {
      id: acc.id,
      email: acc.email || '',
      username: acc.username || acc.email?.split('@')[0] || 'utilisateur',
      full_name: acc.full_name || acc.displayName || acc.username || acc.email?.split('@')[0] || 'Mélomane E-GE',
      avatar_url: acc.avatar_url || '',
      last_login: Date.now()
    };
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...accountEntry };
    } else {
      list.unshift(accountEntry);
    }
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(list.slice(0, 10)));
  } catch (_) {}
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState(getSavedAccountsFromStorage);

  const refreshSavedAccounts = useCallback(() => {
    setSavedAccounts(getSavedAccountsFromStorage());
  }, []);

  const removeSavedAccount = useCallback((idOrEmail) => {
    try {
      const list = getSavedAccountsFromStorage().filter(a => a.id !== idOrEmail && a.email !== idOrEmail);
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(list));
      setSavedAccounts(list);
    } catch (_) {}
  }, []);

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
        persistSavedAccount(data);
        refreshSavedAccounts();

        if (data.full_name) {
          try {
            await supabase.auth.updateUser({
              data: {
                full_name: data.full_name,
                username: data.username || data.full_name
              }
            });
          } catch (_) {}
        }
        return data;
      }
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    let lastUserId = null;

    // 1. First priority: Check active Supabase or local auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      if (currentUser) {
        // We have a real user session: clear any leftover guest keys
        localStorage.removeItem('ege_guest_user');
        localStorage.removeItem('ege_guest_profile');
        setUser(currentUser);
        lastUserId = currentUser.id;
        fetchProfile(currentUser.id);
        setLoading(false);
      } else {
        // 2. Second priority: If no active authenticated session, check if guest mode was chosen
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
              } catch (_) {}
            }
            setProfile(initialProfile);
          } catch (_) {}
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      if (currentUser) {
        localStorage.removeItem('ege_guest_user');
        localStorage.removeItem('ege_guest_profile');
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

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
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

  const signIn = async (email, password) => {
    try {
      localStorage.removeItem('ege_guest_user');
      localStorage.removeItem('ege_guest_profile');

      const res = await supabase.auth.signInWithPassword({ email, password });
      
      if (res.error) {
        return res;
      }

      if (res.data?.user) {
        setUser(res.data.user);
        if (res.data.user.id) {
          await fetchProfile(res.data.user.id);
        }
        refreshSavedAccounts();
        try {
          window.dispatchEvent(new CustomEvent('lyra:auth_changed', { detail: { user: res.data.user } }));
          window.dispatchEvent(new CustomEvent('lyra:reset_player'));
        } catch (_) {}
      }
      return res;
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      localStorage.removeItem('ege_guest_user');
      localStorage.removeItem('ege_guest_profile');

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

      const initialProfile = {
        id: res.data?.user?.id || ('user-' + email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()),
        email,
        full_name: fullName,
        username: username,
        avatar_url: avatarUrl,
        privacy_likes: 'friends',
        privacy_playlists: 'friends',
        privacy_artists: 'friends',
        updated_at: new Date().toISOString()
      };

      const signedUpUser = res.data?.user || {
        id: initialProfile.id,
        email,
        user_metadata: { full_name: fullName, username, avatar_url: avatarUrl },
        is_guest: false
      };

      setUser(signedUpUser);
      setProfile(initialProfile);
      persistSavedAccount(initialProfile);
      refreshSavedAccounts();

      if (signedUpUser.id) {
        try {
          await supabase.from('profiles').upsert(initialProfile);
        } catch (_) {}
      }

      try {
        window.dispatchEvent(new CustomEvent('lyra:auth_changed', { detail: { user: signedUpUser } }));
        window.dispatchEvent(new CustomEvent('lyra:reset_player'));
      } catch (_) {}

      return { data: { user: signedUpUser, session: { user: signedUpUser } }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    const currentUserId = user?.id || user?.uid;
    if (currentUserId) {
      try {
        await updateUserStatus(currentUserId, 'offline');
      } catch (_) {}
    }
    localStorage.removeItem('ege_guest_user');
    localStorage.removeItem('ege_guest_profile');
    try {
      window.dispatchEvent(new CustomEvent('lyra:reset_player'));
    } catch (_) {}
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    refreshSavedAccounts();
    try {
      window.dispatchEvent(new CustomEvent('lyra:auth_changed', { detail: { user: null } }));
      window.dispatchEvent(new CustomEvent('lyra:reset_player'));
    } catch (_) {}
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in');
    if (user.is_guest) {
      setProfile((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem('ege_guest_profile', JSON.stringify(next));
        } catch (_) {}
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
  };

  const value = {
    user,
    profile,
    fetchProfile,
    signIn,
    signUp,
    signInAsGuest,
    signOut,
    updateProfile,
    savedAccounts,
    removeSavedAccount,
    refreshSavedAccounts,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

