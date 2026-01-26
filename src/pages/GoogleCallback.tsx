import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      console.log('[GoogleOAuth] Callback page loaded', { 
        hasCode: !!code, 
        hasState: !!state, 
        error,
        fullUrl: window.location.href 
      });

      if (error) {
        console.error('[GoogleOAuth] Error from Google:', error, searchParams.get('error_description'));
        setStatus('error');
        setErrorMessage(searchParams.get('error_description') || 'Authorization was denied');
        return;
      }

      if (!code || !state) {
        console.error('[GoogleOAuth] Missing code or state');
        setStatus('error');
        setErrorMessage('Missing authorization code or state');
        return;
      }

      try {
        // Use the same published HTTPS URL for token exchange
        const redirectUrl = 'https://keepintouchtext.lovable.app/google-callback';
        console.log('[GoogleOAuth] Callback received, exchanging code with redirect:', redirectUrl);

        const { data, error: callbackError } = await supabase.functions.invoke('google-oauth-callback', {
          body: { code, state, redirectUrl },
        });

        console.log('[GoogleOAuth] Token exchange response:', { 
          success: data?.success, 
          error: data?.error || callbackError?.message 
        });

        if (callbackError || data?.error) {
          throw new Error(data?.error || callbackError?.message || 'Failed to connect Google');
        }

        setStatus('success');
        console.log('[GoogleOAuth] Google Contacts connected successfully!');
        toast({
          title: 'Google Contacts connected!',
          description: 'You can now sync your contacts from Google.',
        });

        // Redirect to settings after a short delay
        setTimeout(() => {
          navigate('/settings', { replace: true });
        }, 1500);
      } catch (err) {
        console.error('[GoogleOAuth] Callback error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to connect Google Contacts');
      }
    };

    handleCallback();
  }, [searchParams, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Connecting Google Contacts...</h2>
              <p className="text-muted-foreground mt-2">Please wait while we complete the connection.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Connected Successfully!</h2>
              <p className="text-muted-foreground mt-2">Redirecting to settings...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Connection Failed</h2>
              <p className="text-muted-foreground mt-2 text-center">{errorMessage}</p>
              <Button 
                onClick={() => navigate('/settings', { replace: true })} 
                className="mt-6"
              >
                Back to Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
