module.exports = {
  admin: {
    repository: require('./admin/repository'),
    service: require('./admin/admin.service'),
    controller: require('./admin/controller'),
    access: require('./admin/access.service'),
    actionAudit: require('./admin/action-audit.service'),
    middleware: require('./admin/middleware'),
    permissions: require('./admin/permissions'),
    routeRules: require('./admin/route-rules'),
  },
  audit: {
    repository: require('./audit/repository'),
    service: require('./audit/service'),
    controller: require('./audit/controller'),
  },
  auth: {
    repository: require('./auth/repository'),
    service: require('./auth/service'),
    controller: require('./auth/controller'),
  },
  billing: {
    repository: require('./billing/repository'),
    service: require('./billing/service'),
    controller: require('./billing/controller'),
  },
  commercial: {
    repository: require('./commercial/repository'),
    service: require('./commercial/service'),
    controller: require('./commercial/controller'),
  },
  consent: {
    repository: require('./consent/repository'),
    service: require('./consent/service'),
    controller: require('./consent/controller'),
  },
  compliance: {
    repository: require('./compliance/repository'),
    service: require('./compliance/service'),
    controller: require('./compliance/controller'),
  },
  featureFlags: require('./feature-flags/config'),
  listings: {
    repository: require('./listings/repository'),
    service: require('./listings/service'),
    controller: require('./listings/controller'),
  },
  messages: {
    repository: require('./messages/repository'),
    service: require('./messages/service'),
    controller: require('./messages/controller'),
  },
  payments: {
    repository: require('./payments/repository'),
    service: require('./payments/service'),
    controller: require('./payments/controller'),
  },
  posts: {
    repository: require('./posts/repository'),
    service: require('./posts/service'),
    controller: require('./posts/controller'),
  },
  risk: {
    repository: require('./risk/repository'),
    service: require('./risk/service'),
    controller: require('./risk/controller'),
  },
  sales: {
    repository: require('./sales/repository'),
    service: require('./sales/service'),
    controller: require('./sales/controller'),
  },
  users: {
    repository: require('./users/repository'),
    service: require('./users/service'),
    controller: require('./users/controller'),
  },
};
