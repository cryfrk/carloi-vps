# Carloi

Carloi; mobil uygulama, web istemcisi, API servisi, admin paneli ve odeme proxy katmanindan olusan ikinci el arac platformudur.

Bu repo artik varsayilan production akisinda klasik VPS hedefler:

- API: Docker container
- Veritabani: PostgreSQL
- Reverse proxy: Nginx
- Dosya yukleme: local volume (`/app/uploads`)
- E-posta: istege bagli, varsayilan olarak kapali

Not:

- Kayit sirasinda gosterilen sozlesme metinleri urun ici hukuki taslaktir. Canliya cikmadan once avukat incelemesi yapilmalidir.
- Garanti / payment-proxy mimarisi korunmustur; bu README sadece VPS ana yolunu varsayilan hale getirir.

## Mimari

- Mobil istemci: Expo / React Native
- Web istemci: Next.js ([carloi-web/Dockerfile](./carloi-web/Dockerfile))
- API: Express ([server/index.js](./server/index.js))
- Payment proxy: ayrik Node servisi ([payment-proxy/index.js](./payment-proxy/index.js))
- Veritabani: PostgreSQL (`DATABASE_URL`)
- Storage: local volume veya opsiyonel olarak GCS
- Mail: SMTP, ama `VCARX_DISABLE_EMAIL=true` ile devre disi birakilabilir

## Varsayilan Production Ortami

Ornek env degerleri icin [.env.example](./.env.example) kullanin.

Temel production ayarlari:

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://carloi_user:strong_password@postgres:5432/carloi
STORAGE_DRIVER=local
UPLOAD_DIR=/app/uploads
VCARX_DISABLE_EMAIL=true
SMTP_DISABLED=true
VCARX_REQUIRE_HTTPS=true
VCARX_TRUST_PROXY=true
```

## VPS Kurulum Adimlari

### 1. Sunucuyu Hazirla

- Ubuntu 22.04 veya benzeri guncel bir Linux dagitimi kullanin.
- Docker Engine ve Docker Compose plugin kurun.
- Reverse proxy olarak Nginx kullanin.
- TLS icin Nginx + Let's Encrypt veya ust katman load balancer tercih edin.

### 2. Repo ve env dosyasini hazirla

```bash
git clone <repo-url> carloi
cd carloi
cp .env.vps.example .env.vps
```

Ilk smoke test icin `.env.vps.example` dosyasi bilerek `development + VCARX_SKIP_VALIDATION=true + http://localhost` ile gelir.

Gercek production domain/TLS hazir oldugunda `.env.vps` icinde en az su alanlari guncelleyin:

- `VCARX_PUBLIC_BASE_URL`
- `APP_BASE_URL`
- `VCARX_SHARE_BASE_URL`
- `EXPO_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `VCARX_SESSION_SECRET`
- `VCARX_DATA_ENCRYPTION_SECRET`
- `VCARX_LOOKUP_SECRET`
- `VCARX_ADMIN_TOKEN`
- `POSTGRES_PASSWORD`

Not:

- `VCARX_REQUIRE_HTTPS=false` ve `VCARX_SKIP_VALIDATION=true` sadece ilk VPS smoke test icindir.
- Canli domain ve TLS hazir olduktan sonra:
  - `NODE_ENV=production`
  - `VCARX_SKIP_VALIDATION=false`
  - `VCARX_REQUIRE_HTTPS=true`
  - `VCARX_TRUST_PROXY=true`

### 3. Docker Compose ile kaldir

```bash
docker compose --env-file .env.vps -f docker-compose.production.yml up -d --build
```

Servisler:

- `postgres`
- `api`
- `nginx`

Kalici volume'ler:

- `postgres_data`
- `uploads_data`

API container startup sirasinda PostgreSQL migration artik otomatik calisir. Bu sayede sifir VPS'te tek komutla ayaga kalkabilir.

### 4. Migration'i manuel tekrar calistir (opsiyonel)

Gerektiginde migration'i tekrar elle idempotent sekilde calistirabilirsiniz:

```bash
docker compose --env-file .env.vps -f docker-compose.production.yml run --rm api node scripts/migrate-postgres.js
```

### 5. Health kontrolu

```bash
curl http://localhost:8080/health
```

Beklenen cevap:

```json
{
  "success": true,
  "name": "Carloi API",
  "port": 8080,
  "storageDriver": "local",
  "databaseMode": "postgresql"
}
```

## Docker Compose Dosyalari

- [docker-compose.production.yml](./docker-compose.production.yml)
- [docker/nginx/default.conf](./docker/nginx/default.conf)

Nginx:

- `/uploads/` istegini direkt volume uzerinden servis eder
- diger tum istekleri `api:8080` servisine yonlendirir
- `X-Forwarded-*` header'larini ekler

## Register / Login Davranisi

- Register akisi artik e-posta gonderimini beklemez.
- Kullanici DB'ye yazildiktan sonra response hemen doner.
- SMTP kapaliysa veya baglanamiyorsa kayit yine basarili olur.
- Duplicate email: `409`
- Eksik alan / eksik zorunlu onay: `400`

## Mail Ayarlari

Varsayilan production path'te e-posta kapali gelebilir:

```env
VCARX_DISABLE_EMAIL=true
SMTP_DISABLED=true
```

SMTP acmak isterseniz:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

Register akisi mail timeout'u yuzunden bloke olmaz.

## Storage

Varsayilan:

```env
STORAGE_DRIVER=local
UPLOAD_DIR=/app/uploads
UPLOADS_BASE_PATH=/uploads
```

Bu modda:

- upload endpoint degismez: `POST /api/media/upload`
- dosyalar volume icine yazilir
- API ve Nginx ayni `uploads_data` volume'unu paylasir

Opsiyonel legacy GCS modu halen desteklenir:

```env
STORAGE_DRIVER=gcs
GCP_PROJECT_ID=...
GCS_BUCKET_NAME=...
```

Ancak bu artik varsayilan production yolu degildir.

## Payment Proxy

Payment proxy/Garanti kodu korunmustur. Bu repo icinde ayrik servistir:

```bash
docker build -f payment-proxy/Dockerfile -t carloi-payment-proxy .
```

VPS'de odeme akisini da ayni makinede kosturacaksaniz ayri container olarak yayinlamaniz gerekir. Bu turda varsayilan compose dosyasina dahil edilmemistir; mevcut Garanti env'leriyle calismaya devam eder.

## Google Cloud Legacy Dosyalari

Su dosyalar repoda halen bulunur ama artik varsayilan deploy yolu degildir:

- [cloudbuild.yaml](./cloudbuild.yaml)
- [cloudbuild.payment-proxy.yaml](./cloudbuild.payment-proxy.yaml)
- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)

Bu dosyalar eski Cloud Run / Cloud SQL / GCS akisinin referansi olarak tutulur.

## Test Komutlari

Root typecheck:

```bash
npx tsc --noEmit
```

Web build:

```bash
cd carloi-web
npm run build
```

Production env validation:

```bash
npm run validate:production
```

## Launch Notlari

- `VCARX_REQUIRE_HTTPS=true` ve `VCARX_TRUST_PROXY=true` production'da acik kalmali.
- Nginx veya ust reverse proxy, `X-Forwarded-Proto=https` zincirini dogru tasimalidir.
- Local uploads kullaniyorsaniz `uploads_data` volume'unu yedekleyin.
- Legal metinler urun ici taslaktir; canli oncesi hukuk kontrolu yapin.
