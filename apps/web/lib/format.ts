export function timeAgo(iso: string, language: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const formatter = new Intl.RelativeTimeFormat(
    language === 'en' ? 'en' : 'ru',
    { numeric: 'auto' },
  );
  const abs = Math.abs(diffSeconds);

  if (abs < 60) {
    return formatter.format(diffSeconds, 'second');
  }
  if (abs < 3600) {
    return formatter.format(Math.round(diffSeconds / 60), 'minute');
  }
  if (abs < 86400) {
    return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  }
  if (abs < 2_592_000) {
    return formatter.format(Math.round(diffSeconds / 86400), 'day');
  }
  if (abs < 31_536_000) {
    return formatter.format(Math.round(diffSeconds / 2_592_000), 'month');
  }
  return formatter.format(Math.round(diffSeconds / 31_536_000), 'year');
}

export function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language === 'en' ? 'en' : 'ru').format(value);
}

export function formatDate(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en' : 'ru', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}
