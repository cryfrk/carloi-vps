# Carloi V3 Product Flows

Bu belge, Carloi V3 icin urun mantigini kod yazmadan once netlestirmek amaciyla hazirlanmistir.

Temel urun tanimi:

- Carloi = Instagram tarzi sosyal otomotiv platformu
- ek katmanlar = ilan, garaj, mesajlasma, sigorta odakli satis akisi, AI, ticari hesap
- mevcut backend korunur
- mevcut canli API tabani: `https://api.carloi.com`

Bu dokuman 3 sey yapar:

1. Her ana akis icin ekran listesini tanimlar
2. Her akis icin gerekli API endpointlerini listeler
3. Su an backend tarafinda eksik olan endpointleri acikca isaretler

Not:

- Yasal metinler ve sozlesme icerikleri urun icinde detayli gosterilecek olsa da canliya cikmadan once hukukcu incelemesi gereklidir.
- Bu belge urun akisini tanimlar; payload alanlari icin ek detaylar `docs/api-contract.md` icinde derinlestirilecektir.

## 0. Genel ilke

V3 ana deneyim ilkeleri:

- mobil oncelikli ama web ile tutarli
- sosyal feed merkezli
- ilan ve sosyal gonderi ayni dunyada ama birbirine karismayan kart mantigi
- kullanici teknik hata gormez
- eksik backend ozelligi varsa UI bunu "disabled + aciklama" ile gostermelidir
- demo placeholder yerine profesyonel empty state kullanilmalidir

---

## 1. Auth

### Amac

Kullanici uygulamaya girer, hizli sekilde giris yapar veya kayit olur. Giris sonrasi dogrulama tamamlandiysa otomatik olarak oturum acilir ve ana akis yuklenir.

### Ekran listesi

- Auth Landing
- Login
- Register Type Select
- Register Contact Method Select
- Register Form
- Verification Screen
- Forgot Password
- Reset Password

### Urun akisi

1. Kullanici ilk ekranda `Giris yap`, `Bireysel hesap olustur`, `Ticari hesap olustur` seceneklerini gorur.
2. Uye ise su alanlardan biriyle giris yapar:
   - email + sifre
   - telefon + sifre
   - kullanici adi + sifre
3. Uye degilse kayit akisina girer.
4. Kayit sonrasi secilen kanala gore:
   - email dogrulama
   - SMS dogrulama
5. Dogrulama tamamlaninca oturum otomatik acilir.
6. Kullanici `bootstrap` ile ana veri snapshot'unu alir ve feed'e duser.

### Gerekli API endpointleri

Mevcut olanlar:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/verification/start`
- `GET /api/auth/verify-email`
- `POST /api/auth/verify-email`
- `POST /api/auth/send-sms-code`
- `POST /api/auth/verify-sms-code`
- `POST /api/auth/resend-code`
- `POST /api/auth/resend-verification-code`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/logout`
- `GET /api/bootstrap`

Destekleyici endpoint:

- `PUT /api/onboarding`

### Eksik veya netlestirilmesi gereken backend noktalar

- `POST /api/auth/login` icin `username + password` contract'i acik dokumante edilmeli
- oturum durumunu hafif cekmek icin `GET /api/auth/session` veya `GET /api/auth/me` benzeri hafif bir endpoint faydali olur
- email ekleme / telefon ekleme sonraki asama icin ayri endpoint gerekecek

---

## 2. Bireysel kayit

### Ekran listesi

- Register Type Select
- Contact Method Select
- Individual Register Form
- Legal Documents Modal
- Verification Screen

### Gerekli alanlar

- isim
- soyisim
- kullanici adi
- email veya telefon
- sifre
- sozlesme onaylari

### Urun akisi

1. Kullanici `Bireysel hesap olustur` secer.
2. Email veya telefon ile kayit kanalini secer.
3. Formu doldurur.
4. Sozlesmeleri modal icinde acip okur, onaylar.
5. `Devam et` der.
6. Dogrulama ekranina gider.
7. Dogrulama tamamlaninca otomatik login olur.

### Gerekli API endpointleri

