import type { GarageVehicleDraft, GarageWizardStepDefinition, GarageWizardStepKey, VehicleListingReadiness } from './types.js';

export const garageWizardSteps: readonly GarageWizardStepDefinition[] = [
  {
    key: 'vehicle-type',
    title: 'Vasita tipi',
    description: 'Aracin temel sinifini sec.',
    required: true
  },
  {
    key: 'brand',
    title: 'Marka',
    description: 'Katalogdan marka sec veya listede yoksa manuel gir.',
    required: true
  },
  {
    key: 'model',
    title: 'Model',
    description: 'Model secimini tamamla.',
    required: true
  },
  {
    key: 'year',
    title: 'Yil',
    description: 'Aracin model yilini gir.',
    required: true
  },
  {
    key: 'trim',
    title: 'Paket',
    description: 'Paket veya donanim seviyesini sec.',
    required: true
  },
  {
    key: 'engine',
    title: 'Motor',
    description: 'Motor secimi ekspertiz ve ilan detaylari icin kullanilir.',
    required: true
  },
  {
    key: 'mileage',
    title: 'Kilometre',
    description: 'Guncel kilometre bilgisini gir.',
    required: true
  },
  {
    key: 'color',
    title: 'Renk',
    description: 'Aracin dis rengini belirt.',
    required: true
  },
  {
    key: 'plate',
    title: 'Plaka',
    description: 'Plaka girebilir veya gizleme modunu secebilirsin.',
    required: true
  },
  {
    key: 'equipment',
    title: 'Donanim',
    description: 'Onemli donanimlari sec veya manuel ekle.',
    required: true
  },
  {
    key: 'paint-map',
    title: 'Boya / degisen',
    description: 'Parcalari isaretle ve boya haritasini onayla.',
    required: true
  },
  {
    key: 'registration',
    title: 'Ruhsat bilgileri',
    description: 'Opsiyonel ama ilan ve sigorta surecini hizlandirir.',
    required: false
  },
  {
    key: 'chassis',
    title: 'Sasi no',
    description: 'Opsiyonel ama OBD analiz ve parca eslestirme icin faydalidir.',
    required: false
  },
  {
    key: 'photos',
    title: 'Fotograflar',
    description: 'Araci garajda gostermek ve ilana cikarmak icin fotograf ekle.',
    required: true
  }
] as const;

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function isGarageWizardStepComplete(step: GarageWizardStepKey, draft: GarageVehicleDraft): boolean {
  switch (step) {
    case 'vehicle-type':
      return Boolean(draft.selection.typeKey);
    case 'brand':
      return Boolean(draft.selection.brandSlug || hasText(draft.selection.brandNameManual));
    case 'model':
      return Boolean(draft.selection.modelSlug || hasText(draft.selection.modelNameManual));
    case 'year':
      return typeof draft.selection.year === 'number' && draft.selection.year >= 1900;
    case 'trim':
      return Boolean(draft.selection.trimSlug || hasText(draft.selection.trimNameManual));
    case 'engine':
      return Boolean(draft.selection.engineSlug || hasText(draft.selection.engineNameManual));
    case 'mileage':
      return typeof draft.mileageKm === 'number' && draft.mileageKm >= 0;
    case 'color':
      return hasText(draft.colorName);
    case 'plate':
      return draft.plateVisibility === 'hidden' || hasText(draft.plateNumber);
    case 'equipment':
      return (
        draft.equipment.confirmed ||
        draft.equipment.selectedPackageSlugs.length > 0 ||
        draft.equipment.customEntries.length > 0 ||
        hasText(draft.equipment.notes)
      );
    case 'paint-map':
      return draft.paintAssessment.confirmed;
    case 'registration':
      return draft.registrationSkipped === true || Boolean(draft.registration);
    case 'chassis':
      return draft.chassisSkipped === true || hasText(draft.chassisNumber);
    case 'photos':
      return draft.photos.length > 0;
    default:
      return false;
  }
}

export function getCompletedGarageSteps(draft: GarageVehicleDraft): GarageWizardStepKey[] {
  return garageWizardSteps.filter((step) => isGarageWizardStepComplete(step.key, draft)).map((step) => step.key);
}

export function getVehicleListingReadiness(draft: GarageVehicleDraft): VehicleListingReadiness {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  for (const step of garageWizardSteps) {
    if (step.required && !isGarageWizardStepComplete(step.key, draft)) {
      missingFields.push(step.title);
    }
  }

  if (!draft.registration && !draft.registrationSkipped) {
    warnings.push('Ruhsat bilgisi eklenirse sigorta ve satis sureci hizlanir.');
  }

  if (!draft.chassisNumber && !draft.chassisSkipped) {
    warnings.push('Sasi numarasi OBD analiz ve parca uyumu icin fayda saglar.');
  }

  if (!draft.paintAssessment.confirmed) {
    warnings.push('Boya ve degisen bilgileri ilanda guven olusturur.');
  }

  return {
    ready: missingFields.length === 0,
    missingFields,
    warnings,
    convenienceHints: {
      hasRegistrationInfo: Boolean(draft.registration),
      hasChassisNumber: hasText(draft.chassisNumber),
      hasPaintAssessment: draft.paintAssessment.confirmed,
      hasObdProfile: false
    }
  };
}
