import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { AvatarId, UpdateProfileData, BannerType } from '../types/profile';
import type { User, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (session: Session): Promise<User> => {
    // Increased timeout to 10s to prevent accidental fallbacks on slow connections
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 10000)
    );

    try {
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle(); // Use maybeSingle to avoid errors if profile is being created

      const result = await Promise.race([profilePromise, timeoutPromise]);

      if (result && (result as any).data) {
        const profile = (result as any).data;
        const meta = session.user.user_metadata as { username?: string; display_name?: string };
        
        return {
          id: session.user.id,
          email: session.user.email ?? '',
          username: meta?.username || profile.display_name || session.user.email?.split('@')[0] || 'User',
          displayName: profile.display_name || meta?.display_name || meta?.username || 'User',
          avatar: (profile.avatar as AvatarId) ?? 'gradient-blue',
          avatarUrl: profile.avatar_url ?? undefined,
          bannerType: (profile.banner_type as BannerType) ?? 'color',
          bannerColorStart: profile?.banner_color_start ?? '#6366f1',
          bannerColorEnd: profile?.banner_color_end ?? '#ec4899',
          bannerUrl: profile?.banner_url ?? undefined,
          bannerPosY: Number(profile?.banner_pos_y ?? 50),
          createdAt: profile?.created_at || session.user.created_at,
        };
      }
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err);
    }

    // Ultimate fallback if DB is completely unreachable
    const meta = session.user.user_metadata as { username?: string; display_name?: string };
    return {
      id: session.user.id,
      email: session.user.email ?? '',
      username: meta?.username ?? 'User',
      displayName: meta?.display_name ?? meta?.username ?? 'User',
      avatar: 'gradient-blue',
      bannerType: 'color',
      bannerColorStart: '#6366f1',
      bannerColorEnd: '#ec4899',
      bannerPosY: 50,
      createdAt: session.user.created_at,
    };
  };

  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session) setUser(await fetchProfile(session));
        else setUser(null);
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Only show global loader for major events like Sign In or Initial Load
        // Avoid flicker for USER_UPDATED (profile changes)
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setIsLoading(true);
        }

        if (session) {
          const profile = await fetchProfile(session);
          setUser(profile);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000;
    let timeoutId: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => logout(), INACTIVITY_TIMEOUT);
    };
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    resetTimer();
    activityEvents.forEach(e => window.addEventListener(e, resetTimer));
    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user]);

  const signup = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { display_name: username.trim(), username: username.trim() } },
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      supabase.from('profiles').insert({
        user_id: data.user.id,
        display_name: username.trim(),
        avatar: 'gradient-blue',
      }).then(({ error }) => {
        if (error) console.warn('Profile insert failed:', error.message);
      });
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(error.message);
  };

  const updateProfile = async (data: UpdateProfileData) => {
    if (!user) throw new Error('Not authenticated');
    const updates: Record<string, any> = {};
    if (data.displayName !== undefined) updates.display_name = data.displayName;
    if (data.avatar !== undefined) updates.avatar = data.avatar;
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;
    if (data.bannerType !== undefined) updates.banner_type = data.bannerType;
    if (data.bannerColorStart !== undefined) updates.banner_color_start = data.bannerColorStart;
    if (data.bannerColorEnd !== undefined) updates.banner_color_end = data.bannerColorEnd;
    if (data.bannerUrl !== undefined) updates.banner_url = data.bannerUrl;
    if (data.bannerPosY !== undefined) updates.banner_pos_y = data.bannerPosY;

    // 1. Update public.profiles table
    const { error: profileError } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
    if (profileError) throw new Error(profileError.message);

    // 2. Sync with Supabase Auth (Metadata) - SILENT UPDATE
    if (data.displayName) {
      // We update auth metadata but don't wait for the broadcast to finish
      // to avoid any potential session-refresh loops.
      supabase.auth.updateUser({
        data: { 
          display_name: data.displayName,
          username: data.displayName
        }
      }).catch(err => console.warn('Auth metadata sync delayed:', err));
    }

    // 3. Update local state
    setUser(prev => prev ? {
      ...prev,
      ...(data.displayName && { 
        displayName: data.displayName,
        username: data.displayName // Update username locally too
      }),
      ...(data.avatar && { avatar: data.avatar }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl ?? undefined }),
      ...(data.bannerType && { bannerType: data.bannerType }),
      ...(data.bannerColorStart && { bannerColorStart: data.bannerColorStart }),
      ...(data.bannerColorEnd && { bannerColorEnd: data.bannerColorEnd }),
      ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl ?? undefined }),
      ...(data.bannerPosY !== undefined && { bannerPosY: data.bannerPosY }),
    } : null);
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    if (!file.type.startsWith('image/')) throw new Error('File must be an image.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5MB.');

    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const cacheBustedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await updateProfile({ avatarUrl: cacheBustedUrl });
    return cacheBustedUrl;
  };

  const uploadBanner = async (file: File): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    if (!file.type.startsWith('image/')) throw new Error('File must be an image.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5MB.');

    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/banner.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(filePath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(filePath);
    const cacheBustedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await updateProfile({ bannerUrl: cacheBustedUrl, bannerPosY: 50 }); // Reset pos on new upload
    return cacheBustedUrl;
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Not authenticated');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (authError) throw new Error('Current password is incorrect.');

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw new Error(updateError.message);
  };

  const deleteAccount = async (password: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (authError) throw new Error('Incorrect password. Account deletion aborted.');

    if (user.avatarUrl) {
      const ext = user.avatarUrl.split('.').pop()?.split('?')[0];
      await supabase.storage.from('avatars').remove([`${user.id}/avatar.${ext}`]);
    }
    if (user.bannerUrl) {
      const ext = user.bannerUrl.split('.').pop()?.split('?')[0];
      await supabase.storage.from('banners').remove([`${user.id}/banner.${ext}`]);
    }

    await supabase.from('profiles').delete().eq('user_id', user.id);
    await logout();
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, login, signup, logout,
      updateProfile, uploadAvatar, uploadBanner,
      sendPasswordReset, updatePassword, deleteAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
