const replacements = [
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

function repairString(value) {
  let nextValue = String(value ?? '');
  for (const [from, to] of replacements) {
    nextValue = nextValue.split(from).join(to);
  }
  return nextValue;
}

function repairBrokenTurkishText(value) {
  if (typeof value === 'string') {
    return repairString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => repairBrokenTurkishText(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, repairBrokenTurkishText(item)]),
    );
  }

  return value;
}

module.exports = {
  repairBrokenTurkishText,
};

