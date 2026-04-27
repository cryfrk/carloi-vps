import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { StateCard } from '../components/StateCard';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import type { SnapshotUserCard } from '../types/app';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Followers'>;

export function FollowersScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const fetchPublicProfile = useSessionStore((state) => state.fetchPublicProfile);
  const [users, setUsers] = useState<SnapshotUserCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const profile = await fetchPublicProfile(route.params.handle);
      if (active) {
        setUsers(route.params.mode === 'followers' ? profile?.followers || [] : profile?.following || []);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchPublicProfile, route.params.handle, route.params.mode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{route.params.mode === 'followers' ? 'Takipciler' : 'Takip edilenler'}</Text>
        {loading ? (
          <StateCard title="Liste hazirlaniyor" description="Profil baglantilari getiriliyor." loading />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <StateCard
                title="Liste bos"
                description="Bu bolumde henuz gosterilecek baglanti bulunmuyor."
              />
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('PublicProfile', { handle: item.handle })}
                style={styles.row}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.texts}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.handle}>@{item.handle}</Text>
                </View>
              </Pressable>
            )}
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
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  list: {
    gap: 10,
  },
  row: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
    color: theme.colors.accent,
  },
  texts: {
    gap: 2,
  },
  name: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  handle: {
    color: theme.colors.muted,
  },
});
