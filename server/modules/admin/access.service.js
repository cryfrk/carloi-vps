const { ADMIN_ROLE_DEFINITIONS } = require('./roles');
const { ADMIN_PERMISSIONS, SENSITIVE_DATA_RULES } = require('./permissions');
const { ADMIN_ROUTE_RULES } = require('./route-rules');

function expandPermissions(roleKey) {
  return ADMIN_ROLE_DEFINITIONS[roleKey]?.permissions || [];
}

function getEffectivePermissions(roleKeys) {
  return Array.from(new Set(roleKeys.flatMap((roleKey) => expandPermissions(roleKey))));
}

function hasAdminPermission(roleKeys, permission) {
  const effectivePermissions = getEffectivePermissions(roleKeys);
  return effectivePermissions.includes('*') || effectivePermissions.includes(permission);
}

function hasAnyAdminPermission(roleKeys, permissions) {
  return permissions.some((permission) => hasAdminPermission(roleKeys, permission));
}

function hasAdminRole(roleKeys, roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return roleKeys.some((roleKey) => allowed.includes(roleKey));
}

function requireAdminPermission(roleKeys, permission) {
  if (hasAdminPermission(roleKeys, permission)) {
    return true;
  }

  const error = new Error('Bu islem icin gerekli admin yetkisi bulunamadi.');
  error.statusCode = 403;
  throw error;
}

function requireAnyAdminPermission(roleKeys, permissions) {
  if (hasAnyAdminPermission(roleKeys, permissions)) {
    return true;
  }

  const error = new Error('Bu islem icin gerekli admin yetkisi bulunamadi.');
  error.statusCode = 403;
  throw error;
}

function canViewMessageContent(roleKeys) {
  return hasAdminRole(roleKeys, SENSITIVE_DATA_RULES.messageContentVisibleTo);
}

function canViewCommercialDocumentFiles(roleKeys) {
  return hasAdminRole(roleKeys, SENSITIVE_DATA_RULES.commercialDocumentFilesVisibleTo);
}

function canViewPaymentInternals(roleKeys) {
  return hasAdminRole(roleKeys, SENSITIVE_DATA_RULES.paymentInternalsVisibleTo);
}

function buildAdminGuard({ anyOfPermissions = [], anyOfRoles = [], visibleToRoles = [] } = {}) {
  return function adminGuard(req, _res, next) {
    try {
      const roleKeys = Array.isArray(req.adminRoleKeys) ? req.adminRoleKeys : [];
      const allowedRoles = anyOfRoles.length ? anyOfRoles : visibleToRoles;

      if (allowedRoles.length && !hasAdminRole(roleKeys, allowedRoles)) {
        const error = new Error('Bu route icin gerekli admin rolu bulunamadi.');
        error.statusCode = 403;
        throw error;
      }

      if (anyOfPermissions.length) {
        requireAnyAdminPermission(roleKeys, anyOfPermissions);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function getAdminRouteRule(pathname) {
  return ADMIN_ROUTE_RULES[pathname] || null;
}

module.exports = {
  buildAdminGuard,
  canViewCommercialDocumentFiles,
  canViewMessageContent,
  canViewPaymentInternals,
  expandPermissions,
  getAdminRouteRule,
  getEffectivePermissions,
  hasAdminRole,
  hasAnyAdminPermission,
  hasAdminPermission,
  requireAnyAdminPermission,
  requireAdminPermission,
};
