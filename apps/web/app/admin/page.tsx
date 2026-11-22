'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWRInfinite from 'swr/infinite';
import { Paginated, PostDto, ReportDto } from '@vp/shared';
import {
  CheckIcon,
  ClockIcon,
  FilmIcon,
  FlagIcon,
  ShieldIcon,
  TrashIcon,
} from '@/components/icons';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';

const fetchReports = (url: string) => apiFetch<Paginated<ReportDto>>(url);
const fetchPending = (url: string) => apiFetch<Paginated<PostDto>>(url);

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'reports' | 'pending'>('reports');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user || user.role === 'USER') {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <ShieldIcon className="h-8 w-8 text-zinc-600" />
        <p className="text-sm text-zinc-400">{t('admin.forbidden')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-rose-500/10 text-brand-400">
            <ShieldIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-50">
              {t('admin.panel')}
            </h1>
            <p className="text-xs text-zinc-500">{t('admin.subtitle')}</p>
          </div>
        </div>
        <span className="badge border border-zinc-700 bg-zinc-900 text-zinc-300">
          {user.role === 'ADMIN'
            ? t('common.adminRole')
            : t('common.moderator')}
        </span>
      </div>

      <div className="flex w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
        <button
          type="button"
          onClick={() => {
            setTab('reports');
            setMessage(null);
            setError(null);
          }}
          aria-pressed={tab === 'reports'}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            tab === 'reports'
              ? 'bg-zinc-800 text-zinc-50 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          <FlagIcon className="h-4 w-4" />
          {t('admin.reportsTab')}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('pending');
            setMessage(null);
            setError(null);
          }}
          aria-pressed={tab === 'pending'}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            tab === 'pending'
              ? 'bg-zinc-800 text-zinc-50 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          <ClockIcon className="h-4 w-4" />
          {t('admin.pendingTab')}
        </button>
      </div>

      {message && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
          <CheckIcon className="h-4 w-4" />
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {tab === 'reports' ? (
        <ReportsPanel onMessage={setMessage} onError={setError} />
      ) : (
        <PendingPanel onMessage={setMessage} onError={setError} />
      )}
    </div>
  );
}

