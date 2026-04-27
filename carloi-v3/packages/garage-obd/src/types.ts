import type {
  DrivetrainKey,
  EngineRecord,
  FuelTypeKey,
  TransmissionKey,
  VehicleSelection,
  VehicleTypeKey
} from '@carloi-v3/vehicle-catalog';

export type GarageWizardStepKey =
  | 'vehicle-type'
  | 'brand'
  | 'model'
  | 'year'
  | 'trim'
  | 'engine'
  | 'mileage'
  | 'color'
  | 'plate'
  | 'equipment'
  | 'paint-map'
  | 'registration'
  | 'chassis'
  | 'photos';

export type VehicleVisibilityScope = 'private' | 'profile' | 'garage' | 'listing-ready';
export type PlateVisibilityMode = 'full' | 'masked' | 'hidden';
export type OwnershipBasis =
  | 'registered-owner'
  | 'authorized-representative'
  | 'family-use'
  | 'commercial-inventory'
  | 'other';

export type PaintStatus = 'unknown' | 'original' | 'painted' | 'local-painted' | 'replaced';

export type VehicleBodyPanelKey =
  | 'hood'
  | 'roof'
  | 'trunk'
  | 'front-bumper'
  | 'rear-bumper'
  | 'front-left-fender'
  | 'front-right-fender'
  | 'rear-left-fender'
  | 'rear-right-fender'
  | 'front-left-door'
  | 'front-right-door'
  | 'rear-left-door'
  | 'rear-right-door';

export interface VehicleMediaAsset {
  id: string;
  url?: string;
  localUri?: string;
  type: 'image' | 'video' | 'document';
  label?: string;
  uploadedAt?: string;
}

export interface VehiclePaintPanelState {
  panelKey: VehicleBodyPanelKey;
  label: string;
  status: PaintStatus;
  note?: string;
  updatedAt?: string;
}

export type VehiclePaintMap = Record<VehicleBodyPanelKey, VehiclePaintPanelState>;

export interface VehiclePaintAssessment {
  map: VehiclePaintMap;
  summaryNotes?: string;
  confirmed: boolean;
}

export interface VehicleRegistrationInfo {
  ownerName?: string;
  documentSerialMasked?: string;
  registrationCity?: string;
  registrationDate?: string;
  plateNumber?: string;
  notes?: string;
}

export interface VehicleEquipmentSelection {
  selectedPackageSlugs: string[];
  customEntries: string[];
  notes?: string;
  confirmed: boolean;
}

export interface VehicleListingConvenienceHints {
  hasRegistrationInfo: boolean;
  hasChassisNumber: boolean;
  hasPaintAssessment: boolean;
  hasObdProfile: boolean;
}

export interface GarageVehicleDraft {
  selection: VehicleSelection;
  displayName?: string;
  ownershipBasis: OwnershipBasis;
  mileageKm?: number;
  colorName?: string;
  plateNumber?: string;
  plateVisibility: PlateVisibilityMode;
  equipment: VehicleEquipmentSelection;
  paintAssessment: VehiclePaintAssessment;
  registration?: VehicleRegistrationInfo;
  registrationSkipped?: boolean;
  chassisNumber?: string;
  chassisSkipped?: boolean;
  photos: VehicleMediaAsset[];
  visibilityScope: VehicleVisibilityScope;
  notes?: string;
}

export interface GarageVehicleRecord extends GarageVehicleDraft {
  id: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  primaryTypeKey: VehicleTypeKey;
  healthScore?: number;
  driveScore?: number;
  currentFaultCount?: number;
  obdLinkedDeviceId?: string;
}

export type ObdTransport = 'bluetooth-classic' | 'bluetooth-le' | 'wifi';
export type ObdProtocol =
  | 'can-11-500'
  | 'can-29-500'
  | 'can-11-250'
  | 'can-29-250'
  | 'iso-9141-2'
  | 'iso-14230-4'
  | 'sae-j1850-vpw'
  | 'sae-j1850-pwm'
  | 'uds'
  | 'unknown';

export type ObdPermissionKey =
  | 'bluetooth'
  | 'bluetoothScan'
  | 'bluetoothConnect'
  | 'nearbyDevices'
  | 'location'
  | 'localNetwork'
  | 'wifiState';

export type ObdConnectionState =
  | 'idle'
  | 'requesting-permissions'
  | 'scanning'
  | 'device-selection'
  | 'auth-required'
  | 'connecting'
  | 'protocol-negotiation'
  | 'connected'
  | 'streaming'
  | 'disconnected'
  | 'error';

