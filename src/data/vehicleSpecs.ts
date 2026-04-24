export interface VehiclePackageSpec {
  name: string;
  years: string[];
  engines: string[];
  equipment: string[];
}

export interface VerifiedVehicleSpec {
  brand: string;
  model: string;
  years: string[];
  aliases?: string[];
  packages: VehiclePackageSpec[];
}

const yearRange = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => String(start + index));

const unique = <T,>(items: T[]) => items.filter((item, index) => items.indexOf(item) === index);

function normalizeLookup(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0131\u0130]/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const corollaBaseEquipment = [
  'Toyota Safety Sense 3',
  'Geri görüş kamerası',
  'Kablosuz Apple CarPlay / Android Auto',
  '8 inç multimedya ekranı',
];

const corollaUpperEquipment = [
  ...corollaBaseEquipment,
  'Çift bölgeli otomatik klima',
  'Kablosuz şarj ünitesi',
];

const corollaHybridEquipment = [
  'Toyota Safety Sense 3',
  'Çift bölgeli otomatik klima',
  'Kablosuz Apple CarPlay / Android Auto',
  'Geri görüş kamerası',
];

const corollaHybridUpperEquipment = [
  ...corollaHybridEquipment,
  'Kablosuz şarj ünitesi',
  'Nanoe X hava kalitesi sistemi',
];

const yarisBaseEquipment = [
  'Toyota Safety Sense',
  'e-Call acil çağrı sistemi',
  'ISOFIX',
  'Kablosuz Apple CarPlay / Android Auto',
];

const yarisPremiumEquipment = [
  ...yarisBaseEquipment,
  '10,5 inç multimedya ekranı',
  '12,3 inç dijital gösterge',
  'Kablosuz şarj',
];

const poloBaseEquipment = [
  'Dijital kokpit',
  'LED aydınlatma',
  'App-Connect',
  'Front Assist',
];

const poloUpperEquipment = [
  ...poloBaseEquipment,
  'Travel Assist',
  'Alüminyum alaşımlı jant',
];

const golfBaseEquipment = [
  '10,3 inç Composition Media Plus',
  'App-Connect',
  'Adaptif hız sabitleyici',
  'Sürüş asistan sistemleri',
];

const golfUpperEquipment = [
  ...golfBaseEquipment,
  '3 bölgeli Climatronic',
  'Kablosuz bağlantı arayüzü',
];

const scalaBaseEquipment = [
  'Yaya algılama özellikli ön bölge frenleme asistanı',
  'Şerit takip sistemi',
  'Sürücü yorgunluk tespit sistemi',
  'Bi-LED ön far grubu',
  '8 inç dijital gösterge paneli',
  '8,25 inç dokunmatik multimedya sistemi',
  'Kablosuz SmartLink',
];

const octaviaBaseEquipment = [
  'Elektrikli, ısıtmalı ve katlanır yan aynalar',
  'Ön ve arka park sensörü',
  'LED ön far grubu',
  'Yağmur ve far sensörü',
  '10 inç dokunmatik multimedya sistemi',
  '10,25 inç dijital gösterge paneli',
  'Çift bölgeli otomatik klima',
];

const corsaEditionEquipment = [
  'LED farlar',
  'Multimedya ekranı',
  'Opel Vizor ön tasarım',
  'Sürüş destek sistemleri',
];

const corsaGsEquipment = [
  '16 inç elmas kesim alaşım jant',
  'Kör nokta uyarı sistemi',
  '130 derecelik geri görüş kamerası',
  'Ön ve arka park sensörü',
  'Elektronik iklim kontrollü klima',
  '10 inç multimedya ekranı',
  'Kablosuz Apple CarPlay / Android Auto',
];

const mokkaEditionEquipment = [
  'Opel Pure Panel kokpit',
  'LED farlar',
  'Kablosuz Apple CarPlay / Android Auto',
  'Sürüş destek sistemleri',
];

const mokkaGsEquipment = [
  ...mokkaEditionEquipment,
  'Intelli-Lux LED Matrix far',
  'Gelişmiş destek sistemleri',
];

