const { config } = require('./config');

const criticalKeywords = [
  'hararet',
  'sıcak',
  'duman',
  'motor lambası',
  'limp mode',
  'çekiş düşük',
  'vuruntu',
  'şanzıman',
  'fren',
  'güvenlik',
  'arıza',
  'ariza',
  'obd',
  'dtc',
  'p0',
  'usta',
  'kronik',
];

const comparisonKeywords = ['karşılaştır', 'kıyasla', 'hangisi', 'fark', 'ikisi'];
const recommendationKeywords = [
  'bütçe',
  'almak istiyorum',
  'hangi arabayı almalıyım',
  'hangi aracı almalıyım',
  'öner',
  'tavsiye',
  'uygun araç',
];
const valueKeywords = ['piyasa değeri', 'piyasa', 'eder', 'ortalama fiyat', 'kaç para', 'değer'];
const listingCopyKeywords = ['ilan açıklaması', 'açıklama yaz', 'ilan metni', 'ilan başlığı', 'ilan hazırla'];
const stopWords = new Set([
  'araç',
  'araba',
  'istiyorum',
  'almak',
  'bütçem',
  'kadar',
  'olan',
  'bana',
  'ilan',
  'ilanı',
  'öner',
  'göster',
  'hangi',
  'iyi',
  'kötü',
  'karşılaştır',
  'kıyasla',
  'arasında',
  'arasından',
  'bak',
  'gibi',
  'yakındaki',
  'yakın',
  'en',
  'uygun',
  'fiyat',
]);

function lower(value) {
  return String(value || '').toLocaleLowerCase('tr');
}

function includesAny(message, keywords) {
  const messageLower = lower(message);
  return keywords.some((keyword) => messageLower.includes(keyword));
}

function hasDeepSeekKey() {
  return config.deepSeekApiKey.trim().length > 0;
}

function hasOpenAIKey() {
  return config.openAIApiKey.trim().length > 0;
}

function parseMoney(raw) {
  const lowered = lower(raw);
  const compact = lowered.replace(/\./g, '').replace(/,/g, '.');
  const match = compact.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return 0;
  }

  const value = Number(match[1]);
  if (Number.isNaN(value)) {
    return 0;
  }

  if (lowered.includes('milyon')) {
    return Math.round(value * 1_000_000);
  }

  if (lowered.includes('bin')) {
    return Math.round(value * 1_000);
  }

  return Math.round(Number(match[1].replace(/\D/g, '')));
}

function parseNumeric(raw) {
  const match = String(raw || '').match(/(\d[\d., ]*)/);
  if (!match) {
    return 0;
  }

  return Number(match[1].replace(/[^\d]/g, '')) || 0;
}

function formatMoney(value) {
  return `${new Intl.NumberFormat('tr-TR').format(value)} TL`;
}

function formatKm(value) {
  return value ? `${new Intl.NumberFormat('tr-TR').format(value)} km` : '-';
}

function getListingPosts(posts) {
  return posts.filter((post) => post.type === 'listing' && post.listing);
}

function getSpecValue(post, labels) {
  const wanted = labels.map((label) => lower(label));
  return (
    post.listing?.specTable.find((item) => wanted.includes(lower(item.label)))?.value ??
    post.listing?.conditionTable.find((item) => wanted.includes(lower(item.label)))?.value ??
    ''
  );
}

function getBrandModel(post) {
  return {
    brand: getSpecValue(post, ['Marka']),
    model: getSpecValue(post, ['Model']),
  };
}

function getListingYear(post) {
  return getSpecValue(post, ['Yıl', 'Model Yılı']);
}

function getListingPackage(post) {
  return getSpecValue(post, ['Paket', 'Donanım', 'Versiyon']);
}

function getListingEngine(post) {
  return getSpecValue(post, ['Motor', 'Motor Hacmi', 'Motor / Güç']);
}

function getListingFuel(post) {
  return getSpecValue(post, ['Yakıt', 'Yakıt Türü']);
}

function getListingTransmission(post) {
  return getSpecValue(post, ['Şanzıman', 'Vites']);
}

function getListingMileageValue(post) {
  return parseNumeric(getSpecValue(post, ['Kilometre', 'KM']));
}

function getListingMileageLabel(post) {
  const raw = getSpecValue(post, ['Kilometre', 'KM']);
  if (raw) {
    return raw;
  }

  return formatKm(getListingMileageValue(post));
}

function getListingHealthBadge(post) {
  return post.listing?.badges.find((item) => lower(item).includes('sağlık')) || '';
}

function getListingLocation(post) {
  return (
    post.listing?.location ||
    [post.listing?.district, post.listing?.city].filter(Boolean).join(' / ') ||
    '-'
  );
}

function getListingTitle(post) {
  return post.listing?.title || 'İlan';
}

function getListingPrice(post) {
  return parseMoney(post.listing?.price ?? '');
}

function getAveragePrice(posts, brand, model) {
  const matching = getListingPosts(posts).filter((post) => {
    const current = getBrandModel(post);
    return (
      lower(current.brand) === lower(brand) &&
      lower(current.model) === lower(model) &&
      getListingPrice(post) > 0
    );
  });

  if (!matching.length) {
    return 0;
  }

  return Math.round(
    matching.reduce((total, post) => total + getListingPrice(post), 0) / matching.length,
  );
}

