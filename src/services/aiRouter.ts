import { aiKeys, hasDeepSeekKey, hasOpenAIKey } from '../config/aiKeys';
import { AIMessage, Post, SocialProfile, VehicleProfile } from '../types';

type AIProvider = 'deepseek' | 'openai' | 'fallback';

interface AIRequest {
  message: string;
  history: AIMessage[];
  posts: Post[];
  profile: SocialProfile;
  vehicle?: VehicleProfile;
}

interface AIResult {
  provider: AIProvider;
  content: string;
}

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
];

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
  'ilani',
  'öner',
  'göster',
  'hangi',
  'iyi',
  'kötü',
  'karşılaştır',
  'kiyasla',
  'arasından',
  'arasında',
  'bak',
  'gibi',
]);

function parseMoney(raw: string) {
  const lowered = raw.toLocaleLowerCase('tr');
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

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR').format(value) + ' TL';
}

function getListingPosts(posts: Post[]) {
  return posts.filter((post) => post.type === 'listing' && post.listing);
}

function getBrandModel(post: Post) {
  const brand = post.listing?.specTable.find((item) => item.label === 'Marka')?.value ?? '';
  const model = post.listing?.specTable.find((item) => item.label === 'Model')?.value ?? '';
  return { brand, model };
}

function getListingPrice(post: Post) {
  return parseMoney(post.listing?.price ?? '');
}

function getAveragePrice(posts: Post[], brand: string, model: string) {
  const matching = getListingPosts(posts).filter((post) => {
    const current = getBrandModel(post);
    return current.brand === brand && current.model === model && getListingPrice(post) > 0;
  });

  if (!matching.length) {
    return 0;
  }

  return Math.round(
    matching.reduce((total, post) => total + getListingPrice(post), 0) / matching.length,
  );
}

function scorePricing(price: number, average: number) {
  if (!price || !average) {
    return 'Bu model için yeterli ilan verisi yok.';
  }

  const ratio = price / average;
  if (ratio >= 1.12) {
    return 'Bu ilan model ortalamasına göre yüksek fiyatlı görünüyor.';
  }
  if (ratio <= 0.9) {
    return 'Bu ilan model ortalamasına göre uygun fiyatlı görünüyor.';
  }
  return 'Bu ilan model ortalamasına yakın görünüyor.';
}

function extractLinks(message: string) {
  return [...message.matchAll(/https:\/\/(?:vcar|vcarx|carloi)\.app\/(?:ilan|gonderi)\/([\w-]+)/g)].map(
    (match) => match[1],
  );
}

