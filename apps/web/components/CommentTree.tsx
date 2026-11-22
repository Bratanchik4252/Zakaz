'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommentDto } from '@vp/shared';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { ReportModal } from './ReportModal';
import { VoteButtons } from './VoteButtons';
import {
  FlagIcon,
  MessageCircleIcon,
  PenLineIcon,
  TrashIcon,
} from './icons';

interface CommentTreeProps {
  comments: CommentDto[];
  postId: string;
  onChange: () => void;
}

interface CommentNodeProps {
  comment: CommentDto;
  postId: string;
  onChange: () => void;
  depth: number;
}

export function CommentTree({ comments, postId, onChange }: CommentTreeProps) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {comments.map((comment) => (
        <CommentNode
          key={comment.id}
          comment={comment}
          postId={postId}
          onChange={onChange}
          depth={0}
        />
      ))}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-[10px] font-bold text-zinc-200">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function CommentNode({ comment, postId, onChange, depth }: CommentNodeProps) {
  const { t, i18n } = useTranslation();
  const { user, login } = useAuth();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.body);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const isOwner = Boolean(user) && user?.id === comment.author?.id;
  const canDelete = isOwner || (Boolean(user) && user?.role !== 'USER');

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/comments/${comment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: text.trim() }),
      });
      setEditing(false);
      onChange();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('common.unknownError'),
      );
    } finally {
      setBusy(false);
    }
  };

  const submitReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      login();
      return;
    }
    if (!replyText.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: replyText.trim(),
          parentId: comment.id,
        }),
      });
      setReplyText('');
      setReplying(false);
      onChange();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('common.unknownError'),
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('post.deleteCommentConfirm'))) {
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/comments/${comment.id}`, { method: 'DELETE' });
      onChange();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('common.unknownError'),
      );
    } finally {
      setBusy(false);
    }
  };

  const actionClass =
    'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-800/70 hover:text-zinc-200';

  return (
    <div
      className={
        depth > 0
          ? 'relative pl-4 before:absolute before:bottom-3 before:left-0 before:top-3 before:w-px before:bg-zinc-800 sm:pl-5'
          : ''
      }
    >
      <div className="rounded-xl px-2 py-2 transition hover:bg-zinc-900/40 sm:px-3">
        <div className="flex gap-2.5">
          {comment.author ? (
            <Link href={`/u/${comment.author.id}`} className="shrink-0">
              <Avatar
                name={comment.author.username}
                url={comment.author.avatarUrl}
              />
            </Link>
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-500">
              ?
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
              {comment.author ? (
                <Link
                  href={`/u/${comment.author.id}`}
                  className="font-semibold text-zinc-300 transition hover:text-brand-300"
                >
                  {comment.author.username}
                </Link>
              ) : (
                <span className="italic">{t('common.deleted')}</span>
              )}
              <span aria-hidden>·</span>
              <span>{timeAgo(comment.createdAt, i18n.language)}</span>
              {comment.isEdited && (
                <span className="text-zinc-600">({t('common.edited')})</span>
              )}
            </div>

            {editing ? (
              <form onSubmit={submitEdit} className="mt-2 space-y-2">
                <textarea
                  className="input min-h-[80px] resize-y"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={5000}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn-primary px-3 py-1.5 text-xs"
                    disabled={busy || !text.trim()}
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => setEditing(false)}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <p
                className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
                  comment.isDeleted
                    ? 'italic text-zinc-600'
                    : 'text-zinc-200'
                }`}
              >
                {comment.body}
              </p>
            )}

            {!comment.isDeleted && !editing && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {user && (
                  <VoteButtons
                    targetType="COMMENT"
                    targetId={comment.id}
                    score={comment.score}
                    viewerVote={comment.viewerVote}
                    orientation="horizontal"
                  />
                )}
                {user && (
                  <button
                    type="button"
                    onClick={() => setReplying((value) => !value)}
                    className={actionClass}
                  >
                    <MessageCircleIcon className="h-3.5 w-3.5" />
                    {t('common.reply')}
                  </button>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setText(comment.body);
                      setEditing(true);
                    }}
                    className={actionClass}
                  >
                    <PenLineIcon className="h-3.5 w-3.5" />
                    {t('common.edit')}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => void remove()}
                    disabled={busy}
                    className={`${actionClass} hover:text-red-500`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </button>
                )}
                {user && !isOwner && (
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className={`${actionClass} hover:text-red-500`}
                  >
                    <FlagIcon className="h-3.5 w-3.5" />
                    {t('common.report')}
                  </button>
                )}
              </div>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

            {replying && (
              <form onSubmit={submitReply} className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-rose-600 text-[10px] font-bold text-white">
                    {(user?.username ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <textarea
                    className="input min-h-[70px] resize-y"
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder={t('post.commentPlaceholder')}
                    maxLength={5000}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 pl-9">
                  <button
                    type="submit"
                    className="btn-primary px-3 py-1.5 text-xs"
                    disabled={busy || !replyText.trim()}
                  >
                    {t('common.send')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => setReplying(false)}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            )}

            <ReportModal
              open={reportOpen}
              onClose={() => setReportOpen(false)}
              commentId={comment.id}
            />
          </div>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="space-y-0.5">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              postId={postId}
              onChange={onChange}
              depth={Math.min(depth + 1, 8)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
