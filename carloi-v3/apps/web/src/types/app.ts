import type { BackendEnvelope, RegisterPayload } from '@carloi-v3/shared';

export type VerificationChannel = 'email' | 'phone';
export type CreateVisibilityScope = 'vehicle-only' | 'profile-and-vehicle' | 'feed-profile-and-vehicle';

export interface SnapshotAuth {
  isRegistered: boolean;
  isAuthenticated: boolean;
  email?: string;
  phone?: string;
  sessionToken?: string;
}

export interface SnapshotProfile {
  id?: string;
  name: string;
  handle: string;
  bio?: string;
  followers: number;
  following: number;
  posts: number;
  soldListings: number;
  verified?: boolean;
  avatarUri?: string;
  coverUri?: string;
  profileLink?: string;
  followingHandles?: string[];
}

export interface SnapshotUserCard {
  id: string;
  name: string;
  handle: string;
  note?: string;
  avatarUri?: string;
  coverUri?: string;
  profileLink?: string;
}

export interface SnapshotMedia {
  id?: string;
  uri?: string;
  url?: string;
  type?: 'image' | 'video' | 'report' | string;
  posterUrl?: string;
  width?: number;
  height?: number;
  label?: string;
  hint?: string;
}

export interface SnapshotListing {
  title?: string;
  price?: string | number;
  city?: string;
  district?: string;
  location?: string;
  vehicleSummary?: string;
  mileageKm?: number;
  plateNumber?: string;
  sellerType?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
  phone?: string;
  description?: string;
  damageRecord?: string;
  paintInfo?: string;
  changedParts?: string;
  accidentInfo?: string;
  extraEquipment?: string;
  complianceStatus?: string;
  expertizSummary?: string;
  detailUrl?: string;
  summaryLine?: string;
  sellerHandle?: string;
  sellerName?: string;
  previewImageUri?: string;
}

export interface SnapshotComment {
  id: string;
  authorName: string;
  handle: string;
  content: string;
  createdAt: string;
}

export interface SnapshotPost {
  id: string;
  authorName: string;
  handle: string;
  role?: string;
  time?: string;
  createdAt?: string;
  authorAvatarUri?: string;
  content: string;
  hashtags?: string[];
  media?: SnapshotMedia[];
  likes?: number;
  comments?: number;
  reposts?: number;
  shares?: number;
  views?: number;
  type?: 'standard' | 'listing';
  likedByUser?: boolean;
  savedByUser?: boolean;
  repostedByUser?: boolean;
  listing?: SnapshotListing;
  commentList?: SnapshotComment[];
  repostOf?: SnapshotPost;
  repostSourceId?: string;
  shareLink?: string;
  lastEditedAt?: string;
}

export interface SnapshotMessage {
  id: string;
  senderHandle: string;
  senderName: string;
  text: string;
  attachments?: Array<{ id?: string; url?: string; type?: string; name?: string }>;
  time?: string;
  isMine?: boolean;
  editedAt?: string;
  isDeletedForEveryone?: boolean;
  canEdit?: boolean;
  canDeleteForEveryone?: boolean;
}

export interface SnapshotAgreement {
  buyerAgreed?: boolean;
  sellerAgreed?: boolean;
  myRole?: 'buyer' | 'seller';
  myAgreed?: boolean;
  counterpartyAgreed?: boolean;
}

export interface SnapshotInsuranceStatus {
  registrationSharedAt?: string;
  paymentStatus?: string;
  quoteAmount?: number;
  registrationInfo?: Record<string, unknown>;
  policyUri?: string;
  invoiceUri?: string;
  policySentAt?: string;
  invoiceSentAt?: string;
}

export interface SnapshotConversation {
  id: string;
  type: 'direct' | 'group' | 'listing';
  name: string;
  handle: string;
  unread?: number;
  isOnline?: boolean;
  lastMessage?: string;
  lastSeen?: string;
  participantHandles?: string[];
  participantNames?: string[];
  avatarUri?: string;
  messages: SnapshotMessage[];
  listingContext?: SnapshotPost;
  agreement?: SnapshotAgreement;
  insuranceStatus?: SnapshotInsuranceStatus;
  saleProcess?: {
    state?: string;
    stateLabel?: string;
    paymentGuidanceEnabled?: boolean;
  };
}