function getMatchingListings(posts, brand, model, options = {}) {
  const packageName = options.packageName ? lower(options.packageName) : '';
  const year = options.year ? String(options.year) : '';

  return getListingPosts(posts).filter((post) => {
    const current = getBrandModel(post);
    if (lower(current.brand) !== lower(brand) || lower(current.model) !== lower(model)) {
      return false;
    }

    if (packageName && lower(getListingPackage(post)) !== packageName) {
      return false;
    }

    if (year && getListingYear(post) !== year) {
      return false;
    }

    return getListingPrice(post) > 0;
  });
}

function scorePricing(price, average) {
  if (!price || !average) {
    return 'Bu model için uygulama içinde yeterli fiyat verisi yok.';
  }

  const ratio = price / average;
  if (ratio >= 1.12) {
    return 'Pazar ortalamasının üzerinde konumlanıyor.';
  }
  if (ratio <= 0.9) {
    return 'Pazar ortalamasının altında konumlanıyor.';
  }

  return 'Pazar ortalamasına yakın görünüyor.';
}

function tokenize(message) {
  return String(message)
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function hasNearbyIntent(message) {
  return includesAny(message, ['yakın', 'yakındaki', 'en yakın', 'çevremde', 'yakınımda']);
}

function hasComparisonIntent(message) {
  return includesAny(message, comparisonKeywords);
}

function hasBudgetIntent(message) {
  return extractBudget(message) > 0 || includesAny(message, recommendationKeywords);
}

function hasValueIntent(message) {
  return includesAny(message, valueKeywords);
}

function hasListingCopyIntent(message) {
  return includesAny(message, listingCopyKeywords);
}

function hasTechnicalIntent(message) {
  return includesAny(message, criticalKeywords);
}

function extractLinkedPostIds(message) {
  return [...String(message).matchAll(/https:\/\/(?:vcar|vcarx|carloi)\.app\/(?:ilan|gonderi)\/([\w-]+)/g)].map(
    (match) => match[1],
  );
}

function findRelevantListings(message, posts) {
  const listingPosts = getListingPosts(posts);
  const linkedPostIds = extractLinkedPostIds(message);
  if (linkedPostIds.length) {
    const linked = linkedPostIds
      .map((id) => listingPosts.find((post) => post.id === id))
      .filter(Boolean);

    if (linked.length) {
      return linked;
    }
  }

  const tokens = tokenize(message);
  if (!tokens.length) {
    return [];
  }

  return listingPosts
    .map((post) => {
      const haystack = [
        getListingTitle(post),
        getListingLocation(post),
        post.listing?.city,
        post.listing?.district,
        ...((post.listing?.specTable ?? []).map((item) => item.value)),
      ]
        .join(' ')
        .toLocaleLowerCase('tr');

      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { post, score };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .map((item) => item.post);
}

function extractBudget(message) {
  const lowerMessage = lower(message);
  const millionMatch = lowerMessage.match(/(\d+(?:[.,]\d+)?)\s*milyon/);
  if (millionMatch) {
    return Math.round(Number(millionMatch[1].replace(',', '.')) * 1_000_000);
  }

  const thousandMatch = lowerMessage.match(/(\d+(?:[.,]\d+)?)\s*bin/);
  if (thousandMatch) {
    return Math.round(Number(thousandMatch[1].replace(',', '.')) * 1_000);
  }

  const tlMatch = lowerMessage.match(/(\d[\d., ]{3,})\s*tl?/);
  if (tlMatch) {
    return parseMoney(tlMatch[1]);
  }

  return 0;
}

function buildVehicleSummary(vehicle) {
  if (!vehicle) {
    return 'Araç profili tanımlı değil.';
  }

  const faults = (vehicle.faultCodes || []).map((item) => `${item.code} ${item.title}`).join(', ');
  const metrics = (vehicle.liveMetrics || [])
    .slice(0, 4)
    .map((metric) => `${metric.label}: ${metric.value}`)
    .join(', ');

  return [
    `Araç: ${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName}`,
    `Motor: ${vehicle.engineVolume}`,
    `Kilometre: ${vehicle.mileage}`,
    `VIN: ${vehicle.vin}`,
    `OBD bağlı: ${vehicle.obdConnected ? 'evet' : 'hayır'}`,
    typeof vehicle.healthScore === 'number'
      ? `Sağlık skoru: ${vehicle.healthScore}%`
      : 'Sağlık skoru: veri yok',
    typeof vehicle.driveScore === 'number'
      ? `Sürüş puanı: ${vehicle.driveScore}/100`
      : 'Sürüş puanı: veri yok',
    `Aktif kodlar: ${faults || 'yok'}`,
    `Canlı veriler: ${metrics || 'yok'}`,
  ].join('\n');
}

function buildSystemPrompt(vehicle) {
  return [
    "Sen Carloi uygulamasının araç uzmanı Loi AI'sın.",
    'Kullanıcıya Türkçe, sade, güven veren ve profesyonel cevap ver.',
    'Kullanıcının sorusuna göre cevabı kısa kategori başlıklarıyla düzenle.',
    'Gerektiğinde 1-3 ilgili emoji veya sembol kullanabilirsin, gereksiz süsleme yapma.',
    'Karşılaştırma, fiyat analizi, kısa liste ve seçim önerilerinde markdown tablo kullan.',
    'İlanları veya araçları kötüleme; artılarını, dikkat noktalarını ve kullanım senaryosuna uygunluğunu nötr şekilde açıkla.',
    'Kendi aracının piyasa değeri sorulduğunda uygulama içi ilan ortalamasını temel al ve bunun yaklaşık bir değer olduğunu belirt.',
    'İlan açıklaması istendiğinde kullanıcıya yayınlamaya uygun başlık ve açıklama taslağı hazırla.',
    'Arıza, DTC, kronik sorun ve maliyet sorularında usta gibi yönlendir ama kesin olmayan noktalarda olasılık dili kullan.',
    'Soruda uygulama içi ilan verisi varsa link paylaşma; ilanın özetini, tabloyu ve seçim yorumunu ver.',
    'Cevap sıralaması çoğunlukla şu akışta olsun: kısa özet, tablo veya önemli veriler, yorum, sonraki adım.',
    buildVehicleSummary(vehicle),
  ].join('\n\n');
}

function shouldUseOpenAI(message, vehicle) {
  const hasCriticalKeyword = criticalKeywords.some((keyword) => lower(message).includes(keyword));
  const hasMultipleFaults = (vehicle?.faultCodes?.length ?? 0) >= 2;
  const lowHealth =
    typeof vehicle?.healthScore === 'number' ? vehicle.healthScore <= 75 : false;
  const longDescription = String(message).trim().length >= 220;

  return hasCriticalKeyword || hasMultipleFaults || lowHealth || longDescription;
}

function distanceKm(firstLat, firstLng, secondLat, secondLng) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRad(secondLat - firstLat);
  const lngDelta = toRad(secondLng - firstLng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRad(firstLat)) *
      Math.cos(toRad(secondLat)) *
      Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getListingDistanceKm(post, location) {
  if (
    location?.latitude === undefined ||
    location?.longitude === undefined ||
    post.listing?.latitude === undefined ||
    post.listing?.longitude === undefined
  ) {
    return null;
  }

  return distanceKm(location.latitude, location.longitude, post.listing.latitude, post.listing.longitude);
}

function sortListingsByLocation(posts, location) {
  if (location?.latitude === undefined || location?.longitude === undefined) {
    return posts;
  }

  return [...posts].sort((first, second) => {
    const firstDistance = getListingDistanceKm(first, location) ?? Number.MAX_SAFE_INTEGER;
    const secondDistance = getListingDistanceKm(second, location) ?? Number.MAX_SAFE_INTEGER;
    return firstDistance - secondDistance;
  });
}

function formatDistance(distance) {
  return typeof distance === 'number' ? `${distance.toFixed(distance < 10 ? 1 : 0)} km` : '-';
}

function sanitizeCell(value) {
  return String(value || '-')
    .replace(/\|/g, '/')
    .replace(/\n/g, ' ')
    .trim() || '-';
}

function buildMarkdownTable(headers, rows) {
  return [
    `| ${headers.map(sanitizeCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(sanitizeCell).join(' | ')} |`),
  ].join('\n');
}

function buildSection(title, lines) {
  const values = (Array.isArray(lines) ? lines : [lines]).filter(
    (line) => String(line || '').trim().length,
  );
  if (!values.length) {
    return null;
  }

  return [`## ${title}`, ...values].join('\n');
}

function joinSections(sections) {
  return sections.filter(Boolean).join('\n\n');
}

function buildListingSummary(post, location) {
  const distance = getListingDistanceKm(post, location);
  return `${getListingTitle(post)} — ${post.listing?.price || '-'} — ${getListingLocation(post)}${distance ? ` — ${formatDistance(distance)}` : ''}`;
}

function buildRecommendationReasons(post, posts, budget, location) {
  const reasons = [];
  const price = getListingPrice(post);
  const mileage = getListingMileageValue(post);
  const distance = getListingDistanceKm(post, location);
  const average = getAveragePrice(posts, getBrandModel(post).brand, getBrandModel(post).model);
  const healthBadge = getListingHealthBadge(post);

  if (budget && price > 0 && price <= budget) {
    reasons.push('bütçeye uyuyor');
  }
  if (average && price > 0) {
    const ratio = price / average;
    if (ratio <= 0.95) {
      reasons.push('ortalamanın altında');
    } else if (ratio <= 1.05) {
      reasons.push('ortalama banda yakın');
    }
  }
  if (mileage && mileage <= 90_000) {
    reasons.push('km daha kontrollü');
  }
  if (typeof distance === 'number' && distance <= 30) {
    reasons.push('konuma yakın');
  }
  if (healthBadge) {
    reasons.push('ekspertiz notu var');
  }

  return reasons.slice(0, 3);
}

function scoreListingForRecommendation(post, posts, budget, location) {
  let score = 0;
  const price = getListingPrice(post);
  const mileage = getListingMileageValue(post);
  const distance = getListingDistanceKm(post, location);
  const average = getAveragePrice(posts, getBrandModel(post).brand, getBrandModel(post).model);

  if (budget && price > 0) {
    if (price <= budget) {
      score += 22;
      score += Math.max(0, 12 - Math.round((Math.abs(budget - price) / Math.max(budget, 1)) * 12));
    } else {
      score -= Math.min(18, Math.round(((price - budget) / Math.max(budget, 1)) * 24));
    }
  }

  if (average && price > 0) {
    if (price <= average) {
      score += 10;
    } else if (price <= average * 1.05) {
      score += 4;
    } else {
      score -= 6;
    }
  }

  if (mileage) {
    if (mileage <= 80_000) {
      score += 8;
    } else if (mileage <= 130_000) {
      score += 4;
    } else if (mileage >= 220_000) {
      score -= 6;
    }
  }

  if (typeof distance === 'number') {
    if (distance <= 20) {
      score += 5;
    } else if (distance >= 120) {
      score -= 2;
    }
  }

  if (getListingHealthBadge(post)) {
    score += 3;
  }

  return score;
}

function buildSingleListingReply(post, posts, location) {
  const { brand, model } = getBrandModel(post);
  const average = getAveragePrice(posts, brand, model);
  const price = getListingPrice(post);
  const healthBadge = getListingHealthBadge(post);

  return {
    content: joinSections([
      buildSection('📌 Hızlı Özet', [
        `${getListingTitle(post)} şu an uygulama içindeki dikkat çekici ilanlardan biri.`,
        `Fiyat yorumu: ${scorePricing(price, average)}`,
      ]),
      buildSection(
        '📊 İlan Özeti',
        buildMarkdownTable(['Kriter', 'Değer'], [
          ['Fiyat', post.listing?.price],
          ['Konum', getListingLocation(post)],
          ['Paket', getListingPackage(post) || '-'],
          ['Motor', getListingEngine(post) || '-'],
          ['Kilometre', getListingMileageLabel(post)],
          [
            'Yakıt / Şanzıman',
            [getListingFuel(post), getListingTransmission(post)].filter(Boolean).join(' / ') || '-',
          ],
          ['Ekspertiz Notu', healthBadge || 'Detay ekranda kontrol et'],
          ['Model Ortalaması', average ? formatMoney(average) : 'Yeterli veri yok'],
        ]),
      ),
      buildSection('🧭 Yorum', [
        'Bu ilanın karar kalitesi, bakım geçmişi, tramer kaydı ve son ekspertiz tarihiyle netleşir.',
        'Mesaj atmadan önce boya/değişen, bakım faturası ve son ağır bakım durumunu sorman iyi olur.',
      ]),
    ]),
    relatedPostIds: [post.id],
  };
}

function buildComparisonReply(first, second, posts, location, budget = 0) {
  const firstPrice = getListingPrice(first);
  const secondPrice = getListingPrice(second);
  const firstAverage = getAveragePrice(posts, getBrandModel(first).brand, getBrandModel(first).model);
  const secondAverage = getAveragePrice(posts, getBrandModel(second).brand, getBrandModel(second).model);
  const firstScore = scoreListingForRecommendation(first, posts, budget, location);
  const secondScore = scoreListingForRecommendation(second, posts, budget, location);
  const firstDistance = getListingDistanceKm(first, location);
  const secondDistance = getListingDistanceKm(second, location);

  const leadLine =
    Math.abs(firstScore - secondScore) <= 3
      ? 'İki ilan da birbirine yakın seviyede; seçim paket, km ve konum önceliğine göre değişir.'
      : `${firstScore > secondScore ? getListingTitle(first) : getListingTitle(second)} ilk inceleme için biraz daha öne çıkıyor.`;

  return {
    content: joinSections([
      buildSection('🔎 Kısa Karşılaştırma', [
        leadLine,
        'Aşağıdaki tablo fiyat ve özellik dengesini birlikte görmen için hazırlandı.',
      ]),
      buildSection(
        '📊 Karşılaştırma Tablosu',
        buildMarkdownTable(['Kriter', '1. İlan', '2. İlan'], [
          ['Başlık', getListingTitle(first), getListingTitle(second)],
          ['Fiyat', first.listing?.price, second.listing?.price],
          ['Pazar Konumu', scorePricing(firstPrice, firstAverage), scorePricing(secondPrice, secondAverage)],
          ['Paket', getListingPackage(first) || '-', getListingPackage(second) || '-'],
          ['Motor', getListingEngine(first) || '-', getListingEngine(second) || '-'],
          ['Kilometre', getListingMileageLabel(first), getListingMileageLabel(second)],
          [
            'Yakıt / Şanzıman',
            [getListingFuel(first), getListingTransmission(first)].filter(Boolean).join(' / ') || '-',
            [getListingFuel(second), getListingTransmission(second)].filter(Boolean).join(' / ') || '-',
          ],
          [
            'Konum',
            `${getListingLocation(first)}${firstDistance ? ` • ${formatDistance(firstDistance)}` : ''}`,
            `${getListingLocation(second)}${secondDistance ? ` • ${formatDistance(secondDistance)}` : ''}`,
          ],
          ['Ekspertiz Notu', getListingHealthBadge(first) || '-', getListingHealthBadge(second) || '-'],
        ]),
      ),
      buildSection('✅ Seçim Notu', [
        `1. ilan öne çıkanları: ${buildRecommendationReasons(first, posts, budget, location).join(', ') || 'özellik dengesi iyi görünüyor'}.`,
        `2. ilan öne çıkanları: ${buildRecommendationReasons(second, posts, budget, location).join(', ') || 'özellik dengesi iyi görünüyor'}.`,
        'İlanların hiçbirini peşinen elemem; karar için mesaj atıp bakım ve ekspertiz detayını netleştirmeni öneririm.',
      ]),
    ]),
    relatedPostIds: [first.id, second.id],
  };
}

function buildRecommendationTableRows(posts, allPosts, budget, location) {
  return posts.map((post, index) => [
    `${index + 1}. ${getListingTitle(post)}`,
    post.listing?.price || '-',
    getListingPackage(post) || '-',
    getListingEngine(post) || '-',
    `${getListingLocation(post)}${getListingDistanceKm(post, location) ? ` • ${formatDistance(getListingDistanceKm(post, location))}` : ''}`,
    buildRecommendationReasons(post, allPosts, budget, location).join(', ') || 'özellik dengesi',
  ]);
}

function buildBudgetReply(message, posts, location) {
  const budget = extractBudget(message);
  const relevant = findRelevantListings(message, posts);
  const source = relevant.length ? relevant : getListingPosts(posts);
  const priced = source.filter((post) => getListingPrice(post) > 0);
  const filtered = budget ? priced.filter((post) => getListingPrice(post) <= budget * 1.06) : priced;
  const ranked = [...(filtered.length ? filtered : priced)].sort(
    (first, second) =>
      scoreListingForRecommendation(second, posts, budget, location) -
      scoreListingForRecommendation(first, posts, budget, location),
  );
  const matches = (hasNearbyIntent(message) ? sortListingsByLocation(ranked, location) : ranked).slice(0, 3);

  if (!matches.length) {
    return {
      content: joinSections([
        buildSection('📭 Sonuç', [
          budget
            ? `Uygulama içinde ${formatMoney(budget)} bandına tam oturan ilan bulamadım.`
            : 'Uygulama içinde bu filtreye göre öne çıkan ilan bulamadım.',
          'İstersen marka, vites, yakıt veya şehir bilgisi ekleyip tekrar sor.',
        ]),
      ]),
      relatedPostIds: [],
    };
  }

  const lead = matches[0];
  return {
    content: joinSections([
      buildSection('🎯 Sana Uyan Kısa Liste', [
        budget
          ? `${formatMoney(budget)} bütçene göre uygulama içinde ilk bakılması gereken ilanları sıraladım.`
          : 'Uygulama içinde şu an öne çıkan ilanları sıraladım.',
      ]),
      buildSection(
        '📊 Kısa Liste Tablosu',
        buildMarkdownTable(
          ['İlan', 'Fiyat', 'Paket', 'Motor', 'Konum', 'Neden Öne Çıktı'],
          buildRecommendationTableRows(matches, posts, budget, location),
        ),
      ),
      buildSection('🧭 Yönlendirme', [
        `${getListingTitle(lead)} ilk bakışta daha dengeli görünüyor; nedeni ${buildRecommendationReasons(lead, posts, budget, location).join(', ') || 'fiyat ve özellik dengesinin daha oturmuş olması'}.`,
        'Karar vermeden önce en az iki ilan sahibine bakım, tramer ve ekspertiz detayını sorup aynı gün test sürüşü planlaman en sağlıklısı olur.',
      ]),
    ]),
    relatedPostIds: matches.map((post) => post.id),
  };
}

function buildNearbyReply(message, posts, location) {
  if (!hasNearbyIntent(message) || !location) {
    return null;
  }

  const relevant = findRelevantListings(message, posts);
  const source = relevant.length ? relevant : getListingPosts(posts);
  const nearest = sortListingsByLocation(source, location).slice(0, 3);

  if (!nearest.length) {
    return null;
  }

  return {
    content: joinSections([
      buildSection('📍 Yakındaki İlanlar', [
        `${location.city || 'Konumuna'} göre önce bakabileceğin ilanları çıkardım.`,
      ]),
      buildSection(
        '📊 Konum Tablosu',
        buildMarkdownTable(['İlan', 'Fiyat', 'Konum', 'Mesafe', 'Öne Çıkan Not'], nearest.map((post, index) => [
          `${index + 1}. ${getListingTitle(post)}`,
          post.listing?.price || '-',
          getListingLocation(post),
          formatDistance(getListingDistanceKm(post, location)),
          buildRecommendationReasons(post, posts, 0, location).join(', ') || 'yakın erişim',
        ])),
      ),
      buildSection('🧭 Not', [
        'Yakın olmak tek başına yeterli değil; yine de ekspertiz ve bakım geçmişini kontrol etmeni öneririm.',
      ]),
    ]),
    relatedPostIds: nearest.map((post) => post.id),
  };
}

function buildPriceInsightReply(message, posts) {
  const relevant = findRelevantListings(message, posts);
  if (!relevant.length) {
    return null;
  }

  const sample = relevant[0];
  const { brand, model } = getBrandModel(sample);
  const average = getAveragePrice(posts, brand, model);

  if (!average) {
    return {
      content: joinSections([
        buildSection('📉 Pazar Görünümü', [
          `${brand} ${model} için uygulama içinde yeterli ilan birikmediği için net ortalama çıkaramadım.`,
        ]),
      ]),
      relatedPostIds: [],
    };
  }

  return {
    content: joinSections([
      buildSection('💰 Pazar Görünümü', [
        `${brand} ${model} için uygulama içi ilan ortalaması yaklaşık ${formatMoney(average)} seviyesinde.`,
      ]),
      buildSection(
        '📊 Referans İlanlar',
        buildMarkdownTable(['İlan', 'Fiyat', 'Pazar Yorumu'], relevant.slice(0, 3).map((post) => [
          getListingTitle(post),
          post.listing?.price || '-',
          scorePricing(getListingPrice(post), average),
        ])),
      ),
    ]),
    relatedPostIds: relevant.slice(0, 3).map((post) => post.id),
  };
}

function buildVehicleMarketValueReply(posts, vehicle) {
  if (!vehicle) {
    return null;
  }

  const exactMatches = getMatchingListings(posts, vehicle.brand, vehicle.model, {
    packageName: vehicle.packageName,
    year: vehicle.year,
  });
  const packageMatches = getMatchingListings(posts, vehicle.brand, vehicle.model, {
    packageName: vehicle.packageName,
  });
  const modelMatches = getMatchingListings(posts, vehicle.brand, vehicle.model);
  const source =
    exactMatches.length >= 2 ? exactMatches : packageMatches.length >= 2 ? packageMatches : modelMatches;

  if (!source.length) {
    return {
      content: joinSections([
        buildSection('💰 Piyasa Değeri', [
          `${vehicle.brand} ${vehicle.model} için uygulama içinde henüz yeterli ilan verisi yok.`,
        ]),
      ]),
      relatedPostIds: [],
    };
  }

  const baseAverage = Math.round(
    source.reduce((total, post) => total + getListingPrice(post), 0) / source.length,
  );
  const mileage = parseNumeric(vehicle.mileage);
  let adjustment = 0;
  if (mileage >= 180_000) {
    adjustment -= 0.08;
  } else if (mileage >= 120_000) {
    adjustment -= 0.04;
  } else if (mileage && mileage <= 60_000) {
    adjustment += 0.04;
  }

  if (typeof vehicle.healthScore === 'number') {
    if (vehicle.healthScore <= 75) {
      adjustment -= 0.04;
    } else if (vehicle.healthScore >= 92) {
      adjustment += 0.02;
    }
  }

  const estimated = Math.round(baseAverage * (1 + adjustment));
  const lowBand = Math.round(estimated * 0.94);
  const highBand = Math.round(estimated * 1.06);

  return {
    content: joinSections([
      buildSection('💰 Tahmini Piyasa Aralığı', [
        `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName} için uygulama içi yaklaşık değer aralığı ${formatMoney(lowBand)} - ${formatMoney(highBand)} bandında görünüyor.`,
      ]),
      buildSection(
        '📊 Hesap Özeti',
        buildMarkdownTable(['Kriter', 'Değer'], [
          ['Referans ilan sayısı', String(source.length)],
          ['Model ortalaması', formatMoney(baseAverage)],
          ['Senin araç km', vehicle.mileage || '-'],
          ['Sağlık skoru', typeof vehicle.healthScore === 'number' ? `${vehicle.healthScore}%` : 'Veri yok'],
          ['Tahmini satış bandı', `${formatMoney(lowBand)} - ${formatMoney(highBand)}`],
        ]),
      ),
      buildSection('🧭 Yorum', [
        'Bu hesap uygulama içindeki ilanlara göre yaklaşık bir banttır; kaporta, bakım geçmişi ve değişen durumu fiyatı doğrudan etkiler.',
        'İlan açarken bakım özeti, tramer, boya/değişen bilgisi ve son ekspertiz tarihi varsa değeri daha doğru konumlandırabilirsin.',
      ]),
    ]),
    relatedPostIds: source.slice(0, 3).map((post) => post.id),
  };
}

function buildListingDescriptionReply(vehicle) {
  if (!vehicle) {
    return {
      content: joinSections([
        buildSection('✍️ İlan Metni Hazırlığı', [
          'Hazır bir ilan metni oluşturabilmem için önce Aracım ekranından araç bilgilerini eklemen iyi olur.',
          'Marka, model, yıl, paket, kilometre ve bakım notu geldikçe metni daha güçlü yazarım.',
        ]),
      ]),
      relatedPostIds: [],
    };
  }

  const title = `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName} ${vehicle.engineVolume}`.trim();
  const equipment = (vehicle.equipment || []).slice(0, 6).join(', ');
  const healthLine =
    typeof vehicle.healthScore === 'number'
      ? `Aracın güncel sağlık skoru uygulama içinde ${vehicle.healthScore}% olarak görünüyor.`
      : null;

  return {
    content: joinSections([
      buildSection('🧾 Hazır Başlık', [title]),
      buildSection('✍️ İlan Açıklaması Taslağı', [
        `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName} paket aracım satılıktır. Araç ${vehicle.mileage} olup ${vehicle.engineVolume} motora sahiptir. Donanım tarafında ${equipment || 'öne çıkan donanım bilgileri'} bulunmaktadır. Bakımları düzenli takip edilmişse bunu ayrıca belirtmeni öneririm. Araçla ilgilenen alıcılar için ekspertiz, tramer, boya/değişen ve bakım detaylarını mesajda net şekilde paylaşman güven oluşturur.${healthLine ? ` ${healthLine}` : ''}`,
      ]),
      buildSection('📌 Eklemeyi Unutma', [
        '- Tramer tutarı ve kaza geçmişi',
        '- Boyalı / değişen parça bilgisi',
        '- Son ağır bakım veya periyodik bakım tarihi',
        '- Lastik durumu ve muayene tarihi',
      ]),
    ]),
    relatedPostIds: [],
  };
}

function buildLocalAppReply(message, posts, location, vehicle) {
  const lowerMessage = lower(message);

  if (hasListingCopyIntent(message)) {
    return buildListingDescriptionReply(vehicle);
  }

  if (hasValueIntent(message) && vehicle && !findRelevantListings(message, posts).length) {
    return buildVehicleMarketValueReply(posts, vehicle);
  }

  if (hasComparisonIntent(message)) {
    const source = findRelevantListings(message, posts).slice(0, 2);
    if (source.length >= 2) {
      return buildComparisonReply(source[0], source[1], posts, location, extractBudget(message));
    }
  }

  const nearbyReply = buildNearbyReply(message, posts, location);
  if (nearbyReply) {
    return nearbyReply;
  }

  if (hasBudgetIntent(message)) {
    return buildBudgetReply(message, posts, location);
  }

  if (hasValueIntent(message)) {
    const insight = buildPriceInsightReply(message, posts);
    if (insight) {
      return insight;
    }
  }

  const relevant = findRelevantListings(message, posts);
  if (relevant.length >= 2 && (lowerMessage.includes('hangisi') || lowerMessage.includes('karşılaştır'))) {
    return buildComparisonReply(relevant[0], relevant[1], posts, location, extractBudget(message));
  }
  if (relevant.length === 1) {
    return buildSingleListingReply(relevant[0], posts, location);
  }

  return null;
}

function buildVehicleRiskHints(vehicle) {
  if (!vehicle) {
    return [];
  }

  const hints = [];
  const mileage = parseNumeric(vehicle.mileage);
  const currentYear = new Date().getFullYear();
  const age = vehicle.year ? Math.max(0, currentYear - Number(vehicle.year)) : 0;

  if (!vehicle.obdConnected) {
    hints.push('OBD verisi yok; canlı değer olmadan yorum daha genel kalır.');
  }
  if (mileage >= 180_000) {
    hints.push('Km yüksek olduğu için sensör, ateşleme, soğutma ve yürüyen aksam tarafı daha dikkat ister.');
  }
  if (age >= 10) {
    hints.push('Araç yaşlandığı için kauçuk hortumlar, conta ve sıvı kaçakları daha yakından izlenmeli.');
  }
  if (typeof vehicle.healthScore === 'number' && vehicle.healthScore <= 75) {
    hints.push('Sağlık skoru düşük tarafta; arıza büyümeden kontrol planı yapmak mantıklı olur.');
  }

  return hints;
}

function buildLocalDiagnosticReply(message, vehicle) {
  const firstPart = vehicle?.probableFaultyParts?.[0];
  const faultCodes = (vehicle?.faultCodes || []).map((item) => `${item.code} ${item.title}`);
  const riskHints = buildVehicleRiskHints(vehicle);

  if (!vehicle) {
    return {
      content: joinSections([
        buildSection('🔧 İlk Yorum', [
          `"${message}" için daha net yönlendirme yapabilmem adına önce araç marka, model, motor ve yıl bilgisini paylaş.`,
        ]),
        buildSection('📌 Benden En İyi Verimi Almak İçin', [
          '- Aracım ekranından araç profilini ekle',
          '- Mümkünse OBD ile rölanti ve sabit devir verisi al',
          '- Arıza lambası, ses, çekiş düşüşü veya yakıt artışı gibi belirtiyi yaz',
        ]),
      ]),
      relatedPostIds: [],
    };
  }

  return {
    content: joinSections([
      buildSection('🔎 İlk Değerlendirme', [
        faultCodes.length
          ? `Şu an ilk bakılması gereken taraf: ${faultCodes.join(', ')}.`
          : 'Aktif arıza kodu görünmüyor; belirtiye göre canlı veriye ihtiyaç var.',
        firstPart
          ? `${firstPart.name} şu an güçlü adaylardan biri görünüyor.`
          : 'Muhtemel parça için daha çok canlı veri gerekiyor.',
      ]),
      buildSection(
        '📊 Teknik Durum',
        buildMarkdownTable(['Kriter', 'Değer'], [
          ['Araç', `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName}`],
          ['Motor', vehicle.engineVolume || '-'],
          ['Kilometre', vehicle.mileage || '-'],
          ['OBD', vehicle.obdConnected ? 'Bağlı' : 'Bağlı değil'],
          ['Sağlık skoru', typeof vehicle.healthScore === 'number' ? `${vehicle.healthScore}%` : 'Veri yok'],
          ['Sürüş puanı', typeof vehicle.driveScore === 'number' ? `${vehicle.driveScore}/100` : 'Veri yok'],
        ]),
      ),
      buildSection('🧰 Muhtemel Sebep / Maliyet', [
        firstPart
          ? `${firstPart.name} için tahmini tamir etkisi ${firstPart.repairCost}; parça piyasası ${firstPart.marketPrice} civarında görünüyor.`
          : 'Parça ve maliyet tarafı için daha net OBD verisi veya aktif DTC gerekiyor.',
        ...riskHints,
      ]),
      buildSection('🧭 Sonraki Adım', [
        'Rölanti, sabit 2500 rpm ve kısa sürüş verisiyle tekrar sorarsan teşhisi daha daraltabilirim.',
        'Aynı anda hararet, çekiş düşüşü veya sert sarsıntı varsa aracı zorlamadan kontrol ettirmen daha güvenli olur.',
      ]),
    ]),
    relatedPostIds: [],
  };
}

function buildDynamicAppContext(message, posts, location, vehicle) {
  const relevant = findRelevantListings(message, posts).slice(0, 4);
  const budget = extractBudget(message);
  const vehicleAverage = vehicle ? getAveragePrice(posts, vehicle.brand, vehicle.model) : 0;

  return [
    `Kullanıcı sorusu: ${message}`,
    location
      ? `Kullanıcı konumu: ${[location.district, location.city].filter(Boolean).join(' / ') || 'paylaşıldı'}`
      : 'Kullanıcı konumu: paylaşılmadı',
    budget ? `Kullanıcı bütçesi: ${formatMoney(budget)}` : 'Kullanıcı bütçesi: belirtilmedi',
    vehicle
      ? `Kullanıcının mevcut aracı: ${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName} - ${vehicle.mileage}`
      : 'Kullanıcının mevcut aracı: eklenmemiş',
    vehicleAverage
      ? `Kullanıcının aracı için uygulama içi model ortalaması: ${formatMoney(vehicleAverage)}`
      : 'Kullanıcının aracı için uygulama içi model ortalaması: veri yok',
    relevant.length
      ? `İlgili ilanlar:\n${relevant
          .map(
            (post, index) =>
              `${index + 1}. ${buildListingSummary(post, location)} | Paket: ${getListingPackage(post) || '-'} | Motor: ${getListingEngine(post) || '-'} | Pazar notu: ${scorePricing(getListingPrice(post), getAveragePrice(posts, getBrandModel(post).brand, getBrandModel(post).model))}`,
          )
          .join('\n')}`
      : 'İlgili ilanlar: belirgin eşleşme yok',
  ].join('\n');
}

async function requestDeepSeek(history, vehicle, appContext) {
  const response = await fetch(config.deepSeekEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepSeekApiKey}`,
    },
    body: JSON.stringify({
      model: config.deepSeekModel,
      messages: [
        { role: 'system', content: buildSystemPrompt(vehicle) },
        { role: 'system', content: `Uygulama içi bağlam:\n${appContext}` },
        ...history.map((message) => ({ role: message.role, content: message.content })),
      ],
      temperature: 0.2,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('DeepSeek response was empty.');
  }

  return { provider: 'deepseek', content };
}

function extractOpenAIText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    const parts = data.output.flatMap((item) => {
      if (!Array.isArray(item?.content)) {
        return [];
      }

      return item.content.flatMap((contentItem) => {
        if (typeof contentItem?.text === 'string') {
          return [contentItem.text];
        }
        if (typeof contentItem?.content === 'string') {
          return [contentItem.content];
        }
        return [];
      });
    });

    if (parts.length) {
      return parts.join('\n').trim();
    }
  }

  return null;
}

async function requestOpenAI(history, vehicle, appContext) {
  const response = await fetch(config.openAIEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openAIApiKey}`,
    },
    body: JSON.stringify({
      model: config.openAIModel,
      input: [
        {
          role: 'developer',
          content: [{ type: 'input_text', text: buildSystemPrompt(vehicle) }],
        },
        {
          role: 'developer',
          content: [{ type: 'input_text', text: `Uygulama içi bağlam:\n${appContext}` }],
        },
        ...history.map((message) => ({
          role: message.role,
          content: [{ type: 'input_text', text: message.content }],
        })),
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = extractOpenAIText(data);
  if (!content) {
    throw new Error('OpenAI response was empty.');
  }

  return { provider: 'openai', content };
}

function buildRelatedPostIds(message, posts, location, vehicle) {
  const localReply = buildLocalAppReply(message, posts, location, vehicle);
  if (localReply?.relatedPostIds?.length) {
    return localReply.relatedPostIds;
  }

  return findRelevantListings(message, posts)
    .slice(0, 3)
    .map((post) => post.id);
}

async function requestAiReply({ history, message, posts, vehicle, location }) {
  const localAppReply = buildLocalAppReply(message, posts, location, vehicle);
  if (localAppReply) {
    return { provider: 'fallback', ...localAppReply };
  }

  const relatedPostIds = buildRelatedPostIds(message, posts, location, vehicle);
  const appContext = buildDynamicAppContext(message, posts, location, vehicle);

  const preferredProvider =
    !hasDeepSeekKey() && !hasOpenAIKey()
      ? 'fallback'
      : !hasDeepSeekKey()
        ? 'openai'
        : !hasOpenAIKey()
          ? 'deepseek'
          : shouldUseOpenAI(message, vehicle)
            ? 'openai'
            : 'deepseek';

  if (preferredProvider === 'fallback') {
    return { provider: 'fallback', ...buildLocalDiagnosticReply(message, vehicle) };
  }

  const providerOrder =
    preferredProvider === 'deepseek' ? ['deepseek', 'openai'] : ['openai', 'deepseek'];

  for (const provider of providerOrder) {
    try {
      if (provider === 'deepseek' && hasDeepSeekKey()) {
        return { ...(await requestDeepSeek(history, vehicle, appContext)), relatedPostIds };
      }
      if (provider === 'openai' && hasOpenAIKey()) {
        return { ...(await requestOpenAI(history, vehicle, appContext)), relatedPostIds };
      }
    } catch {
      continue;
    }
  }

  return { provider: 'fallback', ...buildLocalDiagnosticReply(message, vehicle) };
}

module.exports = {
  requestAiReply,
};
