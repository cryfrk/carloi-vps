import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { StateCard } from '../components/StateCard';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function MessagesScreen() {
  const navigation = useNavigation<Navigation>();
  const snapshot = useSessionStore((state) => state.snapshot);

  const conversations = snapshot?.conversations || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Mesajlar</Text>
        {conversations.length === 0 ? (
          <StateCard
            title="Henuz sohbet yok"
            description="Bir ilana mesaj atinca veya bir kullaniciyla sohbet baslatinca burada gorunecek."
          />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
                style={styles.card}
              >
                <View style={styles.row}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.typeBadge}>{item.type === 'listing' ? 'Ilan' : item.type === 'group' ? 'Grup' : 'Sohbet'}</Text>
                </View>
                <Text style={styles.preview}>{item.lastMessage || 'Henuz mesaj yok.'}</Text>
                {item.listingContext?.listing?.title ? (
                  <Text style={styles.context}>Baglam: {item.listingContext.listing.title}</Text>
                ) : null}
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
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    fontWeight: '800',
    color: theme.colors.text,
    fontSize: 16,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  preview: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  context: {
    color: theme.colors.muted,
    fontSize: 12,
  },
});
