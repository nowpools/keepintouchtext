import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const APP_SCHEME = "keepintouch://callback";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  // Combine search params and hash into the deep link for native
  const { deepLink, hasError, urlErrorMessage } = useMemo(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    const params = new URLSearchParams(search);
    
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    
    return {
      deepLink: `${APP_SCHEME}${search}${hash}`,
      hasError: !!error,
      urlErrorMessage: errorDesc || error || null
    };
  }, []);

  useEffect(() => {
    document.title = "Signing in | Keep in Touch";

    if (hasError) {
      setStatus('error');
      setErrorMessage(urlErrorMessage);
      return;
    }

    // For native apps, redirect to the app
    if (isNative) {
      const t = window.setTimeout(() => {
        window.location.replace(deepLink);
      }, 300);
      return () => window.clearTimeout(t);
    }

    // For web, capture the Google tokens and store them
    const handleWebOAuth = async () => {
      try {
        // Get the current session (Supabase should have set it from the OAuth callback)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // Wait a bit and try again - sometimes the session isn't immediately available
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
          
          if (retryError || !retrySession) {
            throw new Error('Failed to get session after OAuth');
          }
          
          await processSession(retrySession);
        } else {
          await processSession(session);
        }
      } catch (error) {
        console.error('[OAuthCallback] Error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to complete sign-in');
      }
    };

    const processSession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!session) {
        throw new Error('No session available');
      }

      console.log('[OAuthCallback] Session found, provider_token:', !!session.provider_token);

      // If we have a provider_token (Google access token), store it
      if (session.provider_token) {
        const providerRefreshToken = session.provider_refresh_token || '';
        const expiresAt = new Date(Date.now() + 3600 * 1000); // Google tokens expire in 1 hour

        const { error: updateError } = await supabase
          .from('user_integrations')
          .update({
            google_access_token: session.provider_token,
            google_refresh_token: providerRefreshToken,
            google_token_expiry: expiresAt.toISOString(),
            google_sync_enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id);

        if (updateError) {
          console.error('[OAuthCallback] Error storing tokens:', updateError);
          // Don't throw - user is still logged in, just tokens weren't stored
        } else {
          console.log('[OAuthCallback] Google tokens stored successfully');
          
          // Trigger initial sync
          try {
            await supabase.functions.invoke('sync-google-contacts', {
              body: {
                userId: session.user.id,
                accessToken: session.provider_token,
              },
            });
            console.log('[OAuthCallback] Initial sync triggered');
          } catch (syncError) {
            console.error('[OAuthCallback] Initial sync failed:', syncError);
            // Don't throw - sync can be retried later
          }
        }
      }

      setStatus('success');
      toast({
        title: 'Signed in successfully',
        description: session.provider_token ? 'Google Contacts connected!' : 'Welcome back!',
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    };

    handleWebOAuth();
  }, [deepLink, hasError, urlErrorMessage, isNative, navigate, toast]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <article className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>
              {status === 'error' ? "Sign-in Issue" : 
               status === 'success' ? "Success!" : 
               "Completing Sign-in"}
            </CardTitle>
            <CardDescription>
              {status === 'error' 
                ? "There was a problem signing in. Please try again."
                : status === 'success'
                ? "Redirecting to your dashboard..."
                : isNative
                ? "If you don't get prompted to open the app, tap the button below."
                : "Please wait while we complete your sign-in..."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'error' ? (
              <div className="flex items-center gap-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errorMessage || "Authentication failed"}
              </div>
            ) : status === 'success' ? (
              <div className="flex items-center gap-3 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Google Contacts connected!
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isNative ? "Finishing sign-in…" : "Connecting Google Contacts..."}
              </div>
            )}

            {isNative && (
              <Button asChild className="w-full gap-2">
                <a href={deepLink}>
                  Open the app <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}

            {status === 'error' && (
              <Button onClick={() => navigate('/auth')} className="w-full">
                Try Again
              </Button>
            )}

            {!isNative && status !== 'success' && (
              <Button asChild variant="outline" className="w-full">
                <a href="/dashboard">Continue to Dashboard</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </article>
    </main>
  );
}
