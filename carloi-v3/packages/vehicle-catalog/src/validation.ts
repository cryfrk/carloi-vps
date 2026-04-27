import type {
  BrandRecord,
  CatalogSuggestion,
  ModelRecord,
  ValidationIssue,
  ValidationResult,
  VehicleCatalogDataset,
  VehicleSelection,
} from './types.js';

function createValidationResult(errors: ValidationIssue[], warnings: ValidationIssue[] = []): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function hasValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

function pushDuplicateIssue(
  issues: ValidationIssue[],
  kind: string,
  parentPath: string,
  slug: string,
) {
  issues.push({
    code: 'duplicate_slug',
    message: `${kind} slug degeri tekrarlaniyor: ${slug}`,
    path: `${parentPath}.${slug}`,
  });
}

function validateBrandModels(brand: BrandRecord, issues: ValidationIssue[], parentPath: string) {
  const modelSlugs = new Set<string>();
  for (const model of brand.models) {
    if (modelSlugs.has(model.slug)) {
      pushDuplicateIssue(issues, 'Model', parentPath, model.slug);
    } else {
      modelSlugs.add(model.slug);
    }

    const generationSlugs = new Set<string>();
    for (const generation of model.generations) {
      if (generationSlugs.has(generation.slug)) {
        pushDuplicateIssue(issues, 'Generation', `${parentPath}.${model.slug}`, generation.slug);
      } else {
        generationSlugs.add(generation.slug);
      }

      const trimSlugs = new Set<string>();
      for (const trim of generation.trims) {
        if (trimSlugs.has(trim.slug)) {
          pushDuplicateIssue(issues, 'Trim', `${parentPath}.${model.slug}.${generation.slug}`, trim.slug);
        } else {
          trimSlugs.add(trim.slug);
        }
      }

      const engineSlugs = new Set<string>();
      for (const engine of generation.engines) {
        if (engineSlugs.has(engine.slug)) {
          pushDuplicateIssue(issues, 'Engine', `${parentPath}.${model.slug}.${generation.slug}`, engine.slug);
        } else {
          engineSlugs.add(engine.slug);
        }
      }

      const packageSlugs = new Set<string>();
      for (const equipmentPackage of generation.equipmentPackages) {
        if (packageSlugs.has(equipmentPackage.slug)) {
          pushDuplicateIssue(
            issues,
            'Equipment package',
            `${parentPath}.${model.slug}.${generation.slug}`,
            equipmentPackage.slug,
          );
        } else {
          packageSlugs.add(equipmentPackage.slug);
        }
      }
    }
  }
}

export function validateVehicleCatalogDataset(dataset: VehicleCatalogDataset): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const typeKeys = new Set<string>();
  for (const vehicleType of dataset.vehicleTypes) {
    if (typeKeys.has(vehicleType.key)) {
      pushDuplicateIssue(errors, 'Vehicle type', 'vehicleTypes', vehicleType.key);
    } else {
      typeKeys.add(vehicleType.key);
    }
  }

  const brandKeySet = new Set<string>();
  for (const brand of dataset.brands) {
    const key = `${brand.typeKey}:${brand.slug}`;
    if (brandKeySet.has(key)) {
      pushDuplicateIssue(errors, 'Brand', `brands.${brand.typeKey}`, brand.slug);
    } else {
      brandKeySet.add(key);
    }

    if (!typeKeys.has(brand.typeKey)) {
      errors.push({
        code: 'unknown_vehicle_type',
        message: `Brand icin bilinmeyen vehicle type: ${brand.typeKey}`,
        path: `brands.${brand.slug}`,
      });
    }

    if (!brand.models.length) {
      warnings.push({
        code: 'brand_without_models',
        message: `${brand.name} markasi icin seed model listesi bos. Manuel model girisi beklenir.`,
        path: `brands.${brand.slug}`,
      });
    }

    validateBrandModels(brand, errors, `brands.${brand.slug}`);
  }

  return createValidationResult(errors, warnings);
}