- `POST /api/auth/register`
- `POST /api/auth/verification/start`
- `GET /api/auth/verify-email`
- `POST /api/auth/verify-email`
- `POST /api/auth/send-sms-code`
- `POST /api/auth/verify-sms-code`
- `GET /api/bootstrap`

### Eksik backend noktalar

- kayit kanalina gore birincil kimlik alanini acik donen response shape netlestirilmeli
- kayit basarisindan sonra otomatik session donusu netlestirilmeli; aksi halde login adimi ayrica gerekir

---

## 3. Ticari kayit

### Ekran listesi

- Register Type Select
- Commercial Register Form
- Legal Documents Modal
- Verification Screen
- Commercial Documents Modal

### Gerekli alanlar

- isim
- soyisim
- kullanici adi
- email
- telefon
- sifre
- T.C. no
- vergi no
- firma adi
- vergi dairesi
- sozlesme onaylari

### Urun akisi

1. Kullanici `Ticari hesap olustur` secer.
2. Temel bireysel + ticari alanlari doldurur.
3. Dogrulama tamamlanir.
4. Otomatik login olur.
5. Ilk giriste ticari belge modal'i acilir.
6. Kullanici isterse hemen belge yukler, isterse atlar.
7. Belge yuklenmemisse ticari rozet ve ticari ilan yetkileri acilmaz.

### Gerekli API endpointleri

Mevcut olanlar:

- `POST /api/auth/register`
- `POST /api/auth/verification/start`
- `GET /api/auth/verify-email`
- `POST /api/auth/verify-email`
- `POST /api/auth/send-sms-code`
- `POST /api/auth/verify-sms-code`
- `GET /api/commercial/status`
- `POST /api/commercial/profile`
- `PATCH /api/commercial/profile`
- `POST /api/commercial/documents`
- `POST /api/commercial/submit`
- `POST /api/commercial/resubmit`

### Eksik backend noktalar

- belge checklist tipleri backend contract'inda daha acik tanimlanmali
- belge silme / belge degistirme endpointi gerekli olabilir
- ticari basvuru durum gecmisi icin ayri timeline endpoint'i faydali olur

---

## 4. Ana sayfa

### Ekran listesi

- Feed
- Feed Filters
- Inline Composer
- Feed Empty State
- Feed Error State

### Urun akisi

1. Kullanici giris yaptiktan sonra feed'e gelir.
2. Feed; takip edilen kullanicilar, konuma yakin icerikler ve ilan/gonderi karisik mantikla akar.
3. Icerik tipleri ayristirilarak gosterilir:
   - normal gonderi
   - arac gonderisi
   - video
   - ilan gonderisi

### Gerekli API endpointleri

Mevcut olanlar:

- `GET /api/bootstrap`
- `POST /api/posts`
- `POST /api/posts/:postId/like`
- `POST /api/posts/:postId/save`
- `POST /api/posts/:postId/repost`
- `POST /api/posts/:postId/comment`
- `POST /api/posts/:postId/track`

### Eksik backend noktalar

- feed siralama/pagination icin ayri endpoint gerekli:
  - `GET /api/feed`
  - `GET /api/feed?mode=following`
  - `GET /api/feed?mode=nearby`
- feed pagination cursor/next page yapisi gerekli
- sponsorlu icerik veya ticari icerik ayrimi icin feed metadata alanlari gerekli

---

## 5. Ust bar

### Ekran listesi

- Feed Header
- Profile Header
- Search Entry
- Notifications Entry
- Quick Create Entry

### Urun akisi

- sadece ana sayfa ve profil tarafinda gorunur
- sol: gonderi olustur
- sag: arama ve bildirim

### Gerekli API endpointleri

Mevcut direkt endpoint yok; bu bolum UI davranisi ve search/notification altyapisina baglidir.

### Eksik backend noktalar

- `GET /api/notifications`
- `POST /api/notifications/:notificationId/read`
- `POST /api/notifications/read-all`
- `GET /api/search`

---

## 6. Alt bar

### Tab sirasi

1. Ana Sayfa
2. Mesajlar
3. Loi AI
4. Garajim
5. Profil

### Ekran listesi

