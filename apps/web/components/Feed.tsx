'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { Paginated, PostDto, SortOption, TagCount } from '@vp/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DEMO_POSTS } from '@/lib/demo';
import { DemoCard } from './DemoCard';
import { PostCard } from './PostCard';
import {
  FilmIcon,
  FlameIcon,
  SparklesIcon,
  TrendingUpIcon,
  UploadIcon,
} from './icons';

const fetchPosts = (url: string) => apiFetch<Paginated<PostDto>>(url);
const fetchTags = (url: string) => apiFetch<TagCount[]>(url);

const SORT_OPTIONS: {
  value: SortOption;
  labelKey: string;
  icon: typeof FlameIcon;
}[] = [
  { value: 'hot', labelKey: 'feed.sortHot', icon: FlameIcon },
  { value: 'new', labelKey: 'feed.sortNew', icon: SparklesIcon },
  { value: 'top', labelKey: 'feed.sortTop', icon: TrendingUpIcon },
];

export function Feed({ authorId }: { authorId?: string }) {
  const { t } = useTranslation();
  const { user, loading, login } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sort, setSort] = useState<SortOption>(() => {
    const value = searchParams.get('sort');
    return value === 'new' || value === 'top' || value === 'hot'
      ? value
      : 'hot';
  });
  const [feed, setFeed] = useState<'all' | 'subs'>(() =>
    searchParams.get('feed') === 'subs' ? 'subs' : 'all',
  );
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [tags, setTags] = useState<string[]>(() =>
    (searchParams.get('tags') ?? '').split(',').filter(Boolean),
  );

  const urlQ = searchParams.get('q') ?? '';
  const urlSort = searchParams.get('sort');
  const urlFeed = searchParams.get('feed') === 'subs' ? 'subs' : 'all';
  const urlTags = searchParams.get('tags') ?? '';

  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  useEffect(() => {
    if (urlSort === 'new' || urlSort === 'top' || urlSort === 'hot') {
      setSort(urlSort);
    }
  }, [urlSort]);

  useEffect(() => {
    if (!authorId) {
      setFeed(urlFeed);
    }
  }, [urlFeed, authorId]);

  useEffect(() => {
    setTags(urlTags.split(',').filter(Boolean));
  }, [urlTags]);

  const base = useMemo(() => {
    const params = new URLSearchParams();
    params.set('sort', sort);
    if (q) {
      params.set('q', q);
    }
    if (tags.length > 0) {
      params.set('tags', tags.join(','));
    }
    if (feed === 'subs') {
      params.set('feed', 'subs');
    }
    if (authorId) {
      params.set('authorId', authorId);
    }
    return params.toString();
  }, [sort, q, tags, feed, authorId]);

  const getKey = (pageIndex: number, previous: Paginated<PostDto> | null) => {
    if (previous && !previous.nextCursor) {
      return null;
    }
    const params = new URLSearchParams(base);
    if (previous?.nextCursor) {
      params.set('cursor', previous.nextCursor);
    }
    return `/posts?${params.toString()}`;
  };

  const { data, size, setSize, isLoading, error, mutate } =
    useSWRInfinite<Paginated<PostDto>>(getKey, fetchPosts, {
      revalidateFirstPage: false,
    });

  const { data: tagData } = useSWR<TagCount[]>('/tags', fetchTags);

  const posts = useMemo(
    () => data?.flatMap((page) => page.items) ?? [],
    [data],
  );
  const isLoadingMore = isLoading || (size > 0 && !data?.[size - 1]);
  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);

  useEffect(() => {
    if (!loading && !user && feed === 'subs') {
      setFeed('all');
    }
  }, [loading, user, feed]);

  useEffect(() => {
    if (authorId) {
      return;
    }
    const params = new URLSearchParams();
    if (sort !== 'hot') {
      params.set('sort', sort);
    }
    if (q) {
      params.set('q', q);
    }
    if (tags.length > 0) {
      params.set('tags', tags.join(','));
    }
    if (feed === 'subs') {
      params.set('feed', 'subs');
    }
    const suffix = params.toString();
    router.replace(suffix ? `/?${suffix}` : '/', { scroll: false });
  }, [sort, q, tags, feed, authorId, router]);

  const chooseFeed = (mode: 'all' | 'subs') => {
    if (mode === 'subs' && !user) {
      login();
      return;
    }
    setFeed(mode);
  };

  const toggleTag = (tag: string) => {
    setTags((previous) =>
      previous.includes(tag)
        ? previous.filter((item) => item !== tag)
        : [...previous, tag].slice(0, 10),
    );
  };

  const visibleTags = useMemo(() => {
    const popular = tagData?.map((item) => item.name) ?? [];
    const selectedOnly = tags.filter((tag) => !popular.includes(tag));
    return [...selectedOnly, ...popular].slice(0, 16);
  }, [tagData, tags]);

  const clearFilters = () => {
    setQ('');
    setTags([]);
    setFeed('all');
  };

  const hasFilters = Boolean(q) || tags.length > 0 || feed === 'subs';
  const showDemo = posts.length === 0 && (Boolean(error) || isLoading);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-50 sm:text-3xl">
              {t('feed.title')}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{t('feed.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-zinc-800 bg-zinc-900/60 p-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  aria-pressed={sort === option.value}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    sort === option.value
                      ? 'bg-zinc-800 text-zinc-50 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <option.icon className="h-3.5 w-3.5" />
                  {t(option.labelKey)}
                </button>
              ))}
            </div>

            {!authorId && (
              <div className="flex rounded-full border border-zinc-800 bg-zinc-900/60 p-1">
                <button
                  type="button"
                  onClick={() => chooseFeed('all')}
                  aria-pressed={feed === 'all'}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    feed === 'all'
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {t('feed.feedAll')}
                </button>
                <button
                  type="button"
                  onClick={() => chooseFeed('subs')}
                  aria-pressed={feed === 'subs'}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    feed === 'subs'
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {t('feed.feedSubs')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {visibleTags.length > 0 && (
            <>
              <span className="shrink-0 pr-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                {t('feed.popularTags')}
              </span>
              {visibleTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={tags.includes(tag)}
                  className={`chip shrink-0 ${
                    tags.includes(tag) ? 'chip-active' : ''
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-zinc-500 transition hover:text-brand-300"
            >
              {t('feed.clearFilters')}
            </button>
          )}
        </div>

        {q && (
          <p className="text-xs text-zinc-500">
            {t('feed.resultsFor', { query: q })}
          </p>
        )}
      </div>

      {error && posts.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
          <span>{t('feed.demoNotice')}</span>
          <button
            type="button"
            onClick={() => void mutate()}
            className="text-xs font-semibold text-amber-700 underline-offset-2 transition hover:underline"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {showDemo ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {DEMO_POSTS.map((post) => (
            <DemoCard key={post.id} post={post} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
            <FilmIcon className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-zinc-50">
              {feed === 'subs'
                ? t('feed.subsEmptyTitle')
                : hasFilters
                  ? t('feed.noResultsTitle')
                  : t('feed.quietTitle')}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
              {feed === 'subs'
                ? t('feed.subsEmpty')
                : hasFilters
                  ? t('feed.noResultsHint')
                  : t('feed.quietSubtitle')}
            </p>
          </div>
          {feed === 'subs' || hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="btn-secondary"
            >
              {t('feed.clearFilters')}
            </button>
          ) : (
            <Link href="/upload" className="btn-primary">
              <UploadIcon className="h-4 w-4" />
              {t('feed.uploadFirst')}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onChange={() => void mutate()}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={isLoadingMore}
            onClick={() => void setSize(size + 1)}
          >
            {isLoadingMore ? t('common.loading') : t('common.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
