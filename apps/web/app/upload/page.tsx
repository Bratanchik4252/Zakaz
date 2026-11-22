'use client';

import { DragEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
  PostDto,
  PresignResponse,
} from '@vp/shared';
import {
  FilmIcon,
  PenLineIcon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from '@/components/icons';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

async function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read video metadata'));
    };
    video.src = url;
  });
}

function uploadToS3(
  presign: PresignResponse,
  file: File,
  onProgress: (value: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    Object.entries(presign.fields).forEach(([key, value]) => {
      form.append(key, value);
    });
    form.append('file', file);

    const request = new XMLHttpRequest();
    request.open('POST', presign.url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${request.status}`));
      }
    };
    request.onerror = () => reject(new Error('Upload failed'));
    request.send(form);
  });
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function UploadPage() {
  const { t } = useTranslation();
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<'VIDEO' | 'TEXT'>('VIDEO');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-rose-600 text-white shadow-glow">
          <UploadIcon className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-bold text-zinc-50">{t('post.newPost')}</h1>
        <p className="text-sm text-zinc-400">{t('common.loginRequired')}</p>
        <button type="button" onClick={login} className="btn-primary">
          {t('auth.signInGoogle')}
        </button>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 5);

    setBusy(true);
    setProgress(0);

    try {
      if (type === 'VIDEO') {
        if (!file) {
          throw new Error(t('post.noFile'));
        }
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          throw new Error(t('post.videoTooLarge'));
        }
        if (
          !(ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(
            file.type,
          )
        ) {
          throw new Error(t('post.invalidVideoType'));
        }

        const duration = await readDuration(file).catch(() => null);
        if (
          duration !== null &&
          duration > MAX_VIDEO_DURATION_SECONDS + 0.5
        ) {
          throw new Error(t('post.videoTooLong'));
        }

        const presign = await apiFetch<PresignResponse>('/upload/presign', {
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });

        await uploadToS3(presign, file, setProgress);

        const post = await apiFetch<PostDto>('/posts', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim() || undefined,
            type: 'VIDEO',
            videoKey: presign.key,
            tags,
          }),
        });

        router.push(`/post/${post.id}`);
        return;
      }

      const post = await apiFetch<PostDto>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          type: 'TEXT',
          tags,
        }),
      });

      router.push(`/post/${post.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t('common.unknownError'),
      );
      setBusy(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (busy) {
      return;
    }
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setProgress(0);
    }
  };

  const tabClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active
        ? 'bg-zinc-800 text-zinc-50 shadow-sm'
        : 'text-zinc-400 hover:text-zinc-100'
    }`;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-50">
          {t('post.newPost')}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t('post.newPostSubtitle')}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={submit} className="card space-y-5 p-4 sm:p-5">
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
            {(['VIDEO', 'TEXT'] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={busy}
                onClick={() => setType(option)}
                className={tabClass(type === option)}
              >
                {option === 'VIDEO' ? (
                  <FilmIcon className="h-4 w-4" />
                ) : (
                  <PenLineIcon className="h-4 w-4" />
                )}
                {option === 'VIDEO'
                  ? t('post.createVideo')
                  : t('post.createText')}
              </button>
            ))}
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-zinc-300">
              {t('post.title')}
            </span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('post.titlePlaceholder')}
              minLength={3}
              maxLength={200}
              required
              disabled={busy}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-zinc-300">
              {t('post.body')}{' '}
              <span className="font-normal text-zinc-600">
                ({t('common.optional')})
              </span>
            </span>
            <textarea
              className="input min-h-[110px] resize-y"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t('post.bodyPlaceholder')}
              maxLength={10000}
              required={type === 'TEXT'}
              disabled={busy}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-zinc-300">
              {t('post.tags')}{' '}
              <span className="font-normal text-zinc-600">
                ({t('common.optional')})
              </span>
            </span>
            <input
              className="input"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder={t('post.tagsPlaceholder')}
              disabled={busy}
            />
          </label>

          {type === 'VIDEO' ? (
            <div className="space-y-2">
              <span className="block text-sm font-medium text-zinc-300">
                {t('post.videoFile')}
              </span>
              <label
                htmlFor="video-file"
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!busy) {
                    setDragging(true);
                  }
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition ${
                  dragging
                    ? 'border-brand-500 bg-brand-500/10'
                    : file
                      ? 'border-emerald-700/60 bg-emerald-950/20'
                      : 'border-zinc-700 bg-zinc-950/30 hover:border-zinc-600'
                }`}
              >
                <input
                  id="video-file"
                  type="file"
                  accept={ALLOWED_VIDEO_MIME_TYPES.join(',')}
                  disabled={busy}
                  className="sr-only"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setProgress(0);
                  }}
                />
                {file ? (
                  <>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                      <FilmIcon className="h-5 w-5" />
                    </span>
                    <span className="max-w-full truncate text-sm font-semibold text-zinc-100">
                      {file.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setFile(null);
                        setProgress(0);
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition hover:text-red-500"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      {t('common.remove')}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
                      <UploadIcon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-zinc-200">
                      {t('post.dropzoneTitle')}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {t('post.dropzoneHint')}
                    </span>
                  </>
                )}
              </label>
              <p className="text-xs text-zinc-600">{t('post.videoHint')}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3 text-xs text-zinc-500">
              {t('post.textPostHint')}
            </p>
          )}

          {type === 'VIDEO' && busy && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>
                  {progress < 100
                    ? t('post.uploading')
                    : t('post.publishing')}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-rose-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? t('post.publishing') : t('post.publish')}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
              <SparklesIcon className="h-4 w-4 text-brand-400" />
              {t('post.tipsTitle')}
            </h2>
            <ul className="mt-3 space-y-3 text-xs leading-relaxed text-zinc-400">
              <li className="flex gap-2.5">
                <FilmIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <span>{t('post.tipFormat')}</span>
              </li>
              <li className="flex gap-2.5">
                <UploadIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <span>{t('post.tipSize')}</span>
              </li>
              <li className="flex gap-2.5">
                <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <span>{t('post.tipQuality')}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 to-transparent p-4">
            <p className="text-sm font-semibold text-brand-200">
              {t('post.preModerationTitle')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              {t('post.preModerationText')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
