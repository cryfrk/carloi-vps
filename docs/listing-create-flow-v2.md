# Carloi Listing Create Flow v2

## Scope

Listing Create Flow v2, mevcut Carloi ilan akisini tamamen yeniden yazmadan genisletir. Mevcut `listingDraft` payload'i korunur, buna ek olarak step tabanli `listingFlow` yapisi eklenir.

Amac:

- ilan olusturma adimlarini netlestirmek
- ownership / authorization beyanlarini kaydetmek
- guvenli odeme bilgilendirmesini zorunlu kilmak
- feature flag acildiginda ucretli ilan adimini devreye almak
- risk sonucuna gore ilani yayina almak, incelemeye gondermek veya kisitlamak

## Step Order

1. `vehicle_information`
2. `pricing_description`
3. `ownership_authorization`
4. `compliance_responsibility`
5. `billing_listing_fee` (yalnizca odeme gerektiginde)
6. `preview_publish`

## State Machine

`draft`
-> `vehicle_info_completed`
-> `pricing_completed`
-> `ownership_completed`
-> `compliance_completed`
-> `payment_pending` (opsiyonel)
-> `submitted`
-> `published | restricted`

Not:

- `submitted`, ek inceleme gerektiren medium risk ilanlari temsil eder.
- `published`, dusuk risk ilanlari temsil eder.
- `restricted`, yuksek risk veya ciddi uyumsuzluk sinyali tasiyan ilanlari temsil eder.
- `rejected` ve `suspended` admin/moderation sonrasi lifecycle durumlaridir.

## Backend Entry Points

- route: `POST /api/posts`
- store orchestration: `server/store.js`
- flow evaluation: `server/modules/listings/service.js`
- validators: `server/modules/listings/validators.js`
- risk hooks: `server/modules/listings/risk.service.js`
- compliance persistence: `server/modules/compliance/compliance.service.js`

## New / Extended Data

### listingFlow payload

Step tabanli frontend -> backend payload:

- `vehicleInformation`
- `pricingDescription`
- `ownershipAuthorization`
- `complianceResponsibility`
- `billingListingFee`
- `previewPublish`

### listing_compliance fields

Yeni veya genisleyen alanlar:

- `seller_relation_type`
- `plate_number`
- `registration_owner_full_name_declared`
- `is_owner_same_as_account_holder`
- `authorization_declaration_text`
- `authorization_declaration_accepted`
- `authorization_status`
- `eids_status`
- `safe_payment_info_accepted`
- `safe_payment_info_accepted_at`
- `listing_compliance_status`
- `risk_score`
- `risk_level`
- `billing_required`
- `billing_status`
- `payment_record_id`
- `duplicate_plate_flag`
- `abnormal_price_flag`
- `spam_content_flag`
- `review_required_reason`

## Validation Rules

### 1. Vehicle Information

- marka/model/title zorunlu
- en az bir medya beklenir
- plaka opsiyonel
- plaka varsa duplicate plate detection hook calisir

### 2. Pricing & Description

- `price > 0`
- aciklayici icerik / description zorunlu
- abnormal price detection hook calisir
- spam-like content detection hook calisir

### 3. Ownership / Authorization

- `isOwnerSameAsAccountHolder=true` ise basit akis
- `false` ise:
  - `sellerRelationType` zorunlu
  - `registrationOwnerFullNameDeclared` zorunlu
  - `authorizationDeclarationText` zorunlu

Kaydedilen alanlar:

- `sellerRelationType`
- `registrationOwnerFullNameDeclared`
- `isOwnerSameAsAccountHolder`
- `authorizationStatus`
- `eidsStatus`

### 4. Compliance & Responsibility

Zorunlu onaylar:

- `listing_responsibility`
- `safe_payment_information`
- `authorizationDeclarationAccepted` (sadece owner degilse)

### 5. Billing / Listing Fee

- yalnizca `FEATURE_ENABLE_PAID_LISTINGS=true` ise gosterilir / enforce edilir
- odeme gerekiyorsa `billingStatus=paid` olmadan publish olmaz
- aksi halde `payment_pending`

### 6. Preview & Publish

Final karar:

- `low risk => published`
- `medium risk => submitted`
- `high risk => restricted`

## Risk Hooks

### Duplicate Plate

- ayni plaka ile baska aktif ilan varsa `duplicatePlateFlag=true`
- yuksek risk tarafina iter

### Abnormal Price

- seller median veya genel araliklardan ciddi sapma varsa isaretlenir

### Spam-like Content

- tekrarli / dusuk kaliteli / spam patternleri isaretlenir

## Audit Logging

Her step state icin:

- `listing.flow_state_changed`

Final aksiyon icin:

- `listing.published`
- veya `listing.submitted`

Risk artifactleri:

- mevcut risk flag / audit katmanina yazilir

## UI + Backend Enforcement Notes

Sadece metin gostermek yeterli degil:

- `listing_responsibility`
  UI checkbox + backend consent validation birlikte zorunludur.
- `safe_payment_information`
  UI acknowledgement + backend consent persistence birlikte zorunludur.
- `authorization declaration`
  owner olmayan akista sadece helper text yetmez; backend declaration alanlari bos gecilmemelidir.
- `billing`
  odeme ekrani gormek yeterli degil; backend `paymentStatus` kontrol etmeden publish etmemelidir.

## Rollout-Safe Integration

1. Backend yeni payload'i kabul eder ama eski `listingDraft` akisini da korur.
2. Yeni compliance kolonlari nullable / default ile eklenmistir.
3. Ucretli ilan adimi yalnizca feature flag ile aktif olur.
4. Orta risk ilanlar hemen silinmez; `submitted` olarak review kuyruğuna gider.
5. Yuksek risk ilanlar icin urun dili:
   - `pending review`
   - `additional verification may be required`
   kullanilir.
6. Resmi / garanti veren ifade kullanilmaz.
