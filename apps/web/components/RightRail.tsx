'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { TagCount } from '@vp/shared';
import { apiFetch } from '@/lib/api';
import { FlameIcon, PlayIcon, TrendingUpIcon } from './icons';

const fetchTags = (url: string) => apiFetch<TagCount[]>(url);

export function RightRail() {
  const { t } = useTranslation();
  const { data } = useSWR<TagCount[]>('/tags', fetchTags);

  return (
    <aside className="sticky top-24 hidden w-72 shrink-0 self-start xl:block">
      <div className="card overflow-hidden">
        <div className="h-20 bg-gradient-to-br from-brand-500/30 via-rose-500/10 to-transparent" />
        <div className="-mt-8 p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-rose-600 shadow-glow">
            <PlayIcon className="h-5 w-5 text-white" fill="currentColor" stroke="none" />
          </span>
          <h3 className="mt-3 text-sm font-bold text-white">
            {t('rail.aboutTitle')}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {t('rail.aboutText')}
          </p>
          <Link href="/upload" className="btn-secondary mt-3 w-full text-xs">
            {t('rail.createPost')}
          </Link>
        </div>
      </div>

      <div className="card mt-4 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <FlameIcon className="h-4 w-4 text-brand-400" />
          {t('rail.trending')}
        </h3>
        <ol className="mt-3 space-y-0.5">
          {data?.slice(0, 7).map((tag, index) => (
            <li key={tag.name}>
              <Link
                href={`/?tags=${encodeURIComponent(tag.name)}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-zinc-800/60"
              >
                <span className="w-4 text-xs font-bold text-zinc-600">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-zinc-300">
                  #{tag.name}
                </span>
                <span className="text-xs text-zinc-500">{tag.count}</span>
              </Link>
            </li>
          ))}
        </ol>
        {!data && (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-8 w-full" />
            ))}
          </div>
        )}
        {data && data.length === 0 && (
          <p className="mt-3 text-xs text-zinc-500">{t('rail.noTrending')}</p>
        )}
        <Link
          href="/?sort=top"
          className="mt-2 flex items-center gap-1 px-2 text-xs font-medium text-brand-400 hover:text-brand-300"
        >
          <TrendingUpIcon className="h-3.5 w-3.5" />
          {t('rail.viewPopular')}
        </Link>
      </div>

      <p className="mt-4 px-3 text-[11px] leading-relaxed text-zinc-600">
        {t('rail.footer')}
      </p>
    </aside>
  );
}
