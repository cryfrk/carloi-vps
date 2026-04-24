# Carloi Billing / Paid Listing / Subscription Flow v2

## Rollout-safe defaults

- `FEATURE_ENABLE_PAID_LISTINGS=false`
- `FEATURE_ENABLE_SUBSCRIPTIONS=false`
- `BillingSettings.paidListingsEnabled=false`

Bu kombinasyonla mevcut listing publish akisi degismez. Yeni billing bariyeri ancak feature flag ve admin pricing toggle birlikte acildiginda devreye girer.

## Listing publish logic

1. Listing Create Flow v2 tamamlanir.
2. Backend, risk sonucunu ve billing gereksinimini birlikte hesaplar.
3. Odeme gerekmiyorsa publish karari:
   - `low -> published`
   - `medium -> submitted`
   - `high -> restricted`
4. Odeme gerekiyorsa listing `payment_pending` durumda kalir.
5. Backend payment proxy uzerinden redirect URL uretir.
6. Provider callback backend tarafinda onaylandiginda listing compliance durumu nihai publish kararina tasinir.

## Subscription rules

- Commercial hesaplar icin abonelik zorunlulugu `BillingSettings.subscriptionRequiredForCommercial` ile acilir.
- Aktif/trial abonelik varsa listing fee bariyeri asinabilir.
- Ayni kullanici icin ikinci aktif abonelik olusturulmaz.

## Admin pricing controls

- Billing settings degisikligi gerekce ister.
- Tum pricing toggle aksiyonlari audit log'a yazilir.
- PaymentRecord, UserSubscription ve BillingSettings kayitlari soft-operational iz olarak korunur.

## Required env

- `VCARX_BILLING_PAYMENT_PROXY_URL`
- `VCARX_PAYMENT_CALLBACK_TOKEN`
- `FEATURE_ENABLE_PAID_LISTINGS`
- `FEATURE_ENABLE_SUBSCRIPTIONS`
