import {
  AIMessage,
  AppSnapshot,
  AuthState,
  SearchResultUser,
  SocialProfile,
  UserSettings,
} from '../types';

export const currentProfile: SocialProfile = {
  name: '',
  handle: '@',
  bio: '',
  followers: 0,
  following: 0,
  posts: 0,
  soldListings: 0,
  verified: false,
  followingHandles: [],
};

export const defaultSettings: UserSettings = {
  membershipPlan: 'Standart Üyelik',
  membershipSource: 'standard',
  membershipProductId: '',
  membershipActivatedAt: '',
  membershipExpiresAt: '',
  email: '',
  phone: '',
  legalFullName: '',
  identityNumber: '',
  birthDate: '',
  addressLine: '',
  city: '',
  district: '',
  postalCode: '',
  defaultPlateNumber: '',
  registrationOwnerName: '',
  registrationOwnerIdentityNumber: '',
  registrationSerialNumber: '',
  registrationDocumentNumber: '',
  language: 'tr',
  privateProfile: false,
  allowMessageRequests: true,
  pushNotifications: true,
  emailNotifications: false,
  smsNotifications: true,
  biometricLock: false,
  twoFactorEnabled: false,
  aiDataSharing: true,
  showSavedAdsOnProfile: true,
  showLastSeen: true,
  allowCalls: true,
  autoplayVideo: false,
  quickLoginEnabled: false,
  useDeviceLocation: true,
  shareLocationWithAi: true,
  showSoldCountOnProfile: false,
};

export const defaultAuth: AuthState = {
  isRegistered: false,
  isAuthenticated: false,
  email: '',
  phone: '',
  passwordHash: '',
};

export const suggestedUsers: SearchResultUser[] = [];

export const messageDirectoryUsers: SearchResultUser[] = [];

export const aiConversation: AIMessage[] = [];

export const seedAppSnapshot: AppSnapshot = {
  auth: defaultAuth,
  profile: currentProfile,
  commercial: {
    enabled: false,
    accountType: 'individual',
    commercialStatus: 'not_applied',
    canUseCommercialListingFeatures: false,
    pendingReview: false,
    additionalVerificationRequired: false,
    yearlyVehicleSaleCount: 0,
    yearlyVehicleListingCount: 0,
    commercialBehaviorFlag: false,
    profile: null,
    documents: [],
    suspiciousDocumentCount: 0,
    minimumDocumentSet: {
      hasMinimumSet: false,
      requiredDocumentTypes: [],
    },
    requiredDocumentTypes: [],
    nextActions: [],
  },
  vehicle: undefined,
  settings: defaultSettings,
  posts: [],
  conversations: [],
  aiMessages: aiConversation,
  profileSegment: 'paylasimlar',
  directoryUsers: [],
};

