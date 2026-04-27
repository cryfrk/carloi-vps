export type AuthStackParamList = {
  AuthLanding: undefined;
  Login: undefined;
  Register: { type?: 'individual' | 'commercial' } | undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Messages: { conversationId?: string } | undefined;
  LoiAI: undefined;
  Garage: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Create: { mode?: 'post' | 'vehicle' | 'listing' | 'video' } | undefined;
  Search: { query?: string } | undefined;
  Listings: undefined;
  VehicleDetail: { id: string };
  Settings: undefined;
  Commercial: undefined;
};
