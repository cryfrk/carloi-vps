import type { SnapshotConversation, SnapshotPost } from './app';

export type AuthStackParamList = {
  AuthLanding: undefined;
  Login: undefined;
  RegisterWizard: { accountType?: 'individual' | 'commercial' } | undefined;
  Verify: undefined;
};

export type AppTabParamList = {
  FeedTab: undefined;
  MessagesTab: undefined;
  LoiAiTab: undefined;
  GarageTab: undefined;
  ProfileTab: { handle?: string } | undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  CreatePost: { initialType?: 'normal' | 'vehicle' | 'listing' | 'video' } | undefined;
  CreateListing: { vehicleId?: string; source?: 'garage' | 'profile' } | undefined;
  Chat: { conversationId: string };
  Search: undefined;
  Notifications: undefined;
  Settings: undefined;
  CommercialOnboarding: undefined;
  AddVehicleWizard: undefined;
  VehicleDetail: { vehicleId: string; source?: 'server' | 'local' };
  VehiclePosts: { vehicleId: string; title?: string };
  Followers: { handle: string; mode: 'followers' | 'following' };
  Following: { handle: string; mode: 'following' };
  PublicProfile: { handle: string };
  PostDetail: { post: SnapshotPost };
  ListingChat: { conversation: SnapshotConversation };
};
