export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function formatRelativeDate(input?: string | null) {
  if (!input) {
    return 'Bilinmiyor';
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return 'Bilinmiyor';
  }

  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) {
    return 'Bilinmiyor';
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
    return `${diffDays} gün`;
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatCompactNumber(value?: number | null) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}B`;
  }
  return String(amount);
}

export function slugify(input: string) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
