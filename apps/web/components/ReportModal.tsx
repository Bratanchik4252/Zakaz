'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CheckIcon, FlagIcon, XIcon } from './icons';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  postId?: string;
  commentId?: string;
}

export function ReportModal({
  open,
  onClose,
  postId,
  commentId,
}: ReportModalProps) {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setBusy(false);
      setDone(false);
      setError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      login();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          postId,
          commentId,
          reason: reason.trim(),
        }),
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('common.unknownError'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-md animate-fade-in p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <FlagIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-50">
                {t('reportModal.title')}
              </h3>
              <p className="text-xs text-zinc-500">
                {postId ? t('reportModal.post') : t('reportModal.comment')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon -mr-1 -mt-1"
            aria-label={t('common.close')}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="mt-5 space-y-4">
            <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
              <CheckIcon className="h-4 w-4" />
              {t('post.reportSent')}
            </p>
            <button type="button" className="btn-secondary w-full" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-zinc-300">
              {t('reportModal.reasonLabel')}
            </label>
            <textarea
              className="input min-h-[100px] resize-y"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('reportModal.reasonPlaceholder')}
              maxLength={500}
              minLength={3}
              required
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={busy || reason.trim().length < 3}
              >
                {t('reportModal.submit')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
