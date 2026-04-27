function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function safeDateLabel(value: unknown, fallback = 'Bilinmiyor') {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function safeTimeLabel(value: unknown, fallback = '--:--') {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function safeRelativeTime(value: unknown, fallback = 'Bilinmiyor') {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }

  const diffMs = date.getTime() - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' });

  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), 'minute');
  }

  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), 'hour');
  }

  if (Math.abs(diffMs) < 7 * day) {
    return rtf.format(Math.round(diffMs / day), 'day');
  }

  return safeDateLabel(date, fallback);
}
