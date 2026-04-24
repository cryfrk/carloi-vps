import type { ImageSourcePropType } from 'react-native';

export type TabKey = 'home' | 'messages' | 'ai' | 'vehicle' | 'profile';

export type MediaTone = 'cyan' | 'amber' | 'coral' | 'slate' | 'emerald';

export type MediaKind = 'image' | 'video' | 'gif' | 'report';

export type AppLanguage = 'tr' | 'en';
export type AccountType = 'individual' | 'commercial';
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
export type CommercialDocumentType =
  | 'tax_document'
  | 'authorization_certificate'
  | 'trade_registry'
  | 'identity_document'
  | 'other';
export type CommercialDocumentStatus =
  | 'uploaded'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired';
export type CommercialVerificationMethod =
  | 'manual_admin_review'
  | 'e_devlet_reference'
  | 'external_check'
  | 'unverified';

export type AuthVerificationChannel = 'email' | 'phone';
export type SocialAuthProvider = 'google' | 'apple';

export type ProfileSegment = 'paylasimlar' | 'ilanlar' | 'kaydedilenler' | 'ayarlar';

export type MembershipSource = 'standard' | 'google_play' | 'app_store' | 'admin';

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  label: string;
  hint: string;
  tone: MediaTone;
  asset?: ImageSourcePropType;
  uri?: string;
}

export interface ListingFact {
  label: string;
  value: string;
}

export interface ListingStats {
  views: number;
  saves: number;
  shares: number;
  messages: number;
  calls: number;
}

export interface ListingRegistrationInfo {
  ownerName: string;
  ownerIdentityNumber: string;
  serialNumber: string;
  documentNumber: string;
  plateNumber: string;
}

export interface ListingDetails {
  title: string;
  price: string;
  location: string;
  city: string;
  district: string;
  latitude?: number;
  longitude?: number;
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
  registrationInfo?: ListingRegistrationInfo;
  complianceStatus?: ListingCreateFlowState | 'published' | 'restricted' | 'submitted';
  authorizationStatus?: 'not_required' | 'declared' | 'pending_review' | 'approved' | 'rejected';
  eidsStatus?:
    | 'not_started'
    | 'declared'
    | 'pending'
    | 'verified_externally'
    | 'manual_review_required'
    | 'failed';
  riskScore?: number;
  riskLevel?: ListingRiskLevel;
  reviewRequiredReason?: string;
  duplicatePlateFlag?: boolean;
  abnormalPriceFlag?: boolean;
  spamContentFlag?: boolean;
  billingStatus?: ListingBillingStatus;
  stats: ListingStats;
}

export interface PostComment {
  id: string;
  authorName: string;
  handle: string;
  authorAvatarUri?: string;
  content: string;
  time: string;
}

export interface RepostPreview {
  id: string;
  authorName: string;
  handle: string;
  authorAvatarUri?: string;
  content: string;
  media: MediaAsset[];
  listing?: ListingDetails;
  type: 'standard' | 'listing';
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
  type: 'standard' | 'listing';
  likedByUser?: boolean;
  savedByUser?: boolean;
  repostedByUser?: boolean;
  listing?: ListingDetails;
  commentList: PostComment[];
  repostOf?: RepostPreview;
  repostSourceId?: string;
  shareLink: string;
  lastEditedAt?: string;
}

export interface ConversationMessage {
  id: string;
  senderHandle: string;
  senderName: string;
  text: string;
  time: string;
  isMine: boolean;
  attachments?: MessageAttachment[];
  editedAt?: string;
  isDeletedForEveryone?: boolean;
  canEdit?: boolean;
  canDeleteForEveryone?: boolean;
}

export interface ListingConversationContext {
  postId: string;
  title: string;
  price: string;
  location: string;
  summaryLine: string;
  sellerHandle: string;
  sellerName: string;
  previewImageUri?: string;
}

export interface ListingConversationAgreement {
  buyerAgreed: boolean;
  sellerAgreed: boolean;
  myRole: 'buyer' | 'seller';
  myAgreed: boolean;
  counterpartyAgreed: boolean;
}

export interface MessageAttachment {
  id: string;
  kind: 'image' | 'video' | 'audio' | 'location' | 'report';
  label: string;
  uri?: string;
  mimeType?: string;
  durationMs?: number;
  latitude?: number;
  longitude?: number;
  city?: string;
  district?: string;
  locationLine?: string;
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
  listingContext?: ListingConversationContext;
  agreement?: ListingConversationAgreement;
  insuranceStatus?: {
    registrationSharedAt?: string;
    registrationInfo?: ListingRegistrationInfo;
    paymentStatus?:
      | 'missing'
      | 'awaiting_quote'
      | 'quoted'
      | 'payment_pending'
      | 'paid'
      | 'processing'
      | 'policy_sent';
    quoteAmount?: string;
    invoiceUri?: string;
    policyUri?: string;
    policySentAt?: string;
    invoiceSentAt?: string;
  };
  saleProcess?: SaleProcessSummary;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  relatedPostIds?: string[];
  provider?: string;
  editedAt?: string;
  canEdit?: boolean;
}

