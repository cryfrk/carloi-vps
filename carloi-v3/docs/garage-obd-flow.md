# Carloi V3 Garajim, OBD ve Ekspertiz Akisi

## 1. Kapsam

Bu belge Carloi V3 icin su alanlari tanimlar:

- Garajim deneyimi
- coklu arac yonetimi
- arac ekleme wizard'i
- boya / degisen isaretleme mantigi
- opsiyonel ruhsat ve sasi no kullanimi
- OBD cihaz baglanti mimarisi
- OBD tabanli ekspertiz akisi
- backend eksikleri

Temel ilke:

- demo cihaz listesi veya sahte OBD sonucu gosterilmez
- cihaz tipi kesin ayirt edilemiyorsa kullanici guvenli secim ekranina yonlendirilir
- coklu arac omurgasi V3'te bagimsiz bir domain olarak kurulur

## 2. Garajim UX

### 2.1 Ana ekran

Garajim, profil icine gomulu degil, ayri bir urun merkezi gibi calisir.

Ana yapi:

- en ustte `Arac ekle`
- yaninda `OBD bagla`
- altta coklu arac kartlari
- her kartta:
  - arac fotografi
  - marka / model / yil
  - plaka gizlilik moduna gore plaka
  - saglik puani
  - OBD baglanti durumu
  - son ekspertiz tarihi
  - `Araci ilana cikar`

### 2.2 Arac karti

Kart alanlari:

- kapak fotografi
- marka / model / paket
- vasita tipi
- km
- plaka gorunumu
- boya / degisen ozeti
- OBD bagli / bagli degil rozeti
- ekspertiz hazir / veri eksik rozeti

Kart aksiyonlari:

- `Detay`
- `Araci ilana cikar`
- `OBD bagla`
- `Bakim gecmisi`
- `Ekspertiz`

### 2.3 Arac detayi

Arac detay sayfasi:

- medya galerisi
- teknik ozet
- donanim listesi
- boya / degisen gorunumu
- ruhsat bilgisi durumu
- sasi numarasi durumu
- OBD cihaz baglantisi
- son DTC kodlari
- canli sensorler
- son ekspertiz raporu
- `Araci ilana cikar`

## 3. Arac Ekleme Wizard

Adimlar:

1. vasita tipi
2. marka
3. model
4. yil
5. paket
6. motor
7. km
8. renk
9. plaka
10. donanim
11. boya / degisen gorseli
12. ruhsat bilgileri
13. sasi no
14. fotograflar

### 3.1 Katalog ve manuel tamamlama

- marka / model / paket / motor secimleri katalog paketinden gelir
- katalog eksikse:
  - `Listede yok, manuel ekle`
  akisina gecilir
- kullanici manuel ekleme yaptiginda ileride admin katalog kurasyonu icin suggestion olusabilir

### 3.2 Ruhsat alani

Ruhsat opsiyoneldir.

Kullanici metni:

- `Ruhsat bilgisi eklersen ilan olusturma ve sigorta sureci daha hizli ilerler.`

### 3.3 Sasi no alani

Sasi no opsiyoneldir.

Kullanici metni:

- `Sasi numarasi parca bulma, ariza tespiti ve OBD analizinde daha dogru eslestirme saglayabilir.`

## 4. Boya / Degisen UX

### 4.1 Parca haritasi

Secilebilir parcilar:

- kaput
- tavan
- bagaj
- on tampon
- arka tampon
- sol / sag on camurluk
- sol / sag arka camurluk
- sol / sag on kapi
- sol / sag arka kapi

### 4.2 Durumlar

- orijinal
- boyali
- lokal boyali
- degisen

### 4.3 Renk mantigi

- orijinal -> gri
- boyali -> sari
- lokal boyali -> turuncu
- degisen -> kirmizi

Ilk durumda parca `isaretlenmedi` olarak kalir.

Bu bilerek yapilir; tum parcayi varsayilan olarak `orijinal` gostermek yaniltici olur.

### 4.4 UX davranisi

1. Kullanici parca ustune dokunur.
2. Alt drawer veya popover acilir.
3. Durum secilir.
4. Parca ilgili renge boyanir.
5. Kullanici isterse not ekler.
6. Tum harita `onaylandi` durumuna alinmadan wizard bir sonraki zorunlu asamaya gecmez.

## 5. OBD Mimarisi

### 5.1 Desteklenen baglanti tipleri

- Bluetooth Classic
- Bluetooth LE
- Wi-Fi

### 5.2 Guvenli cihaz secim mantigi

Uygulama her zaman bir cihazin kesin OBD oldugunu anlayamayabilir.

Bu durumda UX:

- kesfedilen cihazlar listelenir
- bilinen OBD adaylari `muhtemel OBD` rozeti alir
- ama son karari kullanici verir
- cihaz pin istiyorsa sifre istenir

Metin:

- `Cihaz adi tek basina OBD oldugunu garanti etmez. Kendi OBD cihazinizi listeden secin.`

### 5.3 Izinler

Android:

- bluetooth
- nearby devices
- bluetooth scan
- bluetooth connect
- gerekirse location
- Wi-Fi adaptor icin network durumu

iOS:

- bluetooth
- gerekirse local network

### 5.4 Baglanti state machine

- idle
- requesting-permissions
- scanning
- device-selection
- auth-required
- connecting
- protocol-negotiation
- connected
- streaming
- disconnected
- error

### 5.5 Protokol katmani

Hazirlanan mimari su protokolleri tasiyabilir:

- CAN 11/500
- CAN 29/500
- CAN 11/250
- CAN 29/250
- ISO 9141-2
- ISO 14230-4
- SAE J1850 VPW
- SAE J1850 PWM
- UDS

### 5.6 Sensor ve DTC

Canli sensor omurgasi:

- motor devri
- sogutma suyu sicakligi
- arac hizi
- aku voltaji
- yakit seviyesi
- motor yuku
- emis havasi sicakligi
- MAF
- MAP
- kisa / uzun yakit duzeltme
- lambda
- gaz kelebegi
- O2 sensorleri

DTC katmani:

- stored
- pending
- permanent
- history

## 6. OBD Ekspertiz Akisi

### 6.1 Fazlar

- idle
- obd-precheck
- ready
- countdown
- collecting
- analyzing
- report-ready
- report-failed

### 6.2 Kullanici akisi

1. Kullanici `Ekspertiz baslat` der.
2. Sistem OBD baglantisini kontrol eder.
3. Precheck asamasi:
   - cihaz bagli mi
   - gerekli sensor akisi geliyor mu
   - akumulator / baglanti stabil mi
4. 10 dakikalik surus testi geri sayimi baslar.
5. Veri toplanir.
6. Toplanan veri analiz edilir.
7. Rapor olusur.

### 6.3 Rapor icerigi

- arac saglik puani
- surus puani
- DTC kodlari
- sensor ozetleri
- fabrika verisine yakinlik notlari
- riskli olabilecek parcilar
- rapor PDF

### 6.4 Yakınlastirma ve detay

Rapor ekraninda:

- DTC satirina tikla > detay
- sensor grafiklerine yakinlastir
- sorunlu araliklari isaretle
- boya / degisen ve ekspertiz raporunu yan yana goster

## 7. Veri Modeli

Kod tarafinda hazirlanan yeni paket:

- `carloi-v3/packages/garage-obd`

Paket su domain alanlarini saglar:

- garage vehicle draft / record
- wizard step modeli
- boya haritasi
- OBD cihaz, izin, baglanti state modeli
- DTC ve canli sensor tipleri
- ekspertiz raporu ve faz state modeli
- Garajim ekran manifestleri

## 8. UI Ekranlari

Hazirlanan ekran listesi:

- `GarageHome`
- `AddVehicleWizard`
- `VehiclePaintMap`
- `VehicleDetail`
- `ObdConnection`
- `ExpertiseDriveTest`
- `ExpertiseReport`

Bu ekranlar icin route ve amac tanimlari yeni pakette `garageScreens` olarak tanimlandi.

## 9. Backend Eksikleri

Mevcut backend gozlemine gore eksik veya genisletilmesi gereken alanlar:

### 9.1 Garaj

- coklu arac CRUD endpointleri yok
- mevcut yapi agirlikla tek `vehicle_json` uzerinden ilerliyor
- arac medyasi icin ayrik garage media modeli yok
- arac bazli bakim gecmisi endpointi yok
- arac bazli ekspertiz gecmisi endpointi yok

Onerilen endpointler:

- `GET /api/garage/vehicles`
- `POST /api/garage/vehicles`
- `GET /api/garage/vehicles/:vehicleId`
- `PATCH /api/garage/vehicles/:vehicleId`
- `DELETE /api/garage/vehicles/:vehicleId`
- `POST /api/garage/vehicles/:vehicleId/media`
- `GET /api/garage/vehicles/:vehicleId/posts`

### 9.2 Ruhsat ve sasi

- ruhsat bilgisi icin ayrik saklama modeli yok
- hassas veri maskleme / encryption kurali endpoint bazinda tanimli degil
- sasi numarasi icin guvenli saklama stratejisi netlestirilmeli

Onerilen endpointler:

- `POST /api/garage/vehicles/:vehicleId/registration`
- `GET /api/garage/vehicles/:vehicleId/registration-summary`
- `POST /api/garage/vehicles/:vehicleId/chassis`

### 9.3 OBD

- cihaz eslestirme endpointi yok
- OBD oturum acma / kapama modeli yok
- canli sensor stream endpointi yok
- DTC kayit ve gecmis modeli yok

Onerilen endpointler:

- `POST /api/garage/vehicles/:vehicleId/obd/sessions`
- `POST /api/garage/vehicles/:vehicleId/obd/sessions/:sessionId/readings`
- `POST /api/garage/vehicles/:vehicleId/obd/sessions/:sessionId/dtcs`
- `POST /api/garage/vehicles/:vehicleId/obd/pairings`
- `GET /api/garage/vehicles/:vehicleId/obd/history`

### 9.4 Ekspertiz

- 10 dakikalik test sonucu icin ayrik rapor modeli yok
- rapor PDF / grafik / risk skoru icin endpointler yok
- fabrika verisi ile karsilastirma servis katmani eksik

Onerilen endpointler:

- `POST /api/garage/vehicles/:vehicleId/expertise/sessions`
- `POST /api/garage/vehicles/:vehicleId/expertise/sessions/:sessionId/complete`
- `GET /api/garage/vehicles/:vehicleId/expertise/reports`
- `GET /api/garage/vehicles/:vehicleId/expertise/reports/:reportId`

## 10. Gelistirme Sirasi

1. Garage CRUD ve media modeli
2. boya / degisen UI baglantisi
3. OBD pairing ve session model
4. sensor ve DTC ingestion
5. ekspertiz session ve rapor modeli
6. listing draft from garage endpointi

