# Carloi Production Setup

Bu dokumanin varsayilan hedefi klasik VPS kurulumudur.

Ana adimlar:

1. `.env.example` -> `.env.vps`
2. `docker compose --env-file .env.vps -f docker-compose.production.yml up -d --build`
3. `docker compose --env-file .env.vps -f docker-compose.production.yml exec api npm run db:migrate:postgres`
4. `curl http://127.0.0.1/health`

## Zorunlu Env

- `DATABASE_URL`
- `VCARX_PUBLIC_BASE_URL`
- `APP_BASE_URL`
- `VCARX_SHARE_BASE_URL`
- `VCARX_SESSION_SECRET`
- `VCARX_DATA_ENCRYPTION_SECRET`
- `VCARX_LOOKUP_SECRET`
- `VCARX_ADMIN_TOKEN`

## Varsayilan VPS Env

```env
PORT=8080
DATABASE_URL=postgresql://carloi_user:strong_password@postgres:5432/carloi
STORAGE_DRIVER=local
UPLOAD_DIR=/app/uploads
VCARX_DISABLE_EMAIL=true
SMTP_DISABLED=true
VCARX_REQUIRE_HTTPS=true
VCARX_TRUST_PROXY=true
```

## Opsiyonel

- SMTP acmak icin `SMTP_*` alanlarini doldurun.
- Payment proxy/Garanti servisini ayri container olarak yayinlayin.
- GCS kullanmak istiyorsaniz `STORAGE_DRIVER=gcs` ile legacy mode halen desteklenir.

## Legacy Google Cloud Referansi

Cloud Run / Cloud SQL / GCS akisi bu repoda referans olarak halen mevcuttur:

- `cloudbuild.yaml`
- `cloudbuild.payment-proxy.yaml`

Ancak yeni varsayilan production hedefi VPS'tir.