- Feed
- Messages Inbox
- Loi AI
- Garage
- Profile

### Gerekli API endpointleri

Bu alan esasen navigation katmanidir. Endpoint ihtiyaci ilgili ekranlarda tanimlidir.

### Eksik backend noktalar

- yok; UI routing konusu

---

## 7. Gonderi

### Ekran listesi

- Create Post
- Post Detail
- Likes List
- Comments Sheet
- Tagged Notification Surface

### Urun akisi

1. Kullanici foto/video carousel ile gonderi olusturur.
2. Aciklama, konum ve icerik tipi girer.
3. Gonderi feed'e duser.
4. Diger kullanicilar:
   - begenir
   - yorum yapar
   - kaydeder
   - paylasir
5. Yorumlarda `@etiketleme` ile bildirim olusur.

### Gerekli API endpointleri

Mevcut olanlar:

- `POST /api/media/upload`
- `POST /api/posts`
- `DELETE /api/posts/:postId`
- `POST /api/posts/:postId/like`
- `POST /api/posts/:postId/save`
- `POST /api/posts/:postId/repost`
- `POST /api/posts/:postId/comment`
- `GET /api/public/posts/:postId`

### Eksik backend noktalar

- `GET /api/posts/:postId/likes`
- `GET /api/posts/:postId/comments`
- `POST /api/posts/:postId/share`
- `POST /api/posts/:postId/report`
- yorum mention bildirimleri icin notification surface gerekli

---

## 8. Ilan gonderisi

### Ekran listesi

- Create Listing
- Listing Detail
- Listing Media Viewer
- Listing Contact Actions

### Urun akisi

1. Kullanici garajdan arac secer.
2. Fiyat, aciklama, medya ve arac ozeti ile ilan olusturur.
3. Kartta kisa bilgi tablosu gorunur.
4. Kullanici:
   - detayli incele
   - ara
   - mesaj at
   aksiyonlarini kullanir.

### Gerekli API endpointleri

Mevcut olanlar:

- `POST /api/media/upload`
- `POST /api/posts`
- `GET /api/public/listings/:postId`
- `POST /api/posts/:postId/sold`

### Eksik backend noktalar

- ayri listing listesi ve filtreleme endpointleri gerekli:
  - `GET /api/listings`
  - `GET /api/listings/:listingId`
  - `GET /api/listings/search`
- `POST /api/listings/:listingId/call-track` benzeri bir cagri izleme endpoint'i faydali olabilir
- favori ilan endpoint'i ayri ele alinabilir

---

## 9. Ilan mesaj akisi

### Ekran listesi

- Listing Conversation Starter
- Listing Chat
- Agreement Step
- Registration Share Step

### Urun akisi

1. Alici `Mesaj at` der.
2. Mesaj kutusuna ilan karti baglam olarak eklenir.
3. Saticiya ilan karti + mesaj gider.
4. Sohbette `Anlastik` akisi vardir.
5. Iki taraf da kabul ederse ruhsat bilgisi paylasim adimi acilir.

### Gerekli API endpointleri

Mevcut olanlar:

- `POST /api/conversations/listing`
- `POST /api/conversations/:conversationId/messages`
- `PATCH /api/conversations/:conversationId/messages/:messageId`
- `POST /api/conversations/:conversationId/messages/:messageId/delete`
- `POST /api/conversations/:conversationId/agreement`
- `POST /api/conversations/:conversationId/registration/share`

### Eksik backend noktalar

- inbox listeleme icin:
  - `GET /api/conversations`
  - `GET /api/conversations/:conversationId`
- listing chat'te karsi taraf agreement durumu icin net summary endpoint faydali olur
- mesaj icinde ilan karti ve ruhsat adimlarini standardize eden payload contract dokumani gerekli

---

## 10. Sigorta akisi

### Ekran listesi

- Insurance Request State
- Admin Insurance Queue
- Quote Review
- Payment Redirect
- Policy Delivery State

### Urun akisi

