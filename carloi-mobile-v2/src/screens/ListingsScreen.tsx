import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { getMobileApiClient } from '@/lib/api';
import { getReadableErrorMessage } from '@/lib/errors';
import { NetworkBanner } from '@/components/NetworkBanner';
import { TopHeader } from '@/components/TopHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

export function ListingsScreen({ navigation }: { navigation: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const apiStatus = useSessionStore((state) => state.apiStatus);
  const apiMessage = useSessionStore((state) => state.apiMessage);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const client = useMemo(() => getMobileApiClient(), []);

  const listings = (snapshot?.posts || []).filter((post) => post.type === 'listing' || post.listing);
  const filtered = listings.filter((post) =>
    `${post.listing?.title || ''} ${post.listing?.location || ''} ${post.content || ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  async function openConversation(postId: string) {
    try {
      const response = await client.ensureListingConversation(postId);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
      const latestConversation =
        (response.snapshot?.conversations || []).find((item) => item.listingContext?.postId === postId) ||
        (snapshot?.conversations || []).find((item) => item.listingContext?.postId === postId);
      navigation.navigate('Messages', latestConversation ? { conversationId: latestConversation.id } : undefined);
    } catch (conversationError) {
      setError(getReadableErrorMessage(conversationError, 'Ilan mesaji acilamadi.'));
    }
  }

  return (
    <ScreenContainer>
      <TopHeader
        title="Ilanlar"
        subtitle="Profesyonel kartlar, fiyat ve hizli mesajlasma"
        onPressCreate={() => navigation.navigate('Create', { mode: 'listing' })}
        onPressSearch={() => navigation.navigate('Search', { query })}
      />

      <NetworkBanner status={apiStatus} message={apiMessage} />

      <SectionCard>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Marka, model, konum veya fiyat arat"
          placeholderTextColor={tokens.colors.muted}
          style={styles.searchInput}
        />
      </SectionCard>

      {filtered.length ? (
        filtered.map((post) => (
          <SectionCard key={post.id}>
            {post.media?.[0]?.uri ? (
              <Image source={{ uri: post.media[0].uri }} style={styles.media} resizeMode="cover" />
            ) : null}
            <Text style={styles.title}>{post.listing?.title || post.content || 'Ilan'}</Text>
            <Text style={styles.price}>{post.listing?.price || 'Fiyat bekleniyor'}</Text>
            <Text style={styles.meta}>{post.listing?.summaryLine || post.listing?.location || 'Konum bilgisi bekleniyor'}</Text>
            <Text style={styles.description}>{post.listing?.description || post.content || 'Ilan aciklamasi eklenmemis.'}</Text>
            <View style={styles.actionRow}>
              <PrimaryButton label="Mesaj at" onPress={() => void openConversation(post.id)} />
              <PrimaryButton label="Detay / paylas" variant="secondary" onPress={() => navigation.navigate('Search', { query: post.listing?.title || post.content || '' })} />
            </View>
          </SectionCard>
        ))
      ) : (
        <EmptyState
          title="Ilan havuzu hazir"
          description="Garajindan arac secerek veya create ekranindan yeni bir ilan yayinlayarak burada profesyonel kartlarini gorebilirsin."
          actionLabel="Ilan olustur"
          onAction={() => navigation.navigate('Create', { mode: 'listing' })}
        />
      )}

      <ErrorBanner message={error} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: 14,
    color: tokens.colors.text,
  },
  media: {
    width: '100%',
    height: 210,
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.colors.accent,
  },
  meta: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  description: {
    color: tokens.colors.text,
    lineHeight: 22,
  },
  actionRow: {
    gap: 10,
  },
});
