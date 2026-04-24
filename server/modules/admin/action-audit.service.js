const { appendAuditLog } = require('../audit-risk/audit.repository');
const {
  ADMIN_PERMISSIONS,
  SENSITIVE_ACTIONS_REQUIRING_REASON,
} = require('./permissions');

function normalizeReason(reason) {
  const value = String(reason || '').trim();
  return value ? value : null;
}

function requireActionReason(action, reason) {
  if (!SENSITIVE_ACTIONS_REQUIRING_REASON.includes(action)) {
    return null;
  }

  const normalized = normalizeReason(reason);
  if (normalized) {
    return normalized;
  }

  const error = new Error('Bu hassas admin islemi icin gerekce metni zorunludur.');
  error.statusCode = 422;
  error.errorCode = 'ADMIN_REASON_REQUIRED';
  throw error;
}

async function logAdminAction({
  actorId,
  action,
  targetType,
  targetId,
  reason,
  metadata = {},
  ipAddress,
  userAgent,
}) {
  const normalizedReason = requireActionReason(action, reason);

  return appendAuditLog({
    actorType: 'admin',
    actorId,
    targetType,
    targetId,
    action,
    metadata: {
      ...metadata,
      reason: normalizedReason,
    },
    ipAddress,
    userAgent,
  });
}

const ADMIN_ACTION_ALIASES = Object.freeze({
  approveCommercial: 'commercial.approve',
  rejectCommercial: 'commercial.reject',
  suspendCommercial: 'commercial.suspend',
  revokeCommercial: 'commercial.revoke',
  suspendListing: 'listings.suspend',
  rejectListing: 'listings.reject',
  removePost: 'posts.remove',
  suspendUser: 'users.suspend',
  confirmRiskFlag: 'risk.confirm',
  exportAuditBundle: 'audit.export',
  exportMessageEvidence: 'messages.evidence.export',
  togglePricing: 'pricing.toggle',
  manualPaymentOverride: 'payments.manual_override',
  toggleFeatureFlag: ADMIN_PERMISSIONS.SETTINGS_FEATURE_FLAGS_WRITE,
});

module.exports = {
  ADMIN_ACTION_ALIASES,
  logAdminAction,
  requireActionReason,
};
