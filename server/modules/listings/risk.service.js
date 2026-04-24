const { createRiskFlag } = require('../audit-risk/risk.repository');
const { appendAuditLog } = require('../audit-risk/audit.repository');
const { isFeatureEnabled } = require('../feature-flags/config');
const {
  findPlateMatches,
  listSellerListingBodies,
  listUserListingPrices,
  normalizePlateNumber,
} = require('./repository');
const { parsePriceToNumber } = require('./validators');

const ABNORMAL_PRICE_MIN = 50_000;
const ABNORMAL_PRICE_MAX = 20_000_000;

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/\s+/g, ' ');
}

function calculateMedian(values) {
  const sorted = [...values].sort((first, second) => first - second);
  if (!sorted.length) {
    return null;
  }

  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

async function evaluateDuplicatePlateRisk({ plateNumber, excludePostId }) {
  const normalizedPlate = normalizePlateNumber(plateNumber);
  if (!normalizedPlate) {
    return {
      flagged: false,
      score: 0,
      severity: 'low',
      note: null,
      matches: [],
    };
  }

  const matches = await findPlateMatches(normalizedPlate, excludePostId);
  if (!matches.length) {
    return {
      flagged: false,
      score: 0,
      severity: 'low',
      note: null,
      matches: [],
    };
  }

  return {
    flagged: true,
    score: 70,
    severity: 'high',
    note:
      'Ayni plaka baska aktif ilanlarla eslesti. Ilan ek incelemeye alinabilir.',
    matches,
  };
}

async function evaluateAbnormalPriceRisk({ userId, price, excludePostId }) {
  const numericPrice = parsePriceToNumber(price);
  if (!numericPrice) {
    return {
      flagged: false,
      score: 0,
      severity: 'low',
      note: null,
      numericPrice: null,
    };
  }

  const previousRows = await listUserListingPrices(userId, excludePostId);
  const previousPrices = previousRows
    .map((row) => {
      try {
        const listing = JSON.parse(row.listing_json || '{}');
        return parsePriceToNumber(listing.price);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const sellerMedian = calculateMedian(previousPrices);
  const outsideGlobalRange = numericPrice < ABNORMAL_PRICE_MIN || numericPrice > ABNORMAL_PRICE_MAX;
  const outsideSellerRange =
    sellerMedian && (numericPrice < sellerMedian * 0.35 || numericPrice > sellerMedian * 2.8);

  if (!outsideGlobalRange && !outsideSellerRange) {
    return {
      flagged: false,
      score: 0,
      severity: 'low',
      note: null,
      numericPrice,
    };
  }

  return {
    flagged: true,
    score: outsideGlobalRange ? 45 : 30,
    severity: outsideGlobalRange ? 'medium' : 'low',
    note:
      'Fiyat bilgisi referans araliklarindan belirgin sekilde sapti. Ek inceleme gerekebilir.',
    numericPrice,
  };
}

async function evaluateSpamContentRisk({ userId, content, description, excludePostId }) {
  const normalizedContent = normalizeText([content, description].filter(Boolean).join(' '));
  const sellerBodies = await listSellerListingBodies(userId, excludePostId);
  const exactDuplicates = sellerBodies.filter((row) => {
    try {
      const listing = JSON.parse(row.listing_json || '{}');
      const comparison = normalizeText([row.content, listing.description].filter(Boolean).join(' '));
      return comparison && comparison === normalizedContent;
    } catch {
      return false;
    }
  });

  const spamSignals = [
    exactDuplicates.length > 0,
    /(whatsapp|telegram|hemen ara|acil satilik)/i.test(normalizedContent),
    normalizedContent.length < 40,
    /(.)\1{4,}/.test(normalizedContent),
  ].filter(Boolean).length;

  if (!spamSignals) {
    return {
      flagged: false,
      score: 0,
      severity: 'low',
      note: null,
    };
  }

  return {
    flagged: true,
    score: spamSignals >= 3 ? 45 : 25,
    severity: spamSignals >= 3 ? 'medium' : 'low',
    note:
      'Ilan metni tekrarlayan veya spam benzeri bir yapi gosterdi. Ek inceleme gerekebilir.',
  };
}

function calculateRiskLevel(totalScore) {
  if (totalScore >= 70) {
    return 'high';
  }

  if (totalScore >= 30) {
    return 'medium';
  }

  return 'low';
}

async function evaluateListingRisk(input) {
  const [duplicatePlate, abnormalPrice, spamContent] = await Promise.all([
    evaluateDuplicatePlateRisk(input),
    evaluateAbnormalPriceRisk(input),
    evaluateSpamContentRisk(input),
  ]);

  const score = duplicatePlate.score + abnormalPrice.score + spamContent.score;
  const level = calculateRiskLevel(score);
  const notes = [duplicatePlate.note, abnormalPrice.note, spamContent.note].filter(Boolean);

  return {
    score,
    level,
    notes,
    duplicatePlate,
    abnormalPrice,
    spamContent,
  };
}

async function persistListingRiskArtifacts({ userId, listingId, assessment, requestMeta }) {
  if (!assessment) {
    return;
  }

  await appendAuditLog({
    actorType: 'system',
    actorId: null,
    targetType: 'listing',
    targetId: listingId,
    action: 'listing.risk_scored',
    metadata: {
      riskScore: assessment.score,
      riskLevel: assessment.level,
      duplicatePlateFlag: assessment.duplicatePlate.flagged,
      abnormalPriceFlag: assessment.abnormalPrice.flagged,
      spamContentFlag: assessment.spamContent.flagged,
      notes: assessment.notes,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });

  if (!isFeatureEnabled('enableRiskDetection')) {
    return;
  }

  const pendingFlags = [];
  if (assessment.duplicatePlate.flagged) {
    pendingFlags.push({
      type: 'duplicate_plate',
      severity: assessment.duplicatePlate.severity,
      notes: assessment.duplicatePlate.note,
    });
  }
  if (assessment.abnormalPrice.flagged) {
    pendingFlags.push({
      type: 'abnormal_price',
      severity: assessment.abnormalPrice.severity,
      notes: assessment.abnormalPrice.note,
    });
  }
  if (assessment.spamContent.flagged) {
    pendingFlags.push({
      type: 'spam_listing',
      severity: assessment.spamContent.severity,
      notes: assessment.spamContent.note,
    });
  }

  for (const flag of pendingFlags) {
    await createRiskFlag({
      userId,
      relatedListingId: listingId,
      type: flag.type,
      severity: flag.severity,
      source: 'system_rule',
      status: 'open',
      notes: flag.notes,
    });
  }
}

module.exports = {
  evaluateListingRisk,
  persistListingRiskArtifacts,
};
