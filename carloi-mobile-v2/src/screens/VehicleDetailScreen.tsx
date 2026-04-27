import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBadge } from '@/components/StatusBadge';
import { TopHeader } from '@/components/TopHeader';
import { useGarageStore } from '@/store/garage-store';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

export function VehicleDetailScreen({ navigation, route }: { navigation: any; route: any }) {
  const snapshotVehicle = useSessionStore((state) => state.snapshot?.vehicle);
  const posts = useSessionStore((state) => state.snapshot?.posts || []);
  const localVehicles = useGarageStore((state) => state.vehicles);
  const vehicleId = route?.params?.id || 'primary';

  const localVehicle = localVehicles.find((item) => item.id === vehicleId) || null;

  const title = localVehicle
    ? `${localVehicle.brand} ${localVehicle.model}`
    : `${snapshotVehicle?.brand || 'Arac'} ${snapshotVehicle?.model || ''}`.trim();

  const relatedPosts = useMemo(() => {
    const needle = title.toLowerCase();
    return posts.filter((post) => `${post.content} ${post.listing?.title || ''}`.toLowerCase().includes(needle));
  }, [posts, title]);

  return (
    <ScreenContainer>
      <TopHeader
        title="Arac detayi"
        subtitle="Saglik, bakim, medya ve ilan akislari"
        onPressCreate={() => navigation.navigate('Create', { mode: 'listing' })}
        onPressSearch={() => navigation.navigate('Search')}
      />

      <SectionCard>
        {localVehicle?.photoUri ? <Image source={{ uri: localVehicle.photoUri }} style={styles.heroImage} resizeMode="cover" /> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {localVehicle
            ? `${localVehicle.vehicleType} · ${localVehicle.year} · ${localVehicle.packageName}`
            : `${snapshotVehicle?.year || 'Yil yok'} · ${snapshotVehicle?.packageName || 'Paket bilgisi yok'}`}
        </Text>
        <View style={styles.badges}>
          <StatusBadge
            label={localVehicle ? (localVehicle.obdStatus === 'connected' ? 'OBD bagli' : 'OBD bagli degil') : snapshotVehicle?.obdConnected ? 'OBD bagli' : 'OBD bagli degil'}
            tone={localVehicle ? (localVehicle.obdStatus === 'connected' ? 'success' : 'warning') : snapshotVehicle?.obdConnected ? 'success' : 'warning'}
          />
          <StatusBadge label={localVehicle?.healthSummary ? 'Saglik ozeti var' : snapshotVehicle?.healthScore ? `Saglik ${snapshotVehicle.healthScore}` : 'Saglik bekleniyor'} tone="accent" />
        </View>
        <PrimaryButton label="Araci ilana cikar" onPress={() => navigation.navigate('Create', { mode: 'listing' })} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Arac bilgileri</Text>
        <SpecRow label="Marka / Model" value={title} />
        <SpecRow label="Motor" value={localVehicle?.engineType || snapshotVehicle?.engineVolume || 'Bilinmiyor'} />
        <SpecRow label="Yakit" value={localVehicle?.fuelType || snapshotVehicle?.fuelType || 'Bilinmiyor'} />
        <SpecRow label="Sanziman" value={localVehicle?.gearbox || 'Bilinmiyor'} />
        <SpecRow label="Kilometre" value={localVehicle?.mileage || snapshotVehicle?.mileage || 'Bilinmiyor'} />
        <SpecRow label="Plaka" value={localVehicle ? (localVehicle.plateVisible ? localVehicle.plate : 'Gizli') : 'Gizli'} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Saglik ve bakim</Text>
        <SpecRow label="Bakim" value={localVehicle?.maintenanceState || 'unknown'} />
        <SpecRow label="OBD" value={localVehicle?.obdStatus || (snapshotVehicle?.obdConnected ? 'connected' : 'not_connected')} />
        <Text style={styles.copy}>
          {localVehicle?.healthSummary || snapshotVehicle?.summary || 'Aracin saglik ve risk bilgileri OBD verisi ve bakim kayitlari geldikce burada gosterilir.'}
        </Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Aracla ilgili gonderiler</Text>
        {relatedPosts.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
            {relatedPosts.map((post) => (
              <View key={post.id} style={styles.relatedCard}>
                <Text style={styles.relatedTitle}>{post.authorName}</Text>
                <Text style={styles.relatedCopy} numberOfLines={4}>
                  {post.content}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <EmptyState title="Arac gonderisi henuz yok" description="Arac gonderisi veya ilan paylasildiginda burada baglantili icerikler gorunur." />
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  meta: {
    color: tokens.colors.muted,
    lineHeight: 22,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  specLabel: {
    color: tokens.colors.muted,
    flex: 1,
  },
  specValue: {
    flex: 1,
    textAlign: 'right',
    color: tokens.colors.text,
    fontWeight: '700',
  },
  copy: {
    color: tokens.colors.text,
    lineHeight: 22,
  },
  relatedRow: {
    gap: 10,
  },
  relatedCard: {
    width: 220,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 8,
  },
  relatedTitle: {
    fontWeight: '800',
    color: tokens.colors.text,
  },
  relatedCopy: {
    color: tokens.colors.text,
    lineHeight: 20,
  },
});
