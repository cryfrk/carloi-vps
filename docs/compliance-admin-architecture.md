# Carloi Compliance / Admin / Billing Architecture Scaffold

## Backend Module Tree

```text
server/
  modules/
    _scaffold.js
    index.js
    admin/
      access.service.js
      admin.service.js
      controller.js
      repository.js
      roles.js
    audit/
      controller.js
      repository.js
      service.js
    auth/
      controller.js
      repository.js
      service.js
    billing/
      billing.repository.js
      controller.js
      repository.js
      service.js
      subscription.service.js
      subscription.state.js
    commercial/
      commercial-profile.state.js
      commercial.repository.js
      commercial.service.js
      controller.js
      document-review.state.js
      repository.js
      service.js
    compliance/
      compliance.repository.js
      compliance.service.js
      controller.js
      listing-compliance.state.js
      repository.js
      service.js
    feature-flags/
      config.js
    listings/
      controller.js
      repository.js
      service.js
    messages/
      controller.js
      repository.js
      service.js
    payments/
      controller.js
      repository.js
      service.js
    posts/
      controller.js
      repository.js
      service.js
    risk/
      controller.js
      repository.js
      risk-flag.state.js
      service.js
    sales/
      controller.js
      repository.js
      service.js
    users/
      controller.js
      repository.js
      service.js
```

## Frontend / Admin Route Map

### Web app groups

- public
  - `/`
  - `/p/[postId]`
  - `/profile/[handle]`
  - `/listing/[id]`
- auth
  - `/login`
  - `/register`
  - `/verify-email`
  - `/forgot-password`
  - `/reset-password`
- app
  - `/feed`
  - `/search`
  - `/messages`
  - `/ai`
  - `/profile`
  - `/settings`
- admin
  - `/admin/dashboard`
  - `/admin/users`
  - `/admin/commercial`
  - `/admin/listings`
  - `/admin/posts`
  - `/admin/messages`
  - `/admin/payments`
  - `/admin/subscriptions`
  - `/admin/insurance`
  - `/admin/risk`
  - `/admin/audit`
  - `/admin/reports`
  - `/admin/settings`

Code references:

- [carloi-web/src/lib/routes.ts](/C:/Users/faruk/Documents/trae_projects/VCAR/carloi-web/src/lib/routes.ts:1)
- [carloi-web/src/lib/admin/menu.ts](/C:/Users/faruk/Documents/trae_projects/VCAR/carloi-web/src/lib/admin/menu.ts:1)

## Prisma Schema Additions

### User extensions

- `accountType`
- `commercialStatus`
- `commercialApprovedAt`
- `commercialRejectedReason`
- `commercialReviewedByAdminId`
- `yearlyVehicleSaleCount`
- `yearlyVehicleListingCount`
- `commercialBehaviorFlag`
- `riskScore`
- `riskLevel`
- `canCreatePaidListings`
- `subscriptionStatus`
- `subscriptionPlanId`
- `forgotPasswordRequiredResetAt`
- `lastLoginIp`
- `lastKnownDeviceFingerprint`
- `fraudFlagCount`

### New tables / models

- `CommercialProfile`
- `CommercialDocument`
- `ListingCompliance`
- `SaleProcess`
- `SubscriptionPlan`
- `UserSubscription`
- `BillingSettings`
- `PaymentRecord`
- `AuditLog`
- `RiskFlag`
- `UserConsent`
- `PlatformFeatureFlag`
- `AdminRole`
- `UserAdminRole`

Code references:

- [prisma/schema.prisma](/C:/Users/faruk/Documents/trae_projects/VCAR/prisma/schema.prisma:1)
- [prisma/migrations/20260421093000_compliance_retrofit/migration.sql](/C:/Users/faruk/Documents/trae_projects/VCAR/prisma/migrations/20260421093000_compliance_retrofit/migration.sql:1)

## State Machine Summary

### Commercial profile

- `draft -> submitted -> pending_review -> approved`
- `pending_review -> rejected`
- `pending_review -> suspended`
- `approved -> suspended -> approved`
- `approved -> revoked`

Reference:

- [server/modules/commercial/commercial-profile.state.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/commercial/commercial-profile.state.js:1)

### Document review

- `uploaded -> pending_review -> approved`
- `pending_review -> rejected`
- `approved -> expired`
- `rejected -> pending_review`

Reference:

- [server/modules/commercial/document-review.state.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/commercial/document-review.state.js:1)

### Listing compliance

- `draft -> submitted`
- `submitted -> restricted | published | rejected`
- `restricted -> submitted | published | rejected`
- `published -> suspended | restricted`
- `rejected -> draft | submitted`

Reference:

- [server/modules/compliance/listing-compliance.state.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/compliance/listing-compliance.state.js:1)

### Subscription

- `inactive -> trial | active`
- `trial -> active | cancelled`
- `active -> past_due | cancelled`
- `past_due -> active | cancelled`

Reference:

- [server/modules/billing/subscription.state.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/billing/subscription.state.js:1)

### Risk flag

- `open -> reviewed | dismissed | confirmed`
- `reviewed -> dismissed | confirmed`

Reference:

- [server/modules/risk/risk-flag.state.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/risk/risk-flag.state.js:1)

## RBAC Summary

Supported roles:

- `super_admin`
- `compliance_admin`
- `moderation_admin`
- `support_admin`
- `billing_admin`
- `analytics_admin`
- `legal_export_admin`
- `ops_admin`

Code references:

- [server/modules/admin/roles.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/roles.js:1)
- [server/modules/admin/access.service.js](/C:/Users/faruk/Documents/trae_projects/VCAR/server/modules/admin/access.service.js:1)
- [carloi-web/src/lib/admin/roles.ts](/C:/Users/faruk/Documents/trae_projects/VCAR/carloi-web/src/lib/admin/roles.ts:1)
- [docs/admin-rbac-matrix.md](/C:/Users/faruk/Documents/trae_projects/VCAR/docs/admin-rbac-matrix.md:1)

## Rollout-Safe Migration Notes

1. New columns are additive and default-safe.
2. Existing users remain `individual` with `commercialStatus=not_applied`.
3. Existing listings remain valid unless feature flags start enforcing compliance.
4. Runtime can continue using the current raw SQL store while Prisma becomes the canonical schema layer.
5. Feature flags should be enabled in this order:
   - commercial onboarding
   - listing compliance step
   - safe payment guidance
   - risk detection
   - commercial approval gate
   - paid listings
   - subscriptions
   - admin evidence exports

Related rollout checklist:

- [docs/compliance-retrofit-rollout.md](/C:/Users/faruk/Documents/trae_projects/VCAR/docs/compliance-retrofit-rollout.md:1)
