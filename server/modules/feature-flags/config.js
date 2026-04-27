const FEATURE_FLAGS = {
  enableCommercialOnboarding: {
    key: 'enableCommercialOnboarding',
    env: 'FEATURE_ENABLE_COMMERCIAL_ONBOARDING',
    defaultValue: true,
    phase: 1,
    description: 'Ticari hesap yukselme ve basvuru akislarini gorunur yapar.',
  },
  enableCommercialApprovalGate: {
    key: 'enableCommercialApprovalGate',
    env: 'FEATURE_ENABLE_COMMERCIAL_APPROVAL_GATE',
    defaultValue: false,
    phase: 3,
    description: 'Belirli segmentlerde onaysiz ticari hesaplarin ilan vermesini kisitlar.',
  },
  enableListingComplianceStep: {
    key: 'enableListingComplianceStep',
    env: 'FEATURE_ENABLE_LISTING_COMPLIANCE_STEP',
    defaultValue: false,
    phase: 2,
    description: 'Ilan olusturmada sahiplik ve yetki beyan adimini acar.',
  },
  enableSafePaymentGuidance: {
    key: 'enableSafePaymentGuidance',
    env: 'FEATURE_ENABLE_SAFE_PAYMENT_GUIDANCE',
    defaultValue: false,
    phase: 2,
    description: 'Noter ve resmi guvenli odeme yonlendirmesini zorunlu kabul noktasina donusturur.',
  },
  enableRiskDetection: {
    key: 'enableRiskDetection',
    env: 'FEATURE_ENABLE_RISK_DETECTION',
    defaultValue: false,
    phase: 1,
    description: 'Risk skoru, duplicate plate ve davranis heuristiklerini aktif eder.',
  },
  enablePaidListings: {
    key: 'enablePaidListings',
    env: 'FEATURE_ENABLE_PAID_LISTINGS',
    defaultValue: false,
    phase: 4,
    description: 'Ilan ucretlendirmesi ve odeme bariyerlerini gorunur yapar.',
  },
  enableSubscriptions: {
    key: 'enableSubscriptions',
    env: 'FEATURE_ENABLE_SUBSCRIPTIONS',
    defaultValue: false,
    phase: 4,
    description: 'Abonelik planlari ve ticari paket enforcement katmanini acar.',
  },
  enableAdminEvidenceExports: {
    key: 'enableAdminEvidenceExports',
    env: 'FEATURE_ENABLE_ADMIN_EVIDENCE_EXPORTS',
    defaultValue: false,
    phase: 1,
    description: 'Audit / delil export araclarini admin panelinde acar.',
  },
};

function readBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return String(value).trim().toLowerCase() === 'true';
}

function getFeatureFlagSnapshot() {
  return Object.values(FEATURE_FLAGS).map((flag) => ({
    key: flag.key,
    enabled: readBoolean(process.env[flag.env], flag.defaultValue),
    phase: flag.phase,
    description: flag.description,
    source: process.env[flag.env] === undefined ? 'default' : 'env',
  }));
}

function isFeatureEnabled(key) {
  const flag = FEATURE_FLAGS[key];
  if (!flag) {
    return false;
  }

  return readBoolean(process.env[flag.env], flag.defaultValue);
}

module.exports = {
  FEATURE_FLAGS,
  getFeatureFlagSnapshot,
  isFeatureEnabled,
};
