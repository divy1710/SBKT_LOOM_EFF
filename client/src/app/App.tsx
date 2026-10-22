import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';

import { usePwa } from '@/pwa/usePwa';
import { OfflineBanner } from '@/pwa/OfflineBanner';
import { PwaUpdateNotification } from '@/pwa/PwaUpdateNotification';

export default function App() {
  const { isOnline, needRefresh, updateServiceWorker } = usePwa();

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <OfflineBanner isOnline={isOnline} />
          <RouterProvider router={router} />
          <PwaUpdateNotification needRefresh={needRefresh} onUpdate={updateServiceWorker} />
          <Toaster position="bottom-right" richColors closeButton toastOptions={{ duration: 4000 }} />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
