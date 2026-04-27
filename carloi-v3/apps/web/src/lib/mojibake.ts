export function repairMojibakeText(value: string): string {
  if (!value) {
    return '';
  }

  try {
    if (!/[ÃÄÅ]/.test(value)) {
      return value;
    }

    return decodeURIComponent(
      Array.from(value)
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
  } catch {
    return value;
  }
}

export const fixMojibake = repairMojibakeText;

export function repairMojibakeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return repairMojibakeText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => repairMojibakeDeep(item)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      repairMojibakeDeep(item),
    ]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}
