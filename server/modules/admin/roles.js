const { ADMIN_ROLES, PERMISSION_MATRIX } = require('./permissions');

const ADMIN_ROLE_DEFINITIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: {
    label: 'Super Admin',
    permissions: PERMISSION_MATRIX[ADMIN_ROLES.SUPER_ADMIN],
  },
  [ADMIN_ROLES.COMPLIANCE_ADMIN]: {
    label: 'Compliance Admin',
    permissions: PERMISSION_MATRIX[ADMIN_ROLES.COMPLIANCE_ADMIN],
  },
  [ADMIN_ROLES.MODERATION_ADMIN]: {
    label: 'Moderation Admin',
    permissions: PERMISSION_MATRIX[ADMIN_ROLES.MODERATION_ADMIN],
  },
  [ADMIN_ROLES.SUPPORT_ADMIN]: {
    label: 'Support Admin',
    permissions: PERMISSION_MATRIX[ADMIN_ROLES.SUPPORT_ADMIN],
  },
  [ADMIN_ROLES.BILLING_ADMIN]: {
    label: 'Billing Admin',
    permissions: PERMISSION_MATRIX[ADMIN_ROLES.BILLING_ADMIN],
  },
  [ADMIN_ROLES.ANALYTICS_ADMIN]: {
    label: 'Analytics Admin',
    permissions: PERMISSION_MATRIX[ADMIN_ROLES.ANALYTICS_ADMIN],
  },
  [ADMIN_ROLES.LEGAL_EXPORT_ADMIN]: {
    label: 'Legal Export Admin',
    permissions: PERMISSION_MATRIX[ADMIN_ROLES.LEGAL_EXPORT_ADMIN],
  },
  [ADMIN_ROLES.OPS_ADMIN]: {
    label: 'Ops Admin',
    permissions: PERMISSION_MATRIX[ADMIN_ROLES.OPS_ADMIN],
  },
};

module.exports = {
  ADMIN_ROLE_DEFINITIONS,
};
