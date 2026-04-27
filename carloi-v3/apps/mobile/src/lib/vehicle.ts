import {
  getBrandBySlug,
  getModelBySlug,
  listGenerations,
  vehicleCatalogSeed,
} from '@carloi-v3/vehicle-catalog';
import type { GarageVehicleDraft, GarageVehicleRecord } from '@carloi-v3/garage-obd';

import type { SnapshotPost } from '../types/app';

function joinParts(parts: Array<string | number | null | undefined>) {
  return parts
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .map((value) => String(value).trim())
    .join(' ');
}

function hasSelection(vehicle: unknown): vehicle is GarageVehicleDraft | GarageVehicleRecord {
  return Boolean(vehicle && typeof vehicle === 'object' && 'selection' in vehicle);
}

export function getCatalogBrandName(typeKey: string | null | undefined, brandSlug: string | null | undefined) {
  return getBrandBySlug(typeKey as never, brandSlug || undefined, vehicleCatalogSeed)?.name || '';
}

export function getCatalogModelName(
  typeKey: string | null | undefined,
  brandSlug: string | null | undefined,
  modelSlug: string | null | undefined,
) {
  return getModelBySlug(brandSlug || undefined, modelSlug || undefined, typeKey as never, vehicleCatalogSeed)?.name || '';
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

export function buildGarageVehicleTitle(vehicle: GarageVehicleRecord | GarageVehicleDraft | Record<string, unknown>) {
  if (hasSelection(vehicle)) {
    const selection = vehicle.selection;
    return joinParts([
      getCatalogBrandName(selection.typeKey || null, selection.brandSlug || null) || selection.brandNameManual,
      getCatalogModelName(selection.typeKey || null, selection.brandSlug || null, selection.modelSlug || null) ||
        selection.modelNameManual,
      selection.year,
    ]);
  }

  return joinParts([
    String(vehicle.brand || vehicle.make || '').trim(),
    String(vehicle.model || '').trim(),
    vehicle.year ? String(vehicle.year) : '',
  ]);
}

export function buildGarageVehicleSubtitle(vehicle: GarageVehicleRecord | GarageVehicleDraft | Record<string, unknown>) {
  if (hasSelection(vehicle)) {
    const selection = vehicle.selection;
    return joinParts([
      getCatalogGenerationName(
        selection.typeKey || null,
        selection.brandSlug || null,
        selection.modelSlug || null,
        selection.generationSlug || null,
      ) || selection.trimNameManual || selection.trimSlug,
      selection.engineNameManual || selection.engineSlug,
    ]);
  }

  return joinParts([
    String(vehicle.package || vehicle.trim || '').trim(),
    String(vehicle.engine || vehicle.engineName || '').trim(),
  ]);
}

export function maskPlate(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) {
    return 'Plaka eklenmedi';
  }

  if (raw.length <= 4) {
    return raw;
  }

  return `${raw.slice(0, 2)} *** ${raw.slice(-2)}`;
}

export function buildPrimaryVehicleFromSnapshot(
  vehicle: Record<string, unknown> | null | undefined,
  ownerUserId: string,
) {
  if (!vehicle) {
    return null;
  }

  return {
    id: 'server-primary-vehicle',
    ownerUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    primaryTypeKey: String(vehicle.type || vehicle.vehicleType || 'otomobil') as never,
    source: 'server' as const,
    title: buildGarageVehicleTitle(vehicle),
    subtitle: buildGarageVehicleSubtitle(vehicle),
    vehicle,
  };
}

export function buildVehiclePayloadForOnboarding(vehicle: GarageVehicleRecord) {
  const selection = vehicle.selection || {};
  return {
    type: selection.typeKey || vehicle.primaryTypeKey,
    brand: getCatalogBrandName(selection.typeKey || null, selection.brandSlug || null) || selection.brandNameManual,
    model: getCatalogModelName(selection.typeKey || null, selection.brandSlug || null, selection.modelSlug || null) ||
      selection.modelNameManual,
    generation:
      getCatalogGenerationName(
        selection.typeKey || null,
        selection.brandSlug || null,
        selection.modelSlug || null,
        selection.generationSlug || null,
      ) || selection.generationNameManual,
    year: selection.year,
    package: selection.trimNameManual || selection.trimSlug,
    engine: selection.engineNameManual || selection.engineSlug,
    fuelType: selection.fuelType || selection.engineSlug,
    transmission: selection.transmission,
    drivetrain: selection.drivetrain,
    mileageKm: vehicle.mileageKm,
    color: vehicle.colorName,
    plateNumber: vehicle.plateNumber,
    equipment: vehicle.equipment,
    paintAssessment: vehicle.paintAssessment,
    registration: vehicle.registration,
    chassisNumber: vehicle.chassisNumber,
    photos: vehicle.photos,
    visibilityScope: vehicle.visibilityScope,
  };
}

export function buildListingDraftPayload(
  vehicle: GarageVehicleRecord | Record<string, unknown>,
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
  const isGarageVehicle = hasSelection(vehicle);
  const garageVehicle = isGarageVehicle ? vehicle : null;
  const remoteVehicle = vehicle as Record<string, unknown>;
  const plateNumber = garageVehicle ? garageVehicle.plateNumber : String(remoteVehicle.plateNumber || '');

  return {
    title: options.title,
    city: options.city,
    district: options.district,
    location: options.location,
    fuelType: garageVehicle ? garageVehicle.selection.fuelType || garageVehicle.selection.engineSlug || '' : String(remoteVehicle.fuelType || ''),
    transmission: garageVehicle ? garageVehicle.selection.transmission || '' : String(remoteVehicle.transmission || ''),
    bodyType: garageVehicle ? garageVehicle.selection.bodyType || '' : String(remoteVehicle.bodyType || ''),
    color: garageVehicle ? garageVehicle.colorName || '' : String(remoteVehicle.color || ''),
    plateNumber: plateNumber || '',
    phone: options.phone,
    includeExpertiz: true,
    price: options.price,
    description: options.description,
    damageRecord: '',
    paintInfo: '',
    changedParts: '',
    accidentInfo: '',
    extraEquipment: garageVehicle
      ? garageVehicle.equipment.customEntries.join(', ')
      : String((remoteVehicle as { extraEquipment?: string }).extraEquipment || ''),
    isOwnerSameAsAccountHolder: options.relationType === 'owner',
    sellerRelationType: options.relationType,
    registrationOwnerName:
      garageVehicle ? garageVehicle.registration?.ownerName || '' : String((remoteVehicle as { ownerName?: string }).ownerName || ''),
    registrationOwnerFullNameDeclared:
      garageVehicle ? garageVehicle.registration?.ownerName || '' : String((remoteVehicle as { ownerName?: string }).ownerName || ''),
    authorizationDeclarationText: options.authorizationText || '',
  };
}

export function extractVehicleTaggedPosts(posts: SnapshotPost[], vehicleId: string) {
  return posts.filter((post) => {
    const content = String(post.content || '').toLowerCase();
    const hashtags = Array.isArray(post.hashtags) ? post.hashtags.join(' ').toLowerCase() : '';
    return content.includes(vehicleId.toLowerCase()) || hashtags.includes(vehicleId.toLowerCase());
  });
}
