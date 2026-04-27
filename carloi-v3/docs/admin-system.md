# Carloi V3 Admin System

Bu belge Carloi V3 admin ekosisteminin urun, platform, yetki ve endpoint mantigini guncel baseline uzerinden tanimlar.

Kapsam:

- masaustune kurulabilen admin programi
- Android admin uygulamasi
- ayrik admin auth
- RBAC
- audit log
- panel bazli yetkilendirme
- sigorta, ticari hesap, kullanici, ilan, gonderi, mesaj ve finans operasyonlari

Temel ilke:

- Carloi son kullanici uygulamalari ile admin uygulamalari ayridir
- admin oturumu, son kullanici oturumundan ayridir
- adminler sadece yetkili olduklari panelleri gorur
- hassas islem yapan her admin aksiyonu audit log'a duser
- red, onay, ban, belge talebi, teklif ve fatura yukleme gibi aksiyonlarda neden veya not zorunlu hale getirilebilir

## 1. V3 admin uygulamalari

### 1.1 Admin Desktop

Konum:

- `carloi-v3/apps/admin-desktop`

Hedef:

- PC'ye kurulabilir admin programi
- Electron runtime
- yuksek yogunluklu operasyonlar
- belge inceleme
- sigorta teklif, odeme ve fatura sureci
- kullanici ve icerik denetimi

Bu baseline'de kurulan yapilar:

- route omurgasi
- panel manifestleri
- role based navigation
- insurance/commercial/user workflow tanimlari
- cok pencereli desktop window layout modeli

### 1.2 Admin Mobile

Konum:

- `carloi-v3/apps/admin-mobile`

Hedef:

- Android APK odakli admin uygulamasi
- Expo / React Native tabanli kritik operasyon kabugu
- hareket halindeyken hizli karar ve kuyruk yonetimi

Bu baseline'de kurulan yapilar:

- role based mobile tabs
- kritik ekran listesi
- commercial, insurance, user actions ve mesaj sikayet ekran kontratlari
- hafif ama gercek operasyon mantigi

## 2. Ortak admin cekirdegi

Konum:

- `carloi-v3/packages/admin-core`

Bu paket iki admin uygulamasinin ortak is mantigini tasir:

- V3 admin roller
- panel tanimlari
- dashboard widget tanimlari
- role -> backend role adaylari eslestirmesi
- admin auth policy
- audit kaydi yardimcilari
- mevcut admin endpointleri
- eksik admin endpointleri

## 3. Admin roller

V3 urun rolleri:

1. Super Admin
2. Sigorta Admini
3. Ticari Hesap Admini
4. Kullanici Admini
5. Moderasyon Admini
6. Finans Admini
7. Destek Admini

### 3.1 Rol mantigi

#### Super Admin

- tum paneller
- tum admin kullanicilari
- tum finans, audit ve ticari detaylar
- rol atama
- sistem parametreleri

#### Sigorta Admini

- sigorta istekleri
- teklif PDF
- police veya son belge akisi
- odeme durumu
- fatura sureci
- kullaniciya bildirim tetikleme

#### Ticari Hesap Admini

- ticari basvuru listesi
- belge goruntuleme
- onay
- red
- eksik belge talebi
- admin notu

#### Kullanici Admini

- kullanici profili
- ilanlar
- gonderiler
- garaj
- OBD ozetleri
- hesap durumu
- uyari / ban / gecici kisit

#### Moderasyon Admini

- ilanlar
- gonderiler
- raporlar
- icerik gizleme / reddetme / geri acma

#### Finans Admini

- Garanti Sanal POS odeme kayitlari
- basarili / basarisiz odeme
- fatura akislarinin takibi
- insurance ve payment istisna durumlari

#### Destek Admini

- destek ticket mantigi
- raporlanan mesajlar
- kullaniciya destek notu
- ilgili role eskalasyon

## 4. RBAC veri modeli

V3 icin onerilen veri modeli:

- `admin_users`
- `admin_roles`
- `admin_permissions`
- `admin_user_roles`
- `admin_role_permissions`
- `admin_sessions`
- `admin_action_audit_logs`
- `admin_step_up_challenges`

### 4.1 Admin session icerigi

- `adminId`
- `username`
- `displayName`
- `roles`
- `backendRoles`
- `permissions`
- `sessionId`
- `twoFactorEnabled`
- `twoFactorVerified`
- `issuedAt`
- `expiresAt`

### 4.2 Audit log icerigi

- islem yapan admin
- panel
- entity type
- entity id
- action key
- reason
- metadata
- zaman damgasi

## 5. Admin auth ilkeleri

### 5.1 Ayrik admin auth

Admin auth, son kullanici auth'tan ayridir.

Gerekli V3 mantigi:

- ayrik admin login
- ayrik admin token
- ayrik admin refresh
- ayrik admin logout

### 5.2 2FA hazir altyapi

Bu baseline'de 2FA gercek akisa baglanmadi ama veri modeli ve login flow buna hazir:

- `username-password`
- `awaiting-2fa`
- `authenticated`
- `locked`
- `expired`

### 5.3 Hassas aksiyonlar

Asagidaki aksiyonlar gerekce veya step-up auth gerektirebilir:

- ticari red
- eksik belge isteme
- kullanici ban / kisit
- ilan veya gonderi moderasyonu
- teklif yukleme
- fatura yukleme
- odeme override
- yetki veya admin rol degisikligi

## 6. Panel yapisi

### 6.1 Dashboard

Icerik:

- gunluk kullanici
- aktif ilan
- yeni ticari basvuru
- bekleyen sigorta istegi
- raporlanan icerikler
- odeme istisnalari

