# Vehicle Catalog Plan

Bu belge, Carloi V3 arac veri havuzunun nasil kurulacagini ve nasil buyutulecegini tanimlar.

## Temel ilke

Yanlis veya uydurma veri ile "tam katalog" hissi verilmez.

Bu nedenle V3 katalog sistemi:

- dunyadaki tum vasita tiplerini destekleyecek sekilde modellenecek
- ilk surumde JSON seed ile baslayacak
- eksik marka/model/spec durumunda manuel girise izin verecek
- admin kurasyonu ile buyuyebilecek
- ileride lisansli veri saglayici veya OEM/API entegrasyonuna tasinabilecek

## Paket yapisi

Paket yolu:

- `carloi-v3/packages/vehicle-catalog`

Paket icerigi:

- `src/types.ts`
- `src/catalog.ts`
- `src/search.ts`
- `src/validation.ts`
- `src/normalize.ts`
- `src/seeds/global-core.json`

## Veri modeli

Temel varliklar:

- `VehicleType`
- `Brand`
- `Model`
- `Generation`
- `YearRange`
- `Trim`
- `Engine`
- `FuelType`
- `Transmission`
- `Drivetrain`
- `EquipmentPackage`
- `BodyType`
- `MarketRegion`

### Tasarim karari

Ilk seed, tum markalarin tum generation/trim/motor kombinasyonlarini iddia etmeyecek.

Bu nedenle:

- marka bazli coverage olabilir
- model bazli coverage olabilir
- generation veya trim bos olabilir
- `manual*Allowed` alanlari ile UI kontrollu sekilde manuel tamamlamaya gecer

## Kullanici akisi

1. vasita tipi sec
2. marka sec
3. model sec
4. yil sec
5. paket sec
6. motor sec
7. donanim goster
8. kullanici ek ozellik ekleyebilir

### UI kurallari

- arama destekli select
- marka yoksa `Listede yok, manuel ekle`
- model yoksa `Listede yok, manuel ekle`
- trim/motor eksikse manuel serbest giris
- seed verisi eksikse UI patlamaz; kontrollu fallback verir

## Seed politikasi

`global-core.json` icin kurallar:

- otomobil icin global ana markalar
- motosiklet icin global ana markalar
- kamyon/tir icin ana markalar
- is makinesi icin ana markalar
- tekne/yat/jetski icin ana markalar
- model/paket/motor tarafinda emin olunmayan detaylar seed'e zorla yazilmaz

### Seed seviyeleri

- `brand-only`
- `model-only`
- `partial`
- `detailed`

Bu completeness seviyesi UI ve admin tooling tarafinda gorulebilir olmalidir.

## Admin kurasyon akisi

Admin tarafinda ileride su akis kurulacak:

1. kullanici katalogda olmayan marka/model girer
2. sistem `catalog suggestion` olusturur
3. admin suggestion queue'da gorur
4. admin yeni marka/model/generation/trim/motor ekler
5. onayli veri sonraki seed/sync turunda aktif olur

Gerekli gelecek endpointler:

- `GET /api/admin/vehicle-catalog/suggestions`
- `POST /api/admin/vehicle-catalog/brands`
- `POST /api/admin/vehicle-catalog/models`
- `POST /api/admin/vehicle-catalog/generations`
- `POST /api/admin/vehicle-catalog/engines`
- `PATCH /api/admin/vehicle-catalog/...`

## Arama yardimcilari

Paket tarafinda desteklenecek arama yardimcilari:

- vasita tipi arama
- marka arama
- model arama
- secim ilerledikce ilgili dropdown seceneklerini getirme
- normalize edilmis arama
- Turkce karakter ve alias destekli arama

## Validation yardimcilari

Paket tarafinda desteklenecek validation katmanlari:

- seed dataset dogrulamasi
- duplicate slug kontrolu
- secim akisi dogrulamasi
- manuel marka/model girisi dogrulamasi
- yil araligi mantik kontrolu
- admin katalog suggestion dogrulamasi

## Gelecek asamalar

1. JSON seed baseline
2. admin-curated catalog storage
3. backend sync endpointleri
4. market-region bazli paketleme
5. lisansli veri saglayici entegrasyonu
6. OEM / VIN / plaka destekli zenginlestirme
