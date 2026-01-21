import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sparkles, Calendar, MessageSquare, Loader2, AlertTriangle, RefreshCw, ChevronDown, Bug, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_PRICES, type BillingInterval } from '@/config/stripe';
import appIcon from '@/assets/app-icon.png';

const isIOS = Capacitor.getPlatform() === 'ios';

const Auth = () => {
  const { user, session, isLoading, signInWithGoogle, signInWithApple, signUp, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [storageWritable, setStorageWritable] = useState<boolean | null>(null);
  const [authTokenExists, setAuthTokenExists] = useState<boolean | null>(null);
  
  // Email/password form state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const planFromUrl = searchParams.get('plan');
  const billingFromUrl = (searchParams.get('billing') || 'yearly') as BillingInterval;

  // Check storage writability and auth token on mount
  useEffect(() => {
    try {
      const testKey = '__auth_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      setStorageWritable(true);
    } catch {
      setStorageWritable(false);
    }

    try {
      const keys = Object.keys(localStorage);
      const hasAuthKey = keys.some(k => k.includes('supabase') && k.includes('auth'));
      setAuthTokenExists(hasAuthKey);
    } catch {
      setAuthTokenExists(false);
    }
  }, [user, session]);

  // Detect OAuth errors in URL
  const oauthError = useMemo(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (error) {
      return { error, description: errorDescription || 'Authentication failed. Please try again.' };
    }
    return null;
  }, [searchParams]);

  const hasCodeParam = searchParams.has('code');
  const hasStateParam = searchParams.has('state');

  const handleClearAndRetry = async () => {
    await signOut();
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('error');
    newParams.delete('error_description');
    newParams.delete('code');
    newParams.delete('state');
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    const handlePostLoginCheckout = async () => {
      if (user && !isLoading && planFromUrl && (planFromUrl === 'pro' || planFromUrl === 'business')) {
        setIsCheckingOut(true);
        try {
          const priceConfig = STRIPE_PRICES[planFromUrl][billingFromUrl];
          
          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: {
              priceId: priceConfig.priceId,
              tier: planFromUrl,
              billingInterval: billingFromUrl,
            },
          });

          if (error) throw error;
          if (data?.url) {
            window.location.href = data.url;
          }
        } catch (error: any) {
          console.error('Checkout error:', error);
          toast({
            title: 'Checkout failed',
            description: error.message || 'Failed to start checkout. Redirecting to dashboard.',
            variant: 'destructive',
          });
          navigate('/dashboard');
        }
      } else if (user && !isLoading) {
        navigate('/dashboard');
      }
    };

    handlePostLoginCheckout();
  }, [user, isLoading, navigate, planFromUrl, billingFromUrl]);

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAppleSignIn = async () => {
    const { error } = await signInWithApple();
    if (error) {
      if (error.message?.includes('cancelled')) {
        return;
      }
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (authMode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast({
          title: 'Account created!',
          description: 'You can now sign in with your credentials',
        });
        setAuthMode('signin');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: authMode === 'signup' ? 'Sign up failed' : 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isCheckingOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-muted-foreground">
          {isCheckingOut ? 'Redirecting to checkout...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-end">
        <ThemeToggle />
      </header>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-8 animate-fade-in">
          <img 
            src={appIcon} 
            alt="Keep In Touch" 
            className="w-20 h-20 mb-4 rounded-2xl shadow-lg mx-auto"
          />
          <h1 className="text-4xl font-bold mb-2">Stay Connected</h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Never lose touch with the people who matter most
          </p>
        </div>

        {/* OAuth Error Alert */}
        {oauthError && (
          <Card className="w-full max-w-md mb-4 border-destructive/50 bg-destructive/5 animate-fade-in">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Sign in failed</p>
                  <p className="text-sm text-muted-foreground mt-1">{oauthError.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">Error: {oauthError.error}</p>
                </div>
              </div>
              <Button 
                onClick={handleClearAndRetry}
                variant="outline" 
                size="sm" 
                className="w-full mt-4 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Clear & Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Auth Debug Panel */}
        <Collapsible open={debugOpen} onOpenChange={setDebugOpen} className="w-full max-w-md mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Bug className="w-3 h-3" />
              Auth Debug
              <ChevronDown className={`w-3 h-3 transition-transform ${debugOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2 border-dashed">
              <CardContent className="pt-4 text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">authLoading:</span>
                  <span className={isLoading ? 'text-yellow-500' : 'text-green-500'}>{String(isLoading)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">user present:</span>
                  <span className={user ? 'text-green-500' : 'text-red-500'}>{user ? 'yes' : 'no'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">session present:</span>
                  <span className={session ? 'text-green-500' : 'text-red-500'}>{session ? 'yes' : 'no'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">localStorage writable:</span>
                  <span className={storageWritable ? 'text-green-500' : storageWritable === false ? 'text-red-500' : 'text-muted-foreground'}>
                    {storageWritable === null ? 'checking...' : String(storageWritable)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">auth token in storage:</span>
                  <span className={authTokenExists ? 'text-green-500' : authTokenExists === false ? 'text-yellow-500' : 'text-muted-foreground'}>
                    {authTokenExists === null ? 'checking...' : String(authTokenExists)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">code param:</span>
                  <span>{hasCodeParam ? 'present' : 'none'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">state param:</span>
                  <span>{hasStateParam ? 'present' : 'none'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">error param:</span>
                  <span className={oauthError ? 'text-red-500' : ''}>{oauthError?.error || 'none'}</span>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Sign In Card */}
        <Card className="w-full max-w-md animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="text-center">
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Sign in to manage your contacts and stay connected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="social" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="social">Social Login</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>
              
              <TabsContent value="social" className="space-y-3">
                <Button 
                  onClick={handleGoogleSignIn}
                  className="w-full gap-3 h-12 text-base"
                  size="lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <Button 
                  onClick={handleAppleSignIn}
                  variant="outline"
                  className="w-full gap-3 h-12 text-base bg-black text-white hover:bg-black/90 hover:text-white border-black"
                  size="lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Sign in with Apple
                </Button>
                
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Sign in with Google to sync your contacts automatically
                </p>
              </TabsContent>
              
              <TabsContent value="email">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full gap-2 h-12"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {authMode === 'signup' ? 'Create Account' : 'Sign In'}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                      className="text-sm text-primary hover:underline"
                    >
                      {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Add contacts manually without Google sync
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-3xl animate-fade-in" style={{ animationDelay: '200ms' }}>
          <FeatureCard
            icon={<Calendar className="w-5 h-5" />}
            title="Smart Reminders"
            description="Set custom cadences for each contact"
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            title="AI Suggestions"
            description="Get personalized message drafts"
          />
          <FeatureCard
            icon={<MessageSquare className="w-5 h-5" />}
            title="Quick Actions"
            description="One-tap to send a message"
          />
        </div>
      </div>
    </div>
  );
};

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center p-4">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-secondary mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default Auth;