function tokenize(message: string) {
  return message
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function findRelevantListings(message: string, posts: Post[]) {
  const tokens = tokenize(message);
  const listingPosts = getListingPosts(posts);

  return listingPosts
    .map((post) => {
      const haystack = [
        post.listing?.title,
        post.listing?.location,
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

function extractBudget(message: string) {
  const lower = message.toLocaleLowerCase('tr');
  const millionMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*milyon/);
  if (millionMatch) {
    return Math.round(Number(millionMatch[1].replace(',', '.')) * 1_000_000);
  }

  const thousandMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*bin/);
  if (thousandMatch) {
    return Math.round(Number(thousandMatch[1].replace(',', '.')) * 1_000);
  }

  const tlMatch = lower.match(/(\d[\d\.\, ]{3,})\s*tl?/);
  if (tlMatch) {
    return parseMoney(tlMatch[1]);
  }

  return 0;
}

function buildVehicleSummary(vehicle?: VehicleProfile) {
  if (!vehicle) {
    return 'Araç profili tanımlı değil.';
  }

  const faults = vehicle.faultCodes.map((item) => `${item.code} ${item.title}`).join(', ');
  const metrics = vehicle.liveMetrics
    .slice(0, 4)
    .map((metric) => `${metric.label}: ${metric.value}`)
    .join(', ');

  return [
    `Araç: ${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName}`,
    `Motor: ${vehicle.engineVolume}`,
    `Kilometre: ${vehicle.mileage}`,
    `VIN: ${vehicle.vin}`,
    `OBD bağlı: ${vehicle.obdConnected ? 'evet' : 'hayır'}`,
    typeof vehicle.healthScore === 'number' ? `Sağlık skoru: ${vehicle.healthScore}%` : 'Sağlık skoru: veri yok',
    typeof vehicle.driveScore === 'number' ? `Sürüş puanı: ${vehicle.driveScore}/100` : 'Sürüş puanı: veri yok',
    `Aktif kodlar: ${faults || 'yok'}`,
    `Canlı veriler: ${metrics || 'yok'}`,
  ].join('\n');
}

function buildSystemPrompt(vehicle?: VehicleProfile) {
  return [
    'Sen Carloi uygulaması için araç odaklı teknik asistansın.',
    'Kullanıcıya Türkçe, sade ve profesyonel cevap ver.',
    'Kesin olmadığın yerde olasılık dili kullan.',
    'Cevap sırası: muhtemel nedenler, ilk kontrol adımları, risk seviyesi, ortalama maliyet etkisi.',
    'Gereksiz uzun giriş yapma.',
    'Araç verileri varsa tanıda bunları dikkate al.',
    buildVehicleSummary(vehicle),
  ].join('\n\n');
}

function shouldUseOpenAI(message: string, vehicle?: VehicleProfile) {
  const lowerMessage = message.toLowerCase();
  const hasCriticalKeyword = criticalKeywords.some((keyword) => lowerMessage.includes(keyword));
  const hasMultipleFaults = (vehicle?.faultCodes.length ?? 0) >= 2;
  const lowHealth =
    typeof vehicle?.healthScore === 'number' ? vehicle.healthScore <= 75 : false;
  const longDescription = message.trim().length >= 220;

  return hasCriticalKeyword || hasMultipleFaults || lowHealth || longDescription;
}

function chooseProvider(message: string, vehicle?: VehicleProfile): AIProvider {
  const deepSeekReady = hasDeepSeekKey();
  const openAIReady = hasOpenAIKey();

  if (!deepSeekReady && !openAIReady) {
    return 'fallback';
  }
  if (!deepSeekReady && openAIReady) {
    return 'openai';
  }
  if (!openAIReady && deepSeekReady) {
    return 'deepseek';
  }

  return shouldUseOpenAI(message, vehicle) ? 'openai' : 'deepseek';
}

function toChatMessages(history: AIMessage[], vehicle?: VehicleProfile) {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(vehicle),
    },
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

function buildSingleListingReply(post: Post, posts: Post[]) {
  const { brand, model } = getBrandModel(post);
  const average = getAveragePrice(posts, brand, model);
  const price = getListingPrice(post);
  const pricing = scorePricing(price, average);
  const healthBadge = post.listing?.badges.find((item) => item.includes('araç sağlığı'));

  return [
    `${post.listing?.title} için kısa yorum:`,
    `Fiyat: ${post.listing?.price}`,
    `Konum: ${post.listing?.location}`,
    healthBadge ? `Ekspertiz özeti: ${healthBadge}` : null,
    average ? `Model ortalaması: ${formatMoney(average)}` : null,
    pricing,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildComparisonReply(first: Post, second: Post, posts: Post[]) {
  const firstPrice = getListingPrice(first);
  const secondPrice = getListingPrice(second);
  const firstAverage = getAveragePrice(posts, getBrandModel(first).brand, getBrandModel(first).model);
  const secondAverage = getAveragePrice(posts, getBrandModel(second).brand, getBrandModel(second).model);

  const winner =
    firstPrice && secondPrice
      ? firstPrice <= secondPrice
        ? first
        : second
      : first;

  return [
    'İki ilan karşılaştırması:',
    `1. ${first.listing?.title} - ${first.listing?.price}`,
    `Model ortalaması yorumu: ${scorePricing(firstPrice, firstAverage)}`,
    '',
    `2. ${second.listing?.title} - ${second.listing?.price}`,
    `Model ortalaması yorumu: ${scorePricing(secondPrice, secondAverage)}`,
    '',
    `İlk bakışta daha avantajlı görünen ilan: ${winner.listing?.title}`,
  ].join('\n');
}

function buildBudgetReply(message: string, posts: Post[]) {
  const budget = extractBudget(message);
  const relevant = findRelevantListings(message, posts);
  const listingPosts = relevant.length ? relevant : getListingPosts(posts);

  const matches = listingPosts
    .filter((post) => {
      const price = getListingPrice(post);
      return budget ? price > 0 && price <= budget : true;
    })
    .slice(0, 3);

  if (!matches.length) {
    return 'Uygulama içindeki ilanlarda bu bütçeye uyan net bir eşleşme bulamadım.';
  }

  return [
    budget ? `Bütçe: ${formatMoney(budget)}` : 'Uygun ilanlar:',
    ...matches.map((post, index) => `${index + 1}. ${post.listing?.title} - ${post.listing?.price}`),
  ].join('\n\n');
}

function buildPriceInsightReply(message: string, posts: Post[]) {
  const relevant = findRelevantListings(message, posts);
  if (!relevant.length) {
    return null;
  }

  const sample = relevant[0];
  const { brand, model } = getBrandModel(sample);
  const average = getAveragePrice(posts, brand, model);

  if (!average) {
    return `${brand} ${model} için yeterli ilan verisi olmadığı için ortalama fiyat çıkaramadım.`;
  }

  return `${brand} ${model} için uygulama içi ilan ortalaması yaklaşık ${formatMoney(average)} seviyesinde görünüyor.`;
}

function buildLocalAppReply(message: string, posts: Post[]) {
  const links = extractLinks(message);
  const listingPosts = getListingPosts(posts);
  const linkedPosts = links
    .map((id) => listingPosts.find((post) => post.id === id))
    .filter((post): post is Post => Boolean(post));

  if (linkedPosts.length >= 2 || message.toLocaleLowerCase('tr').includes('karşılaştır')) {
    const source = linkedPosts.length >= 2 ? linkedPosts : findRelevantListings(message, posts).slice(0, 2);
    if (source.length >= 2) {
      return buildComparisonReply(source[0], source[1], posts);
    }
  }

  if (linkedPosts.length === 1) {
    return buildSingleListingReply(linkedPosts[0], posts);
  }

  if (message.toLocaleLowerCase('tr').includes('bütçe') || message.toLocaleLowerCase('tr').includes('almak istiyorum')) {
    return buildBudgetReply(message, posts);
  }

  if (
    message.toLocaleLowerCase('tr').includes('ortalama') ||
    message.toLocaleLowerCase('tr').includes('pahalı') ||
    message.toLocaleLowerCase('tr').includes('ucuz')
  ) {
    const reply = buildPriceInsightReply(message, posts);
    if (reply) {
      return reply;
    }
  }

  const relevant = findRelevantListings(message, posts);
  if (relevant.length === 1) {
    return buildSingleListingReply(relevant[0], posts);
  }

  return null;
}

function buildLocalDiagnosticReply(message: string, vehicle?: VehicleProfile): string {
  const firstPart = vehicle?.probableFaultyParts[0];
  const faultCodes = vehicle?.faultCodes.map((item) => item.code).join(', ');

  if (!vehicle) {
    return [
      `"${message}" için genel yorum: arıza tanısını netleştirmek için önce araç marka, model ve motor bilgisini ekle.`,
      'Mümkünse Aracım ekranından OBD bağlantısı kurup rölanti ve sabit devir verisi gönder.',
      'Bu sayede kronik arıza, muhtemel parça ve maliyet tahmini daha dar bir alana iner.',
    ].join(' ');
  }

  return [
    `Mevcut bağlama göre önce ${faultCodes || 'aktif kod bulunmuyor'} tarafına bakılmalı.`,
    firstPart
      ? `${firstPart.name} şu an en güçlü adaylardan biri görünüyor ve ortalama tamir etkisi ${firstPart.repairCost}.`
      : 'Parça adayları için daha fazla OBD verisi gerekiyor.',
    'Rölanti, sabit 2500 rpm ve kısa sürüş verisiyle tekrar sorarsan cevap daha net olur.',
  ].join(' ');
}

async function requestDeepSeek(history: AIMessage[], vehicle?: VehicleProfile): Promise<AIResult> {
  const response = await fetch(aiKeys.deepSeek.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiKeys.deepSeek.apiKey}`,
    },
    body: JSON.stringify({
      model: aiKeys.deepSeek.model,
      messages: toChatMessages(history, vehicle),
      temperature: 0.2,
      max_tokens: 500,
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

  return {
    provider: 'deepseek',
    content,
  };
}

function extractOpenAIText(data: any): string | null {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    const parts = data.output.flatMap((item: any) => {
      if (!Array.isArray(item?.content)) {
        return [];
      }

      return item.content.flatMap((contentItem: any) => {
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

async function requestOpenAI(history: AIMessage[], vehicle?: VehicleProfile): Promise<AIResult> {
  const response = await fetch(aiKeys.openAI.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiKeys.openAI.apiKey}`,
    },
    body: JSON.stringify({
      model: aiKeys.openAI.model,
      input: [
        {
          role: 'developer',
          content: [
            {
              type: 'input_text',
              text: buildSystemPrompt(vehicle),
            },
          ],
        },
        ...history.map((message) => ({
          role: message.role,
          content: [
            {
              type: 'input_text',
              text: message.content,
            },
          ],
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

  return {
    provider: 'openai',
    content,
  };
}

export async function requestVehicleAssistantReply({
  history,
  message,
  posts,
  vehicle,
}: AIRequest): Promise<AIResult> {
  const localAppReply = buildLocalAppReply(message, posts);
  if (localAppReply) {
    return {
      provider: 'fallback',
      content: localAppReply,
    };
  }

  const preferredProvider = chooseProvider(message, vehicle);

  if (preferredProvider === 'fallback') {
    return {
      provider: 'fallback',
      content: buildLocalDiagnosticReply(message, vehicle),
    };
  }

  const providerOrder: AIProvider[] =
    preferredProvider === 'deepseek' ? ['deepseek', 'openai'] : ['openai', 'deepseek'];

  for (const provider of providerOrder) {
    try {
      if (provider === 'deepseek' && hasDeepSeekKey()) {
        return await requestDeepSeek(history, vehicle);
      }
      if (provider === 'openai' && hasOpenAIKey()) {
        return await requestOpenAI(history, vehicle);
      }
    } catch {
      continue;
    }
  }

  return {
    provider: 'fallback',
    content: buildLocalDiagnosticReply(message, vehicle),
  };
}

