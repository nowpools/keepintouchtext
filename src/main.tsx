import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

// Hide splash screen as soon as web app loads (before React renders)
if (Capacitor.isNativePlatform()) {
  import("@capacitor/splash-screen").then(({ SplashScreen }) => {
    SplashScreen.hide();
  }).catch(console.warn);
}

createRoot(document.getElementById("root")!).render(<App />);