1. Satici ruhsat bilgisini paylasir.
2. Alici `Sigorta teklifi olustur` der.
3. Admin panelde sigorta istegi olusur.
4. Admin teklif ve ucret bilgisini girer.
5. Kullanici bildirim alir.
6. Kullanici Garanti 3D Secure ile odeme yapar.
7. Odeme sonucu admin panelde gorunur.
8. Admin fatura/police belgelerini yukler veya URL ile baglar.
9. Kullaniciya mail ve uygulama ici bilgi gider.

### Gerekli API endpointleri

Mevcut olanlar:

- `POST /api/conversations/:conversationId/insurance/pay`
- `POST /api/payment/initiate`
- `GET /api/payment/session/:paymentReference`
- `POST /api/payments/insurance/callback`
- `GET /api/admin/deals`
- `POST /api/admin/deals/:conversationId/quote`
- `POST /api/admin/deals/:conversationId/policy`
- `GET /api/admin/payments`
- `GET /api/admin/payments/:paymentId`

### Eksik backend noktalar

- teklif PDF yukleme endpoint'i yok; su an URL odakli akiyor
- fatura PDF yukleme endpoint'i yok; su an URL odakli akiyor
- kullanici tarafinda sigorta istek timeline endpoint'i faydali olur:
  - `GET /api/conversations/:conversationId/insurance-status`
- bildirim merkezi endpointleri gerekli

---

## 11. Loi AI

### Ekran listesi

- AI Chat
- AI Prompt Presets
- Vehicle Context Picker
- Media Upload for AI
- AI History

### Urun akisi

1. Kullanici AI tabina girer.
2. Gerekirse arac secer.
3. AI'a su konularda soru sorar:
   - ariza
   - kronik problem
   - ilan karsilastirma
   - butceye gore arac onerisi
   - OBD yorumlama
4. AI cevaplari sohbet mantiginda akar.

### Gerekli API endpointleri

Mevcut olanlar:

- `POST /api/ai/chat`
- `POST /api/ai/clear`
- `DELETE /api/ai/messages/:messageId`
- `PATCH /api/ai/messages/:messageId`

### Eksik backend noktalar

- AI icin medya yukleme / multimodal referans contract'i net degil
- garajdaki secili araci AI'a baglamak icin structured context endpoint faydali olur:
  - `GET /api/garage/vehicles/:vehicleId/context`
- OBD verisi yoksa AI'a "hazir degil" durumu dondurecek net bir alan olmali

---

## 12. Garajim

### Ekran listesi

- Garage Home
- Add Vehicle Wizard
- Vehicle Detail
- OBD Status
- Maintenance History
- Inspection History
- Vehicle Health

### Urun akisi

1. Kullanici birden fazla arac ekler.
2. Arac kartlarinda:
   - foto
   - marka/model
   - plaka gizlilik durumu
   - saglik durumu
   - OBD baglanti durumu
gorunur.
3. Kullanici:
   - arac ekler
   - OBD baglar
   - bakim gecmisi gorur
   - ekspertiz gorur
   - araci ilana cikarir

### Gerekli API endpointleri

Su an dogrudan tespit edilen ayri garage endpoint'i yok.

Muhtemel mevcut veri kaynagi:

- `GET /api/bootstrap`

### Eksik backend noktalar

Bu alan V3 icin en kritik eksik backend alanidir. Gerekli minimum set:

- `GET /api/garage/vehicles`
- `POST /api/garage/vehicles`
- `GET /api/garage/vehicles/:vehicleId`
- `PATCH /api/garage/vehicles/:vehicleId`
- `DELETE /api/garage/vehicles/:vehicleId`
- `POST /api/garage/vehicles/:vehicleId/media`
- `GET /api/garage/vehicles/:vehicleId/health`
- `GET /api/garage/vehicles/:vehicleId/obd`
- `POST /api/garage/vehicles/:vehicleId/obd/connect`
- `GET /api/garage/vehicles/:vehicleId/maintenance`
- `POST /api/garage/vehicles/:vehicleId/maintenance`
- `GET /api/garage/vehicles/:vehicleId/inspection`
- `POST /api/garage/vehicles/:vehicleId/listing-draft`

Ek olarak katalog endpointleri gerekir:

