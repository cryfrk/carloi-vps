const { isFeatureEnabled } = require('../feature-flags/config');
const {
  createRiskFlag,
  getRiskOverview,
  listOpenRiskFlags,
  listRiskFlags,
  reviewRiskFlag,
} = require('./risk.repository');

function evaluateCommercialBehaviorSignal({ yearlyVehicleSaleCount = 0, yearlyVehicleListingCount = 0 }) {
  if (yearlyVehicleSaleCount >= 3) {
    return {
      triggered: true,
      severity: 'medium',
      type: 'excessive_sales',
      notes: 'Additional review required due to yearly vehicle sale activity.',
    };
  }

  if (yearlyVehicleListingCount >= 12) {
    return {
      triggered: true,
      severity: 'low',
      type: 'spam_listing',
      notes: 'Additional review required due to concentrated yearly listing volume.',
    };
  }

  return { triggered: false };
}

async function maybeCreateCommercialBehaviorFlag(userId, counters) {
  if (!isFeatureEnabled('enableRiskDetection')) {
    return null;
  }

  const signal = evaluateCommercialBehaviorSignal(counters);
  if (!signal.triggered) {
    return null;
  }

  return createRiskFlag({
    userId,
    type: signal.type,
    severity: signal.severity,
    source: 'system_rule',
    notes: signal.notes,
  });
}

module.exports = {
  evaluateCommercialBehaviorSignal,
  getRiskOverview,
  listRiskFlags,
  listOpenRiskFlags,
  maybeCreateCommercialBehaviorFlag,
  reviewRiskFlag,
};
