const defaultSettings = {
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

const defaultAiMessages = [];

const defaultProfileSegment = 'paylasimlar';

module.exports = {
  defaultAiMessages,
  defaultProfileSegment,
  defaultSettings,
};
