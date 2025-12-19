import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const useIOSSetup = () => {
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const setupIOS = async () => {
      // Hide splash screen
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch (error) {
        console.warn('SplashScreen not available:', error);
      }

      // Configure status bar for iOS
      try {
        if (Capacitor.getPlatform() === 'ios') {
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          await StatusBar.setStyle({ style: Style.Dark });
        }
      } catch (error) {
        console.warn('StatusBar not available:', error);
      }

      // Setup keyboard listeners
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        await Keyboard.addListener('keyboardWillShow', (info) => {
          document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
        });
        await Keyboard.addListener('keyboardWillHide', () => {
          document.body.style.setProperty('--keyboard-height', '0px');
        });
      } catch (error) {
        console.warn('Keyboard not available:', error);
      }
    };

    setupIOS();
  }, []);
};
