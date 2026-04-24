# Carloi Payment Proxy

Bu servis, sigorta odeme akisinda ana Carloi API ile odeme saglayicisi arasinda calisir.

## Gorevi

- ana platformdan sigorta veya billing odeme istegi alir
- odeme referansi uretir
- Garanti 3D OOS form alanlarini olusturur
- bankadan donen browser callback'ini dogrular
- odeme tamamlandiginda ana platform callback endpoint'ini bilgilendirir

## Mimari

- Cloud Run uyumlu Express servisi
- local SQLite kullanmaz
- `DATABASE_URL` ile PostgreSQL kullanir
- container stateless kalir

## Calistirma

```bash
npm run payment-proxy
```

## Gerekli Env

```env
DATABASE_URL=postgresql://...
VCARX_PAYMENT_PROVIDER=garanti_oos
VCARX_PAYMENT_PROXY_PUBLIC_BASE_URL=https://payment-proxy.carloi.com
VCARX_PLATFORM_PAYMENT_CALLBACK_URL=https://api.carloi.com/api/billing/garanti/callback
VCARX_PAYMENT_CALLBACK_TOKEN=...
VCARX_PAYMENT_CALLBACK_SIGNATURE_SECRET=...
GARANTI_MODE=TEST
GARANTI_API_VERSION=v0.01
GARANTI_SECURE3D_MODEL=3D_OOS_PAY
GARANTI_MERCHANT_ID=...
GARANTI_TERMINAL_ID=...
GARANTI_TERMINAL_PROV_USER_ID=PROVOOS
GARANTI_TERMINAL_USER_ID=PROVOOS
GARANTI_PROVISION_PASSWORD=...
GARANTI_STORE_KEY=...
GARANTI_GATE3DENGINE_URL=https://sanalposprovtest.garanti.com.tr/servlet/gt3dengine
```

## Akis

1. Carloi API `payment-proxy` uzerinde odeme order'i acar.
2. Hosted `/pay` sayfasi kullaniciyi proxy checkout rotasina yollar.
3. Proxy Garanti formunu olusturup `gt3dengine` endpoint'ine POST eder.
4. Garanti browser callback'i proxy'ye donecektir.
5. Proxy hash, `mdstatus`, `procreturncode`, tutar ve referans kontrolunu yapar.
6. Dogrulama sonucu ana Carloi API'ye imzali callback olarak iletilir.

## Deploy

Docker:

```bash
docker build -f payment-proxy/Dockerfile -t carloi-payment-proxy .
```

Cloud Build:

```bash
gcloud builds submit --config cloudbuild.payment-proxy.yaml
```
