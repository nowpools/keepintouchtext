import { ReactNode, useEffect } from 'react';
import { Navigation } from './Navigation';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header with theme toggle - desktop */}
      <div className="hidden md:block fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <main className="pb-24 md:pb-8 pt-4 md:pt-8">
        <div className="max-w-4xl mx-auto px-4">
          {children}
        </div>
      </main>

      {/* Mobile theme toggle */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
    </div>
  );
};
