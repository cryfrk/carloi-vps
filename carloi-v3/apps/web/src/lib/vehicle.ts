import {
  getBrandBySlug,
  getModelBySlug,
  listGenerations,
  resolveSelectionOptions,
  vehicleCatalogSeed,
} from '@carloi-v3/vehicle-catalog';
import {
  createEmptyPaintMap,
  garageWizardSteps,
  getVehicleListingReadiness,
  type GarageVehicleDraft,
  type GarageVehicleRecord as GarageWizardVehicleRecord,
  type PaintStatus,
  type VehicleBodyPanelKey,
} from '@carloi-v3/garage-obd';

import type { GarageVehicleRecord } from '@/types/app';

export {
  createEmptyPaintMap,
  garageWizardSteps,
  getVehicleListingReadiness,
  resolveSelectionOptions,
  type GarageVehicleDraft,
  type GarageWizardVehicleRecord,
  type PaintStatus,
  type VehicleBodyPanelKey,
};

function joinParts(parts: Array<string | number | null | undefined>) {
  return parts
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .map((value) => String(value).trim())
    .join(' ');
}

export function createInitialGarageDraft(): GarageVehicleDraft {
  return {
    selection: {
      equipmentPackageSlugs: [],
      customFeatures: [],
    },
    ownershipBasis: 'registered-owner',
    plateVisibility: 'masked',
    equipment: {
      selectedPackageSlugs: [],
      customEntries: [],
      confirmed: false,
    },
    paintAssessment: {
      map: createEmptyPaintMap(),
      confirmed: false,
    },
    photos: [],
    visibilityScope: 'garage',
  };
}

export function getCatalogBrandName(typeKey: string | null | undefined, brandSlug: string | null | undefined) {
  return getBrandBySlug(typeKey as never, brandSlug || undefined, vehicleCatalogSeed)?.name || '';
}

export function getCatalogModelName(
  typeKey: string | null | undefined,
  brandSlug: string | null | undefined,
  modelSlug: string | null | undefined,
) {
  return (
    getModelBySlug(brandSlug || undefined, modelSlug || undefined, typeKey as never, vehicleCatalogSeed)?.name ||
    ''
  );
}

export function getCatalogGenerationName(
  typeKey: string | null | undefined,
  brandSlug: string | null | undefined,
  modelSlug: string | null | undefined,
  generationSlug: string | null | undefined,
) {
  return (
    listGenerations(
      {
        typeKey: (typeKey || undefined) as never,
        brandSlug: brandSlug || undefined,
        modelSlug: modelSlug || undefined,
      },
      vehicleCatalogSeed,
    ).find((generation) => generation.slug === generationSlug)?.name || ''
  );
}

export function buildVehicleTitle(vehicle: GarageVehicleRecord | GarageVehicleDraft) {
  if ('selection' in vehicle) {
    return joinParts([
      getCatalogBrandName(vehicle.selection.typeKey || null, vehicle.selection.brandSlug || null) ||
        vehicle.selection.brandNameManual,
      getCatalogModelName(
        vehicle.selection.typeKey || null,
        vehicle.selection.brandSlug || null,
        vehicle.selection.modelSlug || null,
      ) || vehicle.selection.modelNameManual,
      vehicle.selection.year,
    ]);
  }

  return joinParts([vehicle.brand, vehicle.model, vehicle.year]);
}

export function buildVehicleSubtitle(vehicle: GarageVehicleRecord | GarageVehicleDraft) {
  if ('selection' in vehicle) {
    return joinParts([
      getCatalogGenerationName(
        vehicle.selection.typeKey || null,
        vehicle.selection.brandSlug || null,
        vehicle.selection.modelSlug || null,
        vehicle.selection.generationSlug || null,
      ) || vehicle.selection.trimNameManual || vehicle.selection.trimSlug,
      vehicle.selection.engineNameManual || vehicle.selection.engineSlug,
    ]);
  }

  return joinParts([vehicle.trim, vehicle.engine]);
}