export interface AIStep {
  id: string;
  label: string;
  detail: string;
  status: 'done' | 'active' | 'queued';
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

export type ObdTransport = 'bluetooth' | 'wifi';

export interface ObdDiscoveredDevice {
  id: string;
  name: string;
  transport: ObdTransport;
  address?: string;
  secure?: boolean;
  signalLevel?: number;
  hint?: string;
  isLikelyObd?: boolean;
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
  obdTransport?: ObdTransport;
  obdDeviceId?: string;
  obdDeviceName?: string;
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
  documentTruthfulnessAcceptedAt?: string | null;
  additionalVerificationAcknowledgedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialDocumentSummary {
  id: string;
  userId: string;
  commercialProfileId: string;
  type: CommercialDocumentType;
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  status: CommercialDocumentStatus;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  rejectReason?: string | null;
  verificationMethod: CommercialVerificationMethod;
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
    requiredDocumentTypes: CommercialDocumentType[];
  };
  requiredDocumentTypes: CommercialDocumentType[];
  canResubmit?: boolean;
  featureRestrictionLevel?: 'none' | 'publish_blocked' | 'full';
  publishingBlockedReason?: string | null;
  nextActions: string[];
}

export type SaleProcessStatus =
  | 'interest'
  | 'negotiating'
  | 'payment_guidance_shown'
  | 'ready_for_notary'
  | 'completed'
  | 'cancelled';

export interface AdminAccessSummary {
  isAdmin: boolean;
  roleKeys: string[];
  permissions: string[];
}

export interface SaleProcessSummary {
  id: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  status: SaleProcessStatus;
  safePaymentInfoAcceptedAt?: string | null;
  safePaymentReferenceCode?: string | null;
  safePaymentProviderName?: string | null;
  safePaymentStatusNote?: string | null;
  guidanceEnabled: boolean;
  requiresGuidanceAcknowledgement: boolean;
}

export interface ExternalPaymentSession {
  paymentReference: string;
  paymentRecordId?: string | null;
  status: string;
  amount: string;
  currency: string;
  providerName: string;
  insuranceType: string;
  paymentUrl?: string;
  gatewayUrl?: string;
  trustMessage: string;
  conversationId?: string;
  vehicleSummary?: {
    title?: string;
    price?: string;
    location?: string;
    plateNumber?: string;
    modelYearSummary?: string;
  };
  returnUrls?: {
    appSuccessUrl: string;
    appFailureUrl: string;
    appCancelledUrl?: string;
    webSuccessUrl: string;
    webFailureUrl: string;
    webCancelledUrl?: string;
  };
}

export interface UserSettings {
  membershipPlan: string;
  membershipSource?: MembershipSource;
  membershipProductId?: string;
  membershipActivatedAt?: string;
  membershipExpiresAt?: string;
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
  language: AppLanguage;
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

export interface PremiumPlanProduct {
  id: string;
  key: 'monthly' | 'yearly';
  title: string;
  description: string;
  displayPrice: string;
}

export type ConsentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'content_responsibility'
  | 'listing_responsibility'
  | 'commercial_declaration'
  | 'safe_payment_information'
  | 'subscription_terms'
  | 'marketing_optional';

export interface ConsentInput {
  type: ConsentType;
  accepted?: boolean;
  version?: string;
  sourceScreen?: string;
}

export type ListingSellerRelationType =
  | 'owner'
  | 'spouse'
  | 'relative_second_degree'
  | 'authorized_business'
  | 'other_authorized';

export type ListingCreateFlowState =
  | 'draft'
  | 'vehicle_info_completed'
  | 'pricing_completed'
  | 'ownership_completed'
  | 'compliance_completed'
  | 'payment_pending'
  | 'submitted'
  | 'published'
  | 'restricted'
  | 'rejected'
  | 'suspended';

export type ListingBillingStatus = 'not_required' | 'pending' | 'paid' | 'failed' | 'waived';

export type ListingRiskLevel = 'low' | 'medium' | 'high';

export interface ListingVehicleInformationStepInput {
  title: string;
  city: string;
  district: string;
  location: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  transmission: string;
  fuelType: string;
  bodyType: string;
  color: string;
  plateOrigin: string;
  plateNumber?: string;
  includeExpertiz: boolean;
}

export interface ListingPricingDescriptionStepInput {
  price: string;
  description: string;
  content: string;
  damageRecord: string;
  paintInfo: string;
  changedParts: string;
  accidentInfo: string;
  extraEquipment: string;
}

export interface ListingOwnershipAuthorizationStepInput {
  sellerRelationType: ListingSellerRelationType;
  registrationOwnerFullNameDeclared: string;
  isOwnerSameAsAccountHolder: boolean;
  authorizationDeclarationText?: string;
  authorizationStatus?:
    | 'not_required'
    | 'declared'
    | 'pending_review'
    | 'approved'
    | 'rejected';
  eidsStatus?:
    | 'not_started'
    | 'declared'
    | 'pending'
    | 'verified_externally'
    | 'manual_review_required'
    | 'failed';
  registrationOwnerName?: string;
  registrationOwnerIdentityNumber?: string;
  registrationSerialNumber?: string;
  registrationDocumentNumber?: string;
}

export interface ListingComplianceResponsibilityStepInput {
  listingResponsibilityAccepted: boolean;
  authorizationDeclarationAccepted: boolean;
  safePaymentInformationAccepted: boolean;
}

export interface ListingBillingStepInput {
  paymentStatus: ListingBillingStatus;
  paymentRecordId?: string;
  paymentReference?: string;
  featuredRequested?: boolean;
}

export interface ListingPreviewPublishStepInput {
  confirmed: boolean;
  requestedAction?: 'publish' | 'save_draft';
}

export interface ListingCreateFlowPayload {
  currentState?: ListingCreateFlowState;
  vehicleInformation: ListingVehicleInformationStepInput;
  pricingDescription: ListingPricingDescriptionStepInput;
  ownershipAuthorization: ListingOwnershipAuthorizationStepInput;
  complianceResponsibility: ListingComplianceResponsibilityStepInput;
  billingListingFee?: ListingBillingStepInput;
  previewPublish: ListingPreviewPublishStepInput;
}

export interface ListingFlowResult {
  finalState: ListingCreateFlowState;
  riskLevel: ListingRiskLevel;
  riskScore: number;
  paymentRequired: boolean;
  paymentStatus: ListingBillingStatus;
  paymentRecordId?: string;
  reviewRequiredReason?: string;
}

export interface PremiumActivationRequest {
  platform: 'android' | 'ios';
  productId: string;
  purchaseToken: string;
  transactionId: string;
  packageName?: string;
  consents?: ConsentInput[];
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

export interface AuthRegisterPayload {
  name: string;
  handle: string;
  bio: string;
  email: string;
  password: string;
  accountType?: AccountType;
  commercialProfile?: {
    companyName?: string;
    taxOrIdentityType?: 'VKN' | 'TCKN';
    taxOrIdentityNumber?: string;
  };
  consents?: ConsentInput[];
}

export interface AuthLoginPayload {
  identifier: string;
  password: string;
}

export interface AuthVerifyEmailPayload {
  email: string;
  code: string;
}

export interface AuthResendCodePayload {
  email: string;
}

export interface SocialAuthPayload {
  provider: SocialAuthProvider;
  idToken: string;
  email?: string;
  fullName?: string;
}

export interface AuthVerificationStartPayload {
  channel: AuthVerificationChannel;
  destination: string;
}

export interface AuthActionResult {
  success: boolean;
  message?: string;
  email?: string;
  expiresAt?: string;
  maskedDestination?: string;
  deliveryFailed?: boolean;
  emailDisabled?: boolean;
  emailNotConfigured?: boolean;
  requiresVerification?: boolean;
}

export interface AuthVerificationStartResult extends AuthActionResult {
  verificationId?: string;
  expiresAt?: string;
  maskedDestination?: string;
}

export interface SearchResultUser {
  id: string;
  name: string;
  handle: string;
  note: string;
  avatarUri?: string;
  coverUri?: string;
}

export interface ComposerSelectedMedia {
  kind: MediaKind;
  uri?: string;
  label: string;
  hint: string;
  fileName?: string;
  mimeType?: string;
}

export interface OnboardingPayload {
  profile: SocialProfile;
  vehicle?: VehicleProfile;
  settings?: Partial<UserSettings>;
}

export interface ListingDraft {
  title: string;
  price: string;
  city: string;
  district: string;
  location: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  transmission: string;
  fuelType: string;
  bodyType: string;
  color: string;
  plateOrigin: string;
  damageRecord: string;
  paintInfo: string;
  changedParts: string;
  accidentInfo: string;
  description: string;
  extraEquipment: string;
  includeExpertiz: boolean;
  registrationOwnerName?: string;
  registrationOwnerIdentityNumber?: string;
  registrationSerialNumber?: string;
  registrationDocumentNumber?: string;
  plateNumber?: string;
  sellerRelationType?: ListingSellerRelationType;
  registrationOwnerFullNameDeclared?: string;
  isOwnerSameAsAccountHolder?: boolean;
  authorizationDeclarationText?: string;
}

export interface ComposerPayload {
  content: string;
  postType: 'standard' | 'listing';
  selectedMediaKinds: MediaKind[];
  selectedMedia?: ComposerSelectedMedia[];
  listingDraft?: ListingDraft;
  listingFlow?: ListingCreateFlowPayload;
  editingPostId?: string;
  consents?: ConsentInput[];
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
  profileSegment: ProfileSegment;
  directoryUsers: SearchResultUser[];
}
