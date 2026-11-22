'use client';

import { useEffect, useState } from 'react';
import { TargetType } from '@vp/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ArrowDownIcon, ArrowUpIcon } from './icons';

interface VoteButtonsProps {
  targetType: TargetType;
  targetId: string;
  score: number;
  viewerVote: number;
  orientation?: 'vertical' | 'horizontal';
  onChange?: (score: number, viewerVote: number) => void;
}

export function VoteButtons({
  targetType,
  targetId,
  score: initialScore,
  viewerVote: initialVote,
  orientation = 'vertical',
  onChange,
}: VoteButtonsProps) {
  const { user, login } = useAuth();
  const [score, setScore] = useState(initialScore);
  const [vote, setVote] = useState(initialVote);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setScore(initialScore);
    setVote(initialVote);
  }, [initialScore, initialVote]);

  const cast = async (value: number) => {
    if (!user) {
      login();
      return;
    }
    if (pending) {
      return;
    }

    const next = vote === value ? 0 : value;
    const previousScore = score;
    const previousVote = vote;

    setScore(score - vote + next);
    setVote(next);
    setPending(true);

    try {
      const result = await apiFetch<{ score: number; viewerVote: number }>(
        '/votes',
        {
          method: 'POST',
          body: JSON.stringify({ targetType, targetId, value: next }),
        },
      );
      setScore(result.score);
      setVote(result.viewerVote);
      onChange?.(result.score, result.viewerVote);
    } catch {
      setScore(previousScore);
      setVote(previousVote);
    } finally {
      setPending(false);
    }
  };

  const upClass =
    vote === 1
      ? 'bg-brand-500/15 text-brand-400'
      : 'text-zinc-500 hover:bg-zinc-800 hover:text-brand-400';
  const downClass =
    vote === -1
      ? 'bg-sky-500/15 text-sky-500'
      : 'text-zinc-500 hover:bg-zinc-800 hover:text-sky-500';

  if (orientation === 'horizontal') {
    return (
      <div className="inline-flex items-center gap-0.5 rounded-full border border-zinc-800/80 bg-zinc-950/40 p-0.5">
        <button
          type="button"
          aria-label="Upvote"
          title="Upvote"
          onClick={() => void cast(1)}
          disabled={pending}
          className={`flex h-6 w-6 items-center justify-center rounded-full transition disabled:opacity-50 ${upClass}`}
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
        <span
          className={`min-w-[1.4rem] text-center text-[11px] font-bold ${
            vote === 1
              ? 'text-brand-400'
              : vote === -1
                ? 'text-sky-500'
                : 'text-zinc-300'
          }`}
        >
          {score}
        </span>
        <button
          type="button"
          aria-label="Downvote"
          title="Downvote"
          onClick={() => void cast(-1)}
          disabled={pending}
          className={`flex h-6 w-6 items-center justify-center rounded-full transition disabled:opacity-50 ${downClass}`}
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 self-start rounded-full border border-zinc-800/80 bg-zinc-950/40 p-1">
      <button
        type="button"
        aria-label="Upvote"
        title="Upvote"
        onClick={() => void cast(1)}
        disabled={pending}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-50 ${upClass}`}
      >
        <ArrowUpIcon className="h-4 w-4" />
      </button>
      <span
        className={`min-w-[1.5rem] py-0.5 text-center text-xs font-bold ${
          vote === 1
            ? 'text-brand-400'
            : vote === -1
              ? 'text-sky-500'
              : 'text-zinc-300'
        }`}
      >
        {score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        title="Downvote"
        onClick={() => void cast(-1)}
        disabled={pending}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-50 ${downClass}`}
      >
        <ArrowDownIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
