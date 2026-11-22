'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PostDto } from '@vp/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatNumber, timeAgo } from '@/lib/format';
import { ReportModal } from './ReportModal';
import { ShareButton } from './ShareButton';
import { VoteButtons } from './VoteButtons';
import {
  EyeIcon,
  FilmIcon,
  FlagIcon,
  MessageCircleIcon,
  PenLineIcon,
  PlayIcon,
  TrashIcon,
} from './icons';

interface PostCardProps {
  post: PostDto;
  onChange?: () => void;
}

export function PostCard({ post, onChange }: PostCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete =
    Boolean(user) &&
    (user?.id === post.author.id || user?.role !== 'USER');
  const canReport = Boolean(user) && user?.id !== post.author.id;

  const deletePost = async () => {
    if (!window.confirm(t('post.deletePostConfirm'))) {
      return;
    }
    setDeleting(true);
    try {
      await apiFetch(`/posts/${post.id}`, { method: 'DELETE' });
      onChange?.();
    } finally {
      setDeleting(false);
    }
  };

  const actionClass =
    'flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50';

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900 transition duration-300 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20">
      <Link
        href={`/post/${post.id}`}
        className="relative block aspect-video overflow-hidden bg-zinc-800"
      >
        {post.type === 'VIDEO' ? (
          post.thumbUrl ? (
            <img
              src={post.thumbUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 text-zinc-600">
              <FilmIcon className="h-8 w-8" />
            </span>
          )
        ) : (
          <span className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 p-4">
            <PenLineIcon className="h-5 w-5 text-brand-400" />
            <span className="line-clamp-3 text-sm font-medium leading-snug text-zinc-300">
              {post.body || post.title}
            </span>
          </span>
        )}

        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <span className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {post.type === 'TEXT' && (
            <span className="rounded-md bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
              {t('post.createText')}
            </span>
          )}
          {post.status === 'PENDING' && (
            <span className="rounded-md bg-amber-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-black">
              {t('common.processing')}
            </span>
          )}
          {post.status === 'REJECTED' && (
            <span className="rounded-md bg-red-600/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              {t('common.rejected')}
            </span>
          )}
        </span>

        <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          <EyeIcon className="h-3 w-3" />
          {formatNumber(post.views, i18n.language)}
        </span>

        {post.type === 'VIDEO' && (
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
              <PlayIcon
                className="h-5 w-5 translate-x-0.5"
                fill="currentColor"
                stroke="none"
              />
            </span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link
            href={`/u/${post.author.id}`}
            className="flex min-w-0 items-center gap-1.5 font-medium text-zinc-400 transition hover:text-brand-300"
          >
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt=""
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-[9px] font-bold text-white">
                {post.author.username.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate">{post.author.username}</span>
          </Link>
          <span aria-hidden>·</span>
          <span className="shrink-0">
            {timeAgo(post.createdAt, i18n.language)}
          </span>
        </div>

        <Link
          href={`/post/${post.id}`}
          className="mt-2 block text-sm font-semibold leading-snug text-zinc-100 transition group-hover:text-brand-300"
        >
          <span className="line-clamp-2 min-h-[2.6rem]">{post.title}</span>
        </Link>

        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                href={`/?tags=${encodeURIComponent(tag)}`}
                className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[10px] font-medium text-zinc-500 transition hover:border-brand-500/40 hover:text-brand-300"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-2.5 text-xs text-zinc-500">
          <VoteButtons
            targetType="POST"
            targetId={post.id}
            score={post.score}
            viewerVote={post.viewerVote}
            orientation="horizontal"
            onChange={() => onChange?.()}
          />

          <div className="flex items-center gap-0.5">
            <Link
              href={`/post/${post.id}#comments`}
              className="inline-flex h-6 items-center gap-1 rounded-full px-1.5 transition hover:bg-zinc-800/70 hover:text-zinc-200"
              aria-label={t('common.comments')}
            >
              <MessageCircleIcon className="h-3.5 w-3.5" />
              {formatNumber(post.commentCount, i18n.language)}
            </Link>
            <ShareButton postId={post.id} compact />
            {canReport && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className={actionClass}
                title={t('common.report')}
                aria-label={t('common.report')}
              >
                <FlagIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => void deletePost()}
                disabled={deleting}
                className={actionClass}
                title={t('common.delete')}
                aria-label={t('common.delete')}
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={post.id}
      />
    </article>
  );
}