- `GET /api/vehicle-catalog/types`
- `GET /api/vehicle-catalog/brands`
- `GET /api/vehicle-catalog/models`
- `GET /api/vehicle-catalog/packages`
- `GET /api/vehicle-catalog/engines`
- `GET /api/vehicle-catalog/trims`

---

## 13. Profil

### Ekran listesi

- Public Profile
- Followers List
- Following List
- Profile Tabs
- Vehicle Profile

### Urun akisi

1. Profil Instagram benzeri ust alanla acilir.
2. Kullanici:
   - takip eder
   - takipci/takip edilen listesine girer
   - gonderi, ilan ve arac sekmelerini gezer
3. Arac kartina tiklarsa arac profiline gider.

### Gerekli API endpointleri

Mevcut olanlar:

- `GET /api/public/profiles/:handle`
- `PATCH /api/profile/settings`
- `PATCH /api/profile/media`
- `POST /api/profile/follow`

### Eksik backend noktalar

- `GET /api/profiles/:handle/followers`
- `GET /api/profiles/:handle/following`
- `GET /api/profiles/:handle/posts`
- `GET /api/profiles/:handle/listings`
- `GET /api/profiles/:handle/vehicles`
- `GET /api/vehicles/:vehicleId/profile`

---

## 14. Mesajlar

### Ekran listesi

- Inbox
- Direct Chat
- Group Chat
- Listing Context Chat
- Shared Card Viewer

### Urun akisi

1. Kullanici birebir veya grup mesaj baslatir.
2. Fotograf/video gonderebilir.
3. Uygulama ici gonderi/ilan/arac karti paylasabilir.
4. Ilan konulu sohbetler ayri baglamla gorunur.

### Gerekli API endpointleri

Mevcut olanlar:

- `POST /api/conversations/direct`
- `POST /api/conversations/listing`
- `POST /api/conversations/group`
- `POST /api/conversations/:conversationId/messages`
- `PATCH /api/conversations/:conversationId/messages/:messageId`
- `POST /api/conversations/:conversationId/messages/:messageId/delete`
- `POST /api/media/upload`
- `GET /api/admin/messages`
- `GET /api/admin/messages/content`

### Eksik backend noktalar

- `GET /api/conversations`
- `GET /api/conversations/:conversationId`
- `POST /api/conversations/:conversationId/read`
- `POST /api/conversations/:conversationId/share-card`
- typing / unread metadata icin summary endpoint

---

## 15. Ayarlar

### Ekran listesi

- Profile Settings
- Security Settings
- Notification Settings
- Privacy Settings
- Commercial Settings
- Garage Settings
- Legal Center
- Support

### Urun akisi

Gruplar:

- profil
- guvenlik
- bildirim
- gizlilik
- ticari hesap
- garaj
- yasal
- destek

### Gerekli API endpointleri

Mevcut olanlar:

- `PATCH /api/profile/settings`
- `PATCH /api/profile/media`
- `GET /api/commercial/status`
- `POST /api/commercial/profile`
- `PATCH /api/commercial/profile`

### Eksik backend noktalar

- `GET /api/settings`
- `PATCH /api/settings/notifications`
- `PATCH /api/settings/privacy`
- `PATCH /api/settings/security`
- `POST /api/auth/change-password`
- `POST /api/auth/attach-email`
- `POST /api/auth/attach-phone`
- `POST /api/legal/acknowledge`

---

## 16. Admin sistemi

### Ekran listesi

- Admin Login
- Dashboard
- Users
- Listings
- Messages
- Risk
- Commercial Reviews
- Insurance Deals
- Payments
- Billing
- Audit
- System Status

### Urun akisi

1. Masaustu admin programi ve Android admin uygulamasi ayni admin API katmanina baglanir.
2. Rol bazli erisim kullanilir.
3. Admin su alanlari yonetir:
   - sigorta
   - kullanicilar
   - ticari hesaplar
   - ilan/gonderi denetimi
   - odemeler
   - audit ve risk

### Gerekli API endpointleri

Mevcut olanlar:

