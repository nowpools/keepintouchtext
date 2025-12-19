import type { CapacitorConfig } from '@capacitor/cli';

// For native builds we want to load the bundled web assets from /dist.
// If you want live-reload during development, set:
//   CAPACITOR_SERVER_URL=http://<your-local-ip>:5173
// then run: npm run build && npx cap sync ios
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.keepintouch.crm',
  appName: 'Keep In Touch',
  webDir: 'dist',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: true,
        },
      }
    : {}),
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'app.keepintouch.crm', // Custom URL scheme for OAuth callbacks
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1A1A2E',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1A1A2E',
    },
  },
};

export default config;
