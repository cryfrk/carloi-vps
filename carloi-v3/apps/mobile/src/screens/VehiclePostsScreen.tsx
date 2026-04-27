import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { PostCard } from '../components/PostCard';
import { StateCard } from '../components/StateCard';
import { extractVehicleTaggedPosts } from '../lib/vehicle';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Route = RouteProp<RootStackParamList, 'VehiclePosts'>;

export function VehiclePostsScreen() {
  const route = useRoute<Route>();
  const snapshot = useSessionStore((state) => state.snapshot);

  const posts = extractVehicleTaggedPosts(snapshot?.posts || [], route.params.vehicleId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{route.params.title || 'Arac gonderileri'}</Text>
        {posts.length === 0 ? (
          <StateCard
            title="Bu arac icin yayin yok"
            description="Araca ozel gonderiler, paylasim sirasinda secilen gorunurluk tercihleri ile burada toplanir."
          />
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
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
    padding: 20,
    gap: 16,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
});
