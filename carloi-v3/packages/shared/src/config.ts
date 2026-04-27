export const API_BASE_URL = 'https://api.carloi.com';

export function normalizeBaseUrl(value: unknown, fallback = API_BASE_URL) {
  if (!value) {
    return fallback;
  }

  const raw = String(value).trim();
  if (!raw) {
    return fallback;
  }

  return raw.replace(/\/+$/, '');
}
