import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Check, X, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_PRICES, type BillingInterval } from '@/config/stripe';
import { toast } from '@/hooks/use-toast';
const tiers = [{
  name: 'Free',
  id: 'free',
  price: {
    monthly: 0,
    yearly: 0
  },
  description: 'Get started with basic relationship management',
  features: [{
    text: 'Unlimited Google Contacts',
    included: true
  }, {
    text: 'Daily Contacts list (up to 5 per day)',
    included: true
  }, {
    text: '2 relationship labels (e.g., Family, Business)',
    included: true
  }, {
    text: 'Basic cadence (Monthly + Quarterly only)',
    included: true
  }, {
    text: 'AI message suggestions (Up to 5 drafts/day)',
    included: true
  }, {
    text: 'Manual notes per contact',
    included: true
  }, {
    text: 'Open in iMessage / SMS (deep link)',
    included: true
  }, {
    text: 'Manual contact completion ("Mark done")',
    included: true
  }],
  cta: 'Start Free',
  highlighted: false
}, {
  name: 'Pro',
  id: 'pro',
  price: {
    monthly: 9,
    yearly: 79
  },
  description: 'For professionals who want to nurture every relationship',
  features: [{
    text: 'Everything in Free, plus:',
    included: true,
    isHeader: true
  }, {
    text: 'Unlimited relationship labels',
    included: true
  }, {
    text: 'Fully customizable cadence system (Daily → Annual)',
    included: true
  }, {
    text: 'Smart Daily Target - Auto-balance contacts',
    included: true
  }, {
    text: 'Unlimited AI message drafts',
    included: true
  }, {
    text: 'Unlimited Daily Contacts',
    included: true
  }, {
    text: 'Progress indicators & streak tracking',
    included: true
  }, {
    text: '2-way Sync with Google Contacts',
    included: true
  }, {
    text: 'Birthday Field with automatic message reminder',
    included: true
  }, {
    text: 'Hide Contacts for future messages',
    included: true
  }],
  cta: 'Start 14-Day Free Trial',
  highlighted: true
}, {
  name: 'Business',
  id: 'business',
  price: {
    monthly: 19,
    yearly: 149
  },
  description: 'Advanced features for power users',
  features: [{
    text: 'Everything in Pro, plus:',
    included: true,
    isHeader: true
  }, {
    text: 'AI message tone setting',
    included: true
  }, {
    text: 'Export Contact History',
    included: true
  }, {
    text: 'Override Follow-Up Cadence',
    included: true
  }, {
    text: 'Custom Contact Cadence within a Label',
    included: true
  }, {
    text: 'Social Media Links within Contact',
    included: true
  }],
  cta: 'Start 14-Day Free Trial',
  highlighted: false
}];
const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('yearly');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('checkout') === 'canceled') {
      toast({
        title: 'Checkout canceled',
        description: 'Your checkout was canceled. Feel free to try again.',
      });
    }
  }, [searchParams]);

  const handleSelectPlan = async (tierId: string) => {
    if (tierId === 'free') {
      navigate(user ? '/dashboard' : '/auth');
      return;
    }

    if (!user) {
      // Redirect to auth with plan info, they'll complete checkout after login
      navigate(`/auth?plan=${tierId}&billing=${billingInterval}`);
      return;
    }

    // User is logged in, create checkout session
    setLoadingTier(tierId);
    try {
      const priceConfig = STRIPE_PRICES[tierId as 'pro' | 'business'][billingInterval];
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: priceConfig.priceId,
          tier: tierId,
          billingInterval,
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
        description: error.message || 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingTier(null);
    }
  };
  return <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">Keep In Touch</span>
            </Link>
            <div className="flex items-center gap-4">
              {!user && <Link to="/auth" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  Login
                </Link>}
              <Button size="sm" onClick={() => navigate(user ? '/dashboard' : '/auth')}>
                {user ? 'Go to Dashboard' : 'Get Started'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="gap-2">
            <Sparkles className="w-3 h-3" />
            14-day free trial on all paid plans
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold">
            Choose your <span className="text-gradient">plan</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade as you grow. All paid plans include a 14-day free trial.
          </p>
          
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setBillingInterval('monthly')} className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors', billingInterval === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              Monthly
            </button>
            <button onClick={() => setBillingInterval('yearly')} className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors', billingInterval === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              Yearly
              <span className="ml-2 text-xs bg-success/20 px-2 py-0.5 rounded-full text-primary-foreground font-bold">
                Save up to 30%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map(tier => <Card key={tier.id} className={cn('relative flex flex-col', tier.highlighted && 'border-primary shadow-lg ring-1 ring-primary')}>
                {tier.highlighted && <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>}
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      ${tier.price[billingInterval]}
                    </span>
                    {tier.price[billingInterval] > 0 && <span className="text-muted-foreground">
                        /{billingInterval === 'yearly' ? 'year' : 'month'}
                      </span>}
                  </div>
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => <li key={index} className={cn('flex items-start gap-3', feature.isHeader && 'font-medium text-foreground')}>
                        {!feature.isHeader && (feature.included ? <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" /> : <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />)}
                        <span className={cn('text-sm', !feature.included && 'text-muted-foreground', feature.isHeader && 'text-primary')}>
                          {feature.text}
                        </span>
                      </li>)}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full gap-2" 
                    variant={tier.highlighted ? 'default' : 'outline'} 
                    onClick={() => handleSelectPlan(tier.id)}
                    disabled={loadingTier === tier.id}
                  >
                    {loadingTier === tier.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {tier.cta}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>)}
          </div>
        </div>
      </section>

      {/* FAQ or additional info */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold">14-day free trial included</h2>
          <p className="text-muted-foreground">
            Try Pro or Business free for 14 days. No credit card required. 
            Cancel anytime before the trial ends and you won't be charged.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Keep In Touch</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>;
};
export default Pricing;