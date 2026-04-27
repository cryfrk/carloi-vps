import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PostCard } from '../components/PostCard';
import { SectionTabs } from '../components/SectionTabs';
import { StateCard } from '../components/StateCard';
import { TopBar } from '../components/TopBar';
import { VehicleCard } from '../components/VehicleCard';
import { buildPrimaryVehicleFromSnapshot } from '../lib/vehicle';
import { useGarageStore } from '../store/garage-store';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { AppTabParamList, RootStackParamList } from '../types/navigation';
import type { PublicProfilePayload } from '../types/app';

type Route = RouteProp<RootStackParamList, 'PublicProfile'> | RouteProp<AppTabParamList, 'ProfileTab'>;
type Navigation = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
type ProfileTab = 'Gonderiler' | 'Ilanlar' | 'Araclar';

export function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const snapshot = useSessionStore((state) => state.snapshot);
  const fetchPublicProfile = useSessionStore((state) => state.fetchPublicProfile);
  const followHandle = useSessionStore((state) => state.followHandle);
  const localVehicles = useGarageStore((state) => state.vehicles);
  const [activeTab, setActiveTab] = useState<ProfileTab>('Gonderiler');
  const [publicProfile, setPublicProfile] = useState<PublicProfilePayload | null>(null);

  const requestedHandle = 'params' in route && route.params && 'handle' in route.params ? route.params.handle : undefined;
  const isPublic = Boolean(requestedHandle && requestedHandle !== snapshot?.profile.handle);

  useEffect(() => {
    let active = true;
    if (isPublic && requestedHandle) {
      void (async () => {
        const payload = await fetchPublicProfile(requestedHandle);
        if (active) {
          setPublicProfile(payload);
        }
      })();
    } else {
      setPublicProfile(null);
    }

    return () => {
      active = false;
    };
  }, [fetchPublicProfile, isPublic, requestedHandle]);

  const profile = isPublic ? publicProfile?.profile : snapshot?.profile;
  const posts = isPublic ? publicProfile?.posts || [] : (snapshot?.posts || []).filter((post) => post.handle === snapshot?.profile.handle && post.type !== 'listing');
  const listings = isPublic ? publicProfile?.listings || [] : (snapshot?.posts || []).filter((post) => post.handle === snapshot?.profile.handle && post.type === 'listing');
  const vehicles = useMemo(() => {
    if (isPublic) {
      return [];
    }

    const items: Array<{
      id: string;
      source: 'server' | 'local';
      vehicle: Record<string, unknown>;
    }> = localVehicles.map((vehicle) => ({
      id: vehicle.id,
      source: 'local',
      vehicle: vehicle as unknown as Record<string, unknown>,
    }));
    const primaryVehicle = buildPrimaryVehicleFromSnapshot(snapshot?.vehicle, snapshot?.profile.handle || 'user');
    if (primaryVehicle) {
      items.unshift({
        id: primaryVehicle.id,
        source: 'server',
        vehicle: primaryVehicle.vehicle,
      });
    }
    return items;
  }, [isPublic, localVehicles, snapshot?.profile.handle, snapshot?.vehicle]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <StateCard title="Profil yuklenemedi" description="Profil bilgileri su anda acilamiyor." tone="warning" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar
        title={isPublic ? `@${profile.handle}` : 'Profil'}
        subtitle={isPublic ? 'Genel profil gorunumu' : 'Profilin ve vitrin alanin'}
        onCreate={() => navigation.navigate('CreatePost')}
        onSearch={() => navigation.navigate('Search')}
        onNotifications={() => navigation.navigate('Notifications')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.handle}>@{profile.handle}</Text>
          <Text style={styles.bio}>{profile.bio || 'Profil aciklamasi eklenmedi.'}</Text>

          <View style={styles.metrics}>
            <Pressable onPress={() => navigation.navigate('Followers', { handle: profile.handle, mode: 'followers' })} style={styles.metricButton}>
              <Text style={styles.metricValue}>{profile.followers}</Text>
              <Text style={styles.metricLabel}>Takipci</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Following', { handle: profile.handle, mode: 'following' })} style={styles.metricButton}>
              <Text style={styles.metricValue}>{profile.following}</Text>
              <Text style={styles.metricLabel}>Takip edilen</Text>
            </Pressable>
            <View style={styles.metricButton}>
              <Text style={styles.metricValue}>{profile.posts}</Text>
              <Text style={styles.metricLabel}>Gonderi</Text>
            </View>
            <View style={styles.metricButton}>
              <Text style={styles.metricValue}>{profile.soldListings}</Text>
              <Text style={styles.metricLabel}>Ilan</Text>
            </View>
          </View>

          {isPublic ? (
            <Pressable onPress={() => void followHandle(profile.handle)} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Takip et / birak</Text>
            </Pressable>
          ) : (
            <View style={styles.rowActions}>
              <Pressable onPress={() => navigation.navigate('Settings')} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Profili duzenle</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('CommercialOnboarding')} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Ticari hesap</Text>
              </Pressable>
            </View>
          )}
        </View>

        <SectionTabs
          tabs={['Gonderiler', 'Ilanlar', 'Araclar'] as const}
          value={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'Gonderiler' ? (
          posts.length ? posts.map((post) => <PostCard key={post.id} post={post} />) : (
            <StateCard title="Gonderi yok" description="Bu profil icin gosterilecek gonderi bulunmuyor." />
          )
        ) : null}

        {activeTab === 'Ilanlar' ? (
          listings.length ? listings.map((post) => <PostCard key={post.id} post={post} />) : (
            <StateCard title="Ilan yok" description="Bu profil icin gosterilecek ilan bulunmuyor." />
          )
        ) : null}

        {activeTab === 'Araclar' ? (
          isPublic ? (
            <StateCard
              title="Genel garaj verisi sinirli"
              description="Backend tarafinda genel profil icin ayri arac vitrini endpointi henuz bulunmadigi icin burada sergilenen araclar gosterilemiyor."
            />
          ) : vehicles.length ? (
            <FlatList
              horizontal
              data={vehicles}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.vehicleStrip}
              renderItem={({ item }) => (
                <VehicleCard
                  vehicle={item as never}
                  variant="profile"
                  sourceLabel="Garaj"
                  onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id, source: item.source })}
                />
              )}
            />
          ) : (
            <StateCard
              title="Arac vitrini bos"
              description="Garajindan sergilemek istedigin araclari ekleyince burada gorunur."
              actionLabel="Garajima git"
              onAction={() => navigation.navigate('GarageTab')}
            />
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  handle: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  bio: {
    color: theme.colors.textSoft,
    lineHeight: 21,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricButton: {
    minWidth: 72,
    gap: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  metricLabel: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  vehicleStrip: {
    gap: 12,
  },
});