const astraGsEquipment = [
  'Opel Vizor ön tasarım',
  'Pure Panel kokpit',
  'Intelli-Lux LED Pixel far',
  'Geniş ekranlı bilgi-eğlence sistemi',
];

const civicBaseEquipment = [
  'Honda SENSING',
  'Geri görüş kamerası',
  'Kablosuz Apple CarPlay / Android Auto',
  'Dijital gösterge paneli',
];

const civicUpperEquipment = [
  ...civicBaseEquipment,
  'Sunroof',
  'Trafik işareti tanıma sistemi',
];

const peugeot2008AllureEquipment = [
  'PEUGEOT i-Cockpit',
  'LED ön farlar',
  'Sürüş destek sistemleri',
  '10 inç multimedya ekranı',
];

const peugeot2008GtEquipment = [
  ...peugeot2008AllureEquipment,
  'PEUGEOT Matrix LED ön farlar',
  '360 derece park desteği',
  'Kör nokta uyarı sistemi',
];

const peugeot308AllureEquipment = [
  'PEUGEOT i-Cockpit',
  'LED ön farlar',
  'Kablosuz Apple CarPlay / Android Auto',
  'Sürüş destek sistemleri',
];

const peugeot308GtEquipment = [
  ...peugeot308AllureEquipment,
  'PEUGEOT Matrix LED ön farlar',
  'Adaptif cruise control',
  'Kör nokta uyarı sistemi',
];

const chrBaseEquipment = [
  'Toyota Safety Sense 3',
  '12,3 inç dijital gösterge',
  '12,3 inç Toyota Touch multimedya',
  'Kablosuz şarj ünitesi',
];

const chrUpperEquipment = [
  ...chrBaseEquipment,
  'Panoramik cam tavan',
  'JBL premium ses sistemi',
];

const rav4Equipment = [
  'Toyota Safety Sense',
  '4x4 hibrit sürüş sistemi',
  'Geri görüş kamerası',
  'Elektrikli bagaj kapağı',
];

const capturBaseEquipment = [
  '10,4 inç openR link multimedya',
  'Google entegre bağlantılı hizmetler',
  'Kaydırılabilen arka koltuklar',
  'Sürüş destek sistemleri',
];

const capturUpperEquipment = [
  ...capturBaseEquipment,
  'Esprit Alpine tasarım paketi',
  'Özel iç trim detayları',
];

const hrvBaseEquipment = [
  'Honda SENSING',
  '18 inç alüminyum alaşımlı jant',
  'LED farlar',
  'Çok açılı geri görüş kamerası',
  '9 inç dokunmatik ekran',
  'Kablosuz Apple CarPlay',
  'Sihirli Koltuklar',
];

const hrvAdvanceEquipment = [
  ...hrvBaseEquipment,
  'Isıtmalı direksiyon',
  'Arka çapraz trafik uyarısı',
  'Kör nokta bilgi sistemi',
];

const peugeot408AllureEquipment = [
  'PEUGEOT i-Cockpit',
  'LED ön farlar',
  '10 inç multimedya ekranı',
  'Sürüş destek sistemleri',
];

const peugeot408GtEquipment = [
  ...peugeot408AllureEquipment,
  'Matrix LED ön farlar',
  'Adaptif hız sabitleyici',
  'Kör nokta uyarı sistemi',
];

const australTechnoEquipment = [
  '19 inç Komah elmas kesim alaşım jant',
  'Adaptif hız sabitleme sistemi',
  'Kör nokta uyarı sistemi',
  'Hava temizleyici',
  '12 inç openR link multimedya sistemi',
];

const australEspritEquipment = [
  ...australTechnoEquipment,
  '20 inç Altitude siyah elmas kesim jant',
  'Esprit Alpine tasarım paketi',
  'Dijital geri görüş kamerası',
  'Kablosuz şarj',
];

