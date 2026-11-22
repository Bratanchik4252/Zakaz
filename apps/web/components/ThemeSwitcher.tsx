'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, PaletteIcon } from './icons';

const STORAGE_KEY = 'vidit-theme';

const THEMES = [
  {
    id: 'dark',
    labelKey: 'theme.dark',
    bg: '#0B0F19',
    accent: '#6366F1',
  },
  {
    id: 'light',
    labelKey: 'theme.light',
    bg: '#F8FAFC',
    accent: '#4F46E5',
  },
  {
    id: 'midnight',
    labelKey: 'theme.midnight',
    bg: '#081020',
    accent: '#0EA5E9',
  },
  {
    id: 'forest',
    labelKey: 'theme.forest',
    bg: '#06120F',
    accent: '#10B981',
  },
  {
    id: 'sunset',
    labelKey: 'theme.sunset',
    bg: '#140C08',
    accent: '#F97316',
  },
  {
    id: 'rose',
    labelKey: 'theme.rose',
    bg: '#140A12',
    accent: '#E11D48',
  },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme =
    theme === 'light' ? 'light' : 'dark';
}

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<ThemeId>('dark');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = THEMES.some((item) => item.id === stored)
      ? (stored as ThemeId)
      : 'dark';
    setTheme(initial);
    applyTheme(initial);

    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const choose = (next: ThemeId) => {
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn-icon"
        aria-label={t('theme.label')}
        title={t('theme.label')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <PaletteIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 animate-fade-in overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl shadow-black/40"
        >
          <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {t('theme.label')}
          </p>
          {THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === item.id}
              onClick={() => choose(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition ${
                theme === item.id
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
              }`}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 shadow-inner"
                style={{ backgroundColor: item.bg }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.accent }}
                />
              </span>
              <span className="flex-1 text-left font-medium">
                {t(item.labelKey)}
              </span>
              {theme === item.id && (
                <CheckIcon className="h-4 w-4 text-brand-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