- `GET /api/admin/dashboard`
- `GET /api/admin/system/status`
- `GET /api/admin/users`
- `GET /api/admin/users/:userId`
- `GET /api/admin/listings`
- `POST /api/admin/listings/:postId/suspend`
- `POST /api/admin/listings/:postId/reject`
- `POST /api/admin/listings/:postId/restore`
- `GET /api/admin/messages`
- `GET /api/admin/messages/content`
- `POST /api/admin/messages/export`
- `GET /api/admin/risk`
- `POST /api/admin/risk-flags/:flagId/review`
- `GET /api/admin/audit`
- `GET /api/admin/commercial/reviews`
- `GET /api/admin/commercial/:profileId`
- `POST /api/admin/commercial/:profileId/approve`
- `POST /api/admin/commercial/:profileId/notes`
- `POST /api/admin/commercial/:profileId/reject`
- `POST /api/admin/commercial/:profileId/suspend`
- `POST /api/admin/commercial/:profileId/revoke`
- `GET /api/admin/billing/settings`
- `PATCH /api/admin/billing/settings`
- `GET /api/admin/billing/plans`
- `POST /api/admin/billing/plans`
- `GET /api/admin/payments`
- `GET /api/admin/payments/:paymentId`
- `GET /api/admin/subscriptions`
- `GET /api/admin/deals`
- `POST /api/admin/deals/:conversationId/quote`
- `POST /api/admin/deals/:conversationId/policy`

### Eksik backend noktalar

- admin auth/sso akisi daha net dokumante edilmeli
- belge dosyasi yukleme yerine URL bekleyen admin insurance akisi gelistirilmeli
- admin notification / assignment queue endpointleri faydali olur
- admin mobile icin hafif summary endpointleri gerekebilir

---

## V3 icin toplu eksik backend endpoint listesi

Urun akisinin tam V3 seviyesine cikmasi icin en kritik eksikler:

### Search

- `GET /api/search`
- `GET /api/search/suggestions`

### Notifications

- `GET /api/notifications`
- `POST /api/notifications/:notificationId/read`
- `POST /api/notifications/read-all`

### Garage

- `GET /api/garage/vehicles`
- `POST /api/garage/vehicles`
- `GET /api/garage/vehicles/:vehicleId`
- `PATCH /api/garage/vehicles/:vehicleId`
- `DELETE /api/garage/vehicles/:vehicleId`
- `GET /api/garage/vehicles/:vehicleId/health`
- `GET /api/garage/vehicles/:vehicleId/obd`
- `GET /api/garage/vehicles/:vehicleId/maintenance`
- `GET /api/garage/vehicles/:vehicleId/inspection`

### Vehicle catalog

- `GET /api/vehicle-catalog/types`
- `GET /api/vehicle-catalog/brands`
- `GET /api/vehicle-catalog/models`
- `GET /api/vehicle-catalog/packages`
- `GET /api/vehicle-catalog/engines`
- `GET /api/vehicle-catalog/trims`

### Profile social graph

- `GET /api/profiles/:handle/followers`
- `GET /api/profiles/:handle/following`
- `GET /api/profiles/:handle/posts`
- `GET /api/profiles/:handle/listings`
- `GET /api/profiles/:handle/vehicles`

### Conversations inbox

- `GET /api/conversations`
- `GET /api/conversations/:conversationId`
- `POST /api/conversations/:conversationId/read`

### Settings

- `GET /api/settings`
- `PATCH /api/settings/notifications`
- `PATCH /api/settings/privacy`
- `PATCH /api/settings/security`
- `POST /api/auth/change-password`
- `POST /api/auth/attach-email`
- `POST /api/auth/attach-phone`

### Insurance and admin documents

- teklif PDF yukleme endpointi
- police/fatura dosya yukleme endpointi
- kullanici tarafi sigorta durum timeline endpointi

---

## V3 icin backend hazirlik onceligi

Kodu yazmadan once backend hazirlik sirasi soyle olmalidir:

1. Garage ve vehicle catalog endpointleri
2. Search ve notifications
3. Conversations inbox GET endpointleri
4. Settings ve account-security endpointleri
5. Insurance belge yukleme ve status timeline
6. Followers/following ve profile tab endpointleri

Bu siralama olmadan V3 UI guzel gorunse bile tam urun deneyimi eksik kalir.
