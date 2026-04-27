import { Feather } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from '@/types/navigation';
import { useSessionStore } from '@/store/session-store';
import { AuthLandingScreen } from '@/screens/AuthLandingScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterWizardScreen } from '@/screens/RegisterWizardScreen';
import { FeedScreen } from '@/screens/FeedScreen';
import { CreateScreen } from '@/screens/CreateScreen';
import { MessagesScreen } from '@/screens/MessagesScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { GarageScreen } from '@/screens/GarageScreen';
import { VehicleDetailScreen } from '@/screens/VehicleDetailScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { CommercialScreen } from '@/screens/CommercialScreen';
import { LoiAiScreen } from '@/screens/LoiAiScreen';
import { ListingsScreen } from '@/screens/ListingsScreen';
import { SearchScreen } from '@/screens/SearchScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function Tabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: 68 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
          backgroundColor: '#ffffff',
          borderTopColor: tokens.colors.border,
        },
        tabBarActiveTintColor: tokens.colors.accent,
        tabBarInactiveTintColor: tokens.colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<keyof MainTabParamList, keyof typeof Feather.glyphMap> = {
            Feed: 'home',
            Messages: 'message-circle',
            LoiAI: 'cpu',
            Garage: 'truck',
            Profile: 'user',
          };
          return <Feather name={iconMap[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ title: 'Ana Sayfa' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Mesajlar' }} />
      <Tab.Screen name="LoiAI" component={LoiAiScreen} options={{ title: 'Loi AI' }} />
      <Tab.Screen name="Garage" component={GarageScreen} options={{ title: 'Garajim' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="AuthLanding" component={AuthLandingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterWizardScreen} />
    </AuthStack.Navigator>
  );
}

export function RootNavigation() {
  const token = useSessionStore((state) => state.token);

  return (
    <NavigationContainer>
      {token ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={Tabs} />
          <RootStack.Screen name="Create" component={CreateScreen} />
          <RootStack.Screen name="Search" component={SearchScreen} />
          <RootStack.Screen name="Listings" component={ListingsScreen} />
          <RootStack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
          <RootStack.Screen name="Settings" component={SettingsScreen} />
          <RootStack.Screen name="Commercial" component={CommercialScreen} />
        </RootStack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
