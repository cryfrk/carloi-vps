# Carloi Production Setup

Bu repo icin varsayilan production hedefi artik klasik Ubuntu VPS + Docker Compose yapisidir.

## 1. Sifir Ubuntu VPS Hazirligi

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Yeni group yetkisi icin tekrar login olun.

## 2. Repo ve env dosyasini hazirla

```bash
git clone <repo-url> carloi
cd carloi
cp .env.vps.example .env.vps
```

`.env.vps.example` dosyasi ilk smoke test icin bilerek daha esnek gelir:

- `NODE_ENV=development`
- `VCARX_SKIP_VALIDATION=true`
- `VCARX_REQUIRE_HTTPS=false`
- `VCARX_TRUST_PROXY=false`
- `VCARX_DISABLE_EMAIL=true`
- `STORAGE_DRIVER=local`

Gercek production domain/TLS hazir oldugunda `.env.vps` icinde sunlari guncelleyin:

- `NODE_ENV=production`
- `VCARX_SKIP_VALIDATION=false`
- `VCARX_REQUIRE_HTTPS=true`
- `VCARX_TRUST_PROXY=true`
- `VCARX_PUBLIC_BASE_URL=https://api.sizin-domaininiz.com`
- `APP_BASE_URL=https://sizin-domaininiz.com`
- `VCARX_SHARE_BASE_URL=https://sizin-domaininiz.com`
- `NEXT_PUBLIC_API_BASE_URL=https://api.sizin-domaininiz.com`
- `EXPO_PUBLIC_API_BASE_URL=https://api.sizin-domaininiz.com`
- `VCARX_SESSION_SECRET`
- `VCARX_DATA_ENCRYPTION_SECRET`
- `VCARX_LOOKUP_SECRET`
- `POSTGRES_PASSWORD`
- `VCARX_ADMIN_TOKEN`

## 3. Tek komutla VPS startup

```bash
docker compose --env-file .env.vps -f docker-compose.production.yml up -d --build
```

Bu compose en az su servisleri ayaga kaldirir:

- `postgres`
- `api`
- `nginx`

Kalici volume'ler:

- `postgres_data`
- `uploads_data`

API container startup sirasinda otomatik olarak:

1. PostgreSQL migration calistirir
2. Sonra `server/index.js` ile servisi acar

## 4. Manuel migration (opsiyonel)

```bash
docker compose --env-file .env.vps -f docker-compose.production.yml run --rm api node scripts/migrate-postgres.js
```

Bu komut idempotent calisir; sifir DB'de tablo kurar, tekrar calisinca hata vermez.

## 5. Health kontrolu

```bash
curl http://localhost:8080/health
```

Beklenen sonuc:

```json
{
  "success": true,
  "storageDriver": "local",
  "databaseMode": "postgresql"
}
```

## 6. Opsiyonel servisler

- SMTP acmak icin `SMTP_*` alanlarini doldurun.
- Payment proxy/Garanti servisini ayri container veya ayri host uzerinde yayinlayin.
- GCS kullanmak isterseniz `STORAGE_DRIVER=gcs` ile legacy yol halen desteklenir; ancak varsayilan production path degildir.

## 7. Legacy Google Cloud referansi

Cloud Run / Cloud SQL / GCS referans dosyalari repoda bilgi amacli tutulur:

- `cloudbuild.yaml`
- `cloudbuild.payment-proxy.yaml`

Ancak VPS deploy icin zorunlu degildirler.
