# Carloi Admin RBAC Matrix

## Supported Roles

- `super_admin`
- `compliance_admin`
- `moderation_admin`
- `support_admin`
- `billing_admin`
- `analytics_admin`
- `legal_export_admin`
- `ops_admin`

Code references:

- [server/modules/admin/permissions.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/permissions.js:1)
- [server/modules/admin/roles.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/roles.js:1)
- [server/modules/admin/access.service.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/access.service.js:1)
- [server/modules/admin/middleware.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/middleware.js:1)
- [server/modules/admin/route-rules.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/route-rules.js:1)

## Permission Matrix

### Users

- Read list/detail:
  - `super_admin`
  - `support_admin`
  - `compliance_admin`
  - `moderation_admin`
  - `ops_admin`
- Suspend / force reset / admin role assignment:
  - `super_admin`
  - limited support actions: `support_admin` only for force reset, not full suspension

### Commercial profiles / documents

- Read profile queue:
  - `super_admin`
  - `compliance_admin`
  - `legal_export_admin` read-only where needed
- Approve / reject / suspend / revoke:
  - `super_admin`
  - `compliance_admin`
- Document metadata:
  - `super_admin`
  - `compliance_admin`
  - `legal_export_admin`
- Document files:
  - `super_admin`
  - `compliance_admin`
  - `legal_export_admin`

### Listings

- Read:
  - `super_admin`
  - `compliance_admin`
  - `moderation_admin`
  - `ops_admin`
- Suspend / restore / moderation:
  - `super_admin`
  - `moderation_admin`
  - `compliance_admin` for compliance-driven restrictions

### Posts

- Read:
  - `super_admin`
  - `moderation_admin`
  - `ops_admin`
- Moderate / remove / restore:
  - `super_admin`
  - `moderation_admin`

### Messages

- Metadata only:
  - `super_admin`
  - `support_admin`
  - `moderation_admin`
  - `legal_export_admin`
- Full content:
  - `super_admin`
  - `legal_export_admin`
- Evidence export:
  - `super_admin`
  - `legal_export_admin`

### Audit logs

- Read:
  - `super_admin`
  - `legal_export_admin`
  - `analytics_admin`
  - limited read in some support flows if added later
- Export:
  - `super_admin`
  - `legal_export_admin`

### Risk flags

- Read:
  - `super_admin`
  - `compliance_admin`
  - `moderation_admin`
  - `analytics_admin`
  - `ops_admin`
- Review / dismiss / confirm:
  - `super_admin`
  - `compliance_admin`
  - `moderation_admin`

### Billing / payments / subscriptions

- Billing settings and monetization:
  - `super_admin`
  - `billing_admin`
- Payment records:
  - `super_admin`
  - `billing_admin`
  - `legal_export_admin`
  - `ops_admin` summary read only
- Payment internals / export:
  - `super_admin`
  - `billing_admin`
  - `legal_export_admin`
- Subscription operations:
  - `super_admin`
  - `billing_admin`

### Insurance tracking

- Read:
  - `super_admin`
  - `billing_admin`
  - `ops_admin`
- Write / resolve exceptions:
  - `super_admin`
  - `billing_admin`

### Settings / feature flags

- Read:
  - `super_admin`
  - `billing_admin`
  - `analytics_admin`
  - `ops_admin`
- Toggle feature flags / pricing:
  - `super_admin`
  - `billing_admin` for monetization settings only

### Analytics

- Read:
  - `super_admin`
  - `analytics_admin`
  - `ops_admin`
  - partial dashboard read for several operational roles

## Sensitive Data Rules

- Message content only visible to:
  - `legal_export_admin`
  - `super_admin`
- Commercial document files only visible to:
  - `compliance_admin`
  - `super_admin`
  - `legal_export_admin`
- Payment internals only visible to:
  - `billing_admin`
  - `super_admin`
  - `legal_export_admin`
- `support_admin`:
  - can inspect user summaries and message metadata
  - cannot inspect message content
  - cannot inspect payment internals
  - cannot inspect commercial document files unless role set changes explicitly

## Mandatory Audit Logging

The following admin actions must always append an audit record:

- approve
- reject
- suspend
- revoke
- pricing toggle
- export actions
- moderation actions

Implementation hook:

- [server/modules/admin/action-audit.service.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/action-audit.service.js:1)

## Reason Required Actions

Reason text is mandatory for:

- `commercial.reject`
- `commercial.suspend`
- `commercial.revoke`
- `listings.suspend`
- `posts.remove`
- `users.suspend`
- `risk.confirm`
- `audit.export`
- `messages.evidence.export`
- `pricing.toggle`

## Route Protection Notes

Route rules are centralized here:

- [server/modules/admin/route-rules.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/route-rules.js:1)

Express-style protection helpers:

- [server/modules/admin/middleware.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/middleware.js:1)

Recommended usage:

1. Resolve admin session and role assignments.
2. Attach `req.adminRoleKeys`.
3. Apply `requireAdminRouteAccess('/admin/...')`.
4. Apply sensitive data middleware where needed:
   - `requireMessageContentAccess`
   - `requireCommercialDocumentFileAccess`
   - `requirePaymentInternalAccess`
5. Wrap mutations with `logAdminAction(...)`.

## Admin Menu Visibility

Frontend visibility rules live in:

- [carloi-web/src/lib/admin/menu.ts](/C:/Users/faruk/Documents/trae_projects/VCAR/carloi-web/src/lib/admin/menu.ts:1)
- [carloi-web/src/lib/admin/roles.ts](/C:/Users/faruk/Documents/trae_projects/VCAR/carloi-web/src/lib/admin/roles.ts:1)

Examples:

- `support_admin` sees:
  - dashboard
  - users
  - messages
- `billing_admin` sees:
  - dashboard
  - payments
  - subscriptions
  - insurance
  - settings
- `legal_export_admin` sees:
  - audit
  - messages
  - payments
  - reports