export const verifiedVehicleSpecs: VerifiedVehicleSpec[] = [
  {
    brand: 'Fiat',
    model: 'Egea',
    aliases: ['Egea Sedan', 'Egea Cross', 'Tipo'],
    years: yearRange(2016, 2026),
    packages: [
      {
        name: 'Easy',
        years: yearRange(2016, 2021),
        engines: ['1.4 Fire 95', '1.4 Fire LPG', '1.3 Multijet 95', '1.6 Multijet 120'],
        equipment: [
          'ABS',
          'ESP',
          'Yokuş kalkış desteği',
          'Manuel klima',
          'Yol bilgisayarı',
          'Elektrikli ön camlar',
          'USB / Bluetooth multimedya',
        ],
      },
      {
        name: 'Easy Plus',
        years: yearRange(2018, 2021),
        engines: ['1.4 Fire 95', '1.4 Fire LPG', '1.3 Multijet 95', '1.6 Multijet 120'],
        equipment: [
          '7 inç ekran',
          'Geri görüş kamerası',
          'Hız sabitleyici',
          'Arka park sensörü',
          'Elektrikli arka camlar',
        ],
      },
      {
        name: 'Urban',
        years: yearRange(2016, 2021),
        engines: ['1.4 Fire 95', '1.4 Fire LPG', '1.3 Multijet 95', '1.6 Multijet 120'],
        equipment: [
          '16 inç alaşım jant',
          'Otomatik klima',
          'Hız sabitleyici',
          'Arka park sensörü',
          'Dokunmatik multimedya ekranı',
        ],
      },
      {
        name: 'Lounge',
        years: yearRange(2016, 2021),
        engines: ['1.4 Fire 95', '1.6 e-Torq 110 AT', '1.6 Multijet 120'],
        equipment: [
          'Anahtarsız giriş',
          'Yağmur ve far sensörü',
          'Geri görüş kamerası',
          'Krom dış detaylar',
          'Çift bölgeli dijital klima',
        ],
      },
      {
        name: 'Mirror',
        years: yearRange(2017, 2021),
        engines: ['1.4 Fire 95', '1.3 Multijet 95', '1.6 Multijet 120'],
        equipment: [
          'Apple CarPlay',
          'Android Auto',
          'Parlak mavi dış detaylar',
          '16 inç alaşım jant',
          'Arka park sensörü',
        ],
      },
      {
        name: 'Street',
        years: yearRange(2020, 2022),
        engines: ['1.4 Fire 95', '1.4 Fire LPG', '1.3 Multijet 95'],
        equipment: [
          'Siyah tavan rayı görünümü',
          'Karartılmış dış detaylar',
          'Dokunmatik ekran',
          'Arka park sensörü',
          'Hız sabitleyici',
        ],
      },
      {
        name: 'Cross',
        years: yearRange(2021, 2026),
        engines: ['1.0 Firefly 100', '1.3 Multijet 95', '1.6 Multijet 130', '1.5 Hybrid 130'],
        equipment: [
          'Yükseltilmiş gövde',
          'LED gündüz farı',
          'Kablosuz Apple CarPlay / Android Auto',
          'Geri görüş kamerası',
          'Şerit takip desteği',
        ],
      },
      {
        name: 'Limited',
        years: yearRange(2022, 2026),
        engines: ['1.0 Firefly 100', '1.6 Multijet 130', '1.5 Hybrid 130'],
        equipment: [
          '17 inç alaşım jant',
          'Anahtarsız çalıştırma',
          'Adaptif hız sabitleyici',
          'Kablosuz şarj',
          'Kör nokta uyarısı',
        ],
      },
    ],
  },
  {
    brand: 'Renault',
    model: 'Clio',
    aliases: ['Yeni Clio', 'Clio Full Hybrid E-Tech'],
    years: ['2026'],
    packages: [
      {
        name: 'Evolution Plus',
        years: ['2026'],
        engines: ['1.2 TCe 115 EDC'],
        equipment: [
          'Adaptif hız sabitleyici',
          '10,1 inç multimedya sistemi',
          'Anahtarsız giriş ve çalıştırma',
          'Elektrikli park freni',
        ],
      },
      {
        name: 'Esprit Alpine',
        years: ['2026'],
        engines: ['1.2 TCe 115 EDC'],
        equipment: [
          '10,1 inç dijital gösterge ekranı',
          '18 inç Cosmic alüminyum jant',
          'Ön, arka ve yan park sensörleri',
          'Kablosuz şarj',
        ],
      },
    ],
  },
  {
    brand: 'Renault',
    model: 'Megane',
    aliases: ['Megane Sedan', 'Yeni Megane Sedan'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Touch',
        years: ['2025', '2026'],
        engines: ['1.3 TCe EDC 140'],
        equipment: [
          'Tek dokunuşla açılan elektrikli ön ve arka camlar',
          'Arka koltuk sırtlığı 1/3-2/3 katlanma',
          'Hız ayar ve sınırlayıcı',
          'LED gündüz farları',
        ],
      },
      {
        name: 'Icon',
        years: ['2025', '2026'],
        engines: ['1.3 TCe EDC 140', '1.5 Blue dCi EDC 115'],
        equipment: [
          'Elektrikli açılır panoramik cam tavan',
          'Krom dış tasarım detayları',
          'Yeni jant tasarımı',
          'C şeklinde LED ışık imzası',
        ],
      },
    ],
  },
  {
    brand: 'Toyota',
    model: 'Corolla',
    aliases: ['Corolla Sedan'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Vision Plus',
        years: ['2025', '2026'],
        engines: ['1.5 Multidrive S 125'],
        equipment: corollaBaseEquipment,
      },
      {
        name: 'Dream',
        years: ['2025', '2026'],
        engines: ['1.5 Multidrive S 125'],
        equipment: corollaBaseEquipment,
      },
      {
        name: 'Dream X-Pack',
        years: ['2025', '2026'],
        engines: ['1.5 Multidrive S 125'],
        equipment: corollaUpperEquipment,
      },
      {
        name: 'Flame X-Pack',
        years: ['2025', '2026'],
        engines: ['1.5 Multidrive S 125'],
        equipment: corollaUpperEquipment,
      },
      {
        name: 'Passion X-Pack',
        years: ['2025', '2026'],
        engines: ['1.5 Multidrive S 125'],
        equipment: corollaUpperEquipment,
      },
      {
        name: 'Hybrid Dream',
        years: ['2025', '2026'],
        engines: ['1.8 Hybrid e-CVT 140'],
        equipment: corollaHybridEquipment,
      },
      {
        name: 'Hybrid Dream X-Pack',
        years: ['2025', '2026'],
        engines: ['1.8 Hybrid e-CVT 140'],
        equipment: corollaHybridEquipment,
      },
      {
        name: 'Hybrid Flame X-Pack',
        years: ['2025', '2026'],
        engines: ['1.8 Hybrid e-CVT 140'],
        equipment: corollaHybridUpperEquipment,
      },
      {
        name: 'Hybrid Passion X-Pack',
        years: ['2025', '2026'],
        engines: ['1.8 Hybrid e-CVT 140'],
        equipment: corollaHybridUpperEquipment,
      },
    ],
  },
  {
    brand: 'Toyota',
    model: 'Yaris',
    aliases: ['Yaris Hybrid'],
    years: ['2026'],
    packages: [
      {
        name: 'Hybrid Flame',
        years: ['2026'],
        engines: ['1.5 Hybrid 116 HP e-CVT', '1.5 Hybrid 130 HP e-CVT'],
        equipment: yarisBaseEquipment,
      },
      {
        name: 'Hybrid Passion X-Pack',
        years: ['2026'],
        engines: ['1.5 Hybrid 116 HP e-CVT', '1.5 Hybrid 130 HP e-CVT'],
        equipment: yarisPremiumEquipment,
      },
    ],
  },
  {
    brand: 'Hyundai',
    model: 'i20',
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Jump',
        years: ['2025'],
        engines: ['1.0 T-GDI 100 DCT'],
        equipment: [],
      },
      {
        name: 'Style',
        years: ['2025'],
        engines: ['1.0 T-GDI 100 DCT'],
        equipment: [],
      },
      {
        name: 'Jump',
        years: ['2026'],
        engines: ['1.0 T-GDI 100 MT', '1.0 T-GDI 100 DCT'],
        equipment: [],
      },
      {
        name: 'Style',
        years: ['2026'],
        engines: ['1.0 T-GDI 100 DCT'],
        equipment: [],
      },
      {
        name: 'Elite',
        years: ['2026'],
        engines: ['1.0 T-GDI 100 DCT'],
        equipment: [],
      },
    ],
  },
  {
    brand: 'Hyundai',
    model: 'Tucson',
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Comfort',
        years: ['2025', '2026'],
        engines: ['1.6 T-GDI 4x2 DCT'],
        equipment: [],
      },
      {
        name: 'Prime',
        years: ['2025'],
        engines: ['1.6 CRDi 136 PS 4x2 DCT'],
        equipment: [],
      },
      {
        name: 'Prime Plus',
        years: ['2025'],
        engines: ['1.6 T-GDI 4x2 DCT'],
        equipment: [],
      },
      {
        name: 'Prime',
        years: ['2026'],
        engines: ['1.6 T-GDI 4x2 DCT'],
        equipment: [],
      },
      {
        name: 'Elite',
        years: ['2025'],
        engines: [
          '1.6 T-GDI 160 PS 4x2 DCT',
          '1.6 T-GDI 180 PS 4x2 DCT',
          '1.6 CRDi 4x2 DCT',
          '1.6 T-GDI HEV 215 PS 4x2 AT',
        ],
        equipment: [],
      },
      {
        name: 'Elite Plus',
        years: ['2025'],
        engines: [
          '1.6 T-GDI 160 PS 4x4 DCT',
          '1.6 T-GDI 180 PS 4x4 DCT',
          '1.6 CRDi 4x4 DCT',
        ],
        equipment: [],
      },
      {
        name: 'Elite',
        years: ['2026'],
        engines: ['1.6 T-GDI 4x2 DCT'],
        equipment: [],
      },
      {
        name: 'Elite Plus',
        years: ['2026'],
        engines: ['1.6 T-GDI 4x4 DCT'],
        equipment: [],
      },
    ],
  },
  {
    brand: 'Volkswagen',
    model: 'Polo',
    aliases: ['Yeni Polo'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Impression',
        years: ['2025', '2026'],
        engines: ['1.0 MPI 80', '1.0 TSI 95'],
        equipment: poloBaseEquipment,
      },
      {
        name: 'Life',
        years: ['2025', '2026'],
        engines: ['1.0 TSI 95'],
        equipment: poloUpperEquipment,
      },
      {
        name: 'Style',
        years: ['2025', '2026'],
        engines: ['1.0 TSI 95'],
        equipment: [
          ...poloUpperEquipment,
          'IQ.LIGHT - LED Matrix farlar',
        ],
      },
    ],
  },
  {
    brand: 'Volkswagen',
    model: 'Golf',
    aliases: ['Yeni Golf'],
    years: ['2026'],
    packages: [
      {
        name: 'Impression',
        years: ['2026'],
        engines: ['1.5 TSI 116', '1.5 eTSI 116'],
        equipment: golfBaseEquipment,
      },
      {
        name: 'Life',
        years: ['2026'],
        engines: ['1.5 eTSI 116', '1.5 eTSI 150'],
        equipment: golfBaseEquipment,
      },
      {
        name: 'Style',
        years: ['2026'],
        engines: ['1.5 eTSI 150'],
        equipment: golfUpperEquipment,
      },
      {
        name: 'R-Line',
        years: ['2026'],
        engines: ['1.5 eTSI 150'],
        equipment: [
          ...golfUpperEquipment,
          'Sportif R-Line tasarım detayları',
        ],
      },
    ],
  },
  {
    brand: 'Skoda',
    model: 'Scala',
    aliases: ['Škoda Scala'],
    years: ['2026'],
    packages: [
      {
        name: 'Elite',
        years: ['2026'],
        engines: ['1.0 TSI 115 PS DSG', '1.5 TSI 150 PS DSG'],
        equipment: scalaBaseEquipment,
      },
      {
        name: 'Premium',
        years: ['2026'],
        engines: ['1.0 TSI 115 PS DSG', '1.5 TSI 150 PS DSG'],
        equipment: [
          ...scalaBaseEquipment,
          'Geri görüş kamerası',
          'Çift bölgeli klima',
        ],
      },
      {
        name: 'Monte Carlo',
        years: ['2026'],
        engines: ['1.0 TSI 115 PS DSG', '1.5 TSI 150 PS DSG'],
        equipment: [
          ...scalaBaseEquipment,
          'Monte Carlo tasarım paketi',
          'Sportif dış detaylar',
        ],
      },
    ],
  },
  {
    brand: 'Skoda',
    model: 'Octavia',
    aliases: ['Škoda Octavia', 'Octavia Combi'],
    years: ['2026'],
    packages: [
      {
        name: 'Elite',
        years: ['2026'],
        engines: ['1.5 TSI mHEV 150 PS DSG'],
        equipment: octaviaBaseEquipment,
      },
      {
        name: 'Premium',
        years: ['2026'],
        engines: ['1.5 TSI mHEV 150 PS DSG'],
        equipment: [
          ...octaviaBaseEquipment,
          '17 inç alaşım jant',
          'Sürüş mod seçimi',
        ],
      },
      {
        name: 'Prestige',
        years: ['2026'],
        engines: ['1.5 TSI mHEV 150 PS DSG'],
        equipment: [
          ...octaviaBaseEquipment,
          'Elektrikli bagaj kapağı',
          'Isıtmalı ön koltuklar',
        ],
      },
      {
        name: 'Sportline',
        years: ['2026'],
        engines: ['1.5 TSI mHEV 150 PS DSG'],
        equipment: [
          ...octaviaBaseEquipment,
          'Sportline tasarım paketi',
          'Spor koltuklar',
        ],
      },
      {
        name: 'Combi Sportline',
        years: ['2026'],
        engines: ['1.5 TSI mHEV 150 PS DSG'],
        equipment: [
          ...octaviaBaseEquipment,
          'Combi gövde',
          'Tavan rayları',
        ],
      },
      {
        name: 'RS',
        years: ['2026'],
        engines: ['2.0 TSI 265 PS DSG'],
        equipment: [
          'RS tasarım paketi',
          'Spor koltuklar',
          'Adaptif sürüş karakteri',
          'Yüksek performans fren sistemi',
        ],
      },
      {
        name: 'Combi RS',
        years: ['2026'],
        engines: ['2.0 TSI 265 PS DSG'],
        equipment: [
          'RS tasarım paketi',
          'Combi gövde',
          'Adaptif sürüş karakteri',
          'Yüksek performans fren sistemi',
        ],
      },
    ],
  },
  {
    brand: 'Opel',
    model: 'Corsa',
    aliases: ['Yeni Corsa'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Edition',
        years: ['2025', '2026'],
        engines: ['1.2 100 HP MT6', '1.2 100 HP AT8', 'Hybrid 1.2 145 e-DCT6'],
        equipment: corsaEditionEquipment,
      },
      {
        name: 'GS',
        years: ['2025', '2026'],
        engines: ['1.2 100 HP AT8', 'Hybrid 1.2 145 e-DCT6'],
        equipment: corsaGsEquipment,
      },
    ],
  },
  {
    brand: 'Opel',
    model: 'Mokka',
    aliases: ['Yeni Mokka'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Edition',
        years: ['2025'],
        engines: ['1.2 130 HP AT8'],
        equipment: mokkaEditionEquipment,
      },
      {
        name: 'Edition',
        years: ['2026'],
        engines: ['1.2 136 HP MT6'],
        equipment: mokkaEditionEquipment,
      },
      {
        name: 'GS',
        years: ['2025', '2026'],
        engines: ['1.2 130 HP AT8', 'Hybrid 1.2 145 e-DCT6'],
        equipment: mokkaGsEquipment,
      },
    ],
  },
  {
    brand: 'Opel',
    model: 'Astra',
    aliases: ['Yeni Astra'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'GS',
        years: ['2025', '2026'],
        engines: ['1.2 130 HP AT8', '1.5 130 HP Dizel AT8'],
        equipment: astraGsEquipment,
      },
    ],
  },
  {
    brand: 'Honda',
    model: 'Civic',
    aliases: ['Civic Sedan', 'Yeni Civic Sedan'],
    years: ['2026'],
    packages: [
      {
        name: 'Elegance+',
        years: ['2026'],
        engines: ['1.5 VTEC Turbo Benzin Otomatik', '1.5 VTEC Turbo ECO Otomatik'],
        equipment: civicBaseEquipment,
      },
      {
        name: 'Executive+',
        years: ['2026'],
        engines: ['1.5 VTEC Turbo Benzin Otomatik', '1.5 VTEC Turbo ECO Otomatik'],
        equipment: civicUpperEquipment,
      },
      {
        name: 'Type R',
        years: ['2026'],
        engines: ['2.0 VTEC Turbo Benzin Manuel'],
        equipment: [
          'Type R performans paketi',
          'Spor koltuklar',
          'Adaptif amortisör sistemi',
          'Honda LogR',
        ],
      },
    ],
  },
  {
    brand: 'Peugeot',
    model: '2008',
    aliases: ['Yeni 2008', 'SUV 2008'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Allure',
        years: ['2025', '2026'],
        engines: ['1.2 Hybrid 145 e-DCS6'],
        equipment: peugeot2008AllureEquipment,
      },
      {
        name: 'GT',
        years: ['2025', '2026'],
        engines: ['1.2 Hybrid 145 e-DCS6'],
        equipment: peugeot2008GtEquipment,
      },
    ],
  },
  {
    brand: 'Peugeot',
    model: '308',
    aliases: ['Yeni 308', '308 HB'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Allure',
        years: ['2025', '2026'],
        engines: ['1.2 PureTech 130 EAT8'],
        equipment: peugeot308AllureEquipment,
      },
      {
        name: 'GT',
        years: ['2025', '2026'],
        engines: ['1.2 PureTech 130 EAT8'],
        equipment: peugeot308GtEquipment,
      },
    ],
  },
  {
    brand: 'Toyota',
    model: 'C-HR',
    aliases: ['Toyota C-HR', 'C-HR Hybrid', 'Toyota C-HR Hybrid'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Passion',
        years: ['2025', '2026'],
        engines: ['1.8 Hybrid e-CVT 140'],
        equipment: chrBaseEquipment,
      },
      {
        name: 'Passion X-Sport',
        years: ['2025', '2026'],
        engines: ['1.8 Hybrid e-CVT 140'],
        equipment: chrBaseEquipment,
      },
      {
        name: 'Passion X-Sport JBL',
        years: ['2025', '2026'],
        engines: ['1.8 Hybrid e-CVT 140'],
        equipment: chrUpperEquipment,
      },
      {
        name: 'GR SPORT',
        years: ['2025', '2026'],
        engines: ['1.8 Hybrid e-CVT 140'],
        equipment: [
          ...chrBaseEquipment,
          'GR SPORT tasarım detayları',
          'Sportif iç trim',
        ],
      },
    ],
  },
  {
    brand: 'Toyota',
    model: 'RAV4',
    aliases: ['RAV4 Hybrid'],
    years: ['2024', '2025', '2026'],
    packages: [
      {
        name: 'Flame',
        years: ['2024', '2025', '2026'],
        engines: ['2.5 Hybrid 4x4 e-CVT 222'],
        equipment: rav4Equipment,
      },
      {
        name: 'Passion X-Pack',
        years: ['2024', '2025', '2026'],
        engines: ['2.5 Hybrid 4x4 e-CVT 222'],
        equipment: [
          ...rav4Equipment,
          'Panoramik görüş sistemi',
          'Deri koltuk döşemesi',
        ],
      },
    ],
  },
  {
    brand: 'Renault',
    model: 'Captur',
    aliases: ['Yeni Captur'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Techno',
        years: ['2025', '2026'],
        engines: ['1.3 Mild Hybrid EDC 160', '1.6 E-Tech Full Hybrid 145'],
        equipment: capturBaseEquipment,
      },
      {
        name: 'Esprit Alpine',
        years: ['2025', '2026'],
        engines: ['1.3 Mild Hybrid EDC 160', '1.6 E-Tech Full Hybrid 145'],
        equipment: capturUpperEquipment,
      },
    ],
  },
  {
    brand: 'Renault',
    model: 'Austral',
    aliases: ['Yeni Austral', 'Renault Austral'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Techno',
        years: ['2025', '2026'],
        engines: ['1.3 Mild Hybrid 150 hp Auto'],
        equipment: australTechnoEquipment,
      },
      {
        name: 'Esprit Alpine',
        years: ['2025', '2026'],
        engines: ['Full Hybrid E-Tech 200 hp'],
        equipment: australEspritEquipment,
      },
    ],
  },
  {
    brand: 'Honda',
    model: 'HR-V',
    aliases: ['HR-V e:HEV', 'Yeni HR-V'],
    years: ['2026'],
    packages: [
      {
        name: 'Elegance',
        years: ['2026'],
        engines: ['1.5 Hibrit Otomatik'],
        equipment: hrvBaseEquipment,
      },
      {
        name: 'Advance',
        years: ['2026'],
        engines: ['1.5 Hibrit Otomatik'],
        equipment: hrvAdvanceEquipment,
      },
    ],
  },
  {
    brand: 'Peugeot',
    model: '408',
    aliases: ['Yeni 408'],
    years: ['2025', '2026'],
    packages: [
      {
        name: 'Allure',
        years: ['2025', '2026'],
        engines: ['1.2 Hybrid 145 e-DCS6'],
        equipment: peugeot408AllureEquipment,
      },
      {
        name: 'GT',
        years: ['2025', '2026'],
        engines: ['1.2 Hybrid 145 e-DCS6'],
        equipment: peugeot408GtEquipment,
      },
    ],
  },
];

