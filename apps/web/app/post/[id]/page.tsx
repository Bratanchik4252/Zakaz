'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { CommentDto, PostDto, UserProfile } from '@vp/shared';
import { CommentTree } from '@/components/CommentTree';
import { ReportModal } from '@/components/ReportModal';
import { ShareButton } from '@/components/ShareButton';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VoteButtons } from '@/components/VoteButtons';
import {
  ArrowLeftIcon,
  ClockIcon,
  EyeIcon,
  FlagIcon,
  MessageCircleIcon,
  TrashIcon,
} from '@/components/icons';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatNumber, timeAgo } from '@/lib/format';

const fetchPost = (url: string) => apiFetch<PostDto>(url);
const fetchComments = (url: string) =>
  apiFetch<{ items: CommentDto[] }>(url);
const fetchProfile = (url: string) => apiFetch<UserProfile>(url);

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: post, error: loadError, isLoading } = useSWR<PostDto>(
    id ? `/posts/${id}` : null,
    fetchPost,
    {
      refreshInterval: (latest) =>
        latest?.status === 'PENDING' ? 3000 : 0,
    },
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-5 w-24" />
        <div className="skeleton aspect-video w-full rounded-2xl" />
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    );
  }

  if (loadError || !post) {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-sm text-zinc-400">{t('post.notFound')}</p>
        <Link href="/" className="btn-secondary">
          {t('common.back')}
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === post.author.id;
  const isStaff = user?.role === 'MODERATOR' || user?.role === 'ADMIN';
  const canDelete = isOwner || isStaff;
  const canComment = post.status === 'READY' && post.approved;

  const remove = async () => {
    if (!window.confirm(t('post.deletePostConfirm'))) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/posts/${post.id}`, { method: 'DELETE' });
      router.push('/');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('common.unknownError'),
      );
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-5">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t('common.back')}
      </button>

      <article className="card overflow-hidden">
        {post.type === 'VIDEO' && post.videoUrl && (
          <div className="p-3 pb-0 sm:p-4 sm:pb-0">
            <VideoPlayer src={post.videoUrl} poster={post.thumbUrl} />
          </div>
        )}

        <div className="p-4 sm:p-5">
          {(post.status === 'PENDING' ||
            post.status === 'REJECTED' ||
            !post.approved) && (
            <div className="mb-4 space-y-2">
              {post.status === 'PENDING' && (isOwner || isStaff) && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600">
                  <ClockIcon className="h-4 w-4 shrink-0" />
                  {t('post.processingVideo')}
                </div>
              )}
              {post.status === 'REJECTED' && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600">
                  <p className="font-semibold">{t('post.rejectedVideo')}</p>
                  {post.rejectionReason && (
                    <p className="mt-0.5 text-red-600/80">
                      {t('post.rejectionReason')}: {post.rejectionReason}
                    </p>
                  )}
                </div>
              )}
              {!post.approved && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-sm text-sky-600">
                  {t('admin.pendingTab')}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <EyeIcon className="h-3.5 w-3.5" />
              {t('post.viewsCount', {
                value: formatNumber(post.views, i18n.language),
              })}
            </span>
            <span aria-hidden>·</span>
            <span>{timeAgo(post.createdAt, i18n.language)}</span>
            {post.tags.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/?tags=${encodeURIComponent(tag)}`}
                      className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[11px] font-medium text-zinc-400 transition hover:border-brand-500/40 hover:text-brand-300"
                    >
                      #{tag}
                    </Link>
                  ))}
                </span>
              </>
            )}
          </div>

          <h1 className="mt-2 text-balance text-2xl font-extrabold leading-tight tracking-tight text-zinc-50 sm:text-3xl">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <VoteButtons
              targetType="POST"
              targetId={post.id}
              score={post.score}
              viewerVote={post.viewerVote}
              orientation="horizontal"
            />
            <ShareButton postId={post.id} />
            {user && !isOwner && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="btn-ghost"
              >
                <FlagIcon className="h-4 w-4" />
                {t('common.report')}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={deleting}
                className="btn-ghost hover:text-red-500"
              >
                <TrashIcon className="h-4 w-4" />
                {t('post.deletePost')}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/70 pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={`/u/${post.author.id}`}>
                {post.author.avatarUrl ? (
                  <img
                    src={post.author.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-rose-600 text-sm font-bold text-white">
                    {post.author.username.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/u/${post.author.id}`}
                  className="block truncate text-sm font-bold text-zinc-100 transition hover:text-brand-300"
                >
                  {post.author.username}
                </Link>
                <p className="text-xs text-zinc-500">
                  {t('common.karma')}:{' '}
                  {formatNumber(post.author.karma, i18n.language)}
                </p>
              </div>
            </div>
            <SubscribeButton authorId={post.author.id} />
          </div>

          {post.body && (
            <div className="mt-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {post.body}
              </p>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
      </article>

      <section id="comments" className="card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-50">
          <MessageCircleIcon className="h-5 w-5 text-brand-400" />
          {t('post.commentsTitle')}
          <span className="text-sm font-medium text-zinc-500">
            {post.commentCount}
          </span>
        </h2>
        <Comments postId={post.id} canComment={canComment} />
      </section>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={post.id}
      />
    </div>
  );
}

function SubscribeButton({ authorId }: { authorId: string }) {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [busy, setBusy] = useState(false);
  const { data, mutate } = useSWR<UserProfile>(
    `/users/${authorId}`,
    fetchProfile,
  );

  if (user?.id === authorId) {
    return null;
  }

  const subscribed = data?.isSubscribed ?? false;

  const toggle = async () => {
    if (!user) {
      login();
      return;
    }
    setBusy(true);
    try {
      if (subscribed) {
        await apiFetch(`/subscriptions/${authorId}`, { method: 'DELETE' });
      } else {
        await apiFetch('/subscriptions', {
          method: 'POST',
          body: JSON.stringify({ targetType: 'USER', targetId: authorId }),
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
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={subscribed ? 'btn-secondary' : 'btn-primary'}
    >
      {subscribed ? t('post.unsubscribe') : t('post.subscribe')}
    </button>
  );
}

function Comments({
  postId,
  canComment,
}: {
  postId: string;
  canComment: boolean;
}) {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: loadError, mutate } = useSWR<{
    items: CommentDto[];
  }>(`/posts/${postId}/comments`, fetchComments);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      login();
      return;
    }
    if (!body.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody('');
      await mutate();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('common.unknownError'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {!user ? (
        <button
          type="button"
          onClick={login}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 px-4 py-4 text-sm font-medium text-zinc-400 transition hover:border-brand-500/40 hover:text-brand-300"
        >
          <MessageCircleIcon className="h-4 w-4" />
          {t('post.loginToComment')}
        </button>
      ) : canComment ? (
        <form onSubmit={submit} className="space-y-2">
          <div className="flex gap-2.5">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-rose-600 text-xs font-bold text-white">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            <textarea
              className="input min-h-[90px] resize-y"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t('post.commentPlaceholder')}
              maxLength={5000}
            />
          </div>
          <div className="flex items-center gap-3 pl-[42px]">
            <button
              type="submit"
              className="btn-primary px-4 py-1.5 text-xs"
              disabled={busy || !body.trim()}
            >
              {t('post.addComment')}
            </button>
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        </form>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <div className="skeleton h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-500">{t('common.error')}</p>
          <button
            type="button"
            className="text-sm font-medium text-brand-400"
            onClick={() => void mutate()}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          {t('post.noComments')}
        </p>
      ) : (
        <CommentTree
          comments={data.items}
          postId={postId}
          onChange={() => void mutate()}
        />
      )}
    </div>
  );
}
