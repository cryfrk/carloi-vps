export type AccountType = 'individual' | 'commercial';
export type AuthVerificationChannel = 'email' | 'phone';
export type CommercialStatus =
  | 'not_applied'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'revoked';
export type CommercialProfileStatus =
  | 'draft'
  | 'submitted'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'revoked';
export type MediaKind = 'image' | 'video' | 'gif' | 'report';
export type PostType = 'standard' | 'listing';

export type VehicleType =
  | 'Otomobil'
  | 'SUV'
  | 'Ticari araç'
  | 'Minibüs'
  | 'Otobüs'
  | 'Karavan'
  | 'Pick-up'
  | 'Motosiklet'
  | 'ATV'
  | 'UTV'
  | 'Tır'
  | 'Çekici'
  | 'Kamyon'
  | 'Kamyonet'
  | 'İş makinesi'
  | 'Kepçe'
  | 'Forklift'
  | 'Traktör'
  | 'Tekne'
  | 'Yat'
  | 'Jet ski'
  | 'Diğer';

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  label: string;
  hint: string;
  uri?: string;
  tone?: string;
}

export interface ListingFact {
  label: string;
  value: string;
}

export interface ListingDetails {
  title: string;
  price: string;
  location: string;
  city: string;
  district: string;
  contactPhone?: string;
  sellerName: string;
  sellerHandle: string;
  description: string;
  summaryLine: string;
  listingLink: string;
  badges: string[];
  factorySpecs: string[];
  reportHighlights: string[];
  specTable: ListingFact[];
  conditionTable: ListingFact[];
  equipment: string[];
  extraEquipment?: string;
  showExpertiz: boolean;
  isSold?: boolean;
  soldAt?: string;
  stats: {
    views: number;
    saves: number;
    shares: number;
    messages: number;
    calls: number;
  };
}

export interface PostComment {
  id: string;
  authorName: string;
  handle: string;
  content: string;
  time: string;
  authorAvatarUri?: string;
}

export interface Post {
  id: string;
  authorName: string;
  handle: string;
  role: string;
  time: string;
  createdAt: string;
  authorAvatarUri?: string;
  content: string;
  hashtags: string[];
  media: MediaAsset[];
  likes: number;
  comments: number;
  reposts: number;
  shares: number;
  views: number;
  type: PostType;
  likedByUser?: boolean;
  savedByUser?: boolean;
  repostedByUser?: boolean;
  listing?: ListingDetails;
  commentList: PostComment[];
  shareLink: string;
  lastEditedAt?: string;
}

export interface SearchResultUser {
  id: string;
  name: string;
  handle: string;
  note: string;
  avatarUri?: string;
  coverUri?: string;
  profileLink?: string;
}

export interface SocialProfile {
  name: string;
  handle: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  soldListings?: number;
  verified: boolean;
  avatarUri?: string;
  coverUri?: string;
  followingHandles: string[];
}

export interface LiveMetric {
  id: string;
  label: string;
  value: string;
  helper: string;
}

export interface FaultCode {
  code: string;
  title: string;
  severity: 'Dikkat' | 'Orta' | 'Yuksek';
  detail: string;
}

export interface PartPrediction {
  name: string;
  probability: number;
  marketPrice: string;
  repairCost: string;
  explanation: string;
}

export interface VehicleProfile {
  brand: string;
  model: string;
  year: string;
  packageName: string;
  mileage: string;
  engineVolume: string;
  vin: string;
  fuelType?: string;
  obdConnected: boolean;
  obdLastSyncAt?: string;
  healthScore?: number;
  driveScore?: number;
  liveMetrics: LiveMetric[];
  faultCodes: FaultCode[];
  probableFaultyParts: PartPrediction[];
  upcomingRisks: PartPrediction[];
  summary: string;
  actions: string[];
  equipment: string[];
  extraEquipment?: string;
}

export interface MessageAttachment {
  id: string;
  kind: 'image' | 'video' | 'audio' | 'location' | 'report';
  label: string;
  uri?: string;
  mimeType?: string;
}

