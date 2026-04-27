import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FeedScreen } from '../screens/FeedScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { LoiAiScreen } from '../screens/LoiAiScreen';
import { GarageScreen } from '../screens/GarageScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AuthLandingScreen } from '../screens/AuthLandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterWizardScreen } from '../screens/RegisterWizardScreen';
import { VerifyScreen } from '../screens/VerifyScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CommercialOnboardingScreen } from '../screens/CommercialOnboardingScreen';
import { AddVehicleWizardScreen } from '../screens/AddVehicleWizardScreen';
import { VehicleDetailScreen } from '../screens/VehicleDetailScreen';
import { VehiclePostsScreen } from '../screens/VehiclePostsScreen';
import { FollowersScreen } from '../screens/FollowersScreen';
import { CreatePostScreen } from '../screens/CreatePostScreen';
import { CreateListingScreen } from '../screens/CreateListingScreen';
import { useSessionStore } from '../store/session-store';
import type { AppTabParamList, AuthStackParamList, RootStackParamList } from '../types/navigation';
import { theme } from '../theme';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="AuthLanding" component={AuthLandingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="RegisterWizard" component={RegisterWizardScreen} />
      <AuthStack.Screen name="Verify" component={VerifyScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 72,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<keyof AppTabParamList, keyof typeof Ionicons.glyphMap> = {
            FeedTab: 'home-outline',
            MessagesTab: 'chatbubble-ellipses-outline',
            LoiAiTab: 'sparkles-outline',
            GarageTab: 'car-sport-outline',
            ProfileTab: 'person-circle-outline',
          };
          return <Ionicons name={iconMap[route.name as keyof AppTabParamList]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: 'Ana Sayfa' }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Mesajlar' }} />
      <Tab.Screen name="LoiAiTab" component={LoiAiScreen} options={{ title: 'Loi AI' }} />
      <Tab.Screen name="GarageTab" component={GarageScreen} options={{ title: 'Garajim' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

export function RootNavigation() {
  const status = useSessionStore((state) => state.status);

  return (
    <NavigationContainer>
      {status === 'authenticated' ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={MainTabs} />
          <RootStack.Screen name="CreatePost" component={CreatePostScreen} />
          <RootStack.Screen name="CreateListing" component={CreateListingScreen} />
          <RootStack.Screen name="Chat" component={ChatScreen} />
          <RootStack.Screen name="Search" component={SearchScreen} />
          <RootStack.Screen name="Notifications" component={NotificationsScreen} />
          <RootStack.Screen name="Settings" component={SettingsScreen} />
          <RootStack.Screen name="CommercialOnboarding" component={CommercialOnboardingScreen} />
          <RootStack.Screen name="AddVehicleWizard" component={AddVehicleWizardScreen} />
          <RootStack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
          <RootStack.Screen name="VehiclePosts" component={VehiclePostsScreen} />
          <RootStack.Screen name="Followers" component={FollowersScreen} />
          <RootStack.Screen name="Following" component={FollowersScreen} />
          <RootStack.Screen name="PublicProfile" component={ProfileScreen} />
        </RootStack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
