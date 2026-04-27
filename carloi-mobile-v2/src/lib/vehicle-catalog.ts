export type VehicleCatalogType =
  | 'Otomobil'
  | 'SUV'
  | 'Ticari arac'
  | 'Minibus'
  | 'Otobus'
  | 'Karavan'
  | 'Pick-up'
  | 'Motosiklet'
  | 'ATV'
  | 'UTV'
  | 'Tir'
  | 'Cekici'
  | 'Kamyon'
  | 'Kamyonet'
  | 'Is makinesi'
  | 'Kepce'
  | 'Forklift'
  | 'Traktor'
  | 'Tekne'
  | 'Yat'
  | 'Jet ski'
  | 'Diger';

export interface VehicleCatalogModel {
  name: string;
  packages: string[];
  engineOptions: string[];
  fuels: string[];
  gearboxes: string[];
  equipmentOptions: string[];
}

export interface VehicleCatalogBrand {
  name: string;
  models: VehicleCatalogModel[];
}

export interface VehicleCatalogCategory {
  type: VehicleCatalogType;
  brands: VehicleCatalogBrand[];
}

function model(
  name: string,
  packages: string[],
  engineOptions: string[],
  fuels: string[],
  gearboxes: string[],
  equipmentOptions: string[],
): VehicleCatalogModel {
  return { name, packages, engineOptions, fuels, gearboxes, equipmentOptions };
}

export const vehicleTypeOptions: VehicleCatalogType[] = [
  'Otomobil',
  'SUV',
  'Ticari arac',
  'Minibus',
  'Otobus',
  'Karavan',
  'Pick-up',
  'Motosiklet',
  'ATV',
  'UTV',
  'Tir',
  'Cekici',
  'Kamyon',
  'Kamyonet',
  'Is makinesi',
  'Kepce',
  'Forklift',
  'Traktor',
  'Tekne',
  'Yat',
  'Jet ski',
  'Diger',
];

