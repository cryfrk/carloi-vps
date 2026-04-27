export type VehicleTypeKey =
  | 'otomobil'
  | 'suv'
  | 'ticari-arac'
  | 'minibus'
  | 'otobus'
  | 'karavan'
  | 'pick-up'
  | 'motosiklet'
  | 'atv'
  | 'utv'
  | 'tir'
  | 'cekici'
  | 'kamyon'
  | 'kamyonet'
  | 'is-makinesi'
  | 'kepce'
  | 'forklift'
  | 'traktor'
  | 'tekne'
  | 'yat'
  | 'jet-ski'
  | 'diger';

export type FuelTypeKey =
  | 'benzin'
  | 'dizel'
  | 'lpg'
  | 'hibrit'
  | 'plug-in-hibrit'
  | 'elektrik'
  | 'cng'
  | 'lng'
  | 'hidrojen'
  | 'iki-zamanli-benzin'
  | 'deniz-benzin'
  | 'deniz-dizel'
  | 'belirsiz';

export type TransmissionKey =
  | 'manuel'
  | 'otomatik'
  | 'yari-otomatik'
  | 'cvt'
  | 'dct'
  | 'tek-vites'
  | 'distan-takma'
  | 'inboard-drive'
  | 'belirsiz';

export type DrivetrainKey =
  | 'fwd'
  | 'rwd'
  | 'awd'
  | '4wd'
  | 'zincir'
  | 'kayis'
  | 'saft'
  | 'distan-takma'
  | 'palet'
  | 'artikule'
  | 'belirsiz';

export type BodyTypeKey =
  | 'sedan'
  | 'hatchback'
  | 'wagon'
  | 'coupe'
  | 'cabrio'
  | 'suv'
  | 'crossover'
  | 'pickup'
  | 'van'
  | 'minibus'
  | 'bus'
  | 'camper'
  | 'naked'
  | 'sportbike'
  | 'touring'
  | 'adventure'
  | 'scooter'
  | 'atv'
  | 'utv'
  | 'tractor-unit'
  | 'truck'
  | 'tractor'
  | 'excavator'
  | 'backhoe-loader'
  | 'forklift'
  | 'boat'
  | 'yacht'
  | 'jetski'
  | 'other';

export type MarketRegionKey =
  | 'global'
  | 'turkiye'
  | 'europe'
  | 'north-america'
  | 'latin-america'
  | 'middle-east-africa'
  | 'asia-pacific'
  | 'marine-global'
  | 'powersports-global'
  | 'heavy-commercial-global'
  | 'industrial-global'
  | 'agriculture-global';

export type CatalogCompleteness =
  | 'brand-only'
  | 'model-only'
  | 'partial'
  | 'detailed';

export interface YearRange {
  start: number;
  end?: number | null;
  label?: string;
}

export interface EquipmentPackageRecord {
  slug: string;
  name: string;
  notes?: string;
}

export interface TrimRecord {
  slug: string;
  name: string;
  notes?: string;
  equipmentPackageSlugs?: string[];
}

export interface EngineRecord {
  slug: string;
  name: string;
  fuelType: FuelTypeKey;
  transmissionOptions?: TransmissionKey[];
  drivetrainOptions?: DrivetrainKey[];
  notes?: string;
}

export interface GenerationRecord {
  slug: string;
  name: string;
  yearRanges: YearRange[];
  bodyTypes?: BodyTypeKey[];
  trims: TrimRecord[];
  engines: EngineRecord[];
  equipmentPackages: EquipmentPackageRecord[];
  completeness: CatalogCompleteness;
  manualSpecEntryAllowed?: boolean;
  notes?: string;
}

export interface ModelRecord {
  slug: string;
  name: string;
  aliases?: string[];
  bodyTypes?: BodyTypeKey[];
  generations: GenerationRecord[];
  completeness: CatalogCompleteness;
  manualGenerationEntryAllowed?: boolean;
  manualSpecEntryAllowed?: boolean;
  notes?: string;
}

export interface BrandRecord {
  slug: string;
  name: string;
  aliases?: string[];
  typeKey: VehicleTypeKey;
  marketRegions: MarketRegionKey[];
  models: ModelRecord[];
  completeness: CatalogCompleteness;
  manualModelEntryAllowed?: boolean;
  notes?: string;
}

export interface VehicleTypeRecord {
  key: VehicleTypeKey;
  label: string;
  marketRegions: MarketRegionKey[];
  supportsObd: boolean;
  supportsCommercialListing: boolean;
  supportsProfileShowcase: boolean;
  manualBrandEntryAllowed: boolean;
  manualModelEntryAllowed: boolean;
}

export interface VehicleCatalogDataset {
  version: string;
  sourcePolicy: string;
  notes: string[];
  vehicleTypes: VehicleTypeRecord[];
  brands: BrandRecord[];
}

export interface VehicleSelection {
  typeKey?: VehicleTypeKey | null;
  brandSlug?: string | null;
  brandNameManual?: string | null;
  modelSlug?: string | null;
  modelNameManual?: string | null;
  year?: number | null;
  generationSlug?: string | null;
  generationNameManual?: string | null;
  trimSlug?: string | null;
  trimNameManual?: string | null;
  engineSlug?: string | null;
  engineNameManual?: string | null;
  bodyType?: BodyTypeKey | null;
  fuelType?: FuelTypeKey | null;
  transmission?: TransmissionKey | null;
  drivetrain?: DrivetrainKey | null;
  equipmentPackageSlugs?: string[];
  customFeatures?: string[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface CatalogSearchInput {
  query?: string;
  typeKey?: VehicleTypeKey;
  brandSlug?: string;
  region?: MarketRegionKey;
}

export interface CatalogSuggestion {
  typeKey: VehicleTypeKey;
  brandName: string;
  modelName?: string;
  generationName?: string;
  year?: number;
  notes?: string;
  source: 'manual-user' | 'admin-curation';
}
