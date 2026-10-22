import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" richColors closeButton toastOptions={{ duration: 4000 }} />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
