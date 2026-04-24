# Carloi Commercial Onboarding Flow v2

## Scope

Commercial Onboarding Flow v2, mevcut Carloi auth ve user sistemini bozmadan ticari hesap upgrade surecini ekler.

Temel prensipler:

- bireysel hesaplar normal sekilde calismaya devam eder
- kullanici daha sonra ticari hesaba gecebilir
- belge seti tek seferde yuklenir, sonrasinda artimsal guncelleme yapilabilir
- onay otomatik degildir
- karar dili guvenli urun dili ile sinirli kalir:
  - pending review
  - additional verification required
  - approved by platform review
  - rejected
  - suspended
  - revoked

## Flow Steps

1. Account type selection
2. Business information
3. Document upload
4. Declaration and legal acknowledgements
5. Review summary and submission
6. Status screen

## Data Model

### User extensions

- `account_type`
- `commercial_status`
- `commercial_approved_at`
- `commercial_rejected_reason`
- `commercial_reviewed_by_admin_id`
- `can_create_paid_listings`
- risk/fraud related fields already present

### CommercialProfile

- companyName
- taxOrIdentityType
- taxOrIdentityNumber
- tradeName
- mersisNumber
- authorizedPersonName
- authorizedPersonTitle
- phone
- city
- district
- address
- notes
- status
- `submitted_at`
- `document_truthfulness_accepted_at`
- `additional_verification_acknowledged_at`

### CommercialDocument

- type
- fileUrl
- originalFileName
- mimeType
- fileSize
- uploadedAt
- status
- reviewedByAdminId
- reviewedAt
- rejectReason
- verificationMethod
- suspiciousFlag

## State Machines

### CommercialProfile

Conceptual:

`not_applied -> draft -> submitted -> pending_review -> approved | rejected | suspended | revoked`

Implementation note:

- `not_applied` user seviyesinde `commercial_status` ve profile yok durumu ile temsil edilir
- profile kaydi olustugunda `draft`
- submit sonrasi profile `pending_review`, user `commercial_status=pending`

### CommercialDocument

`uploaded -> pending_review -> approved | rejected | expired`

## Required Validation

### Draft save

- `companyName`
- `taxOrIdentityNumber`

### Submission

- full business/contact fields complete
- minimum document set uploaded
- `commercial_declaration` consent accepted
- `documentTruthfulnessAccepted=true`
- `additionalVerificationAcknowledged=true`

### Minimum document set

- `tax_document`
- `identity_document`
- plus at least one of:
  - `authorization_certificate`
  - `trade_registry`
  - `other`

## Suspicious Document Rules

Asagidaki sinyaller manual review gerektirir:

- belge boyutu asiri kucuk
- ayni belge tipi kullanici icin birden fazla kez reddedilmis

Bu durumlarda:

- `CommercialDocument.suspiciousFlag=true`
- `RiskFlag(type='suspicious_document')`
- status yine review queue uzerinden ilerler

## Endpoint Drafts

### User endpoints

- `GET /api/commercial/status`
- `POST /api/commercial/profile`
- `PATCH /api/commercial/profile`
- `POST /api/commercial/documents`
- `POST /api/commercial/submit`

### Admin endpoints

- `GET /api/admin/commercial/reviews`
- `GET /api/admin/commercial/:profileId`
- `POST /api/admin/commercial/:profileId/approve`
- `POST /api/admin/commercial/:profileId/reject`
- `POST /api/admin/commercial/:profileId/suspend`
- `POST /api/admin/commercial/:profileId/revoke`

## UI Enforcement Notes

Sadece metin gostermek yeterli degildir:

- commercial declaration checkbox tek basina yeterli degildir
  - backend consent kaydi zorunludur
- document truthfulness / additional verification acknowledgement
  - backend submit validation ile birlikte kontrol edilir
- approved commercial privileges
  - listing tarafinda feature flag acildiginda backend gating ile enforce edilir

## Rollout-Safe Notes

1. Existing users default `individual / not_applied`
2. No forced migration of current listing flow
3. Commercial approval gate only enforces when `FEATURE_ENABLE_COMMERCIAL_APPROVAL_GATE=true`
4. Onboarding UI only visible when `FEATURE_ENABLE_COMMERCIAL_ONBOARDING=true`
5. Admin review actions always create audit logs
6. Reject / suspend / revoke actions require reason text
