import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SectionTabs } from '../components/SectionTabs';
import { PostCard } from '../components/PostCard';
import { StateCard } from '../components/StateCard';
import { VehicleCard } from '../components/VehicleCard';
import { useGarageStore } from '../store/garage-store';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type SearchTab = 'Tumu' | 'Kullanicilar' | 'Gonderiler' | 'Videolar' | 'Ilanlar' | 'Araclar';
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const navigation = useNavigation<Navigation>();
  const snapshot = useSessionStore((state) => state.snapshot);
  const vehicles = useGarageStore((state) => state.vehicles);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('Tumu');

  const normalizedQuery = query.trim().toLowerCase();
  const users = useMemo(
    () =>
      (snapshot?.directoryUsers || []).filter((item) =>
        [item.name, item.handle, item.note].some((value) =>
          String(value || '').toLowerCase().includes(normalizedQuery),
        ),
      ),
    [normalizedQuery, snapshot?.directoryUsers],
  );

  const posts = useMemo(
    () =>
      (snapshot?.posts || []).filter((post) =>
        [
          post.content,
          post.authorName,
          post.handle,
          post.hashtags?.join(' '),
          post.listing?.title,
        ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery)),
      ),
    [normalizedQuery, snapshot?.posts],
  );

  const videos = posts.filter((post) => post.media?.some((media) => media.type === 'video'));
  const listings = posts.filter((post) => post.type === 'listing');
  const matchedVehicles = vehicles.filter((vehicle) =>
    JSON.stringify(vehicle).toLowerCase().includes(normalizedQuery),
  );

  const currentPosts = tab === 'Gonderiler'
    ? posts
    : tab === 'Videolar'
      ? videos
      : tab === 'Ilanlar'
        ? listings
        : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Ara</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Kullanici, gonderi, ilan veya arac ara"
          style={styles.input}
        />
        <SectionTabs
          tabs={['Tumu', 'Kullanicilar', 'Gonderiler', 'Videolar', 'Ilanlar', 'Araclar'] as const}
          value={tab}
          onChange={setTab}
        />

        {!query.trim() ? (
          <StateCard
            title="Arama baslat"
            description="Kullanici, ilan, gonderi veya arac aramak icin yukaridaki kutuyu kullan."
          />
        ) : tab === 'Tumu' ? (
          <FlatList
            data={[{ key: 'users' }, { key: 'posts' }, { key: 'vehicles' }]}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              if (item.key === 'users') {
                return (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Kullanicilar</Text>
                    {users.slice(0, 5).map((user) => (
                      <Pressable
                        key={user.id}
                        onPress={() => navigation.navigate('PublicProfile', { handle: user.handle })}
                        style={styles.userRow}
                      >
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userHandle}>@{user.handle}</Text>
                      </Pressable>
                    ))}
                  </View>
                );
              }

              if (item.key === 'posts') {
                return (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Gonderiler</Text>
                    {posts.slice(0, 3).map((post) => <PostCard key={post.id} post={post} />)}
                  </View>
                );
              }

              return (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Araclar</Text>
                  {matchedVehicles.slice(0, 4).map((vehicle) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      sourceLabel="Garaj"
                      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id, source: 'local' })}
                    />
                  ))}
                </View>
              );
            }}
          />
        ) : tab === 'Kullanicilar' ? (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<StateCard title="Sonuc yok" description="Bu arama icin kullanici bulunamadi." />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('PublicProfile', { handle: item.handle })}
                style={styles.userRow}
              >
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userHandle}>@{item.handle}</Text>
              </Pressable>
            )}
          />
        ) : tab === 'Araclar' ? (
          <FlatList
            data={matchedVehicles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<StateCard title="Arac bulunamadi" description="Garajinda bu aramaya uygun arac yok." />}
            renderItem={({ item }) => (
              <VehicleCard
                vehicle={item}
                sourceLabel="Garaj"
                onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id, source: 'local' })}
              />
            )}
          />
        ) : (
          <FlatList
            data={currentPosts}
            keyExtractor={(item) => ('id' in item ? item.id : Math.random().toString())}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<StateCard title="Sonuc bulunamadi" description="Arama sonucunda gosterilecek kayit yok." />}
            renderItem={({ item }) => <PostCard post={item as never} />}
          />
        )}
      </View>
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
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: theme.colors.text,
  },
  list: {
    gap: 14,
    paddingBottom: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  userRow: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  userName: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  userHandle: {
    color: theme.colors.muted,
  },
});
