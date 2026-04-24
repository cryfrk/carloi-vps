const {
  buildAdminGuard,
  canViewCommercialDocumentFiles,
  canViewMessageContent,
  canViewPaymentInternals,
  getAdminRouteRule,
  requireAnyAdminPermission,
  requireAdminPermission,
} = require('./access.service');
const { appendAuditLog } = require('../audit-risk/audit.repository');

function writeAdminSecurityAudit(req, action, metadata = {}, actorType = 'admin') {
  const actorId = String(req.adminActorId || req.user?.id || '').trim() || null;

  void appendAuditLog({
    actorType,
    actorId,
    targetType: 'admin_route',
    targetId: req.originalUrl || req.path || null,
    action,
    metadata: {
      method: req.method,
      routePath: req.route?.path || req.path || null,
      roleKeys: Array.isArray(req.adminRoleKeys) ? req.adminRoleKeys : [],
      permissionKeys: Array.isArray(req.adminPermissionKeys) ? req.adminPermissionKeys : [],
      ...metadata,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  }).catch(() => undefined);
}

function requireAdminRouteAccess(pathname) {
  const rule = getAdminRouteRule(pathname);
  if (!rule) {
    return function unknownAdminRouteGuard(req, _res, next) {
      writeAdminSecurityAudit(req, 'admin.access.denied', {
        route: pathname,
        outcome: 'denied',
        reason: 'rbac_rule_missing',
      });
      const error = new Error('Bu admin route icin RBAC kurali tanimli degil.');
      error.statusCode = 403;
      next(error);
    };
  }

  const guard = buildAdminGuard(rule);
  return function adminRouteGuard(req, res, next) {
    guard(req, res, (error) => {
      if (error) {
        writeAdminSecurityAudit(req, 'admin.access.denied', {
          route: pathname,
          outcome: 'denied',
          reason: error.message,
          requiredRoles: rule.visibleToRoles || rule.anyOfRoles || [],
          requiredPermissions: rule.anyOfPermissions || [],
        });
        next(error);
        return;
      }

      writeAdminSecurityAudit(req, 'admin.route.access', {
        route: pathname,
        outcome: 'allowed',
        requiredRoles: rule.visibleToRoles || rule.anyOfRoles || [],
        requiredPermissions: rule.anyOfPermissions || [],
      });
      next();
    });
  };
}

function requireMessageContentAccess(req, _res, next) {
  const roleKeys = Array.isArray(req.adminRoleKeys) ? req.adminRoleKeys : [];
  if (canViewMessageContent(roleKeys)) {
    writeAdminSecurityAudit(req, 'admin.sensitive_access.check', {
      outcome: 'allowed',
      domain: 'messages',
      accessLevel: 'content',
    });
    next();
    return;
  }

  writeAdminSecurityAudit(req, 'admin.access.denied', {
    domain: 'messages',
    accessLevel: 'content',
    reason: 'role_missing',
  });
  const error = new Error('Mesaj icerigi yalnizca yetkili legal export veya super admin tarafindan gorulebilir.');
  error.statusCode = 403;
  next(error);
}

function requireCommercialDocumentFileAccess(req, _res, next) {
  const roleKeys = Array.isArray(req.adminRoleKeys) ? req.adminRoleKeys : [];
  if (canViewCommercialDocumentFiles(roleKeys)) {
    writeAdminSecurityAudit(req, 'admin.sensitive_access.check', {
      outcome: 'allowed',
      domain: 'commercial_documents',
      accessLevel: 'file',
    });
    next();
    return;
  }

  writeAdminSecurityAudit(req, 'admin.access.denied', {
    domain: 'commercial_documents',
    accessLevel: 'file',
    reason: 'role_missing',
  });
  const error = new Error('Belge dosyasi erisimi yalnizca compliance admin veya super admin ile sinirlidir.');
  error.statusCode = 403;
  next(error);
}

function requirePaymentInternalAccess(req, _res, next) {
  const roleKeys = Array.isArray(req.adminRoleKeys) ? req.adminRoleKeys : [];
  if (canViewPaymentInternals(roleKeys)) {
    writeAdminSecurityAudit(req, 'admin.sensitive_access.check', {
      outcome: 'allowed',
      domain: 'payments',
      accessLevel: 'internal',
    });
    next();
    return;
  }

  writeAdminSecurityAudit(req, 'admin.access.denied', {
    domain: 'payments',
    accessLevel: 'internal',
    reason: 'role_missing',
  });
  const error = new Error('Odeme detaylarinin ic yapisi yalnizca billing, legal export veya super admin tarafindan gorulebilir.');
  error.statusCode = 403;
  next(error);
}

function requirePermission(permission) {
  return function adminPermissionGuard(req, _res, next) {
    try {
      const roleKeys = Array.isArray(req.adminRoleKeys) ? req.adminRoleKeys : [];
      requireAdminPermission(roleKeys, permission);
      writeAdminSecurityAudit(req, 'admin.permission.check', {
        outcome: 'allowed',
        permission,
      });
      next();
    } catch (error) {
      writeAdminSecurityAudit(req, 'admin.access.denied', {
        permission,
        outcome: 'denied',
        reason: error.message,
      });
      next(error);
    }
  };
}

function requireAnyPermission(permissions) {
  return function adminAnyPermissionGuard(req, _res, next) {
    try {
      const roleKeys = Array.isArray(req.adminRoleKeys) ? req.adminRoleKeys : [];
      requireAnyAdminPermission(roleKeys, permissions);
      writeAdminSecurityAudit(req, 'admin.permission.check', {
        outcome: 'allowed',
        anyOfPermissions: permissions,
      });
      next();
    } catch (error) {
      writeAdminSecurityAudit(req, 'admin.access.denied', {
        anyOfPermissions: permissions,
        outcome: 'denied',
        reason: error.message,
      });
      next(error);
    }
  };
}

module.exports = {
  requireAdminRouteAccess,
  requireCommercialDocumentFileAccess,
  requirePermission,
  requireAnyPermission,
  requireMessageContentAccess,
  requirePaymentInternalAccess,
  writeAdminSecurityAudit,
};
