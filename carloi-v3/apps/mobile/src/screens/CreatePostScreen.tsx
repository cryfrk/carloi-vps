import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { GarageVehicleRecord } from '@carloi-v3/garage-obd';

import { SectionTabs } from '../components/SectionTabs';
import { StateCard } from '../components/StateCard';
import { VehicleCard } from '../components/VehicleCard';
import { buildListingDraftPayload, buildPrimaryVehicleFromSnapshot, buildVehiclePayloadForOnboarding } from '../lib/vehicle';
import { createPost, pickImagesFromLibrary, saveOnboarding, uploadPickedAssets } from '../lib/api';
import { extractSnapshot } from '../lib/api';
import { useGarageStore } from '../store/garage-store';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Route = RouteProp<RootStackParamList, 'CreatePost'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;
type ComposerMode = 'normal' | 'vehicle' | 'listing' | 'video';

export function CreatePostScreen({ forcedMode }: { forcedMode?: ComposerMode }) {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const localVehicles = useGarageStore((state) => state.vehicles);
  const [mode, setMode] = useState<ComposerMode>(forcedMode || route.params?.initialType || 'normal');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<Array<{ url: string; type: string; name: string }>>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [visibility, setVisibility] = useState<'vehicle-only' | 'profile-and-vehicle' | 'feed-profile-and-vehicle'>('feed-profile-and-vehicle');
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [location, setLocation] = useState('');
  const [sellerRelationType, setSellerRelationType] = useState<'owner' | 'authorized_business' | 'other_authorized'>('owner');
  const [authorizationText, setAuthorizationText] = useState('');
  const [busy, setBusy] = useState(false);

  const primaryServerVehicle = useMemo(
    () => buildPrimaryVehicleFromSnapshot(snapshot?.vehicle, snapshot?.profile.handle || 'user'),
    [snapshot?.profile.handle, snapshot?.vehicle],
  );
  const selectableVehicles = useMemo(() => {
    const items: Array<{ id: string; source: 'server' | 'local'; vehicle: Record<string, unknown> | GarageVehicleRecord }> = [];
    if (primaryServerVehicle) {
      items.push({ id: primaryServerVehicle.id, source: 'server', vehicle: primaryServerVehicle.vehicle });
    }
    for (const vehicle of localVehicles) {
      items.push({ id: vehicle.id, source: 'local', vehicle });
    }
    return items;
  }, [localVehicles, primaryServerVehicle]);

  async function addMedia() {
    const assets = await pickImagesFromLibrary();
    const uploaded = await uploadPickedAssets(assets);
    setMedia((state) => [...state, ...uploaded.map((item) => ({ url: item.url, type: item.type, name: item.name }))]);
  }

  async function submit() {
    setBusy(true);
    try {
      let payload: Record<string, unknown>;

      if (mode === 'listing') {
        const selected = selectableVehicles.find((item) => item.id === selectedVehicleId);
        if (!selected) {
          throw new Error('Ilan icin once bir arac secmelisin.');
        }

        if (!snapshot?.auth.phone && !snapshot?.settings?.phone) {
          throw new Error('Ilan iletisim bilgisi icin once hesap telefonunu eklemelisin.');
        }

        if (selected.source === 'local') {
          const syncEnvelope = await saveOnboarding({
            vehicle: buildVehiclePayloadForOnboarding(selected.vehicle as GarageVehicleRecord),
          });
          const syncedSnapshot = extractSnapshot(syncEnvelope);
          if (syncedSnapshot) {
            setSnapshot(syncedSnapshot);
          }
        }

        payload = {
          postType: 'listing',
          content,
          media,
          listingDraft: buildListingDraftPayload(selected.vehicle as GarageVehicleRecord, {
            title: title || 'Carloi ilanı',
            price,
            description: content,
            city,
            district,
            location,
            phone: snapshot?.auth.phone || snapshot?.settings?.phone || '',
            relationType: sellerRelationType,
            authorizationText,
          }),
        };
      } else {
        const hashtags = [];
        if (mode === 'vehicle' && selectedVehicleId) {
          hashtags.push(`garage:${selectedVehicleId}`);
          hashtags.push(`visibility:${visibility}`);
        }
        if (mode === 'video') {
          hashtags.push('video');
        }

        payload = {
          content,
          media,
          hashtags,
        };
      }

      const envelope = await createPost(payload);
      const nextSnapshot = extractSnapshot(envelope);
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      }
      Alert.alert('Yayinlandi', 'Icerigin basariyla paylasildi.');
      navigation.navigate('MainTabs');
    } catch (error) {
      Alert.alert('Islem tamamlanamadi', error instanceof Error ? error.message : 'Beklenmeyen hata.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{mode === 'listing' ? 'Ilan olustur' : 'Icerik olustur'}</Text>
        {!forcedMode ? (
          <SectionTabs
            tabs={['Normal', 'Arac', 'Ilan', 'Video'] as const}
            value={mode === 'normal' ? 'Normal' : mode === 'vehicle' ? 'Arac' : mode === 'listing' ? 'Ilan' : 'Video'}
            onChange={(value) => setMode(value === 'Normal' ? 'normal' : value === 'Arac' ? 'vehicle' : value === 'Ilan' ? 'listing' : 'video')}
          />
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Aciklama</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={mode === 'listing' ? 'Ilan aciklamasi' : 'Paylasimini yaz'}
            multiline
            style={styles.textArea}
          />
        </View>

        {(mode === 'vehicle' || mode === 'listing') ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Arac secimi</Text>
            {selectableVehicles.length === 0 ? (
              <StateCard
                title="Arac secimi gerekli"
                description="Bu gonderi tipi icin once Garajim alanina arac eklemelisin."
                actionLabel="Garajima git"
                onAction={() => navigation.navigate('MainTabs')}
              />
            ) : (
              selectableVehicles.map((item) => (
                <Pressable key={item.id} onPress={() => setSelectedVehicleId(item.id)}>
                  <VehicleCard
                    vehicle={item.vehicle}
                    sourceLabel={item.source === 'server' ? 'Senkron' : 'Yerel'}
                  />
                  {selectedVehicleId === item.id ? <Text style={styles.selectedLabel}>Secildi</Text> : null}
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {mode === 'vehicle' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Gorunurluk</Text>
            <SectionTabs
              tabs={['Sadece arac', 'Profil + arac', 'Ana akis + profil + arac'] as const}
              value={visibility === 'vehicle-only' ? 'Sadece arac' : visibility === 'profile-and-vehicle' ? 'Profil + arac' : 'Ana akis + profil + arac'}
              onChange={(value) =>
                setVisibility(value === 'Sadece arac' ? 'vehicle-only' : value === 'Profil + arac' ? 'profile-and-vehicle' : 'feed-profile-and-vehicle')
              }
            />
          </View>
        ) : null}

        {mode === 'listing' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ilan bilgileri</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Ilan basligi" style={styles.input} />
            <TextInput value={price} onChangeText={setPrice} placeholder="Fiyat" keyboardType="number-pad" style={styles.input} />
            <TextInput value={city} onChangeText={setCity} placeholder="Sehir" style={styles.input} />
            <TextInput value={district} onChangeText={setDistrict} placeholder="Ilce" style={styles.input} />
            <TextInput value={location} onChangeText={setLocation} placeholder="Konum" style={styles.input} />
            <SectionTabs
              tabs={['Ruhsat sahibi', 'Yetkili isletme', 'Diger yetkili'] as const}
              value={sellerRelationType === 'owner' ? 'Ruhsat sahibi' : sellerRelationType === 'authorized_business' ? 'Yetkili isletme' : 'Diger yetkili'}
              onChange={(value) => setSellerRelationType(value === 'Ruhsat sahibi' ? 'owner' : value === 'Yetkili isletme' ? 'authorized_business' : 'other_authorized')}
            />
            {sellerRelationType !== 'owner' ? (
              <TextInput
                value={authorizationText}
                onChangeText={setAuthorizationText}
                placeholder="Yetki/aciklama metni"
                multiline
                style={styles.textArea}
              />
            ) : null}
            <StateCard
              title="Mevzuat uyarisi"
              description="Farkli kisinin araci satiliyor veya temsil ediliyorsa gerekli yetki ve e-Devlet dogrulamalari kullanicinin sorumlulugundadir. Iletisim bilgisi dogrudan Carloi hesabindan gelir; farkli numara eklenemez."
              tone="warning"
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Medya</Text>
          <Pressable onPress={() => void addMedia()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Foto / video ekle</Text>
          </Pressable>
          {media.map((item) => (
            <Text key={`${item.url}-${item.name}`} style={styles.mediaItem}>{item.name}</Text>
          ))}
        </View>

        <Pressable onPress={() => void submit()} style={[styles.primaryButton, busy ? styles.disabled : null]} disabled={busy}>
          <Text style={styles.primaryText}>{busy ? 'Yayinlaniyor...' : mode === 'listing' ? 'Ilani yayinla' : 'Gonderiyi yayinla'}</Text>
        </Pressable>
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
    paddingBottom: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  card: {
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontWeight: '800',
    color: theme.colors.text,
    fontSize: 16,
  },
  textArea: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
  },
  selectedLabel: {
    color: theme.colors.accent,
    fontWeight: '800',
    marginTop: 8,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  mediaItem: {
    color: theme.colors.textSoft,
  },
  primaryButton: {
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: theme.colors.text,
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
});
