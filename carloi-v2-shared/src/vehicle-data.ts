import type { VehicleSeedCategory } from './types';

export const vehicleTypeOptions = [
  'Otomobil',
  'SUV',
  'Ticari araç',
  'Minibüs',
  'Otobüs',
  'Karavan',
  'Pick-up',
  'Motosiklet',
  'ATV',
  'UTV',
  'Tır',
  'Çekici',
  'Kamyon',
  'Kamyonet',
  'İş makinesi',
  'Kepçe',
  'Forklift',
  'Traktör',
  'Tekne',
  'Yat',
  'Jet ski',
  'Diğer',
] as const;

export const vehicleSeedCatalog: VehicleSeedCategory[] = [
  {
    type: 'Otomobil',
    brands: [
      {
        name: 'Volkswagen',
        models: [
          {
            name: 'Golf',
            packages: ['Life', 'Style', 'R-Line'],
            engineOptions: ['1.0 eTSI', '1.5 eTSI', '2.0 TDI'],
            fuels: ['Benzin', 'Dizel', 'Hibrit'],
            gearboxes: ['Manuel', 'DSG'],
          },
          {
            name: 'Passat',
            packages: ['Business', 'Elegance'],
            engineOptions: ['1.5 eTSI', '2.0 TDI'],
            fuels: ['Benzin', 'Dizel'],
            gearboxes: ['DSG'],
          },
        ],
      },
      {
        name: 'BMW',
        models: [
          {
            name: '3 Serisi',
            packages: ['Sport Line', 'Luxury', 'M Sport'],
            engineOptions: ['320i', '320d', '330e'],
            fuels: ['Benzin', 'Dizel', 'Plug-in Hibrit'],
            gearboxes: ['Otomatik'],
          },
          {
            name: '5 Serisi',
            packages: ['Executive', 'Luxury', 'M Sport'],
            engineOptions: ['520i', '520d', '530e'],
            fuels: ['Benzin', 'Dizel', 'Plug-in Hibrit'],
            gearboxes: ['Otomatik'],
          },
        ],
      },
      {
        name: 'Renault',
        models: [
          {
            name: 'Clio',
            packages: ['Joy', 'Touch', 'Icon'],
            engineOptions: ['1.0 TCe', '1.5 Blue dCi'],
            fuels: ['Benzin', 'Dizel'],
            gearboxes: ['Manuel', 'EDC'],
          },
          {
            name: 'Megane',
            packages: ['Joy', 'Touch', 'Icon', 'RS Line'],
            engineOptions: ['1.3 TCe', '1.5 Blue dCi'],
            fuels: ['Benzin', 'Dizel'],
            gearboxes: ['Manuel', 'EDC'],
          },
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
          {
            name: 'C-HR',
            packages: ['Flame', 'Passion', 'X-Pack'],
            engineOptions: ['1.8 Hybrid', '2.0 Hybrid'],
            fuels: ['Hibrit'],
            gearboxes: ['e-CVT'],
          },
          {
            name: 'RAV4',
            packages: ['Flame', 'Passion X-Pack'],
            engineOptions: ['2.5 Hybrid'],
            fuels: ['Hibrit'],
            gearboxes: ['e-CVT'],
          },
        ],
      },
      {
        name: 'Peugeot',
        models: [
          {
            name: '2008',
            packages: ['Active', 'Allure', 'GT'],
            engineOptions: ['1.2 PureTech', '1.5 BlueHDi', 'E-2008'],
            fuels: ['Benzin', 'Dizel', 'Elektrik'],
            gearboxes: ['Manuel', 'EAT8'],
          },
          {
            name: '3008',
            packages: ['Active Prime', 'Allure', 'GT'],
            engineOptions: ['1.2 PureTech', '1.5 BlueHDi'],
            fuels: ['Benzin', 'Dizel'],
            gearboxes: ['EAT8'],
          },
        ],
      },
    ],
  },
  {
    type: 'Ticari araç',
    brands: [
      {
        name: 'Ford',
        models: [
          {
            name: 'Transit Custom',
            packages: ['Trend', 'Titanium'],
            engineOptions: ['2.0 EcoBlue'],
            fuels: ['Dizel'],
            gearboxes: ['Manuel', 'Otomatik'],
          },
        ],
      },
      {
        name: 'Fiat',
        models: [
          {
            name: 'Ducato',
            packages: ['Business', 'Maxi'],
            engineOptions: ['2.2 Multijet'],
            fuels: ['Dizel'],
            gearboxes: ['Manuel'],
          },
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
          {
            name: 'Hilux',
            packages: ['Hi-Cruiser', 'Adventure'],
            engineOptions: ['2.4 D-4D', '2.8 D-4D'],
            fuels: ['Dizel'],
            gearboxes: ['Manuel', 'Otomatik'],
          },
        ],
      },
      {
        name: 'Isuzu',
        models: [
          {
            name: 'D-Max',
            packages: ['V-Cross', 'Hi-Ride'],
            engineOptions: ['1.9 Ddi'],
            fuels: ['Dizel'],
            gearboxes: ['Manuel', 'Otomatik'],
          },
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
          {
            name: 'MT-07',
            packages: ['Standard'],
            engineOptions: ['689 cc'],
            fuels: ['Benzin'],
            gearboxes: ['Manuel'],
          },
          {
            name: 'NMAX',
            packages: ['Connected'],
            engineOptions: ['155 cc'],
            fuels: ['Benzin'],
            gearboxes: ['CVT'],
          },
        ],
      },
      {
        name: 'Honda',
        models: [
          {
            name: 'CBR500R',
            packages: ['Standard'],
            engineOptions: ['471 cc'],
            fuels: ['Benzin'],
            gearboxes: ['Manuel'],
          },
        ],
      },
    ],
  },
  {
    type: 'Traktör',
    brands: [
      {
        name: 'New Holland',
        models: [
          {
            name: 'TT50',
            packages: ['4WD', '2WD'],
            engineOptions: ['50 HP'],
            fuels: ['Dizel'],
            gearboxes: ['Manuel'],
          },
        ],
      },
      {
        name: 'Massey Ferguson',
        models: [
          {
            name: '240S',
            packages: ['Standard'],
            engineOptions: ['50 HP'],
            fuels: ['Dizel'],
            gearboxes: ['Manuel'],
          },
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
          {
            name: 'Activ 605',
            packages: ['Open'],
            engineOptions: ['115 HP'],
            fuels: ['Benzin'],
            gearboxes: ['Dıştan Takma'],
          },
        ],
      },
    ],
  },
];
