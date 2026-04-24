import { getVerifiedEquipment } from '../data/vehicleSpecs';
import { PartPrediction, VehicleProfile } from '../types';

interface VehicleDraftInput {
  brand: string;
  model: string;
  year: string;
  packageName: string;
  mileage: string;
  engineVolume: string;
  vin: string;
  fuelType?: string;
  extraEquipment?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseMileage(mileage: string) {
  const digits = mileage.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function buildUpcomingRisks(mileageValue: number, age: number): PartPrediction[] {
  const baseScore = clamp(28 + Math.round(mileageValue / 6000) + age * 3, 18, 88);

  return [
    {
      name: 'Bakım sarf malzemeleri',
      probability: clamp(baseScore, 24, 87),
      marketPrice: 'Değişken',
      repairCost: 'Kontrol gerekli',
      explanation:
        'Kilometre ve yaş bilgisine göre periyodik bakım parçaları yakından izlenmeli.',
    },
    {
      name: 'Fren hattı ve balata takibi',
      probability: clamp(baseScore - 9, 16, 79),
      marketPrice: 'Değişken',
      repairCost: 'Servis kontrolü gerekli',
      explanation:
        'Yüksek kilometreli araçlarda fren sisteminin detaylı kontrolü geciktirilmemeli.',
    },
    {
      name: 'Akü ve şarj sistemi',
      probability: clamp(baseScore - 14, 12, 72),
      marketPrice: 'Değişken',
      repairCost: 'Elektrik kontrolü gerekli',
      explanation:
        'Araç yaşı arttıkça ilk elektrik problemleri akü ve şarj hattında görülebilir.',
    },
  ];
}

export function createVehicleProfileFromInput(
  input: VehicleDraftInput,
  previousVehicle?: VehicleProfile,
): VehicleProfile {
  const currentYear = new Date().getFullYear();
  const yearValue = Number(input.year) || currentYear;
  const age = clamp(currentYear - yearValue, 0, 25);
  const mileageValue = parseMileage(input.mileage);
  const normalizedMileage = input.mileage.trim()
    ? input.mileage.includes('km')
      ? input.mileage.trim()
      : `${input.mileage.trim()} km`
    : '0 km';
  const equipment = getVerifiedEquipment(input.brand, input.model, input.packageName);
  const upcomingRisks = buildUpcomingRisks(mileageValue, age);
  const sameVehicle =
    previousVehicle &&
    previousVehicle.brand === input.brand &&
    previousVehicle.model === input.model &&
    previousVehicle.year === input.year &&
    previousVehicle.vin === (input.vin || previousVehicle.vin);

  if (sameVehicle && previousVehicle) {
    return {
      ...previousVehicle,
      brand: input.brand,
      model: input.model,
      year: input.year,
      packageName: input.packageName,
      mileage: normalizedMileage,
      engineVolume: input.engineVolume.trim() || previousVehicle.engineVolume,
      fuelType: input.fuelType?.trim() || previousVehicle.fuelType,
      vin: input.vin.trim().toUpperCase() || previousVehicle.vin,
      upcomingRisks,
      equipment: equipment.length ? equipment : previousVehicle.equipment,
      extraEquipment: input.extraEquipment?.trim() || previousVehicle.extraEquipment,
      summary:
        previousVehicle.obdConnected || previousVehicle.liveMetrics.length || previousVehicle.faultCodes.length
          ? previousVehicle.summary
          : 'Araç profili güncellendi. OBD bağlantısı kurulana kadar yalnızca statik araç bilgilerine göre uyarı gösterilir.',
    };
  }

  return {
    brand: input.brand,
    model: input.model,
    year: input.year,
    packageName: input.packageName,
    mileage: normalizedMileage,
    engineVolume: input.engineVolume.trim() || 'Motor bilgisi bekleniyor',
    fuelType: input.fuelType?.trim() || 'Yakıt tipi bekleniyor',
    vin: input.vin.trim().toUpperCase() || 'VIN bekleniyor',
    obdConnected: false,
    healthScore: undefined,
    driveScore: undefined,
    liveMetrics: [],
    faultCodes: [],
    probableFaultyParts: [],
    upcomingRisks,
    summary:
      'OBD verisi henüz alınmadı. Bu ekrandaki uyarılar yalnızca araç yaşı, kilometresi ve doğrulanmış model bilgisine göre hazırlanır.',
    actions: [
      'Araç başındayken OBD bağlantısı kurup gerçek canlı verileri alın.',
      'Son bakım kayıtlarını kilometre ve yaş bilgisiyle birlikte kontrol edin.',
      'Kronik sorun bilinen modellerde bakım geçmişini doğrulamadan karar vermeyin.',
    ],
    equipment,
    extraEquipment: input.extraEquipment?.trim(),
  };
}