### 6.2 Kullanicilar

Icerik:

- kullanici listesi
- detay
- profil
- ilanlar
- gonderiler
- garaj
- OBD ozetleri
- hesap durumu
- uyari / ban / kisit

### 6.3 Ticari basvurular

Icerik:

- basvuru listesi
- belge goruntuleme
- onay
- red
- eksik belge talebi
- admin notu

### 6.4 Sigorta istekleri

Icerik:

- istek listesi
- alici bilgisi
- satici bilgisi
- arac bilgisi
- ruhsat bilgisi
- teklif PDF yukleme
- teklif ucreti girme
- odeme durumunu gorme
- fatura PDF yukleme
- kullaniciya bildirim gonderme

### 6.5 Ilanlar

Icerik:

- ilan listesi
- detay
- gizle
- reddet
- geri ac
- mevzuat kontrolu

### 6.6 Gonderiler

Icerik:

- gonderi listesi
- raporlar
- yorum moderasyonu
- icerik kaldirma / geri acma

### 6.7 Mesaj / sikayetler

Icerik:

- raporlanan mesajlar
- mesaj metadata
- destek talepleri
- eskalasyon

### 6.8 Odemeler

Icerik:

- islem listesi
- basarili / basarisiz odemeler
- odeme detayi
- payment exception izleme

### 6.9 Faturalar

Icerik:

- fatura listesi
- fatura PDF yukleme
- durum guncelleme
- tekrar gonderim

### 6.10 Sistem ayarlari

Icerik:

- sistem parametreleri
- rol ve yetki kurallari
- feature flags

### 6.11 Admin kullanicilari

Icerik:

- admin listesi
- rol atama
- 2FA hazirlik durumu
- admin erisim kapatma

## 7. Uygulama dosya yapisi

### 7.1 Desktop baseline

- `apps/admin-desktop/src/index.ts`
- `apps/admin-desktop/src/navigation.ts`
- `apps/admin-desktop/src/workflows.ts`
- `apps/admin-desktop/src/window-layout.ts`

Bu baseline:

- desktop route'lari
- role bazli navigation
- sigorta/ticari/kullanici operasyon workflow'lari
- pencereli desktop layout

### 7.2 Mobile baseline

- `apps/admin-mobile/src/index.ts`
- `apps/admin-mobile/src/navigation.ts`
- `apps/admin-mobile/src/screens.ts`

Bu baseline:

- mobile tab omurgasi
- kritik screen listesi
- role bazli mobile panel gorunurlugu

## 8. Mevcut backend'te kullanilabilen admin endpointleri

Mevcut route gozlemlerine gore kullanilabilir olanlar:

- `GET /api/admin/system/status`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/users/:userId`
- `GET /api/admin/listings`
- `POST /api/admin/listings/:postId/suspend`
- `POST /api/admin/listings/:postId/reject`
- `POST /api/admin/listings/:postId/restore`
- `GET /api/admin/messages`
- `GET /api/admin/messages/content`
- `GET /api/admin/messages/export`
- `GET /api/admin/audit`
- `GET /api/admin/commercial/reviews`
- `GET /api/admin/commercial/:profileId`
- `POST /api/admin/commercial/:profileId/approve`
- `POST /api/admin/commercial/:profileId/notes`
- `POST /api/admin/commercial/:profileId/reject`
- `POST /api/admin/commercial/:profileId/suspend`
- `POST /api/admin/commercial/:profileId/revoke`
- `GET /api/admin/payments`
- `GET /api/admin/payments/:paymentId`
- `GET /api/admin/deals`
- `POST /api/admin/deals/:conversationId/quote`
- `POST /api/admin/deals/:conversationId/policy`

## 9. API endpoint eksikleri

V3 admin urun mantigi icin eksik gorunen ana endpointler:

### 9.1 Admin auth

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `POST /api/admin/auth/refresh`
- `GET /api/admin/auth/session`
- `POST /api/admin/auth/2fa/verify`

### 9.2 Sigorta

- `GET /api/admin/deals/:conversationId`
- `POST /api/admin/deals/:conversationId/quote-file`
- `POST /api/admin/deals/:conversationId/invoice-file`
- `POST /api/admin/deals/:conversationId/notify`

### 9.3 Gonderi moderasyonu

- `GET /api/admin/posts`
- `GET /api/admin/posts/:postId`
- `POST /api/admin/posts/:postId/remove`
- `POST /api/admin/posts/:postId/restore`

### 9.4 Mesaj ve sikayet

- `GET /api/admin/messages/reports`
- `GET /api/admin/messages/:conversationId`
- `POST /api/admin/messages/:conversationId/escalate`

### 9.5 Faturalar

- `GET /api/admin/invoices`
- `GET /api/admin/invoices/:invoiceId`
- `POST /api/admin/invoices/:invoiceId/send`

### 9.6 Admin kullanici yonetimi

- `GET /api/admin/admin-users`
- `POST /api/admin/admin-users`
- `POST /api/admin/admin-users/:adminId/roles`
- `POST /api/admin/admin-users/:adminId/disable`

### 9.7 Kullanici enforcement

- `POST /api/admin/users/:userId/actions`

Bu endpoint tek contract altinda su aksiyonlari toplayabilir:

- warn
- suspend
- restrict
- force-password-reset

## 10. Baseline gelistirme sirasi

1. admin auth ayrimi
2. admin-core -> backend permission mapping
3. desktop dashboard ve queue ekranlari
4. mobile kritik queue ekranlari
5. sigorta detail + pdf upload contract
6. admin user management
7. 2FA ve step-up auth
