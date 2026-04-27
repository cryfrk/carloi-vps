import { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { CreatePostPayload, MediaKind } from '@carloi/v2-shared';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMobileApiClient } from '@/lib/api';
import { getLegalDocuments, type LegalDocument } from '@/lib/consents';
import { getReadableErrorMessage } from '@/lib/errors';
import { LegalDocumentModal } from '@/components/LegalDocumentModal';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBadge } from '@/components/StatusBadge';
import { TopHeader } from '@/components/TopHeader';
import { useGarageStore } from '@/store/garage-store';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

type CreateMode = 'post' | 'vehicle' | 'listing' | 'video';
type VisibilityTarget = 'vehicle_only' | 'vehicle_and_profile' | 'feed_and_profile';

const createModes: Array<{ key: CreateMode; label: string; description: string }> = [
  { key: 'post', label: 'Normal gonderi', description: 'Sosyal akista gorsel, yazi veya guncelleme paylas.' },
  { key: 'vehicle', label: 'Arac gonderisi', description: 'Garajindaki bir araca bagli paylasim olustur.' },
  { key: 'listing', label: 'Ilan gonderisi', description: 'Profesyonel ilan karti ve mesajlasma akisi baslat.' },
  { key: 'video', label: 'Video', description: 'Video odakli icerigi akista yayinla.' },
];

const visibilityOptions: Array<{ key: VisibilityTarget; label: string; helper: string }> = [
  { key: 'vehicle_only', label: 'Sadece arac profili', helper: 'Icerik yalnizca arac detayinda onerilir.' },
  { key: 'vehicle_and_profile', label: 'Arac + profil', helper: 'Arac sayfasi ve profil akisi birlikte kullanilir.' },
  { key: 'feed_and_profile', label: 'Tum akislar', helper: 'Arac, profil ve ana akis birlikte kullanilir.' },
];

