type CatalogEntry = [brand: string, models: string[], packages?: string[]];

const DEFAULT_PACKAGES = [
  'Base',
  'Comfort',
  'Premium',
  'Sport',
  'Luxury',
  'Prestige',
];

const ELECTRIC_PACKAGES = ['Standard Range', 'Long Range', 'Performance', 'Premium'];

const catalogEntries: CatalogEntry[] = [
  ['Abarth', ['500', '595', '695', '124 Spider']],
  ['Acura', ['ILX', 'Integra', 'TLX', 'RDX', 'MDX', 'ZDX', 'NSX']],
  ['Alfa Romeo', ['Giulia', 'Giulietta', 'Stelvio', 'Tonale', '4C']],
  ['Aston Martin', ['Vantage', 'DB11', 'DB12', 'DBX']],
  ['Audi', ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'e-tron']],
  ['Bentley', ['Continental GT', 'Flying Spur', 'Bentayga']],
  ['BMW', ['114i', '116i', '118i', '216d', '320i', '330e', '520d', '730d', 'X1', 'X3', 'X5', 'X7', 'i4', 'iX']],
  ['Bugatti', ['Chiron', 'Divo', 'Mistral']],
  ['Buick', ['Encore', 'Envision', 'Envista', 'LaCrosse']],
  ['BYD', ['Atto 3', 'Dolphin', 'Han', 'Seal', 'Tang'], ELECTRIC_PACKAGES],
  ['Cadillac', ['CT4', 'CT5', 'Escalade', 'XT4', 'XT5', 'Lyriq']],
  ['Changan', ['Alsvin', 'CS35 Plus', 'CS55 Plus', 'UNI-T', 'UNI-K']],
  ['Chery', ['Arrizo 5', 'Tiggo 7', 'Tiggo 8', 'Omoda 5', 'Jaecoo 7']],
  ['Chevrolet', ['Aveo', 'Cruze', 'Malibu', 'Captiva', 'Tracker', 'Tahoe', 'Silverado', 'Bolt']],
  ['Chrysler', ['300', 'Pacifica', 'Voyager']],
  ['Citroen', ['C3', 'C4', 'C5 Aircross', 'C-Elysee', 'Berlingo', 'Jumpy']],
  ['Cupra', ['Formentor', 'Born', 'Leon', 'Ateca'], ['Base', 'VZ', 'e-Hybrid', 'Performance']],
  ['Dacia', ['Sandero', 'Stepway', 'Duster', 'Jogger', 'Spring']],
  ['Daewoo', ['Lanos', 'Nubira', 'Leganza', 'Matiz']],
  ['Daihatsu', ['Cuore', 'Sirion', 'Terios', 'Materia']],
  ['Dodge', ['Challenger', 'Charger', 'Durango', 'Hornet', 'RAM 1500']],
  ['DS Automobiles', ['DS 3', 'DS 4', 'DS 7', 'DS 9']],
  ['Ferrari', ['Roma', '296 GTB', 'SF90', 'Purosangue']],
  ['Fiat', ['500', '500X', 'Egea', 'Tipo', 'Doblo', 'Fiorino', 'Panda', 'Linea']],
  ['Fisker', ['Ocean']],
  ['Ford', ['Fiesta', 'Focus', 'Mondeo', 'Puma', 'Kuga', 'Bronco', 'Explorer', 'Ranger', 'Mustang', 'F-150']],
  ['Genesis', ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80']],
  ['GMC', ['Terrain', 'Acadia', 'Yukon', 'Sierra']],
  ['Great Wall', ['Poer', 'Wingle', 'Tank 300']],
  ['Haval', ['H6', 'Jolion', 'Dargo', 'H9']],
  ['Honda', ['Jazz', 'City', 'Civic', 'Accord', 'CR-V', 'HR-V', 'ZR-V', 'Pilot', 'Ridgeline']],
  ['Hongqi', ['H5', 'H7', 'HS5', 'E-HS9']],
  ['Hummer', ['H2', 'H3', 'EV Pickup']],
  ['Hyundai', ['i10', 'i20', 'i30', 'Elantra', 'Sonata', 'Bayon', 'Kona', 'Tucson', 'Santa Fe', 'Palisade', 'IONIQ 5', 'IONIQ 6']],
  ['Infiniti', ['Q30', 'Q50', 'Q60', 'QX50', 'QX60', 'QX80']],
  ['Isuzu', ['D-Max', 'MU-X', 'N-Series']],
  ['Jaguar', ['XE', 'XF', 'F-Pace', 'E-Pace', 'I-Pace', 'F-Type']],
  ['Jeep', ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Gladiator', 'Avenger']],
  ['Jetour', ['X70', 'X90', 'Dashing']],
  ['Kia', ['Picanto', 'Rio', 'Ceed', 'Cerato', 'Seltos', 'Niro', 'Sportage', 'Sorento', 'EV6', 'Carnival']],
  ['Koenigsegg', ['Jesko', 'Gemera', 'Regera']],
  ['Lada', ['Niva', 'Vesta', 'Granta']],
  ['Lamborghini', ['Huracan', 'Revuelto', 'Urus']],
  ['Lancia', ['Ypsilon', 'Delta']],
  ['Land Rover', ['Defender', 'Discovery Sport', 'Discovery', 'Range Rover Evoque', 'Range Rover Velar', 'Range Rover Sport', 'Range Rover']],
  ['Lexus', ['CT', 'ES', 'IS', 'LS', 'UX', 'NX', 'RX', 'GX', 'LX', 'RZ']],
  ['Lincoln', ['Corsair', 'Nautilus', 'Aviator', 'Navigator']],
  ['Lotus', ['Emira', 'Eletre', 'Evija']],
  ['Lucid', ['Air', 'Gravity'], ELECTRIC_PACKAGES],
  ['Mahindra', ['XUV300', 'XUV700', 'Scorpio', 'Thar', 'Bolero']],
  ['Maserati', ['Ghibli', 'Levante', 'Grecale', 'GranTurismo']],
  ['Mazda', ['2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-90', 'MX-5']],
  ['McLaren', ['Artura', '570S', '720S', '750S']],
  ['Mercedes-Benz', ['A 180', 'B 180', 'C 200', 'CLA 200', 'E 220 d', 'S 400', 'GLA 200', 'GLC 300', 'GLE 450', 'Vito', 'Sprinter', 'EQE', 'EQS']],
  ['MG', ['MG3', 'MG4', 'MG5', 'ZS', 'HS', 'Marvel R']],
  ['Mini', ['Cooper', 'Clubman', 'Countryman', 'Aceman']],
  ['Mitsubishi', ['Attrage', 'Lancer', 'ASX', 'Eclipse Cross', 'Outlander', 'L200', 'Pajero Sport']],
  ['NIO', ['ET5', 'ET7', 'EL6', 'EL7', 'ES8'], ELECTRIC_PACKAGES],
  ['Nissan', ['Micra', 'Sunny', 'Sentra', 'Juke', 'Qashqai', 'X-Trail', 'Patrol', 'Navara', 'Leaf', 'Ariya']],
  ['Opel', ['Corsa', 'Astra', 'Insignia', 'Crossland', 'Grandland', 'Mokka', 'Combo']],
  ['Pagani', ['Huayra', 'Utopia']],
  ['Peugeot', ['208', '308', '408', '2008', '3008', '5008', 'Partner', 'Rifter']],
  ['Polestar', ['2', '3', '4'], ELECTRIC_PACKAGES],
  ['Pontiac', ['G6', 'Solstice', 'Torrent']],
  ['Porsche', ['718 Cayman', '718 Boxster', '911', 'Panamera', 'Macan', 'Cayenne', 'Taycan']],
  ['Proton', ['Saga', 'Persona', 'X50', 'X70']],
  ['Ram', ['1500', '2500', '3500', 'TRX']],
  ['Renault', ['Clio', 'Megane', 'Taliant', 'Captur', 'Austral', 'Arkana', 'Koleos', 'Kangoo', 'Master']],
  ['Rivian', ['R1T', 'R1S'], ELECTRIC_PACKAGES],
  ['Rolls-Royce', ['Ghost', 'Phantom', 'Cullinan', 'Spectre']],
  ['Saab', ['9-3', '9-5', '9-7X']],
  ['Seat', ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco']],
  ['Seres', ['3', '5']],
  ['Skoda', ['Fabia', 'Scala', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq']],
  ['Smart', ['fortwo', 'forfour', '#1', '#3']],
  ['SsangYong', ['Tivoli', 'Korando', 'Rexton', 'Musso']],
  ['Subaru', ['Impreza', 'Legacy', 'Levorg', 'Forester', 'Outback', 'XV', 'BRZ']],
  ['Suzuki', ['Swift', 'Baleno', 'Vitara', 'S-Cross', 'Jimny', 'Across']],
  ['Tata', ['Tiago', 'Altroz', 'Nexon', 'Harrier', 'Safari']],
  ['Tesla', ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'], ELECTRIC_PACKAGES],
  ['Toyota', ['Yaris', 'Corolla', 'Camry', 'C-HR', 'RAV4', 'Highlander', 'Land Cruiser', 'Hilux', 'Prius', 'bZ4X']],
  ['Volkswagen', ['Polo', 'Golf', 'Jetta', 'Passat', 'Arteon', 'T-Cross', 'T-Roc', 'Tiguan', 'Touareg', 'Transporter', 'Amarok', 'ID.4']],
  ['Volvo', ['S60', 'S90', 'V60', 'XC40', 'XC60', 'XC90', 'EX30', 'EX90']],
  ['Voyah', ['Free', 'Dream']],
  ['Xpeng', ['P5', 'P7', 'G6', 'G9'], ELECTRIC_PACKAGES],
  ['Zeekr', ['001', '009', 'X'], ELECTRIC_PACKAGES],
];

export const VEHICLE_CATALOG: Record<
  string,
  {
    models: string[];
    packages: string[];
  }
> = Object.fromEntries(
  catalogEntries
    .slice()
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([brand, models, packages]) => [
      brand,
      {
        models: models.slice().sort((first, second) => first.localeCompare(second)),
        packages: (packages ?? DEFAULT_PACKAGES)
          .slice()
          .sort((first, second) => first.localeCompare(second)),
      },
    ]),
);

export const VEHICLE_YEARS = Array.from({ length: 48 }, (_, index) => String(2026 - index));

export const ENGINE_OPTIONS = [
  '0.9',
  '1.0',
  '1.2',
  '1.3',
  '1.4',
  '1.5',
  '1.6',
  '1.8',
  '2.0',
  '2.2',
  '2.5',
  '3.0',
  '3.5',
  '4.0',
  'Elektrik',
  'Hibrit',
] as const;
