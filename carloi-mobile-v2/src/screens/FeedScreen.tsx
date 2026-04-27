import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getMobileApiClient } from '@/lib/api';
import { getReadableErrorMessage } from '@/lib/errors';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { NetworkBanner } from '@/components/NetworkBanner';
import { PostCard } from '@/components/PostCard';
import { StatusBadge } from '@/components/StatusBadge';
import { TopHeader } from '@/components/TopHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

export function FeedScreen({ navigation }: { navigation: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const bootstrapping = useSessionStore((state) => state.bootstrapping);
  const apiStatus = useSessionStore((state) => state.apiStatus);
  const apiMessage = useSessionStore((state) => state.apiMessage);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const client = useMemo(() => getMobileApiClient(), []);

  const posts = snapshot?.posts || [];

  async function openListingConversation(postId: string) {
    try {
      const response = await client.ensureListingConversation(postId);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
      const latestConversation =
        (response.snapshot?.conversations || []).find((item) => item.listingContext?.postId === postId) ||
        (snapshot?.conversations || []).find((item) => item.listingContext?.postId === postId);
      navigation.navigate('Messages', latestConversation ? { conversationId: latestConversation.id } : undefined);
    } catch (error) {
      useSessionStore.getState().setApiState({
        status: 'degraded',
        message: getReadableErrorMessage(error, 'Mesajlasma akisi acilamadi.'),
      });
    }
  }

  return (
    <ScreenContainer>
      <TopHeader
        title="Ana Sayfa"
        subtitle="Sosyal otomotiv akisi"
        onPressCreate={() => navigation.getParent()?.navigate('Create')}
        onPressSearch={() => navigation.getParent()?.navigate('Search')}
      />

      <NetworkBanner status={apiStatus} message={apiMessage} />

      <SectionCard>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.heroTitle}>Carloi social feed</Text>
            <Text style={styles.heroCopy}>
              Gonderiler, arac paylasimlari, listing kartlari ve ticari icerikler tek timeline icinde profesyonel bir akista.
            </Text>
          </View>
          <StatusBadge label={`${posts.length} akis ogesi`} tone="accent" />
        </View>
      </SectionCard>

      {bootstrapping && !posts.length ? (
        <LoadingSkeleton rows={3} />
      ) : posts.length ? (
        <View style={styles.feed}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onOpenListingConversation={openListingConversation} />
          ))}
        </View>
      ) : (
        <EmptyState
          title="Akisin hazir"
          description="Ilk gonderiyi olusturarak veya bir araci ilana cikararak Carloi akisini baslat."
          actionLabel="Icerik olustur"
          onAction={() => navigation.getParent()?.navigate('Create')}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  heroCopy: {
    color: tokens.colors.muted,
    lineHeight: 22,
  },
  feed: {
    gap: 14,
  },
});