export function mapGarageApiVehicleToWizardSeed(vehicle: GarageVehicleRecord): Partial<GarageVehicleDraft> {
  return {
    selection: {
      typeKey: vehicle.vehicleType as never,
      brandNameManual: vehicle.brand,
      modelNameManual: vehicle.model,
      year: vehicle.year ?? undefined,
      trimNameManual: vehicle.trim,
      engineNameManual: vehicle.engine,
      fuelType: (vehicle.fuelType as never) || undefined,
      transmission: (vehicle.transmission as never) || undefined,
      drivetrain: (vehicle.drivetrain as never) || undefined,
      bodyType: (vehicle.bodyType as never) || undefined,
      customFeatures: vehicle.equipment || [],
      equipmentPackageSlugs: [],
    },
    mileageKm: vehicle.mileageKm ?? undefined,
    colorName: vehicle.color,
    plateNumber: vehicle.plate,
    plateVisibility: vehicle.plateIsHidden ? 'masked' : 'full',
    equipment: {
      selectedPackageSlugs: [],
      customEntries: vehicle.equipment || [],
      confirmed: (vehicle.equipment || []).length > 0,
    },
    paintAssessment: {
      map: (vehicle.paintMap as never) || createEmptyPaintMap(),
      confirmed: Boolean(vehicle.paintMap),
    },
    registration: vehicle.registration
      ? {
          ownerName: vehicle.registration.ownerName,
          registrationCity: vehicle.registration.registrationCity,
          registrationDate: vehicle.registration.issuedAt || undefined,
          plateNumber: vehicle.plate,
        }
      : undefined,
    chassisNumber: vehicle.chassis?.chassisNo,
    photos: vehicle.media.map((item) => ({
      id: item.id,
      url: item.url,
      type: item.kind === 'video' ? 'video' : 'image',
      label: item.fileName,
    })),
    visibilityScope: vehicle.showInProfile ? 'profile' : 'garage',
  };
}

export function buildGarageApiPayloadFromDraft(draft: GarageVehicleDraft) {
  return {
    vehicleType: draft.selection.typeKey || draft.selection.brandNameManual || 'otomobil',
    brand:
      getCatalogBrandName(draft.selection.typeKey || null, draft.selection.brandSlug || null) ||
      draft.selection.brandNameManual ||
      '',
    model:
      getCatalogModelName(
        draft.selection.typeKey || null,
        draft.selection.brandSlug || null,
        draft.selection.modelSlug || null,
      ) ||
      draft.selection.modelNameManual ||
      '',
    generation:
      getCatalogGenerationName(
        draft.selection.typeKey || null,
        draft.selection.brandSlug || null,
        draft.selection.modelSlug || null,
        draft.selection.generationSlug || null,
      ) || draft.selection.generationNameManual,
    year: draft.selection.year,
    trim: draft.selection.trimNameManual || draft.selection.trimSlug,
    engine: draft.selection.engineNameManual || draft.selection.engineSlug,
    fuelType: draft.selection.fuelType,
    transmission: draft.selection.transmission,
    drivetrain: draft.selection.drivetrain,
    bodyType: draft.selection.bodyType,
    mileageKm: draft.mileageKm,
    color: draft.colorName,
    plate: draft.plateNumber,
    plateIsHidden: draft.plateVisibility !== 'full',
    equipment: [
      ...draft.equipment.selectedPackageSlugs,
      ...draft.equipment.customEntries,
      ...(draft.selection.customFeatures || []),
    ].filter(Boolean),
    paintMap: draft.paintAssessment.map,
    showInProfile: draft.visibilityScope !== 'private',
    media: draft.photos.map((photo, index) => ({
      url: photo.url,
      kind: photo.type === 'video' ? 'video' : 'photo',
      fileName: photo.label,
      sortOrder: index,
    })),
  };
}

export function buildListingDraftPayload(
  vehicle: GarageVehicleRecord,
  options: {
    title: string;
    price: string;
    description: string;
    city: string;
    district: string;
    location: string;
    phone: string;
    relationType: string;
    authorizationText?: string;
  },
) {
  return {
    title: options.title,
    city: options.city,
    district: options.district,
    location: options.location,
    fuelType: vehicle.fuelType || '',
    transmission: vehicle.transmission || '',
    bodyType: vehicle.bodyType || '',
    color: vehicle.color || '',
    plateNumber: vehicle.plate || '',
    phone: options.phone,
    includeExpertiz: true,
    price: options.price,
    description: options.description,
    damageRecord: '',
    paintInfo: '',
    changedParts: '',
    accidentInfo: '',
    extraEquipment: vehicle.equipment?.join(', ') || '',
    isOwnerSameAsAccountHolder: options.relationType === 'owner',
    sellerRelationType: options.relationType,
    registrationOwnerName: vehicle.registration?.ownerName || '',
    registrationOwnerFullNameDeclared: vehicle.registration?.ownerName || '',
    authorizationDeclarationText: options.authorizationText || '',
  };
}

export function cyclePaintStatus(current: PaintStatus): PaintStatus {
  const order: PaintStatus[] = ['unknown', 'original', 'painted', 'local-painted', 'replaced'];
  const nextIndex = (order.indexOf(current) + 1) % order.length;
  return order[nextIndex];
}

export function updatePaintPanel(
  map: GarageVehicleDraft['paintAssessment']['map'],
  panelKey: VehicleBodyPanelKey,
  status: PaintStatus,
) {
  return {
    ...map,
    [panelKey]: {
      ...map[panelKey],
      status,
      updatedAt: new Date().toISOString(),
    },
  };
}
