'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import {
  FlameIcon,
  HomeIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
} from './icons';

export function MobileNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user, login } = useAuth();

  const itemClass = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
      active ? 'text-brand-400' : 'text-zinc-500 hover:text-zinc-200'
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-end px-2">
        <Link href="/" className={itemClass(pathname === '/')}>
          <HomeIcon className="h-5 w-5" />
          {t('nav.home')}
        </Link>
        <Link href="/?sort=top" className={itemClass(false)}>
          <FlameIcon className="h-5 w-5" />
          {t('nav.popular')}
        </Link>
        <Link
          href="/upload"
          className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium text-zinc-400"
        >
          <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-rose-600 text-white shadow-glow ring-4 ring-zinc-950">
            <UploadIcon className="h-5 w-5" />
          </span>
          {t('common.upload')}
        </Link>
        <Link
          href={user ? `/?feed=subs` : '/login'}
          className={itemClass(pathname === '/?feed=subs')}
        >
          <UsersIcon className="h-5 w-5" />
          {t('nav.subscriptions')}
        </Link>
        {user ? (
          <Link href={`/u/${user.id}`} className={itemClass(false)}>
            <UserIcon className="h-5 w-5" />
            {t('nav.profile')}
          </Link>
        ) : (
          <button type="button" onClick={login} className={itemClass(false)}>
            <UserIcon className="h-5 w-5" />
            {t('common.login')}
          </button>
        )}
      </div>
    </nav>
  );
}