export function CreateScreen({ navigation, route }: { navigation: any; route: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const localVehicles = useGarageStore((state) => state.vehicles);
  const client = useMemo(() => getMobileApiClient(), []);
  const [mode, setMode] = useState<CreateMode>(route?.params?.mode || 'post');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState(snapshot?.settings.city || '');
  const [listingPhone, setListingPhone] = useState(snapshot?.settings.phone || '');
  const [files, setFiles] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<'primary' | string | null>(snapshot?.vehicle ? 'primary' : localVehicles[0]?.id || null);
  const [visibility, setVisibility] = useState<VisibilityTarget>('feed_and_profile');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [acceptedDocs, setAcceptedDocs] = useState<string[]>([]);

  useEffect(() => {
    if (route?.params?.mode) {
      setMode(route.params.mode);
    }
  }, [route?.params?.mode]);

  const selectedVehicle = selectedVehicleId === 'primary'
    ? (snapshot?.vehicle
        ? {
            id: 'primary',
            brand: snapshot.vehicle.brand,
            model: snapshot.vehicle.model,
            year: snapshot.vehicle.year,
            packageName: snapshot.vehicle.packageName,
            fuelType: snapshot.vehicle.fuelType || '',
            mileage: snapshot.vehicle.mileage,
          }
        : null)
    : localVehicles.find((item) => item.id === selectedVehicleId) || null;

  const requiredDocs = useMemo(() => {
    if (mode === 'listing') {
      return getLegalDocuments(snapshot?.commercial?.accountType || 'individual').filter((item) =>
        ['listing_rules', 'vehicle_listing_responsibility', 'messaging_safe_trade'].includes(item.id),
      );
    }

    return [];
  }, [mode, snapshot?.commercial?.accountType]);

  useEffect(() => {
    if (!selectedVehicle) {
      return;
    }

    if ((mode === 'vehicle' || mode === 'listing') && !title) {
      setTitle(`${selectedVehicle.brand} ${selectedVehicle.model}`);
    }
  }, [mode, selectedVehicle, title]);

  function toggleConsent(documentId: string) {
    setAcceptedDocs((current) =>
      current.includes(documentId) ? current.filter((item) => item !== documentId) : [...current, documentId],
    );
  }

  async function pickFiles() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.9,
    });

    if (!result.canceled) {
      setFiles(result.assets);
    }
  }

  async function submit() {
    if (!content.trim() && !files.length && mode !== 'listing') {
      setError('Paylasim metni veya medya eklemelisin.');
      return;
    }

    if ((mode === 'vehicle' || mode === 'listing') && !selectedVehicle) {
      setError('Bu icerik turu icin once bir arac secmelisin.');
      return;
    }

    if (mode === 'listing') {
      const missing = requiredDocs.filter((item) => !acceptedDocs.includes(item.id));
      if (missing.length) {
        setError('Ilan yayinlamak icin gerekli beyan ve kurallari kabul etmelisin.');
        return;
      }
      if (!price.trim()) {
        setError('Ilan fiyati zorunludur.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const uploaded: Array<{
        kind: MediaKind;
        uri?: string;
        label: string;
        hint: string;
        fileName?: string;
        mimeType?: string;
      }> = [];

      for (const asset of files) {
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || `upload-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        } as never);

        const uploadResponse = await client.uploadMedia(formData);
        const mediaKind: MediaKind = asset.mimeType?.includes('video') ? 'video' : 'image';
        uploaded.push({
          kind: mediaKind,
          uri: uploadResponse.url,
          label: asset.fileName || 'Medya',
          hint: mode === 'video' ? 'Video paylasimi' : 'Mobil V2 composer',
          fileName: asset.fileName || undefined,
          mimeType: asset.mimeType || undefined,
        });
      }

      const payload: CreatePostPayload & {
        vehicleContext?: Record<string, unknown>;
      } = {
        content: content.trim() || title.trim(),
        postType: mode === 'listing' ? 'listing' : 'standard',
        selectedMediaKinds: uploaded.map((item) => item.kind),
        selectedMedia: uploaded,
      };

      if (mode === 'listing') {
        payload.consents = requiredDocs.map((item) => ({
          type: item.id,
          accepted: true,
          version: item.version,
          sourceScreen: 'mobile_v2_create',
        }));
        payload.listingDraft = {
          title: title.trim() || `${selectedVehicle?.brand || ''} ${selectedVehicle?.model || ''}`.trim(),
          price: price.trim(),
          city: snapshot?.settings.city || location,
          district: snapshot?.settings.district || '',
          location: location || snapshot?.settings.city || '',
          phone: listingPhone || snapshot?.settings.phone || '',
          transmission: selectedVehicle?.packageName || 'Belirtilmedi',
          fuelType: selectedVehicle?.fuelType || 'Belirtilmedi',
          bodyType: selectedVehicle?.brand || 'Belirtilmedi',
          color: 'Belirtilmedi',
          plateOrigin: 'TR',
          damageRecord: '',
          paintInfo: '',
          changedParts: '',
          accidentInfo: '',
          description: content.trim(),
          extraEquipment: snapshot?.vehicle?.equipment?.join(', ') || '',
          includeExpertiz: true,
          registrationOwnerName: snapshot?.settings.registrationOwnerName || snapshot?.profile.name || '',
          registrationOwnerIdentityNumber: snapshot?.settings.registrationOwnerIdentityNumber || '',
          registrationSerialNumber: snapshot?.settings.registrationSerialNumber || '',
          registrationDocumentNumber: snapshot?.settings.registrationDocumentNumber || '',
          plateNumber: snapshot?.settings.defaultPlateNumber || '',
          sellerRelationType: 'owner',
          registrationOwnerFullNameDeclared: snapshot?.settings.registrationOwnerName || snapshot?.profile.name || '',
          isOwnerSameAsAccountHolder: true,
          authorizationDeclarationText: '',
        };
        payload.listingFlow = {
          currentState: 'submitted',
          vehicleInformation: {
            title: title.trim(),
            city: snapshot?.settings.city || location,
            district: snapshot?.settings.district || '',
            location: location || snapshot?.settings.city || '',
            phone: listingPhone || snapshot?.settings.phone || '',
          },
          pricingDescription: {
            price: price.trim(),
            description: content.trim(),
          },
          ownershipAuthorization: {
            sellerRelationType: 'owner',
            registrationOwnerFullNameDeclared: snapshot?.settings.registrationOwnerName || snapshot?.profile.name || '',
            isOwnerSameAsAccountHolder: true,
          },
          complianceResponsibility: {
            listingResponsibilityAccepted: true,
            authorizationDeclarationAccepted: true,
            safePaymentInformationAccepted: true,
          },
          previewPublish: {
            confirmed: true,
            requestedAction: 'publish',
          },
        };
      }

      if (mode === 'vehicle') {
        payload.vehicleContext = {
          vehicleId: selectedVehicleId,
          title: title.trim(),
          visibility,
          selectedVehicle,
        };
      }

      if (mode === 'video') {
        payload.vehicleContext = {
          mediaMode: 'video',
        };
      }

      const response = await client.createPost(payload);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }

      setMessage(response.message || (mode === 'listing' ? 'Ilan yayina gonderildi.' : 'Icerik paylasildi.'));
      setContent('');
      setTitle('');
      setPrice('');
      setFiles([]);
      setAcceptedDocs([]);
      Alert.alert('Basarili', mode === 'listing' ? 'Ilan olusturuldu.' : 'Paylasim tamamlandi.');
    } catch (submitError) {
      setError(getReadableErrorMessage(submitError, 'Icerik gonderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <TopHeader
        title="Olustur"
        subtitle="Gonderi, arac paylasimi, video veya profesyonel ilan hazirla"
        onPressSearch={() => navigation.navigate('Search')}
      />

      <SectionCard>
        <Text style={styles.sectionTitle}>Icerik turu</Text>
        <View style={styles.modeGrid}>
          {createModes.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.modeCard, mode === item.key && styles.modeCardActive]}
              onPress={() => setMode(item.key)}
            >
              <Text style={[styles.modeTitle, mode === item.key && styles.modeTitleActive]}>{item.label}</Text>
              <Text style={styles.modeDescription}>{item.description}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      {(mode === 'vehicle' || mode === 'listing') ? (
        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Arac baglami</Text>
            <PrimaryButton label="Garajim" variant="secondary" onPress={() => navigation.navigate('Garage')} />
          </View>

          {snapshot?.vehicle || localVehicles.length ? (
            <>
              <View style={styles.optionWrap}>
                {snapshot?.vehicle ? (
                  <PrimaryButton
                    label={`${snapshot.vehicle.brand} ${snapshot.vehicle.model}`}
                    variant={selectedVehicleId === 'primary' ? 'primary' : 'secondary'}
                    onPress={() => setSelectedVehicleId('primary')}
                  />
                ) : null}
                {localVehicles.map((vehicle) => (
                  <PrimaryButton
                    key={vehicle.id}
                    label={`${vehicle.brand} ${vehicle.model}`}
                    variant={selectedVehicleId === vehicle.id ? 'primary' : 'secondary'}
                    onPress={() => setSelectedVehicleId(vehicle.id)}
                  />
                ))}
              </View>
              {selectedVehicle ? (
                <View style={styles.contextCard}>
                  <Text style={styles.contextTitle}>
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </Text>
                  <Text style={styles.contextMeta}>
                    {selectedVehicle.year} | {selectedVehicle.packageName} | {selectedVehicle.mileage}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Arac secimi gerekiyor"
              description="Arac gonderisi ve ilan gonderisi icin once Garajim alanina en az bir arac eklemelisin."
              actionLabel="Garaja git"
              onAction={() => navigation.navigate('Garage')}
            />
          )}
        </SectionCard>
      ) : null}

      {mode === 'vehicle' ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Gorunurluk</Text>
          <View style={styles.optionWrap}>
            {visibilityOptions.map((item) => (
              <Pressable
                key={item.key}
                style={[styles.visibilityCard, visibility === item.key && styles.visibilityCardActive]}
                onPress={() => setVisibility(item.key)}
              >
                <Text style={[styles.visibilityTitle, visibility === item.key && styles.visibilityTitleActive]}>{item.label}</Text>
                <Text style={styles.visibilityHelper}>{item.helper}</Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <SectionCard>
        {mode !== 'post' ? (
          <AppInput label="Baslik" value={title} onChangeText={setTitle} placeholder="Kisa baslik" />
        ) : null}
        {mode === 'listing' ? (
          <>
            <AppInput label="Fiyat" value={price} onChangeText={setPrice} placeholder="1.250.000" />
            <AppInput label="Konum" value={location} onChangeText={setLocation} placeholder="Istanbul / Kadikoy" />
            <AppInput label="Iletisim telefonu" value={listingPhone} onChangeText={setListingPhone} placeholder="0555..." />
          </>
        ) : null}

        <AppInput
          label={mode === 'listing' ? 'Ilan aciklamasi' : 'Icerik'}
          value={content}
          onChangeText={setContent}
          placeholder={mode === 'video' ? 'Video aciklamasi yaz' : 'Metin veya aciklama'}
          multiline
        />

        <PrimaryButton label="Medya sec" variant="secondary" onPress={pickFiles} />
        {files.length ? <Text style={styles.helper}>{files.length} medya secildi.</Text> : null}
      </SectionCard>

      {mode === 'listing' ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Ilan yayinlama beyanlari</Text>
          {requiredDocs.map((item) => {
            const accepted = acceptedDocs.includes(item.id);
            return (
              <Pressable key={item.id} style={styles.consentRow} onPress={() => setDocument(item)}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.consentTitle}>{item.title}</Text>
                  <Text style={styles.consentMeta}>Detayi gor ve kabul et</Text>
                </View>
                <PrimaryButton
                  label={accepted ? 'Kabul edildi' : 'Kabul et'}
                  variant={accepted ? 'primary' : 'secondary'}
                  onPress={() => toggleConsent(item.id)}
                />
              </Pressable>
            );
          })}
        </SectionCard>
      ) : null}

      {message ? (
        <SectionCard>
          <Text style={styles.successText}>{message}</Text>
        </SectionCard>
      ) : null}

      <ErrorBanner message={error} />

      <PrimaryButton
        label={submitting ? 'Yayinlaniyor...' : mode === 'listing' ? 'Ilani yayinla' : 'Paylas'}
        onPress={() => void submit()}
        disabled={
          submitting ||
          ((mode === 'vehicle' || mode === 'listing') && !selectedVehicle) ||
          (mode === 'video' && !files.some((item) => item.mimeType?.includes('video')))
        }
      />

      {mode === 'video' && !files.some((item) => item.mimeType?.includes('video')) ? (
        <Text style={styles.helper}>Video modunda yayinlamak icin en az bir video secmelisin.</Text>
      ) : null}

      <LegalDocumentModal
        visible={Boolean(document)}
        document={document}
        accepted={Boolean(document && acceptedDocs.includes(document.id))}
        onClose={() => setDocument(null)}
        onAccept={() => {
          if (document) {
            toggleConsent(document.id);
          }
          setDocument(null);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modeGrid: {
    gap: 10,
  },
  modeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 6,
  },
  modeCardActive: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accentSoft,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  modeTitleActive: {
    color: tokens.colors.accent,
  },
  modeDescription: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextCard: {
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 6,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  contextMeta: {
    color: tokens.colors.muted,
  },
  visibilityCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 6,
  },
  visibilityCardActive: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accentSoft,
  },
  visibilityTitle: {
    fontWeight: '800',
    color: tokens.colors.text,
  },
  visibilityTitleActive: {
    color: tokens.colors.accent,
  },
  visibilityHelper: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  helper: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  consentTitle: {
    color: tokens.colors.text,
    fontWeight: '700',
  },
  consentMeta: {
    color: tokens.colors.muted,
    fontSize: 12,
  },
  successText: {
    color: tokens.colors.success,
    fontWeight: '700',
  },
});
