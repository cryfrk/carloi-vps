import seed from './seeds/global-core.json' with { type: 'json' };
import { includesQuery, uniqueBySlug } from './normalize.js';
import type {
  BrandRecord,
  CatalogSearchInput,
  GenerationRecord,
  ModelRecord,
  VehicleCatalogDataset,
  VehicleSelection,
  VehicleTypeKey,
  VehicleTypeRecord,
} from './types.js';
import { validateVehicleCatalogDataset } from './validation.js';

export const vehicleCatalogSeed = seed as VehicleCatalogDataset;

const seedValidation = validateVehicleCatalogDataset(vehicleCatalogSeed);
if (!seedValidation.valid) {
  throw new Error(
    `Vehicle catalog seed validation failed: ${seedValidation.errors
      .map((issue) => `${issue.path || 'root'}=${issue.message}`)
      .join('; ')}`,
  );
}

export const vehicleCatalogWarnings = seedValidation.warnings;

export function listVehicleTypes(dataset: VehicleCatalogDataset = vehicleCatalogSeed): VehicleTypeRecord[] {
  return [...dataset.vehicleTypes];
}

export function getVehicleTypeByKey(
  typeKey: VehicleTypeKey | null | undefined,
  dataset: VehicleCatalogDataset = vehicleCatalogSeed,
) {
  if (!typeKey) {
    return null;
  }

  return dataset.vehicleTypes.find((vehicleType) => vehicleType.key === typeKey) || null;
}

export function listBrands(
  input: Pick<CatalogSearchInput, 'typeKey' | 'region'> = {},
  dataset: VehicleCatalogDataset = vehicleCatalogSeed,
): BrandRecord[] {
  return dataset.brands.filter((brand) => {
    if (input.typeKey && brand.typeKey !== input.typeKey) {
      return false;
    }
    if (input.region && !brand.marketRegions.includes(input.region) && !brand.marketRegions.includes('global')) {
      return false;
    }
    return true;
  });
}

export function getBrandBySlug(
  typeKey: VehicleTypeKey | null | undefined,
  brandSlug: string | null | undefined,
  dataset: VehicleCatalogDataset = vehicleCatalogSeed,
) {
  if (!typeKey || !brandSlug) {
    return null;
  }

  return listBrands({ typeKey }, dataset).find((brand) => brand.slug === brandSlug) || null;
}

export function listModels(
  brandSlug: string | null | undefined,
  typeKey?: VehicleTypeKey | null,
  dataset: VehicleCatalogDataset = vehicleCatalogSeed,
): ModelRecord[] {
  const brand = getBrandBySlug(typeKey || undefined, brandSlug, dataset);
  return brand ? [...brand.models] : [];
}

export function getModelBySlug(
  brandSlug: string | null | undefined,
  modelSlug: string | null | undefined,
  typeKey?: VehicleTypeKey | null,
  dataset: VehicleCatalogDataset = vehicleCatalogSeed,
) {
  if (!modelSlug) {
    return null;
  }

  return listModels(brandSlug, typeKey, dataset).find((model) => model.slug === modelSlug) || null;
}

export function listGenerations(
  selection: Pick<VehicleSelection, 'typeKey' | 'brandSlug' | 'modelSlug'>,
  dataset: VehicleCatalogDataset = vehicleCatalogSeed,
): GenerationRecord[] {
  const model = getModelBySlug(selection.brandSlug, selection.modelSlug, selection.typeKey, dataset);
  return model ? [...model.generations] : [];
}

export function resolveSelectionOptions(
  selection: VehicleSelection,
  dataset: VehicleCatalogDataset = vehicleCatalogSeed,
) {
  const brands = listBrands({ typeKey: selection.typeKey || undefined }, dataset);
  const models = listModels(selection.brandSlug, selection.typeKey, dataset);
  const generations = listGenerations(selection, dataset);
  const selectedGeneration =
    generations.find((generation) => generation.slug === selection.generationSlug) || null;

  return {
    vehicleTypes: listVehicleTypes(dataset),
    brands,
    models,
    generations,
    trims: selectedGeneration ? [...selectedGeneration.trims] : [],
    engines: selectedGeneration ? [...selectedGeneration.engines] : [],
    equipmentPackages: selectedGeneration ? [...selectedGeneration.equipmentPackages] : [],
  };
}

export function searchVehicleTypes(query: string, dataset: VehicleCatalogDataset = vehicleCatalogSeed) {
  return listVehicleTypes(dataset).filter((vehicleType) => includesQuery(vehicleType.label, query));
}

export function searchBrands(
  input: CatalogSearchInput,
  dataset: VehicleCatalogDataset = vehicleCatalogSeed,
) {
  const brands = listBrands({ typeKey: input.typeKey, region: input.region }, dataset);
  return uniqueBySlug(
    brands.filter((brand) => {
      if (!input.query?.trim()) {
        return true;
      }

      const aliases = brand.aliases || [];
      return [brand.name, ...aliases].some((value) => includesQuery(value, input.query || ''));
    }),
  );
}

export function searchModels(
  input: CatalogSearchInput,
  dataset: VehicleCatalogDataset = vehicleCatalogSeed,
) {
  const models = listModels(input.brandSlug, input.typeKey, dataset);
  return uniqueBySlug(
    models.filter((model) => {
      if (!input.query?.trim()) {
        return true;
      }

      const aliases = model.aliases || [];
      return [model.name, ...aliases].some((value) => includesQuery(value, input.query || ''));
    }),
  );
}
