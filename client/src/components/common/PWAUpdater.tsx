import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useConfirm } from '../../context/ConfirmContext';
import { useTranslation } from 'react-i18next';

const PWAUpdater = () => {
  const { confirm } = useConfirm();
  const { t } = useTranslation();

  useEffect(() => {
    // Register service worker if in production OR if specifically enabled in development
    const shouldRegister = import.meta.env.PROD || (import.meta.env.DEV && true); // VitePWA configured with enabled: true
    
    if (shouldRegister) {
      registerSW({
        onNeedRefresh() {
          const handleUpdate = async () => {
            const result = await confirm({
              title: t('Update Available'),
              message: t('A new version of the app is available. Would you like to update now?'),
              confirmText: t('Update'),
              cancelText: t('Later')
            });
            if (result) {
              window.location.reload();
            }
          };
          handleUpdate();
        },
        onOfflineReady() {
          console.log('App ready to work offline');
        },
      });
    }
  }, [confirm, t]);

  // Suppress MUI aria-hidden accessibility warning in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args: any[]) => {
        const message = args.join(' ');
        if (
          message.includes('aria-hidden') || 
          message.includes('Blocked aria-hidden') || 
          message.includes('ariaHidden') ||
          message.includes('width(-1) and height(-1)')
        ) {
          return;
        }
        originalError.apply(console, args);
      };

      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (
          message.includes('aria-hidden') || 
          message.includes('Blocked aria-hidden') || 
          message.includes('ariaHidden') ||
          message.includes('width(-1) and height(-1)')
        ) {
          return;
        }
        originalWarn.apply(console, args);
      };

      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  return null;
};

export default PWAUpdater;
