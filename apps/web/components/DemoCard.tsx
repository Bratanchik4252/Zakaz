'use client';

import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import { DemoPost } from '@/lib/demo';
import {
  ArrowUpIcon,
  EyeIcon,
  MessageCircleIcon,
  PlayIcon,
} from './icons';

export function DemoCard({ post }: { post: DemoPost }) {
  const { i18n } = useTranslation();
  const language = i18n.language === 'en' ? 'en' : 'ru';

  return (
    <article className="group overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900 transition duration-300 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20">
      <div className="relative aspect-video overflow-hidden bg-zinc-800">
        <img
          src={post.image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {post.category[language]}
        </span>
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {post.duration}
        </span>
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
            <PlayIcon
              className="h-5 w-5 translate-x-0.5"
              fill="currentColor"
              stroke="none"
            />
          </span>
        </span>
      </div>

      <div className="p-3.5">
        <h3 className="line-clamp-2 min-h-[2.6rem] text-sm font-semibold leading-snug text-zinc-100 transition group-hover:text-brand-300">
          {post.title[language]}
        </h3>

        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${post.gradient} text-[10px] font-bold text-white`}
          >
            {post.author.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate font-medium text-zinc-400">
            {post.author}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="h-3.5 w-3.5" />
            {formatNumber(post.views, language)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-zinc-800/60 pt-2.5 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1 font-semibold text-zinc-300">
            <ArrowUpIcon className="h-3.5 w-3.5" />
            {formatNumber(post.score, language)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircleIcon className="h-3.5 w-3.5" />
            {formatNumber(post.comments, language)}
          </span>
        </div>
      </div>
    </article>
  );
}
