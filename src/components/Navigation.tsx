import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Settings, Heart } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Today', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Navigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:relative md:bottom-auto">
      <div className="glass border-t md:border-t-0 md:border-b border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between md:justify-start md:gap-1 py-2">
            {/* Logo - desktop only */}
            <div className="hidden md:flex items-center gap-2 mr-8">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Keep In Touch</span>
            </div>

            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-lg text-muted-foreground transition-colors",
                  "hover:bg-secondary hover:text-foreground"
                )}
                activeClassName="bg-primary/10 text-primary font-medium"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs md:text-sm">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};
