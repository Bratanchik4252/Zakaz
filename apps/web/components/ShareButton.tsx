'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, LinkIcon } from './icons';

interface ShareButtonProps {
  postId: string;
  compact?: boolean;
  className?: string;
}

export function ShareButton({
  postId,
  compact = false,
  className = '',
}: ShareButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt(t('common.share'), url);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void share()}
        className={`inline-flex items-center gap-1.5 text-zinc-500 transition hover:text-zinc-200 ${className}`}
        title={copied ? t('common.copied') : t('common.share')}
        aria-label={t('common.share')}
      >
        {copied ? (
          <CheckIcon className="h-4 w-4 text-emerald-500" />
        ) : (
          <LinkIcon className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {copied ? t('common.copied') : t('common.share')}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={`btn-secondary ${className}`}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-emerald-500" />
      ) : (
        <LinkIcon className="h-4 w-4" />
      )}
      {copied ? t('common.copied') : t('common.share')}
    </button>
  );
}