export interface SnapshotAiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  editedAt?: string;
  canEdit?: boolean;
  relatedPostIds?: string[];
}

export interface SnapshotCommercial {
  status?: string;
  companyName?: string;
  authorizedPerson?: string;
  businessType?: string;
  pendingDocuments?: string[];
  approvedAt?: string;
  rejectedReason?: string;
  riskLevel?: string;
  reviewNote?: string;
  publishingBlockedReason?: string;
}

export interface SnapshotAdmin {
  isAdmin?: boolean;
  roleKeys?: string[];
  permissions?: string[];
}

export interface SnapshotSettings {
  membershipPlan?: string;
  email?: string;
  phone?: string;
  profileVisibility?: string;
  garageVisibility?: string;
  plateVisibility?: string;
  language?: string;
  theme?: string;
  notifications?: Record<string, boolean>;
}

export interface GarageVehicleMedia {
  id: string;
  url: string;
  kind: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  sortOrder?: number;
}

export interface GarageVehicleRegistration {
  ownerName?: string;
  ownerIdentifier?: string;
  registrationCity?: string;
  registrationSerial?: string;
  registrationNumber?: string;
  issuedAt?: string | null;
}

export interface GarageVehicleChassis {
  chassisNo?: string;
  engineNo?: string;
  notes?: string;
}

export interface GarageVehicleLatestReport {
  id: string;
  healthScore?: number | null;
  drivingScore?: number | null;
  dtcSummary?: Array<Record<string, unknown>>;
  sensorSummary?: Array<Record<string, unknown>>;
  riskSummary?: Array<Record<string, unknown>>;
  comparisonSummary?: Array<Record<string, unknown>>;
  report?: Record<string, unknown>;
  createdAt?: string;
}

export interface GarageVehicleRecord {
  id: string;
  userId: string;
  vehicleType: string;
  brand: string;
  model: string;
  generation?: string;
  year?: number | null;
  trim?: string;
  engine?: string;
  fuelType?: string;
  transmission?: string;
  drivetrain?: string;
  bodyType?: string;
  marketRegion?: string;
  color?: string;
  plate?: string;
  plateDisplay?: string;
  plateIsHidden?: boolean;
  mileageKm?: number | null;
  equipment: string[];
  paintMap?: Record<string, unknown>;
  showInProfile?: boolean;
  isPrimary?: boolean;
  obdConnectionStatus?: string;
  healthScore?: number | null;
  drivingScore?: number | null;
  createdAt?: string;
  updatedAt?: string;
  media: GarageVehicleMedia[];
  registration?: GarageVehicleRegistration | null;
  chassis?: GarageVehicleChassis | null;
  latestExpertiseReport?: GarageVehicleLatestReport | null;
  listingDefaults?: Record<string, unknown>;
  canCreateListing?: boolean;
}

export interface SnapshotGarage {
  vehicles: GarageVehicleRecord[];
  totalVehicles: number;
  primaryVehicleId?: string | null;
}

export interface AppSnapshot {
  auth: SnapshotAuth;
  profile: SnapshotProfile;
  vehicle?: Record<string, unknown>;
  garage?: SnapshotGarage;
  settings?: SnapshotSettings;
  posts: SnapshotPost[];
  conversations: SnapshotConversation[];
  aiMessages: SnapshotAiMessage[];
  profileSegment?: string;
  directoryUsers: SnapshotUserCard[];
  commercial?: SnapshotCommercial;
  admin?: SnapshotAdmin;
}

export interface PublicProfilePayload {
  profile: SnapshotProfile;
  posts: SnapshotPost[];
  listings: SnapshotPost[];
  followers: SnapshotUserCard[];
  following: SnapshotUserCard[];
}

export interface AppErrorState {
  title: string;
  description: string;
  kind?: string;
}

export interface PendingVerificationState {
  channel: VerificationChannel;
  email?: string;
  phone?: string;
  maskedDestination?: string;
  expiresAt?: string;
  accountType: 'individual' | 'commercial';
}

export type AppEnvelope = BackendEnvelope & {
  maskedDestination?: string;
  expiresAt?: string;
  verificationChannel?: VerificationChannel;
};

export interface RegisterWizardDraft extends RegisterPayload {
  surname?: string;
  verificationCode?: string;
}
