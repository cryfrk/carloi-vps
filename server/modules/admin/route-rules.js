const { ADMIN_PERMISSIONS, ADMIN_ROLES } = require('./permissions');

const ADMIN_ROUTE_RULES = {
  '/admin/dashboard': {
    anyOfPermissions: [ADMIN_PERMISSIONS.DASHBOARD_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.COMPLIANCE_ADMIN,
      ADMIN_ROLES.MODERATION_ADMIN,
      ADMIN_ROLES.SUPPORT_ADMIN,
      ADMIN_ROLES.BILLING_ADMIN,
      ADMIN_ROLES.ANALYTICS_ADMIN,
      ADMIN_ROLES.OPS_ADMIN,
    ],
  },
  '/admin/users': {
    anyOfPermissions: [ADMIN_PERMISSIONS.USERS_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.SUPPORT_ADMIN,
      ADMIN_ROLES.COMPLIANCE_ADMIN,
    ],
  },
  '/admin/users/:id': {
    anyOfPermissions: [ADMIN_PERMISSIONS.USERS_DETAIL_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.SUPPORT_ADMIN,
      ADMIN_ROLES.COMPLIANCE_ADMIN,
    ],
  },
  '/admin/commercial': {
    anyOfPermissions: [ADMIN_PERMISSIONS.COMMERCIAL_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.COMPLIANCE_ADMIN,
    ],
  },
  '/admin/commercial/:id': {
    anyOfPermissions: [ADMIN_PERMISSIONS.COMMERCIAL_REVIEW],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.COMPLIANCE_ADMIN,
    ],
  },
  '/admin/listings': {
    anyOfPermissions: [ADMIN_PERMISSIONS.LISTINGS_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.MODERATION_ADMIN,
      ADMIN_ROLES.COMPLIANCE_ADMIN,
      ADMIN_ROLES.OPS_ADMIN,
    ],
  },
  '/admin/posts': {
    anyOfPermissions: [ADMIN_PERMISSIONS.POSTS_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.MODERATION_ADMIN,
      ADMIN_ROLES.OPS_ADMIN,
    ],
  },
  '/admin/messages': {
    anyOfPermissions: [ADMIN_PERMISSIONS.MESSAGES_METADATA_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.SUPPORT_ADMIN,
      ADMIN_ROLES.LEGAL_EXPORT_ADMIN,
    ],
  },
  '/admin/payments': {
    anyOfPermissions: [ADMIN_PERMISSIONS.PAYMENTS_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.BILLING_ADMIN,
      ADMIN_ROLES.LEGAL_EXPORT_ADMIN,
    ],
  },
  '/admin/subscriptions': {
    anyOfPermissions: [ADMIN_PERMISSIONS.SUBSCRIPTIONS_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.BILLING_ADMIN,
      ADMIN_ROLES.OPS_ADMIN,
    ],
  },
  '/admin/insurance': {
    anyOfPermissions: [ADMIN_PERMISSIONS.INSURANCE_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.BILLING_ADMIN,
      ADMIN_ROLES.OPS_ADMIN,
    ],
  },
  '/admin/risk': {
    anyOfPermissions: [ADMIN_PERMISSIONS.RISK_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.COMPLIANCE_ADMIN,
      ADMIN_ROLES.MODERATION_ADMIN,
    ],
  },
  '/admin/audit': {
    anyOfPermissions: [ADMIN_PERMISSIONS.AUDIT_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.LEGAL_EXPORT_ADMIN,
    ],
  },
  '/admin/reports': {
    anyOfPermissions: [ADMIN_PERMISSIONS.REPORTS_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.MODERATION_ADMIN,
      ADMIN_ROLES.LEGAL_EXPORT_ADMIN,
      ADMIN_ROLES.OPS_ADMIN,
    ],
  },
  '/admin/settings': {
    anyOfPermissions: [ADMIN_PERMISSIONS.SETTINGS_READ],
    visibleToRoles: [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.BILLING_ADMIN,
      ADMIN_ROLES.ANALYTICS_ADMIN,
      ADMIN_ROLES.OPS_ADMIN,
    ],
  },
};

module.exports = {
  ADMIN_ROUTE_RULES,
};