function findBrand(dataset: VehicleCatalogDataset, typeKey: string | null | undefined, brandSlug: string | null | undefined) {
  if (!typeKey || !brandSlug) {
    return null;
  }

  return dataset.brands.find((brand) => brand.typeKey === typeKey && brand.slug === brandSlug) || null;
}

function findModel(brand: BrandRecord | null, modelSlug: string | null | undefined) {
  if (!brand || !modelSlug) {
    return null;
  }

  return brand.models.find((model) => model.slug === modelSlug) || null;
}

export function validateVehicleSelection(
  selection: VehicleSelection,
  dataset: VehicleCatalogDataset,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!selection.typeKey) {
    errors.push({
      code: 'type_required',
      message: 'Vasita tipi secilmelidir.',
      path: 'typeKey',
    });
  }

  const brand = findBrand(dataset, selection.typeKey || undefined, selection.brandSlug || undefined);
  if (!brand && !hasValue(selection.brandNameManual)) {
    errors.push({
      code: 'brand_required',
      message: 'Marka secilmeli veya manuel marka girilmelidir.',
      path: 'brandSlug',
    });
  } else if (!brand && hasValue(selection.brandNameManual)) {
    warnings.push({
      code: 'manual_brand',
      message: 'Marka katalogda yok. Manuel marka girisi kullaniliyor.',
      path: 'brandNameManual',
    });
  }

  const model = findModel(brand, selection.modelSlug || undefined);
  if (!model && !hasValue(selection.modelNameManual)) {
    errors.push({
      code: 'model_required',
      message: 'Model secilmeli veya manuel model girilmelidir.',
      path: 'modelSlug',
    });
  } else if (!model && hasValue(selection.modelNameManual)) {
    warnings.push({
      code: 'manual_model',
      message: 'Model katalogda yok. Manuel model girisi kullaniliyor.',
      path: 'modelNameManual',
    });
  }

  if (selection.year != null) {
    const currentYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(selection.year) || selection.year < 1886 || selection.year > currentYear) {
      errors.push({
        code: 'invalid_year',
        message: 'Yil degeri gecerli bir aralikta olmalidir.',
        path: 'year',
      });
    }
  }

  if (selection.generationSlug) {
    if (!model) {
      errors.push({
        code: 'generation_without_model',
        message: 'Generation secimi icin once katalogdan model secilmelidir.',
        path: 'generationSlug',
      });
    } else if (!model.generations.find((generation) => generation.slug === selection.generationSlug)) {
      errors.push({
        code: 'unknown_generation',
        message: 'Secilen generation katalogda bulunamadi.',
        path: 'generationSlug',
      });
    }
  }

  if (selection.trimSlug || selection.engineSlug || (selection.equipmentPackageSlugs || []).length) {
    if (!model) {
      errors.push({
        code: 'spec_without_model',
        message: 'Trim, motor veya donanim secimi icin once model secilmelidir.',
        path: 'modelSlug',
      });
    }
  }

  return createValidationResult(errors, warnings);
}

export function validateCatalogSuggestion(suggestion: CatalogSuggestion): ValidationResult {
  const errors: ValidationIssue[] = [];

  if (!hasValue(suggestion.typeKey)) {
    errors.push({
      code: 'type_required',
      message: 'Yeni katalog onerisi icin vasita tipi zorunludur.',
      path: 'typeKey',
    });
  }

  if (!hasValue(suggestion.brandName)) {
    errors.push({
      code: 'brand_name_required',
      message: 'Yeni katalog onerisi icin marka adi zorunludur.',
      path: 'brandName',
    });
  }

  if (suggestion.year != null) {
    const currentYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(suggestion.year) || suggestion.year < 1886 || suggestion.year > currentYear) {
      errors.push({
        code: 'invalid_year',
        message: 'Onerilen yil degeri gecerli degil.',
        path: 'year',
      });
    }
  }

  return createValidationResult(errors);
}

export function hasCatalogModels(brand: BrandRecord | null) {
  return Boolean(brand && brand.models.length > 0);
}

export function hasCatalogGenerations(model: ModelRecord | null) {
  return Boolean(model && model.generations.length > 0);
}
