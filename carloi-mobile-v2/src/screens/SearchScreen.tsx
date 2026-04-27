import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { TopHeader } from '@/components/TopHeader';
import { useGarageStore } from '@/store/garage-store';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

const searchTabs = ['Tumu', 'Kullanicilar', 'Ilanlar', 'Gonderiler', 'Videolar', 'Araclar'] as const;

export function SearchScreen({ navigation, route }: { navigation: any; route: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const vehicles = useGarageStore((state) => state.vehicles);
  const [query, setQuery] = useState(route?.params?.query || '');
  const [activeTab, setActiveTab] = useState<(typeof searchTabs)[number]>('Tumu');

  const loweredQuery = query.trim().toLowerCase();

  const users = useMemo(
    () =>
      (snapshot?.directoryUsers || []).filter((item) =>
        `${item.name} ${item.handle} ${item.note}`.toLowerCase().includes(loweredQuery),
      ),
    [loweredQuery, snapshot?.directoryUsers],
  );

  const posts = useMemo(
    () =>
      (snapshot?.posts || []).filter((item) =>
        `${item.authorName} ${item.handle} ${item.content} ${item.hashtags.join(' ')}`.toLowerCase().includes(loweredQuery),
      ),
    [loweredQuery, snapshot?.posts],
  );

  const listings = useMemo(() => posts.filter((item) => item.type === 'listing'), [posts]);
  const videos = useMemo(() => posts.filter((item) => item.media.some((media) => media.kind === 'video')), [posts]);
  const matchedVehicles = useMemo(
    () =>
      vehicles.filter((item) =>
        `${item.vehicleType} ${item.brand} ${item.model} ${item.packageName} ${item.engineType}`.toLowerCase().includes(loweredQuery),
      ),
    [loweredQuery, vehicles],
  );

  function renderResults() {
    if (!loweredQuery) {
      return <EmptyState title="Aramaya basla" description="Kullanici, ilan, gonderi, video veya arac arayabilirsin." />;
    }

    const hasAnyResult = users.length || listings.length || posts.length || videos.length || matchedVehicles.length;
    if (!hasAnyResult) {
      return <EmptyState title="Sonuc bulunamadi" description="Arama ifadesini degistirip tekrar deneyin." />;
    }

    return (
      <View style={{ gap: 12 }}>
        {(activeTab === 'Tumu' || activeTab === 'Kullanicilar') &&
          users.map((item) => (
            <SectionCard key={item.id}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>@{item.handle}</Text>
              <Text style={styles.cardCopy}>{item.note}</Text>
            </SectionCard>
          ))}

        {(activeTab === 'Tumu' || activeTab === 'Ilanlar') &&
          listings.map((item) => (
            <SectionCard key={item.id}>
              <Text style={styles.cardTitle}>{item.listing?.title || item.content}</Text>
              <Text style={styles.cardMeta}>{item.listing?.price || 'Fiyat bilgisi yok'}</Text>
              <Text style={styles.cardCopy}>{item.listing?.location || item.content}</Text>
            </SectionCard>
          ))}

        {(activeTab === 'Tumu' || activeTab === 'Gonderiler') &&
          posts
            .filter((item) => item.type !== 'listing')
            .map((item) => (
              <SectionCard key={item.id}>
                <Text style={styles.cardTitle}>{item.authorName}</Text>
                <Text style={styles.cardMeta}>@{item.handle}</Text>
                <Text style={styles.cardCopy}>{item.content}</Text>
              </SectionCard>
            ))}

        {(activeTab === 'Tumu' || activeTab === 'Videolar') &&
          videos.map((item) => (
            <SectionCard key={item.id}>
              <Text style={styles.cardTitle}>{item.authorName}</Text>
              <Text style={styles.cardMeta}>Video gonderisi</Text>
              <Text style={styles.cardCopy}>{item.content}</Text>
            </SectionCard>
          ))}

        {(activeTab === 'Tumu' || activeTab === 'Araclar') &&
          matchedVehicles.map((item) => (
            <SectionCard key={item.id}>
              <Text style={styles.cardTitle}>
                {item.brand} {item.model}
              </Text>
              <Text style={styles.cardMeta}>
                {item.vehicleType} · {item.year}
              </Text>
              <Text style={styles.cardCopy}>{item.engineType}</Text>
            </SectionCard>
          ))}
      </View>
    );
  }

  return (
    <ScreenContainer>
      <TopHeader title="Ara" subtitle="Kullanici, ilan, gonderi, video ve arac aramasi" onPressCreate={() => navigation.navigate('Create')} />
      <AppInput value={query} onChangeText={setQuery} placeholder="Kullanici, ilan, video, marka, model veya hashtag ara" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {searchTabs.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {renderResults()}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    gap: 10,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  tabActive: {
    backgroundColor: tokens.colors.accentSoft,
    borderColor: tokens.colors.accent,
  },
  tabLabel: {
    color: tokens.colors.text,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: tokens.colors.accent,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  cardMeta: {
    color: tokens.colors.muted,
  },
  cardCopy: {
    color: tokens.colors.text,
    lineHeight: 21,
  },
});
