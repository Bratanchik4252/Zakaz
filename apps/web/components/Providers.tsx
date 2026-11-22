'use client';

import { useEffect } from 'react';
import i18n from '@/lib/i18n';
import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored === 'ru' || stored === 'en') {
      void i18n.changeLanguage(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}
