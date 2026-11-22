'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import {
  FlameIcon,
  HomeIcon,
  ShieldIcon,
  SparklesIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
} from './icons';

export function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user, login } = useAuth();

  const browse = [
    { href: '/', label: t('nav.home'), icon: HomeIcon, active: pathname === '/' },
    { href: '/?sort=top', label: t('nav.popular'), icon: FlameIcon },
    { href: '/?sort=new', label: t('nav.new'), icon: SparklesIcon },
  ];

  const account = [
    {
      href: '/?feed=subs',
      label: t('nav.subscriptions'),
      icon: UsersIcon,
      requiresAuth: true,
    },
    ...(user
      ? [
          {
            href: `/u/${user.id}`,
            label: t('nav.profile'),
            icon: UserIcon,
            active: pathname === `/u/${user.id}`,
          },
        ]
      : []),
    ...(user?.role === 'ADMIN' || user?.role === 'MODERATOR'
      ? [
          {
            href: '/admin',
            label: t('nav.admin'),
            icon: ShieldIcon,
            active: pathname === '/admin',
          },
        ]
      : []),
  ];

  return (
    <aside className="sticky top-24 hidden w-56 shrink-0 self-start lg:block xl:w-60">
      <Link
        href={user ? '/upload' : '/login'}
        className="btn-primary w-full"
      >
        <UploadIcon className="h-4 w-4" />
        {t('nav.create')}
      </Link>

      <nav className="mt-5 space-y-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          {t('nav.browse')}
        </p>
        {browse.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`nav-item ${item.active ? 'nav-item-active' : ''}`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <nav className="mt-5 space-y-1 border-t border-zinc-800/70 pt-4">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          {t('nav.you')}
        </p>
        {account.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={(event) => {
              if ('requiresAuth' in item && item.requiresAuth && !user) {
                event.preventDefault();
                login();
              }
            }}
            className={`nav-item ${'active' in item && item.active ? 'nav-item-active' : ''}`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        <Link
          href="/upload"
          className={`nav-item ${pathname === '/upload' ? 'nav-item-active' : ''}`}
        >
          <UploadIcon className="h-5 w-5" />
          {t('common.upload')}
        </Link>
      </nav>

      <p className="mt-8 px-3 text-[11px] leading-relaxed text-zinc-600">
        Vidit MVP · 2026
        <br />
        {t('nav.footer')}
      </p>
    </aside>
  );
}