function ReportsPanel({
  onMessage,
  onError,
}: {
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [showResolved, setShowResolved] = useState(false);

  const getKey = (
    _index: number,
    previous: Paginated<ReportDto> | null,
  ) => {
    if (previous && !previous.nextCursor) {
      return null;
    }
    const params = new URLSearchParams();
    params.set('resolved', showResolved ? 'true' : 'false');
    if (previous?.nextCursor) {
      params.set('cursor', previous.nextCursor);
    }
    return `/admin/reports?${params.toString()}`;
  };

  const { data, size, setSize, isLoading, mutate } =
    useSWRInfinite<Paginated<ReportDto>>(getKey, fetchReports);

  const reports = data?.flatMap((page) => page.items) ?? [];
  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);

  const act = async (
    action: () => Promise<unknown>,
    success?: string,
  ) => {
    try {
      await action();
      await mutate();
      if (success) {
        onMessage(success);
      }
    } catch (err) {
      onError(
        err instanceof ApiError ? err.message : t('common.unknownError'),
      );
    }
  };

  const resolve = (report: ReportDto, resolved: boolean) =>
    act(
      () =>
        apiFetch(`/admin/reports/${report.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ resolved }),
        }),
      t('admin.reportResolved'),
    );

  const deleteTarget = (report: ReportDto) => {
    if (!window.confirm(t('admin.deleteContentConfirm'))) {
      return;
    }
    void act(
      () =>
        report.targetType === 'POST'
          ? apiFetch(`/posts/${report.targetId}`, { method: 'DELETE' })
          : apiFetch(`/comments/${report.targetId}`, {
              method: 'DELETE',
            }),
      t('admin.deleteContent'),
    );
  };

  const banAuthor = (report: ReportDto) => {
    if (!report.targetAuthor) {
      return;
    }
    if (
      !window.confirm(
        t('admin.banConfirm', { username: report.targetAuthor.username }),
      )
    ) {
      return;
    }
    void act(
      () =>
        apiFetch(`/admin/users/${report.targetAuthor?.id}/ban`, {
          method: 'POST',
          body: JSON.stringify({ banned: true }),
        }),
      t('admin.authorBanned'),
    );
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setShowResolved((value) => !value)}
        className={`chip ${showResolved ? 'chip-active' : ''}`}
      >
        {showResolved ? t('admin.hideResolved') : t('admin.showResolved')}
      </button>

      {isLoading && reports.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckIcon className="h-5 w-5" />
          </span>
          <p className="text-sm text-zinc-400">{t('admin.noReports')}</p>
        </div>
      ) : (
        reports.map((report) => (
          <div key={report.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span
                className={`badge ${
                  report.resolved
                    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                    : 'border border-red-500/30 bg-red-500/10 text-red-600'
                }`}
              >
                {report.resolved ? t('admin.resolved') : t('admin.reportsTab')}
              </span>
              <span className="badge border border-zinc-700 bg-zinc-900 text-zinc-400">
                {report.targetType === 'POST'
                  ? t('reportModal.post')
                  : t('reportModal.comment')}
              </span>
              <span>
                {t('admin.reporter')}:{' '}
                <span className="text-zinc-300">
                  {report.reporter.username}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>{timeAgo(report.createdAt, i18n.language)}</span>
            </div>

            <p className="mt-2.5 text-sm text-zinc-200">
              <span className="text-zinc-500">{t('admin.reason')}: </span>
              {report.reason}
            </p>

            <div className="mt-2.5 rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3">
              {report.targetPostId ? (
                <Link
                  href={`/post/${report.targetPostId}`}
                  className="line-clamp-2 text-sm text-zinc-300 transition hover:text-brand-300"
                >
                  «{report.targetExcerpt}»
                </Link>
              ) : (
                <p className="line-clamp-2 text-sm text-zinc-300">
                  «{report.targetExcerpt}»
                </p>
              )}
              {report.targetAuthor && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  {t('admin.author')}:{' '}
                  <Link
                    href={`/u/${report.targetAuthor.id}`}
                    className="font-medium text-zinc-400 transition hover:text-brand-300"
                  >
                    {report.targetAuthor.username}
                  </Link>
                </p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void resolve(report, !report.resolved)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                {report.resolved ? t('admin.reopen') : t('admin.resolve')}
              </button>
              <button
                type="button"
                onClick={() => deleteTarget(report)}
                className="btn-secondary px-3 py-1.5 text-xs hover:text-red-500"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                {t('admin.deleteContent')}
              </button>
              {report.targetAuthor && (
                <button
                  type="button"
                  onClick={() => banAuthor(report)}
                  className="btn-secondary px-3 py-1.5 text-xs hover:text-red-500"
                >
                  {t('admin.banAuthor')}
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn-secondary"
            disabled={isLoading}
            onClick={() => void setSize(size + 1)}
          >
            {t('common.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}

function PendingPanel({
  onMessage,
  onError,
}: {
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { t, i18n } = useTranslation();

  const getKey = (
    _index: number,
    previous: Paginated<PostDto> | null,
  ) => {
    if (previous && !previous.nextCursor) {
      return null;
    }
    const params = new URLSearchParams();
    if (previous?.nextCursor) {
      params.set('cursor', previous.nextCursor);
    }
    const suffix = params.toString();
    return `/admin/posts/pending${suffix ? `?${suffix}` : ''}`;
  };

  const { data, size, setSize, isLoading, mutate } =
    useSWRInfinite<Paginated<PostDto>>(getKey, fetchPending);

  const posts = data?.flatMap((page) => page.items) ?? [];
  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);

  const act = async (
    action: () => Promise<unknown>,
    success?: string,
  ) => {
    try {
      await action();
      await mutate();
      if (success) {
        onMessage(success);
      }
    } catch (err) {
      onError(
        err instanceof ApiError ? err.message : t('common.unknownError'),
      );
    }
  };

  const approve = (post: PostDto) =>
    act(
      () =>
        apiFetch(`/admin/posts/${post.id}/approve`, {
          method: 'PATCH',
          body: JSON.stringify({ approved: true }),
        }),
      t('admin.postApproved'),
    );

  const remove = (post: PostDto) => {
    if (!window.confirm(t('admin.deleteContentConfirm'))) {
      return;
    }
    void act(
      () => apiFetch(`/posts/${post.id}`, { method: 'DELETE' }),
      t('admin.deleteContent'),
    );
  };

  return (
    <div className="space-y-3">
      {isLoading && posts.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckIcon className="h-5 w-5" />
          </span>
          <p className="text-sm text-zinc-400">{t('admin.noPending')}</p>
        </div>
      ) : (
        posts.map((post) => (
          <div
            key={post.id}
            className="card flex flex-wrap items-center gap-3 p-3 sm:p-4"
          >
            {post.thumbUrl ? (
              <img
                src={post.thumbUrl}
                alt=""
                className="h-16 w-24 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-500">
                <FilmIcon className="h-5 w-5" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <Link
                href={`/post/${post.id}`}
                className="block truncate text-sm font-semibold text-zinc-100 transition hover:text-brand-300"
              >
                {post.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <Link
                  href={`/u/${post.author.id}`}
                  className="font-medium text-zinc-400 transition hover:text-brand-300"
                >
                  {post.author.username}
                </Link>
                <span aria-hidden>·</span>
                <span>{timeAgo(post.createdAt, i18n.language)}</span>
                <span aria-hidden>·</span>
                <span>
                  {post.type === 'VIDEO'
                    ? t('post.createVideo')
                    : t('post.createText')}
                </span>
                {post.status === 'PENDING' && (
                  <span className="badge border border-amber-500/30 bg-amber-500/10 text-amber-600">
                    {t('common.processing')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => void approve(post)}
                className="btn-primary flex-1 px-3 py-1.5 text-xs sm:flex-none"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                {t('admin.approve')}
              </button>
              <button
                type="button"
                onClick={() => remove(post)}
                className="btn-secondary flex-1 px-3 py-1.5 text-xs hover:text-red-500 sm:flex-none"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn-secondary"
            disabled={isLoading}
            onClick={() => void setSize(size + 1)}
          >
            {t('common.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
