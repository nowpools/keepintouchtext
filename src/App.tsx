import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "@/hooks/useAuth";
import { useIOSSetup } from "@/hooks/useIOSSetup";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// For native apps, skip landing page and go directly to auth
const isNative = Capacitor.isNativePlatform();

const AppContent = () => {
  useIOSSetup();
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Native apps skip landing, go to auth */}
          <Route path="/" element={isNative ? <Navigate to="/auth" replace /> : <Landing />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