export interface ConversationMessage {
  id: string;
  senderHandle: string;
  senderName: string;
  text: string;
  time: string;
  isMine: boolean;
  attachments?: MessageAttachment[];
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'listing';
  name: string;
  handle: string;
  unread: number;
  isOnline: boolean;
  lastMessage: string;
  lastSeen: string;
  participantHandles: string[];
  participantNames: string[];
  avatarUri?: string;
  messages: ConversationMessage[];
  listingContext?: {
    postId: string;
    title: string;
    price: string;
    location: string;
    summaryLine: string;
    sellerHandle: string;
    sellerName: string;
    previewImageUri?: string;
  };
  saleProcess?: {
    id: string;
    listingId: string;
    status: 'interest' | 'negotiating' | 'payment_guidance_shown' | 'ready_for_notary' | 'completed' | 'cancelled';
    guidanceEnabled: boolean;
    requiresGuidanceAcknowledgement: boolean;
  };
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  relatedPostIds?: string[];
  provider?: string;
}

export interface CommercialProfileSummary {
  id: string;
  userId: string;
  companyName: string;
  taxOrIdentityType: 'VKN' | 'TCKN';
  taxOrIdentityNumber: string;
  tradeName?: string | null;
  mersisNumber?: string | null;
  authorizedPersonName?: string | null;
  authorizedPersonTitle?: string | null;
  phone: string;
  city: string;
  district: string;
  address: string;
  notes?: string | null;
  status: CommercialProfileStatus;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialDocumentSummary {
  id: string;
  userId: string;
  commercialProfileId: string;
  type:
    | 'tax_document'
    | 'authorization_certificate'
    | 'trade_registry'
    | 'identity_document'
    | 'other';
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  status: 'uploaded' | 'pending_review' | 'approved' | 'rejected' | 'expired';
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  rejectReason?: string | null;
  verificationMethod: 'manual_admin_review' | 'e_devlet_reference' | 'external_check' | 'unverified';
  suspiciousFlag: boolean;
}

export interface CommercialStatusSummary {
  enabled: boolean;
  accountType: AccountType;
  commercialStatus: CommercialStatus;
  canUseCommercialListingFeatures: boolean;
  pendingReview: boolean;
  additionalVerificationRequired: boolean;
  yearlyVehicleSaleCount: number;
  yearlyVehicleListingCount: number;
  commercialBehaviorFlag: boolean;
  profile?: CommercialProfileSummary | null;
  documents: CommercialDocumentSummary[];
  currentDocuments?: CommercialDocumentSummary[];
  documentHistory?: CommercialDocumentSummary[];
  suspiciousDocumentCount: number;
  minimumDocumentSet: {
    hasMinimumSet: boolean;
    requiredDocumentTypes: string[];
  };
  requiredDocumentTypes: string[];
  canResubmit?: boolean;
  featureRestrictionLevel?: 'none' | 'publish_blocked' | 'full';
  publishingBlockedReason?: string | null;
  nextActions: string[];
}

export interface UserSettings {
  membershipPlan: string;
  email: string;
  phone: string;
  legalFullName: string;
  identityNumber: string;
  birthDate: string;
  addressLine: string;
  city: string;
  district: string;
  postalCode: string;
  defaultPlateNumber: string;
  registrationOwnerName: string;
  registrationOwnerIdentityNumber: string;
  registrationSerialNumber: string;
  registrationDocumentNumber: string;
  language: 'tr' | 'en';
  privateProfile: boolean;
  allowMessageRequests: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  biometricLock: boolean;
  twoFactorEnabled: boolean;
  aiDataSharing: boolean;
  showSavedAdsOnProfile: boolean;
  showLastSeen: boolean;
  allowCalls: boolean;
  autoplayVideo: boolean;
  quickLoginEnabled: boolean;
  useDeviceLocation: boolean;
  shareLocationWithAi: boolean;
  showSoldCountOnProfile: boolean;
}

export interface AdminAccessSummary {
  isAdmin: boolean;
  roleKeys: string[];
  permissions: string[];
}

export interface AuthState {
  isRegistered: boolean;
  isAuthenticated: boolean;
  email: string;
  phone: string;
  passwordHash: string;
  sessionToken?: string;
  registeredAt?: string;
  lastLoginAt?: string;
}

export interface AppSnapshot {
  auth: AuthState;
  profile: SocialProfile;
  commercial: CommercialStatusSummary;
  admin?: AdminAccessSummary;
  vehicle?: VehicleProfile;
  settings: UserSettings;
  posts: Post[];
  conversations: Conversation[];
  aiMessages: AIMessage[];
  profileSegment: 'paylasimlar' | 'ilanlar' | 'kaydedilenler' | 'ayarlar';
  directoryUsers: SearchResultUser[];
}

export interface PublicProfilePayload {
  profile: Omit<SocialProfile, 'followingHandles'> & { id: string; profileLink: string };
  posts: Post[];
  listings: Post[];
  followers: SearchResultUser[];
  following: SearchResultUser[];
}

export interface BackendResponse<T = unknown> {
  success: boolean;
  message?: string;
  token?: string;
  snapshot?: AppSnapshot;
  post?: Post;
  profile?: PublicProfilePayload['profile'];
  posts?: Post[];
  listings?: Post[];
  followers?: SearchResultUser[];
  following?: SearchResultUser[];
  email?: string;
  phone?: string;
  expiresAt?: string;
  maskedDestination?: string;
  verificationChannel?: AuthVerificationChannel;
  deliveryFailed?: boolean;
  emailDisabled?: boolean;
  emailNotConfigured?: boolean;
  smsDisabled?: boolean;
  smsNotConfigured?: boolean;
  provider?: string;
  relatedPostIds?: string[];
  url?: string;
  data?: T;
  commercial?: CommercialStatusSummary;
  reviews?: CommercialReviewSummary[];
  review?: CommercialReviewDetail;
}

export interface AuthResult {
  token?: string;
  snapshot?: AppSnapshot;
  message?: string;
  email?: string;
  phone?: string;
  expiresAt?: string;
  maskedDestination?: string;
  verificationChannel?: AuthVerificationChannel;
  deliveryFailed?: boolean;
  emailDisabled?: boolean;
  emailNotConfigured?: boolean;
  smsDisabled?: boolean;
  smsNotConfigured?: boolean;
}

export interface RegisterPayload {
  name: string;
  handle: string;
  bio?: string;
  email?: string;
  phone?: string;
  password: string;
  primaryChannel: AuthVerificationChannel;
  accountType: AccountType;
  signupVerification?: {
    code?: string;
  };
  commercialProfile?: {
    companyName?: string;
    taxOrIdentityType?: 'VKN' | 'TCKN';
    taxOrIdentityNumber?: string;
    tradeName?: string;
    mersisNumber?: string;
    authorizedPersonName?: string;
    authorizedPersonTitle?: string;
    phone?: string;
    city?: string;
    district?: string;
    address?: string;
    notes?: string;
  };
  consents: Array<{
    type: string;
    accepted?: boolean;
    version?: string;
    sourceScreen?: string;
  }>;
}

export interface CreatePostPayload {
  content: string;
  postType: PostType;
  selectedMediaKinds: MediaKind[];
  selectedMedia?: Array<{
    kind: MediaKind;
    uri?: string;
    label: string;
    hint: string;
    fileName?: string;
    mimeType?: string;
  }>;
  listingDraft?: Record<string, unknown>;
  listingFlow?: Record<string, unknown>;
  consents?: Array<{
    type: string;
    accepted?: boolean;
    version?: string;
    sourceScreen?: string;
  }>;
}

export interface CommercialReviewSummary {
  profileId: string;
  userId: string;
  companyName: string;
  status: CommercialProfileStatus;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  suspiciousDocumentCount: number;
  requiredDocumentTypes: string[];
  userName?: string;
  userHandle?: string;
  phone?: string;
  city?: string;
}

export interface CommercialReviewDetail {
  profile: CommercialProfileSummary;
  documents: CommercialDocumentSummary[];
  adminNotes?: Array<{
    id: string;
    note: string;
    noteType?: string;
    createdAt: string;
    adminId?: string;
  }>;
  user?: {
    id: string;
    name: string;
    handle: string;
    email?: string;
    phone?: string;
  };
}

export interface VehicleSeedModel {
  name: string;
  packages: string[];
  engineOptions: string[];
  fuels: string[];
  gearboxes: string[];
}

export interface VehicleSeedBrand {
  name: string;
  models: VehicleSeedModel[];
}

export interface VehicleSeedCategory {
  type: VehicleType;
  brands: VehicleSeedBrand[];
}

export interface DesignTokens {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
}
