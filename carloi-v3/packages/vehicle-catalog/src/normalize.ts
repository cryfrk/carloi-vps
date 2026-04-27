const TURKISH_CHAR_MAP: Record<string, string> = {
  '\u00e7': 'c',
  '\u00c7': 'c',
  '\u011f': 'g',
  '\u011e': 'g',
  '\u0131': 'i',
  '\u0130': 'i',
  '\u00f6': 'o',
  '\u00d6': 'o',
  '\u015f': 's',
  '\u015e': 's',
  '\u00fc': 'u',
  '\u00dc': 'u',
};

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u00e7\u00c7\u011f\u011e\u0131\u0130\u00f6\u00d6\u015f\u015e\u00fc\u00dc]/g, (character) => TURKISH_CHAR_MAP[character] || character)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugify(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, '-');
}

export function includesQuery(candidate: string, query: string) {
  if (!query.trim()) {
    return true;
  }

  return normalizeSearchText(candidate).includes(normalizeSearchText(query));
}

export function uniqueBySlug<T extends { slug: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.slug)) {
      return false;
    }
    seen.add(item.slug);
    return true;
  });
}
