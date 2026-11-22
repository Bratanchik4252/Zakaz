'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldIcon, XIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const { completeLogin } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<'banned' | 'failed' | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = hash.get('error');
    const token = hash.get('access_token');

    window.history.replaceState(null, '', window.location.pathname);

    if (errorCode) {
      setError(errorCode === 'banned' ? 'banned' : 'failed');
      return;
    }

    if (!token) {
      setError('failed');
      return;
    }

    let cancelled = false;

    completeLogin(token)
      .then(() => {
        if (!cancelled) {
          router.replace('/');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [completeLogin, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20">
      <div className="card w-full p-8 text-center">
        {error ? (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              {error === 'banned' ? (
                <ShieldIcon className="h-5 w-5" />
              ) : (
                <XIcon className="h-5 w-5" />
              )}
            </span>
            <p className="mt-4 text-sm text-red-600">
              {error === 'banned'
                ? t('auth.bannedError')
                : t('auth.callbackError')}
            </p>
            <Link href="/login" className="btn-secondary mt-5">
              {t('common.login')}
            </Link>
          </>
        ) : (
          <>
            <span
              className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-zinc-700 border-t-brand-500"
              aria-hidden
            />
            <p className="mt-4 text-sm text-zinc-400">
              {t('auth.signingIn')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