export const vehicleCatalog: VehicleCatalogCategory[] = [
  {
    type: 'Otomobil',
    brands: [
      {
        name: 'Volkswagen',
        models: [
          model('Golf', ['Life', 'Style', 'R-Line'], ['1.0 eTSI', '1.5 eTSI', '2.0 TDI'], ['Benzin', 'Dizel', 'Hibrit'], ['Manuel', 'DSG'], ['Cam tavan', 'Adaptif cruise', 'LED matrix']),
          model('Passat', ['Business', 'Elegance'], ['1.5 eTSI', '2.0 TDI'], ['Benzin', 'Dizel'], ['DSG'], ['Deri koltuk', '360 kamera', 'Isitmali koltuk']),
        ],
      },
      {
        name: 'BMW',
        models: [
          model('3 Serisi', ['Sport Line', 'Luxury', 'M Sport'], ['320i', '320d', '330e'], ['Benzin', 'Dizel', 'Plug-in hibrit'], ['Otomatik'], ['Head-up display', 'Harman Kardon', 'Adaptif surus']),
          model('5 Serisi', ['Executive', 'Luxury', 'M Sport'], ['520i', '520d', '530e'], ['Benzin', 'Dizel', 'Plug-in hibrit'], ['Otomatik'], ['Masajli koltuk', 'Panoramik cam tavan', 'Arka yonlendirme']),
        ],
      },
      {
        name: 'Renault',
        models: [
          model('Clio', ['Evolution', 'Techno', 'Esprit Alpine'], ['1.0 TCe', '1.5 Blue dCi'], ['Benzin', 'Dizel'], ['Manuel', 'EDC'], ['Geri gorus kamerasi', 'CarPlay', 'Anahtarsiz giris']),
          model('Megane', ['Touch', 'Icon', 'RS Line'], ['1.3 TCe', '1.5 Blue dCi'], ['Benzin', 'Dizel'], ['Manuel', 'EDC'], ['Adaptif hiz sabitleyici', 'Kablosuz sarj', 'Tam dijital ekran']),
        ],
      },
    ],
  },
  {
    type: 'SUV',
    brands: [
      {
        name: 'Toyota',
        models: [
          model('C-HR', ['Flame', 'Passion', 'X-Pack'], ['1.8 Hybrid', '2.0 Hybrid'], ['Hibrit'], ['e-CVT'], ['JBL ses sistemi', 'Korner kamera', 'Akilli park']),
          model('RAV4', ['Flame', 'Passion X-Pack'], ['2.5 Hybrid'], ['Hibrit'], ['e-CVT'], ['Elektrikli bagaj', '4x4', '360 kamera']),
        ],
      },
      {
        name: 'Peugeot',
        models: [
          model('2008', ['Active', 'Allure', 'GT'], ['1.2 PureTech', '1.5 BlueHDi', 'E-2008'], ['Benzin', 'Dizel', 'Elektrik'], ['Manuel', 'EAT8'], ['Alcantara koltuk', 'Kablosuz CarPlay', 'Panoramik tavan']),
          model('3008', ['Active Prime', 'Allure', 'GT'], ['1.2 PureTech', '1.5 BlueHDi'], ['Benzin', 'Dizel'], ['EAT8'], ['Gece gorusu', 'Focal ses sistemi', 'Grip Control']),
        ],
      },
    ],
  },
  {
    type: 'Ticari arac',
    brands: [
      {
        name: 'Ford',
        models: [
          model('Transit Custom', ['Trend', 'Titanium'], ['2.0 EcoBlue'], ['Dizel'], ['Manuel', 'Otomatik'], ['Kayar kapi', 'Arka kamera', 'Yuk bolmesi kaplamasi']),
          model('Courier', ['Deluxe', 'Titanium'], ['1.5 EcoBlue', '1.0 EcoBoost'], ['Dizel', 'Benzin'], ['Manuel', 'Otomatik'], ['Multimedya ekran', 'Hiz sabitleyici', 'Tavan raf']),
        ],
      },
      {
        name: 'Fiat',
        models: [
          model('Ducato', ['Business', 'Maxi'], ['2.2 Multijet'], ['Dizel'], ['Manuel'], ['Cift surgu kapi', 'Kabin izolasyonu', 'Geri gorus kamerasi']),
          model('Doblo Cargo', ['Easy', 'Premio'], ['1.6 Multijet'], ['Dizel'], ['Manuel'], ['Tavan bagaj', 'Bluetooth', 'Park sensoru']),
        ],
      },
    ],
  },
  {
    type: 'Minibus',
    brands: [
      {
        name: 'Mercedes-Benz',
        models: [
          model('Sprinter Minibus', ['Tourer', 'VIP'], ['2.0 CDI'], ['Dizel'], ['Otomatik', 'Manuel'], ['Yolcu klima', 'Tavan TV', 'VIP koltuk']),
        ],
      },
      {
        name: 'Volkswagen',
        models: [
          model('Crafter Minibus', ['School', 'Tour'], ['2.0 TDI'], ['Dizel'], ['Manuel', 'Otomatik'], ['Seyahat koltugu', 'Ek bagaj', 'Tavan klima']),
        ],
      },
    ],
  },
  {
    type: 'Otobus',
    brands: [
      {
        name: 'Temsa',
        models: [
          model('Prestij', ['City', 'Tour'], ['4.5L'], ['Dizel'], ['Otomatik', 'Manuel'], ['Bagaj kapasitesi', 'Hostes koltugu', 'Klima']),
        ],
      },
      {
        name: 'Otokar',
        models: [
          model('Sultan', ['Mega', 'Comfort'], ['Cummins 6.7'], ['Dizel'], ['Manuel', 'Otomatik'], ['Engelli rampasi', 'Yolcu bilgilendirme', 'Kamera seti']),
        ],
      },
    ],
  },
  {
    type: 'Karavan',
    brands: [
      {
        name: 'Hymer',
        models: [
          model('B-Class', ['Premium'], ['2.2 Diesel'], ['Dizel'], ['Otomatik'], ['Gunes paneli', 'Dus kabini', 'Mutfak modulu']),
        ],
      },
      {
        name: 'Roller Team',
        models: [
          model('Kronos', ['Advance'], ['2.3 Multijet'], ['Dizel'], ['Otomatik', 'Manuel'], ['Tente', 'Bisiklet tasiyici', 'Harici dus']),
        ],
      },
    ],
  },
  {
    type: 'Pick-up',
    brands: [
      {
        name: 'Toyota',
        models: [
          model('Hilux', ['Hi-Cruiser', 'Adventure'], ['2.4 D-4D', '2.8 D-4D'], ['Dizel'], ['Manuel', 'Otomatik'], ['4x4', 'Rulo kapak', 'Ceki demiri']),
        ],
      },
      {
        name: 'Isuzu',
        models: [
          model('D-Max', ['V-Cross', 'Hi-Ride'], ['1.9 Ddi'], ['Dizel'], ['Manuel', 'Otomatik'], ['Arazı modu', 'Kasa havuzu', 'Yan basamak']),
        ],
      },
    ],
  },
  {
    type: 'Motosiklet',
    brands: [
      {
        name: 'Yamaha',
        models: [
          model('MT-07', ['Standard'], ['689 cc'], ['Benzin'], ['Manuel'], ['ABS', 'Quick shifter', 'Koruma demiri']),
          model('NMAX', ['Connected'], ['155 cc'], ['Benzin'], ['CVT'], ['Akilli anahtar', 'Topcase', 'USB sarj']),
        ],
      },
      {
        name: 'Honda',
        models: [
          model('CBR500R', ['Standard'], ['471 cc'], ['Benzin'], ['Manuel'], ['ABS', 'Slipper clutch', 'Koruma takozi']),
          model('Forza 250', ['Deluxe'], ['250 cc'], ['Benzin'], ['CVT'], ['Akilli anahtar', 'Topcase', 'Elcik koruma']),
        ],
      },
    ],
  },
  {
    type: 'ATV',
    brands: [
      {
        name: 'CFMoto',
        models: [
          model('CForce 520', ['EPS'], ['495 cc'], ['Benzin'], ['CVT'], ['Vinç', 'Arka canta', 'Led aydinlatma']),
        ],
      },
      {
        name: 'Can-Am',
        models: [
          model('Outlander 570', ['XT'], ['570 cc'], ['Benzin'], ['CVT'], ['Winch', 'Koruma plakasi', 'Römork topuzu']),
        ],
      },
    ],
  },
  {
    type: 'UTV',
    brands: [
      {
        name: 'Polaris',
        models: [
          model('Ranger 1000', ['EPS'], ['999 cc'], ['Benzin'], ['CVT'], ['Tavan', 'On cam', 'Yuk kasasi']),
        ],
      },
      {
        name: 'Can-Am',
        models: [
          model('Defender', ['DPS'], ['976 cc'], ['Benzin'], ['CVT'], ['Cam silecek', 'Kapilar', 'Vinç']),
        ],
      },
    ],
  },
  {
    type: 'Tir',
    brands: [
      {
        name: 'Volvo',
        models: [
          model('FH', ['Globetrotter'], ['460 HP', '500 HP'], ['Dizel'], ['I-Shift'], ['Retarder', 'Yatakli kabin', 'Telematik']),
        ],
      },
      {
        name: 'Scania',
        models: [
          model('R Series', ['Highline'], ['450 HP', '500 HP'], ['Dizel'], ['Opticruise'], ['Buzdolabi', 'Retarder', 'Arac takip']),
        ],
      },
    ],
  },
  {
    type: 'Cekici',
    brands: [
      {
        name: 'Mercedes-Benz',
        models: [
          model('Actros', ['LS'], ['480 HP'], ['Dizel'], ['PowerShift'], ['Retarder', 'Kabin isitma', 'Arac takip']),
        ],
      },
      {
        name: 'MAN',
        models: [
          model('TGX', ['EfficientLine'], ['470 HP'], ['Dizel'], ['TipMatic'], ['Line assist', 'Retarder', 'Yatakli kabin']),
        ],
      },
    ],
  },
  {
    type: 'Kamyon',
    brands: [
      {
        name: 'Isuzu',
        models: [
          model('NPR', ['Long'], ['190 HP'], ['Dizel'], ['Manuel'], ['Lift', 'Kapali kasa', 'Geri gorus kamerasi']),
        ],
      },
      {
        name: 'Ford Trucks',
        models: [
          model('1833 DC', ['Tipper'], ['330 HP'], ['Dizel'], ['Manuel'], ['Damper', 'Asiri yuk sensoru', 'PTO']),
        ],
      },
    ],
  },
  {
    type: 'Kamyonet',
    brands: [
      {
        name: 'Volkswagen',
        models: [
          model('Transporter', ['Camli Van', 'Panelvan'], ['2.0 TDI'], ['Dizel'], ['Manuel', 'DSG'], ['Arka klima', 'Yan basamak', 'Kamera']),
        ],
      },
      {
        name: 'Peugeot',
        models: [
          model('Expert', ['Plus', 'Premium'], ['2.0 BlueHDi'], ['Dizel'], ['Manuel', 'Otomatik'], ['Kaplamali zemin', 'Multimedya ekran', 'Hiz sabitleyici']),
        ],
      },
    ],
  },
  {
    type: 'Is makinesi',
    brands: [
      {
        name: 'Caterpillar',
        models: [
          model('320 GC', ['Standard'], ['Cat C4.4'], ['Dizel'], ['Otomatik'], ['GPS hazirlik', 'Kova seti', 'Hizli baglanti']),
        ],
      },
      {
        name: 'Komatsu',
        models: [
          model('PC210', ['Standard'], ['SAA6D107E'], ['Dizel'], ['Otomatik'], ['Telematik', 'Kirikici hatti', 'Kamera']),
        ],
      },
    ],
  },
  {
    type: 'Kepce',
    brands: [
      {
        name: 'JCB',
        models: [
          model('3CX', ['Eco'], ['81 kW'], ['Dizel'], ['Powershift'], ['On kova', 'Arka kazici', 'Klima']),
        ],
      },
      {
        name: 'Hidromek',
        models: [
          model('HMK 102B', ['Alpha'], ['100 HP'], ['Dizel'], ['Otomatik'], ['Kazici ekipman', 'Hidrolik kilit', 'Kamera']),
        ],
      },
    ],
  },
  {
    type: 'Forklift',
    brands: [
      {
        name: 'Toyota',
        models: [
          model('8FG', ['3 Ton'], ['2.4 LPG'], ['LPG', 'Dizel'], ['Otomatik'], ['Yan kaydirici', 'Kapali kabin', 'Mast kamera']),
        ],
      },
      {
        name: 'Jungheinrich',
        models: [
          model('EFG', ['Electric'], ['48V'], ['Elektrik'], ['Otomatik'], ['Yan kaydirici', 'Soguk hava paketi', 'Ek catallar']),
        ],
      },
    ],
  },
  {
    type: 'Traktor',
    brands: [
      {
        name: 'New Holland',
        models: [
          model('TT50', ['4WD', '2WD'], ['50 HP'], ['Dizel'], ['Manuel'], ['Kabin', 'On agirlik', 'PTO']),
        ],
      },
      {
        name: 'Massey Ferguson',
        models: [
          model('240S', ['Standard'], ['50 HP'], ['Dizel'], ['Manuel'], ['Rops', 'Ceki demiri', 'Agirlik seti']),
        ],
      },
    ],
  },
  {
    type: 'Tekne',
    brands: [
      {
        name: 'Quicksilver',
        models: [
          model('Activ 605', ['Open'], ['115 HP'], ['Benzin'], ['Distan takma'], ['Bimini', 'Balikci ekipmani', 'Muzik sistemi']),
        ],
      },
      {
        name: 'Safter',
        models: [
          model('750', ['Cabin'], ['200 HP'], ['Benzin'], ['Distan takma'], ['Kamarali', 'GPS', 'Can yelek seti']),
        ],
      },
    ],
  },
  {
    type: 'Yat',
    brands: [
      {
        name: 'Azimut',
        models: [
          model('50 Fly', ['Premium'], ['2 x 550 HP'], ['Dizel'], ['Otomatik'], ['Flybridge', 'Jeneratör', 'Stabilizer']),
        ],
      },
      {
        name: 'Princess',
        models: [
          model('F45', ['Luxury'], ['2 x 480 HP'], ['Dizel'], ['Otomatik'], ['Tender garaj', 'Watermaker', 'Uydu TV']),
        ],
      },
    ],
  },
  {
    type: 'Jet ski',
    brands: [
      {
        name: 'Sea-Doo',
        models: [
          model('GTI SE', ['170'], ['1630 ACE'], ['Benzin'], ['Otomatik'], ['Audio paketi', 'Step wedge', 'Römork']),
        ],
      },
      {
        name: 'Yamaha',
        models: [
          model('FX Cruiser', ['HO'], ['1812 cc'], ['Benzin'], ['Otomatik'], ['Cruise control', 'Audio', 'Cover']),
        ],
      },
    ],
  },
  {
    type: 'Diger',
    brands: [
      {
        name: 'Genel',
        models: [
          model('Ozel arac', ['Standart'], ['Belirtilmedi'], ['Belirtilmedi'], ['Belirtilmedi'], ['Ozel ekipman', 'Kurumsal kaplama', 'Ek belge']),
        ],
      },
    ],
  },
];
