import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Users, Calendar, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import heroImage from '@/assets/hero-professional-texting.jpg';
import professionalsImage from '@/assets/professionals-connecting.jpg';
import mobileImage from '@/assets/professional-mobile.jpg';

const Landing = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };
  return (
    <div className="min-h-screen bg-background">
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
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Pricing
              </Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Privacy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Terms
              </Link>
              {!user && (
                <Link to="/auth" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  Login
                </Link>
              )}
              <Button size="sm" onClick={handleGetStarted}>
                {user ? 'Go to Dashboard' : 'Get Started'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <MessageCircle className="w-4 h-4" />
                Nurture your relationships
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Never lose touch with the people who{' '}
                <span className="text-gradient">matter most</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Keep In Touch helps busy professionals maintain meaningful connections 
                by reminding you when it's time to reach out to friends, family, and colleagues.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={handleGetStarted}>
                  {user ? 'Go to Dashboard' : 'Start Free'} <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="lg" className="gap-2">
                  <Heart className="w-4 h-4" />
                  See How It Works
                </Button>
              </div>
            </div>
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={heroImage} 
                  alt="Professional staying connected on mobile" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 glass rounded-xl p-4 card-shadow animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">3 connections made</p>
                    <p className="text-xs text-muted-foreground">today</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Relationships need <span className="text-primary">attention</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We help you stay connected with the people who matter, without the stress of remembering everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Smart Contact Management',
                description: 'Import from Google Contacts and organize your relationships by importance and frequency.',
              },
              {
                icon: Calendar,
                title: 'Personalized Reminders',
                description: 'Set custom cadences for each contact. Daily, weekly, monthly – you decide.',
              },
              {
                icon: MessageCircle,
                title: 'AI-Powered Suggestions',
                description: 'Get personalized message drafts to help you start meaningful conversations.',
              },
            ].map((feature, index) => (
              <div 
                key={feature.title}
                className="bg-card rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-shadow animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              <img 
                src={professionalsImage} 
                alt="Professionals connecting over coffee" 
                className="rounded-2xl shadow-xl w-full"
              />
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl font-bold">
                Built for <span className="text-primary">busy professionals</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Whether you're managing a team, building a network, or just trying to stay 
                close to friends and family – Keep In Touch makes it effortless.
              </p>
              <ul className="space-y-4">
                {[
                  'Sync with Google Contacts in one click',
                  'Track your communication history',
                  'Never miss an important birthday or anniversary',
                  'Works on any device, anywhere',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-primary rounded-3xl p-8 sm:p-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-90" />
            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
                  Start nurturing your relationships today
                </h2>
                <p className="text-primary-foreground/80">
                  Join thousands of professionals who use Keep In Touch to maintain meaningful connections.
                </p>
                <Button size="lg" variant="secondary" className="gap-2" onClick={handleGetStarted}>
                  {user ? 'Go to Dashboard' : 'Get Started Free'} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="hidden md:block">
                <img 
                  src={mobileImage} 
                  alt="Professional using Keep In Touch on mobile" 
                  className="rounded-2xl shadow-2xl max-h-80 object-cover mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Heart className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">Keep In Touch</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Helping you maintain meaningful connections with the people who matter most.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={handleGetStarted} className="hover:text-foreground transition-colors">Get Started</button></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:support@keepintouch.app" className="hover:text-foreground transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Keep In Touch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
