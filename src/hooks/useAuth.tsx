import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { setupCapacitorAuth, signInWithGoogleNative, signInWithAppleNative } from './useCapacitorAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Store Google tokens when we have them from OAuth
async function storeGoogleTokens(userId: string, providerToken: string, providerRefreshToken?: string) {
  try {
    console.log('Storing Google tokens for user:', userId);
    
    const updates: Record<string, unknown> = {
      google_access_token: providerToken,
      google_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
      updated_at: new Date().toISOString(),
    };
    
    if (providerRefreshToken) {
      updates.google_refresh_token = providerRefreshToken;
    }

    const { error } = await supabase
      .from('user_integrations')
      .update(updates)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to store Google tokens:', error);
    } else {
      console.log('Google tokens stored successfully');
    }
  } catch (error) {
    console.error('Failed to store Google tokens:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Setup Capacitor auth handlers for native platforms
    setupCapacitorAuth();

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Store Google tokens when user signs in with Google
        if (session?.user && session.provider_token) {
          setTimeout(() => {
            storeGoogleTokens(
              session.user.id,
              session.provider_token!,
              session.provider_refresh_token
            );
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Store tokens if available on initial load
      if (session?.user && session.provider_token) {
        storeGoogleTokens(
          session.user.id,
          session.provider_token,
          session.provider_refresh_token
        );
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // Use native OAuth flow for Capacitor apps
    if (Capacitor.isNativePlatform()) {
      return signInWithGoogleNative();
    }

    // Web OAuth flow
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'https://www.googleapis.com/auth/contacts',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    return { error };
  };

  const signInWithApple = async () => {
    // Apple Sign-In only works on native iOS
    if (Capacitor.isNativePlatform()) {
      return signInWithAppleNative();
    }

    return { error: new Error('Apple Sign-In is only available on iOS devices') };
  };

  const signOut = async () => {
    try {
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Sign out from Supabase - use 'local' scope to ensure local storage is cleared
      // even if the server session is already invalid
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, we've already cleared local state
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
