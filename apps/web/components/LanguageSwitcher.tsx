'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { GlobeIcon } from './icons';

export function LanguageSwitcher() {
  const { i18n: instance } = useTranslation();
  const current = instance.language === 'en' ? 'en' : 'ru';

  const change = (language: 'ru' | 'en') => {
    void i18n.changeLanguage(language);
    localStorage.setItem('lang', language);
    document.documentElement.lang = language;
  };

  return (
    <div className="flex items-center rounded-full border border-zinc-800 bg-zinc-900/60 p-0.5 text-[11px] font-semibold">
      <GlobeIcon className="mx-1.5 hidden h-3.5 w-3.5 text-zinc-500 sm:block" />
      {(['ru', 'en'] as const).map((language) => (
        <button
          key={language}
          type="button"
          onClick={() => change(language)}
          aria-pressed={current === language}
          className={`rounded-full px-2 py-1 transition ${
            current === language
              ? 'bg-zinc-800 text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