export function getVerifiedVehicleSpec(brand: string, model: string) {
  const normalizedBrand = normalizeLookup(brand);
  const normalizedModel = normalizeLookup(model);

  return verifiedVehicleSpecs.find((item) => {
    const sameBrand = normalizeLookup(item.brand) === normalizedBrand;
    if (!sameBrand) {
      return false;
    }

    if (normalizeLookup(item.model) === normalizedModel) {
      return true;
    }

    return item.aliases?.some((alias) => normalizeLookup(alias) === normalizedModel) ?? false;
  });
}

export function getVerifiedYears(brand: string, model: string) {
  return getVerifiedVehicleSpec(brand, model)?.years ?? [];
}

export function getVerifiedPackages(brand: string, model: string, year?: string) {
  const spec = getVerifiedVehicleSpec(brand, model);
  if (!spec) {
    return [];
  }

  return unique(
    spec.packages
      .filter((item) => !year || item.years.includes(year))
      .map((item) => item.name),
  );
}

export function getVerifiedEngines(
  brand: string,
  model: string,
  year?: string,
  packageName?: string,
) {
  const spec = getVerifiedVehicleSpec(brand, model);
  if (!spec) {
    return [];
  }

  return unique(
    spec.packages
      .filter(
        (item) =>
          (!packageName || normalizeLookup(item.name) === normalizeLookup(packageName)) &&
          (!year || item.years.includes(year)),
      )
      .flatMap((item) => item.engines),
  );
}

export function getVerifiedEquipment(
  brand: string,
  model: string,
  packageName?: string,
) {
  const spec = getVerifiedVehicleSpec(brand, model);
  if (!spec || !packageName) {
    return [];
  }

  return unique(
    spec.packages
      .filter((item) => normalizeLookup(item.name) === normalizeLookup(packageName))
      .flatMap((item) => item.equipment),
  );
}

