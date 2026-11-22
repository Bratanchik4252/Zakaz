'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  GoogleIcon,
  MessageCircleIcon,
  PlayIcon,
  UsersIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { formatNumber } from '@/lib/format';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { user, loading, login } = useAuth();

  const features = [
    {
      icon: PlayIcon,
      title: t('auth.feature1Title'),
      text: t('auth.feature1Text'),
    },
    {
      icon: MessageCircleIcon,
      title: t('auth.feature2Title'),
      text: t('auth.feature2Text'),
    },
    {
      icon: UsersIcon,
      title: t('auth.feature3Title'),
      text: t('auth.feature3Text'),
    },
  ];

  return (
    <div className="mx-auto grid max-w-4xl animate-fade-in overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 shadow-2xl shadow-black/30 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-[#0B0F19] p-8 lg:flex">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.4),transparent_40%),radial-gradient(circle_at_85%_70%,rgba(255,255,255,0.2),transparent_45%)]" />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <PlayIcon className="h-4 w-4 text-white" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">
              {t('common.appName')}
            </span>
          </Link>
          <h1 className="mt-10 text-balance text-3xl font-extrabold leading-tight tracking-tight text-white">
            {t('auth.heroTitle')}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
            {t('auth.heroSubtitle')}
          </p>
        </div>

        <ul className="relative mt-10 space-y-4">
          {features.map((feature) => (
            <li key={feature.title} className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                <feature.icon className="h-4 w-4 text-white" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {feature.title}
                </p>
                <p className="text-xs text-white/60">{feature.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 lg:hidden"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-rose-600">
            <PlayIcon className="h-4 w-4 text-white" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-zinc-50">
            {t('common.appName')}
          </span>
        </Link>

        <h2 className="text-xl font-extrabold tracking-tight text-zinc-50">
          {t('auth.loginTitle')}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
          {t('auth.welcome')}
        </p>

        {user ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-rose-600 text-sm font-bold text-white">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-100">
                  {user.username}
                </p>
                <p className="text-xs text-zinc-500">
                  {t('common.karma')}:{' '}
                  {formatNumber(user.karma, i18n.language)}
                </p>
              </div>
            </div>
            <Link href="/" className="btn-primary w-full">
              {t('auth.goHome')}
            </Link>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={login}
              disabled={loading}
              className="btn-primary mt-6 w-full gap-2.5 py-3"
            >
              <GoogleIcon className="h-4 w-4" />
              {loading ? t('auth.signingIn') : t('auth.signInGoogle')}
            </button>
            <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">
              {t('auth.onlyGoogle')}
            </p>
          </>
        )}

        <p className="mt-6 text-center text-[11px] text-zinc-600">
          {t('auth.terms')}
        </p>
      </div>
    </div>
  );
}
