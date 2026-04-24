# Carloi Compliance Retrofit Rollout

## Scope

Bu retrofit mevcut Carloi mimarisine ek katman olarak uygulanir:

- compliance
- commercial onboarding
- admin
- audit / risk
- billing / subscription
- feature flags

Runtime katmani halen mevcut raw SQL store uzerinden calismaya devam eder. `prisma/` klasoru bu yeni veri modelini standartlastirmak, migration takibini kolaylastirmak ve gelecekte moduler servisleri ayni sema etrafinda toplamak icin eklendi.

## Migration Plan

### Phase 0 - Safe schema expansion

1. `prisma/migrations/20260421093000_compliance_retrofit/migration.sql` deploy edilir.
2. Yeni kolonlar `users` tablosuna default / nullable olarak eklenir.
3. Yeni tablolar olusturulur:
   - `commercial_profiles`
   - `commercial_documents`
   - `listing_compliance`
   - `sale_processes`
   - `subscription_plans`
   - `user_subscriptions`
   - `billing_settings`
   - `payment_records`
   - `audit_logs`
   - `risk_flags`
   - `user_consents`
   - `platform_feature_flags`
4. Mevcut kullanicilar `individual` ve `commercial_status=not_applied` olarak calismaya devam eder.

### Phase 1 - Hidden readiness

- Admin route agaci acilir fakat veri kaynaklari placeholder / service contract seviyesinde kalir.
- Audit ve risk repository katmanlari eklenir.
- Feature flag modulu eklenir.
- Uygulama davranisi henuz degismez.

### Phase 2 - Soft prompts

- `enableCommercialOnboarding=true`
- `enableListingComplianceStep=true`
- `enableSafePaymentGuidance=true`
- Kullaniciya sadece bilgi ve beyan adimlari gosterilir.
- Publish / create aksiyonlari hemen bloklanmaz.

### Phase 3 - Controlled enforcement

- `enableCommercialApprovalGate=true`
- `enableRiskDetection=true`
- Yuksek riskli hesap ve ilanlar icin manual review tetiklenir.
- Ticari gorunuslu davranis gosteren kullanicilara soft-to-hard upgrade akisi uygulanir.

### Phase 4 - Monetization

- `enablePaidListings=true`
- `enableSubscriptions=true`
- Abonelik ve ilan ucretlendirmesi sadece billing readiness ve callback handling dogrulandiktan sonra acilir.

## Operational Checklist

### Database

- [ ] PostgreSQL migration production ortaminda dry-run edildi
- [ ] `billing_settings` default satiri olustu
- [ ] Yeni indexler query planlarinda dogrulandi
- [ ] Backfill ihtiyaci olan alanlar icin script listesi hazirlandi

### Backend

- [ ] Feature flag env degerleri Secret Manager veya runtime env uzerinden tanimlandi
- [ ] Yeni repository / service katmanlari smoke test edildi
- [ ] Audit log ve risk flag write pathleri gerçek endpointlere kademeli baglandi

### Web Admin

- [ ] `/admin/*` route yapisi deploy edildi
- [ ] Dashboard placeholder bloklari gerçek backend sorgularina baglanacak backlog olusturuldu
- [ ] Admin authorization / role gate implementation backlog'a alindi

### Compliance

- [ ] Commercial onboarding alanlari legal metin ile birlikte netlestirildi
- [ ] Listing compliance beyan metni hukuk ekibiyle sonlandirildi
- [ ] Safe payment guidance copy onayi alindi

### Billing

- [ ] Garanti Sanal POS callback sozlesmesi netlestirildi
- [ ] Plan kodlari ve ticari/individual segment kurallari onaylandi
- [ ] PaymentRecord tipleri muhasebe ihtiyaclariyla hizalandi

## Notes

- Bu retrofit mevcut auth, feed, posting ve messaging akislarini bozmaz.
- Enforcement backend tarafinda feature flag olmadan aktif edilmemelidir.
- Contract text tek basina yeterli degildir; consent kaydi ve endpoint seviyesinde validation birlikte kullanilmalidir.
