function toDate(value: unknown) {
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

export function safeRelativeTime(value: unknown, fallback = 'Bilinmiyor') {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }

  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) {
    return fallback;
  }

  const diffMinutes = Math.max(1, Math.floor(diffMs / 60_000));
  if (diffMinutes < 60) {
    return `${diffMinutes} dk`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} sa`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} gun`;
  }

  return safeDateLabel(date, fallback);
}
