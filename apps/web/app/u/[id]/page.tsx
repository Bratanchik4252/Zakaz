'use client';

import { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { UserProfile } from '@vp/shared';
import { Feed } from '@/components/Feed';
import { FilmIcon, TrendingUpIcon, UsersIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatNumber } from '@/lib/format';

const fetchProfile = (url: string) => apiFetch<UserProfile>(url);

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { t, i18n } = useTranslation();
  const { user, login } = useAuth();
  const [busy, setBusy] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<UserProfile>(
    id ? `/users/${id}` : null,
    fetchProfile,
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-44 w-full rounded-2xl" />
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <UsersIcon className="h-8 w-8 text-zinc-600" />
        <p className="text-sm text-zinc-400">{t('profile.notFound')}</p>
      </div>
    );
  }

  const roleLabel =
    data.role === 'ADMIN'
      ? t('common.adminRole')
      : data.role === 'MODERATOR'
        ? t('common.moderator')
        : t('common.userRole');

  const isSelf = user?.id === data.id;

  const toggle = async () => {
    if (!user) {
      login();
      return;
    }
    setBusy(true);
    try {
      if (data.isSubscribed) {
        await apiFetch(`/subscriptions/${data.id}`, { method: 'DELETE' });
      } else {
        await apiFetch('/subscriptions', {
          method: 'POST',
          body: JSON.stringify({ targetType: 'USER', targetId: data.id }),
        });
      }
      await mutate();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-5">
      <section className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
        <div className="relative h-28 overflow-hidden bg-gradient-to-r from-brand-600/40 via-rose-600/25 to-zinc-900 sm:h-36">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(255,255,255,0.15),transparent_40%)]" />
        </div>

        <div className="px-4 pb-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 items-end gap-3">
              <div className="-mt-9 shrink-0 sm:-mt-11">
                {data.avatarUrl ? (
                  <img
                    src={data.avatarUrl}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover ring-4 ring-zinc-950 sm:h-20 sm:w-20"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-rose-600 text-2xl font-bold text-white ring-4 ring-zinc-950 sm:h-20 sm:w-20">
                    {data.username.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-zinc-50 sm:text-2xl">
                    {data.username}
                  </h1>
                  <span className="badge border border-zinc-700 bg-zinc-800/80 text-zinc-300">
                    {roleLabel}
                  </span>
                  {isSelf && (
                    <span className="badge border border-brand-500/30 bg-brand-500/10 text-brand-300">
                      {t('profile.you')}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {t('profile.memberSince', {
                    date: formatDate(data.createdAt, i18n.language),
                  })}
                </p>
              </div>
            </div>

            {!isSelf && (
              <button
                type="button"
                onClick={() => void toggle()}
                disabled={busy}
                className={`${data.isSubscribed ? 'btn-secondary' : 'btn-primary'} mb-1`}
              >
                {data.isSubscribed
                  ? t('post.unsubscribe')
                  : t('post.subscribe')}
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-800 rounded-xl border border-zinc-800/70 bg-zinc-950/40">
            <Stat
              icon={FilmIcon}
              value={data.postCount}
              label={t('profile.statsPosts')}
              language={i18n.language}
            />
            <Stat
              icon={TrendingUpIcon}
              value={data.karma}
              label={t('profile.statsKarma')}
              language={i18n.language}
            />
            <Stat
              icon={UsersIcon}
              value={data.subscriberCount}
              label={t('profile.statsSubscribers')}
              language={i18n.language}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-zinc-50">
          {t('profile.postsBy', { username: data.username })}
        </h2>
        <Suspense
          fallback={
            <div className="skeleton h-32 w-full rounded-2xl" />
          }
        >
          <Feed authorId={data.id} />
        </Suspense>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  language,
}: {
  icon: typeof FilmIcon;
  value: number;
  label: string;
  language: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
      <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-100">
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
        {formatNumber(value, language)}
      </span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  );
}
