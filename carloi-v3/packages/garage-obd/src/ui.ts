import type { GarageScreenDefinition } from './types.js';

export const garageScreens: readonly GarageScreenDefinition[] = [
  {
    id: 'garage-home',
    route: 'GarageHome',
    title: 'Garajim',
    purpose: 'Coklu arac yonetimi, OBD durumu ve ilan hazirligi.',
    primaryAction: 'Arac ekle',
    secondaryAction: 'OBD bagla'
  },
  {
    id: 'garage-add-vehicle',
    route: 'AddVehicleWizard',
    title: 'Arac ekle',
    purpose: 'Katalog tabanli arac ekleme ve manuel tamamlama akisidir.',
    primaryAction: 'Devam et',
    secondaryAction: 'Kaydet ve cik'
  },
  {
    id: 'garage-paint-map',
    route: 'VehiclePaintMap',
    title: 'Boya / degisen',
    purpose: 'Parca bazli boya ve degisen durumu isaretleme ekranidir.',
    primaryAction: 'Kaydet',
    secondaryAction: 'Temizle'
  },
  {
    id: 'garage-detail',
    route: 'VehicleDetail',
    title: 'Arac detayi',
    purpose: 'Arac sagligi, OBD, ekspertiz ve ilan baglantilarini gosterir.',
    primaryAction: 'Araci ilana cikar',
    secondaryAction: 'Ekspertiz baslat'
  },
  {
    id: 'garage-obd-setup',
    route: 'ObdConnection',
    title: 'OBD baglantisi',
    purpose: 'Bluetooth veya Wi-Fi OBD adaptorlerini kesfetme ve baglama yuzeyi.',
    primaryAction: 'Cihaz tara',
    secondaryAction: 'Manuel baglanti'
  },
  {
    id: 'garage-expertise',
    route: 'ExpertiseDriveTest',
    title: 'OBD ekspertiz',
    purpose: '10 dakikalik surus testi ve rapor olusturma akisidir.',
    primaryAction: 'Testi baslat',
    secondaryAction: 'Daha sonra'
  },
  {
    id: 'garage-expertise-report',
    route: 'ExpertiseReport',
    title: 'Ekspertiz raporu',
    purpose: 'Saglik puani, DTC, sensore dayali analiz ve yakinlastirma gorunumu.',
    primaryAction: 'PDF gor',
    secondaryAction: 'Paylas'
  }
] as const;
