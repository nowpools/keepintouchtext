import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sparkles, Calendar, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_PRICES, type BillingInterval } from '@/config/stripe';
import appIcon from '@/assets/app-icon.png';

const Auth = () => {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const planFromUrl = searchParams.get('plan');
  const billingFromUrl = (searchParams.get('billing') || 'yearly') as BillingInterval;

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
            className="w-20 h-20 mb-4 rounded-2xl shadow-lg"
          />
          <h1 className="text-4xl font-bold mb-2">Stay Connected</h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Never lose touch with the people who matter most
          </p>
        </div>

        {/* Sign In Card */}
        <Card className="w-full max-w-md animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="text-center">
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Sign in with Google to sync your contacts and start nurturing your relationships
            </CardDescription>
          </CardHeader>
          <CardContent>
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

            <p className="text-xs text-muted-foreground text-center mt-4">
              We'll sync your Google Contacts to help you stay in touch
            </p>
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