export type ObdConnectionEvent =
  | 'start-scan'
  | 'permissions-granted'
  | 'permissions-denied'
  | 'device-detected'
  | 'device-selected'
  | 'pin-required'
  | 'pin-submitted'
  | 'socket-opened'
  | 'protocol-detected'
  | 'stream-started'
  | 'disconnect'
  | 'failure'
  | 'reset';

export interface ObdPermissionRequirement {
  key: ObdPermissionKey;
  required: boolean;
  rationale: string;
}

export interface ObdDiscoveredDevice {
  id: string;
  name: string;
  address?: string;
  transport: ObdTransport;
  rssi?: number;
  manufacturerHint?: string;
  requiresPin: boolean;
  discoveryConfidence: 'unknown' | 'possible' | 'likely';
  isKnownObdCandidate: boolean;
}

export interface ObdConnectionProfile {
  transport: ObdTransport;
  selectedProtocol?: ObdProtocol;
  deviceId?: string;
  deviceName?: string;
  pairedAt?: string;
  lastConnectedAt?: string;
  lastFailureReason?: string;
}

export interface ObdDiagnosticTroubleCode {
  code: string;
  title?: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'stored' | 'pending' | 'permanent' | 'history';
  description?: string;
}

export type ObdSensorKey =
  | 'rpm'
  | 'coolant-temperature'
  | 'vehicle-speed'
  | 'battery-voltage'
  | 'fuel-level'
  | 'engine-load'
  | 'intake-air-temperature'
  | 'maf'
  | 'map'
  | 'short-fuel-trim-bank-1'
  | 'long-fuel-trim-bank-1'
  | 'lambda-bank-1'
  | 'throttle-position'
  | 'o2-bank-1-sensor-1'
  | 'o2-bank-1-sensor-2';

export interface ObdLiveSensorReading {
  sensorKey: ObdSensorKey;
  label: string;
  unit: string;
  value: number;
  recordedAt: string;
}

export type ExpertisePhase =
  | 'idle'
  | 'obd-precheck'
  | 'ready'
  | 'countdown'
  | 'collecting'
  | 'analyzing'
  | 'report-ready'
  | 'report-failed';

export type ExpertiseEvent =
  | 'start-precheck'
  | 'precheck-passed'
  | 'precheck-failed'
  | 'start-countdown'
  | 'countdown-finished'
  | 'data-threshold-met'
  | 'analysis-complete'
  | 'analysis-failed'
  | 'reset';

export interface ExpertiseCountdown {
  totalSeconds: number;
  remainingSeconds: number;
}

export interface ExpertiseTelemetryWindow {
  startedAt: string;
  endedAt?: string;
  sampleCount: number;
  averageSpeedKmh?: number;
  maxSpeedKmh?: number;
  sensorCoverageRate?: number;
}

export interface ExpertiseRiskPartHint {
  partKey: string;
  title: string;
  reason: string;
  probability: 'low' | 'medium' | 'high';
}

export interface ExpertiseReport {
  id: string;
  vehicleId: string;
  createdAt: string;
  phase: Extract<ExpertisePhase, 'report-ready' | 'report-failed'>;
  protocol?: ObdProtocol;
  healthScore?: number;
  driveScore?: number;
  dtcCodes: ObdDiagnosticTroubleCode[];
  liveSensors: ObdLiveSensorReading[];
  telemetry: ExpertiseTelemetryWindow;
  riskHints: ExpertiseRiskPartHint[];
  comparisonNotes: string[];
  reportPdfUrl?: string;
}

export interface GarageScreenDefinition {
  id: string;
  route: string;
  title: string;
  purpose: string;
  primaryAction?: string;
  secondaryAction?: string;
}

export interface VehicleListingReadiness {
  ready: boolean;
  missingFields: string[];
  warnings: string[];
  convenienceHints: VehicleListingConvenienceHints;
}

export interface GarageWizardStepDefinition {
  key: GarageWizardStepKey;
  title: string;
  description: string;
  required: boolean;
}

export interface SelectedEngineSnapshot {
  slug: string;
  name: string;
  fuelType: FuelTypeKey;
  transmissionOptions?: TransmissionKey[];
  drivetrainOptions?: DrivetrainKey[];
}

export interface VehicleRuntimeSummary {
  vehicleId: string;
  hasObdProfile: boolean;
  latestEngine?: SelectedEngineSnapshot | EngineRecord;
  latestFaultCodes: ObdDiagnosticTroubleCode[];
  latestHealthScore?: number;
  latestDriveScore?: number;
}
