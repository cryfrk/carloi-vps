const replacements: Array<[string, string]> = [
  ['Ãƒ¼', 'ü'],
  ['ÃƒÅ“', 'Ü'],
  ['Ãƒ¶', 'ö'],
  ['Ãƒ–', 'Ö'],
  ['Ãƒ§', 'ç'],
  ['Ãƒâ€¡', 'Ç'],
  ['Ã„±', 'ı'],
  ['Ã„°', 'İ'],
  ['Ã…Å¸', 'ş'],
  ['Ã…Ÿ', 'ş'],
  ['Ã…Å¾', 'Ş'],
  ['Ã…', 'Ş'],
  ['Ã„Å¸', 'ğ'],
  ['Ã„Å¾', 'Ä'],
  ['Ã¢â‚¬¢', '•'],
  ['Ã¢â‚¬"', '–'],
  ['Ã¢â‚¬"', '—'],
  ['Ã¢â‚¬¦', '…'],
  ['Ã¢â‚¬â„¢', "'"],
  ['Ã¢â‚¬Å“', '"'],
  ['Ã¢â‚¬', '"'],
];

function repairString(value: string) {
  let nextValue = value;
  for (const [from, to] of replacements) {
    nextValue = nextValue.split(from).join(to);
  }
  return nextValue;
}

export function repairTurkishText<T>(value: T): T {
  if (typeof value === 'string') {
    return repairString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => repairTurkishText(item)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => [key, repairTurkishText(item)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

