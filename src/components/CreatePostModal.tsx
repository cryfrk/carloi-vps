import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { appFeatureFlags } from '../config/featureFlags';
import {
  buildConsent,
  getListingResponsibilityCopy,
  getSafePaymentGuidanceText,
  getSubscriptionTermsText,
} from '../config/legalConsents';
import { getCurrentResolvedLocation } from '../services/location';
import { pickComposerMedia } from '../services/mediaPicker';
import { theme } from '../theme';
import {
  ComposerPayload,
  ListingBillingStatus,
  ListingCreateFlowPayload,
  ListingFlowResult,
  ListingSellerRelationType,
  MediaKind,
  Post,
  UserSettings,
  VehicleProfile,
} from '../types';
import { AdaptiveModal } from './AdaptiveModal';
import { ConsentChecklist } from './ConsentChecklist';

interface CreatePostModalProps {
  visible: boolean;
  hasVehicle: boolean;
  autoLocationEnabled?: boolean;
  vehicle?: VehicleProfile;
  settings?: UserSettings;
  editingPost?: Post | null;
  defaultMode?: 'standard' | 'listing';
  onClose: () => void;
  onSubmit: (
    payload: ComposerPayload,
  ) => Promise<{ message?: string; url?: string; listingFlow?: ListingFlowResult } | void>;
}

interface ListingDraftState {
  title: string;
  price: string;
  city: string;
  district: string;
  location: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  transmission: string;
  fuelType: string;
  bodyType: string;
  color: string;
  plateOrigin: string;
  damageRecord: string;
  paintInfo: string;
  changedParts: string;
  accidentInfo: string;
  description: string;
  extraEquipment: string;
  includeExpertiz: boolean;
  registrationOwnerName: string;
  registrationOwnerIdentityNumber: string;
  registrationSerialNumber: string;
  registrationDocumentNumber: string;
  plateNumber: string;
  sellerRelationType: ListingSellerRelationType;
  registrationOwnerFullNameDeclared: string;
  isOwnerSameAsAccountHolder: boolean;
  authorizationDeclarationText: string;
}

const mediaOptions: Array<{ key: MediaKind; label: string; icon: keyof typeof Feather.glyphMap }> =
  [
    { key: 'image', label: 'Fotoğraf', icon: 'image' },
    { key: 'video', label: 'Video', icon: 'film' },
    { key: 'gif', label: 'GIF', icon: 'play-circle' },
  ];

const relationOptions: Array<{ key: ListingSellerRelationType; label: string }> = [
  { key: 'owner', label: 'Araç sahibi' },
  { key: 'spouse', label: 'Eş' },
  { key: 'relative_second_degree', label: '2. derece yakın' },
  { key: 'authorized_business', label: 'Yetkili işletme' },
  { key: 'other_authorized', label: 'Diğer yetkili' },
];

function buildListingDefaults(vehicle?: VehicleProfile, editingPost?: Post | null, settings?: UserSettings) {
  return {
    title:
      editingPost?.listing?.title ??
      (vehicle ? `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName}` : ''),
    price: editingPost?.listing?.price ?? '',
    city: editingPost?.listing?.city ?? settings?.city ?? '',
    district: editingPost?.listing?.district ?? settings?.district ?? '',
    location: editingPost?.listing?.location ?? [settings?.district, settings?.city].filter(Boolean).join(' / '),
    latitude: editingPost?.listing?.latitude,
    longitude: editingPost?.listing?.longitude,
    phone: editingPost?.listing?.contactPhone ?? settings?.phone ?? '',
    transmission:
      editingPost?.listing?.specTable.find((item) => item.label.toLowerCase() === 'vites')?.value ??
      '',
    fuelType:
      editingPost?.listing?.specTable.find((item) => item.label.toLowerCase() === 'yakıt')?.value ??
      vehicle?.fuelType ??
      '',
    bodyType:
      editingPost?.listing?.specTable.find((item) => item.label.toLowerCase() === 'kasa tipi')?.value ??
      '',
    color: editingPost?.listing?.specTable.find((item) => item.label.toLowerCase() === 'renk')?.value ?? '',
    plateOrigin:
      editingPost?.listing?.specTable.find((item) => item.label.toLowerCase() === 'plaka')?.value ??
      '',
    damageRecord:
      editingPost?.listing?.conditionTable.find((item) => item.label.toLowerCase() === 'hasar kaydı')?.value ??
      '',
    paintInfo:
      editingPost?.listing?.conditionTable.find((item) => item.label.toLowerCase() === 'boya')?.value ?? '',
    changedParts:
      editingPost?.listing?.conditionTable.find((item) => item.label.toLowerCase() === 'değişen')?.value ??
      '',
    accidentInfo:
      editingPost?.listing?.conditionTable.find((item) => item.label.toLowerCase() === 'kaza')?.value ?? '',
    description:
      editingPost?.listing?.description ??
      (vehicle
        ? `${vehicle.year} ${vehicle.brand} ${vehicle.model} için güncel, temiz ve açıklayıcı ilan metni.`
        : ''),
    extraEquipment: editingPost?.listing?.extraEquipment ?? vehicle?.extraEquipment ?? '',
    includeExpertiz: editingPost?.listing?.showExpertiz ?? Boolean(vehicle),
    registrationOwnerName: editingPost?.listing?.registrationInfo?.ownerName ?? settings?.registrationOwnerName ?? '',
    registrationOwnerIdentityNumber:
      editingPost?.listing?.registrationInfo?.ownerIdentityNumber ??
      settings?.registrationOwnerIdentityNumber ??
      '',
    registrationSerialNumber:
      editingPost?.listing?.registrationInfo?.serialNumber ?? settings?.registrationSerialNumber ?? '',
    registrationDocumentNumber:
      editingPost?.listing?.registrationInfo?.documentNumber ?? settings?.registrationDocumentNumber ?? '',
    plateNumber: editingPost?.listing?.registrationInfo?.plateNumber ?? settings?.defaultPlateNumber ?? '',
    sellerRelationType: 'owner' as ListingSellerRelationType,
    registrationOwnerFullNameDeclared:
      editingPost?.listing?.registrationInfo?.ownerName ??
      settings?.registrationOwnerName ??
      settings?.legalFullName ??
      '',
    isOwnerSameAsAccountHolder: true,
    authorizationDeclarationText: '',
  } satisfies ListingDraftState;
}

function buildListingFlowPayload(
  listing: ListingDraftState,
  content: string,
  accepts: {
    listingResponsibilityAccepted: boolean;
    authorizationDeclarationAccepted: boolean;
    safePaymentInformationAccepted: boolean;
  },
  billingStatus: ListingBillingStatus,
  featuredRequested: boolean,
): ListingCreateFlowPayload {
  return {
    currentState: 'submitted',
    vehicleInformation: {
      title: listing.title.trim(),
      city: listing.city.trim(),
      district: listing.district.trim(),
      location: listing.location.trim(),
      latitude: listing.latitude,
      longitude: listing.longitude,
      phone: listing.phone.trim(),
      transmission: listing.transmission.trim(),
      fuelType: listing.fuelType.trim(),
      bodyType: listing.bodyType.trim(),
      color: listing.color.trim(),
      plateOrigin: listing.plateOrigin.trim(),
      plateNumber: listing.plateNumber.trim() || undefined,
      includeExpertiz: listing.includeExpertiz,
    },
    pricingDescription: {
      price: listing.price.trim(),
      description: listing.description.trim(),
      content: content.trim(),
      damageRecord: listing.damageRecord.trim(),
      paintInfo: listing.paintInfo.trim(),
      changedParts: listing.changedParts.trim(),
      accidentInfo: listing.accidentInfo.trim(),
      extraEquipment: listing.extraEquipment.trim(),
    },
    ownershipAuthorization: {
      sellerRelationType: listing.sellerRelationType,
      registrationOwnerFullNameDeclared: listing.registrationOwnerFullNameDeclared.trim(),
      isOwnerSameAsAccountHolder: listing.isOwnerSameAsAccountHolder,
      authorizationDeclarationText: listing.authorizationDeclarationText.trim() || undefined,
      registrationOwnerName: listing.registrationOwnerName.trim() || undefined,
      registrationOwnerIdentityNumber: listing.registrationOwnerIdentityNumber.trim() || undefined,
      registrationSerialNumber: listing.registrationSerialNumber.trim() || undefined,
      registrationDocumentNumber: listing.registrationDocumentNumber.trim() || undefined,
    },
    complianceResponsibility: {
      listingResponsibilityAccepted: accepts.listingResponsibilityAccepted,
      authorizationDeclarationAccepted: accepts.authorizationDeclarationAccepted,
      safePaymentInformationAccepted: accepts.safePaymentInformationAccepted,
    },
    billingListingFee: {
      paymentStatus: billingStatus,
      featuredRequested,
    },
    previewPublish: {
      confirmed: true,
      requestedAction: 'publish',
    },
  };
}

function getListingValidationError(
  listing: ListingDraftState,
  content: string,
  accepts: {
    listingResponsibilityAccepted: boolean;
    authorizationDeclarationAccepted: boolean;
    safePaymentInformationAccepted: boolean;
    subscriptionTermsAccepted: boolean;
  },
  featuredRequested: boolean,
) {
  if (!listing.title.trim()) {
    return 'İlan başlığı zorunludur.';
  }

  if (!listing.price.trim()) {
    return 'Fiyat zorunludur.';
  }

  if (!listing.city.trim() || !listing.district.trim()) {
    return 'Şehir ve ilçe bilgilerini tamamlayın.';
  }

  if ((listing.description.trim() || content.trim()).length < 24) {
    return 'İlan açıklaması en az 24 karakter olmalıdır.';
  }

  if (!listing.phone.trim()) {
    return 'İletişim telefonu zorunludur.';
  }

  if (!listing.registrationOwnerFullNameDeclared.trim()) {
    return 'Ruhsat sahibi veya yetkili kişi bilgisi gereklidir.';
  }

  if (listing.sellerRelationType !== 'owner' && !listing.authorizationDeclarationText.trim()) {
    return 'Araç sahibi dışında bir ilişki seçtiğinizde yetki beyanı girmeniz gerekir.';
  }

  if (!accepts.listingResponsibilityAccepted) {
    return 'İlan sorumluluğu onayı gereklidir.';
  }

  if (!accepts.safePaymentInformationAccepted) {
    return 'Güvenli ödeme bilgilendirmesini onaylamanız gerekir.';
  }

  if (listing.sellerRelationType !== 'owner' && !accepts.authorizationDeclarationAccepted) {
    return 'Yetki beyanı onayı gereklidir.';
  }

  if (appFeatureFlags.enablePaidListings && featuredRequested && !accepts.subscriptionTermsAccepted) {
    return 'Ücretli yayın koşullarını onaylamanız gerekir.';
  }

  return '';
}

export function CreatePostModal({
  visible,
  hasVehicle,
  autoLocationEnabled,
  vehicle,
  settings,
  editingPost,
  defaultMode = 'standard',
  onClose,
  onSubmit,
}: CreatePostModalProps) {
  const [postType, setPostType] = useState<'standard' | 'listing'>(defaultMode);
  const [content, setContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ComposerPayload['selectedMedia']>([]);
  const [listing, setListing] = useState<ListingDraftState>(buildListingDefaults(vehicle, editingPost, settings));
  const [listingResponsibilityAccepted, setListingResponsibilityAccepted] = useState(false);
  const [safePaymentInformationAccepted, setSafePaymentInformationAccepted] = useState(false);
  const [authorizationDeclarationAccepted, setAuthorizationDeclarationAccepted] = useState(false);
  const [subscriptionTermsAccepted, setSubscriptionTermsAccepted] = useState(false);
  const [featuredRequested, setFeaturedRequested] = useState(false);
  const [billingStatus, setBillingStatus] = useState<ListingBillingStatus>('not_required');
  const [autofillPending, setAutofillPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const listingResponsibilityCopy = getListingResponsibilityCopy(settings?.language || 'tr');
  const safePaymentCopy = getSafePaymentGuidanceText(settings?.language || 'tr');
  const subscriptionTermsCopy = getSubscriptionTermsText(settings?.language || 'tr');
  const selectedMediaKinds = useMemo(
    () => Array.from(new Set((selectedMedia ?? []).map((item) => item.kind))),
    [selectedMedia],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setPostType(editingPost?.type ?? defaultMode);
    setContent(editingPost?.content ?? '');
    setSelectedMedia(
      editingPost?.media
        ?.filter((media) => media.kind !== 'report')
        .map((media) => ({
          kind: media.kind,
          uri: media.uri,
          label: media.label,
          hint: media.hint,
        })) ?? [],
    );
    setListing(buildListingDefaults(vehicle, editingPost, settings));
    setListingResponsibilityAccepted(Boolean(editingPost?.type === 'listing'));
    setSafePaymentInformationAccepted(Boolean(editingPost?.type === 'listing'));
    setAuthorizationDeclarationAccepted(Boolean(editingPost?.type === 'listing'));
    setSubscriptionTermsAccepted(!appFeatureFlags.enablePaidListings);
    setFeaturedRequested(false);
    setBillingStatus('not_required');
    setSubmitting(false);
  }, [defaultMode, editingPost, settings, vehicle, visible]);

  useEffect(() => {
    if (
      !visible ||
      postType !== 'listing' ||
      !autoLocationEnabled ||
      listing.city ||
      listing.district ||
      listing.location
    ) {
      return;
    }

    void autofillLocation();
  }, [autoLocationEnabled, listing.city, listing.district, listing.location, postType, visible]);

  const updateListingField = <T extends keyof ListingDraftState>(field: T, value: ListingDraftState[T]) => {
    setListing((current) => ({ ...current, [field]: value }));
  };

  const addMedia = async (kind: MediaKind) => {
    const selectableKind = kind === 'report' ? 'image' : kind;

    try {
      const pickedMedia = await pickComposerMedia(selectableKind as 'image' | 'video' | 'gif');
      if (!pickedMedia) {
        return;
      }

      setSelectedMedia((current) => [...(current ?? []), pickedMedia]);
    } catch {
      Alert.alert(
        'Medya seçilemedi',
        'Galeri izni vermeniz veya başka bir dosya seçmeniz gerekiyor.',
      );
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia((current) => current?.filter((_, itemIndex) => itemIndex !== index) ?? []);
  };

  const autofillLocation = async () => {
    setAutofillPending(true);
    try {
      const location = await getCurrentResolvedLocation();
      setListing((current) => ({
        ...current,
        city: current.city || location.city || '',
        district: current.district || location.district || '',
        location: current.location || location.locationLine || '',
        latitude: location.latitude,
        longitude: location.longitude,
      }));
    } catch (error) {
      Alert.alert(
        'Konum alınamadı',
        error instanceof Error ? error.message : 'Konum bilgisi şu anda doldurulamadı.',
      );
    } finally {
      setAutofillPending(false);
    }
  };

  const submit = async () => {
    const standardError =
      postType === 'standard' && !content.trim() ? 'Paylaşım metni girmeden yayın oluşturamazsınız.' : '';
    const listingError =
      postType === 'listing'
        ? getListingValidationError(listing, content, {
            listingResponsibilityAccepted,
            authorizationDeclarationAccepted,
            safePaymentInformationAccepted,
            subscriptionTermsAccepted,
          }, featuredRequested)
        : '';
    const errorMessage = standardError || listingError;

    if (errorMessage) {
      Alert.alert('Form tamamlanmadı', errorMessage);
      return;
    }

    setSubmitting(true);
    try {
      const listingFlow =
        postType === 'listing'
          ? buildListingFlowPayload(
              listing,
              content,
              {
                listingResponsibilityAccepted,
                authorizationDeclarationAccepted,
                safePaymentInformationAccepted,
              },
              billingStatus,
              featuredRequested,
            )
          : undefined;

      await onSubmit({
        content: content.trim() || listing.description.trim(),
        postType,
        selectedMediaKinds,
        selectedMedia,
        editingPostId: editingPost?.id,
        consents:
          postType === 'listing'
            ? [
                buildConsent('listing_responsibility', 'listing_creation'),
                buildConsent('safe_payment_information', 'listing_creation'),
                ...(appFeatureFlags.enablePaidListings && subscriptionTermsAccepted
                  ? [buildConsent('subscription_terms', 'listing_billing')]
                  : []),
              ]
            : undefined,
        listingDraft:
          postType === 'listing'
            ? {
                title: listing.title.trim(),
                price: listing.price.trim(),
                city: listing.city.trim(),
                district: listing.district.trim(),
                location: listing.location.trim(),
                latitude: listing.latitude,
                longitude: listing.longitude,
                phone: listing.phone.trim(),
                transmission: listing.transmission.trim(),
                fuelType: listing.fuelType.trim(),
                bodyType: listing.bodyType.trim(),
                color: listing.color.trim(),
                plateOrigin: listing.plateOrigin.trim(),
                damageRecord: listing.damageRecord.trim(),
                paintInfo: listing.paintInfo.trim(),
                changedParts: listing.changedParts.trim(),
                accidentInfo: listing.accidentInfo.trim(),
                description: listing.description.trim(),
                extraEquipment: listing.extraEquipment.trim(),
                includeExpertiz: listing.includeExpertiz,
                registrationOwnerName: listing.registrationOwnerName.trim(),
                registrationOwnerIdentityNumber: listing.registrationOwnerIdentityNumber.trim(),
                registrationSerialNumber: listing.registrationSerialNumber.trim(),
                registrationDocumentNumber: listing.registrationDocumentNumber.trim(),
                plateNumber: listing.plateNumber.trim(),
                sellerRelationType: listing.sellerRelationType,
                registrationOwnerFullNameDeclared: listing.registrationOwnerFullNameDeclared.trim(),
                isOwnerSameAsAccountHolder: listing.isOwnerSameAsAccountHolder,
                authorizationDeclarationText: listing.authorizationDeclarationText.trim(),
              }
            : undefined,
        listingFlow,
      });
    } catch (error) {
      Alert.alert(
        postType === 'listing' ? 'İlan yayınlanamadı' : 'Paylaşım gönderilemedi',
        error instanceof Error
          ? error.message
          : postType === 'listing'
            ? 'İlan şu anda yayınlanamadı. Lütfen tekrar deneyin.'
            : 'Paylaşım şu anda gönderilemedi. Lütfen tekrar deneyin.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdaptiveModal animationType="slide" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>CARLOI</Text>
              <Text style={styles.title}>
                {editingPost
                  ? postType === 'listing'
                    ? 'İlanı düzenle'
                    : 'Gönderiyi düzenle'
                  : postType === 'listing'
                    ? 'Yeni ilan oluştur'
                    : 'Yeni gönderi paylaş'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather color={theme.colors.textSoft} name="x" size={18} />
            </Pressable>
          </View>

          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setPostType('standard')}
              style={[styles.modeChip, postType === 'standard' && styles.modeChipActive]}
            >
              <Text style={[styles.modeChipText, postType === 'standard' && styles.modeChipTextActive]}>
                Gönderi
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPostType('listing')}
              style={[styles.modeChip, postType === 'listing' && styles.modeChipActive]}
            >
              <Text style={[styles.modeChipText, postType === 'listing' && styles.modeChipTextActive]}>
                İlan
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.mediaCard}>
              <View style={styles.mediaHeader}>
                <Text style={styles.sectionTitle}>Medya ekle</Text>
                <Text style={styles.sectionHint}>
                  Fotoğraf, video veya GIF ile paylaşımını daha güçlü hale getir.
                </Text>
              </View>
              <View style={styles.mediaActions}>
                {mediaOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      void addMedia(option.key);
                    }}
                    style={styles.mediaActionChip}
                  >
                    <Feather color={theme.colors.primary} name={option.icon} size={14} />
                    <Text style={styles.mediaActionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>

              {selectedMedia?.length ? (
                <View style={styles.selectedMediaList}>
                  {selectedMedia.map((media, index) => (
                    <View key={`${media.kind}-${media.uri ?? media.label}-${index}`} style={styles.selectedMediaCard}>
                      {media.uri && media.kind !== 'video' ? (
                        <Image source={{ uri: media.uri }} style={styles.selectedMediaImage} />
                      ) : (
                        <View style={styles.selectedMediaPlaceholder}>
                          <Feather
                            color={theme.colors.primary}
                            name={media.kind === 'video' ? 'film' : 'image'}
                            size={18}
                          />
                        </View>
                      )}
                      <View style={styles.selectedMediaCopy}>
                        <Text numberOfLines={1} style={styles.selectedMediaTitle}>
                          {media.label}
                        </Text>
                        <Text numberOfLines={1} style={styles.selectedMediaHint}>
                          {media.hint}
                        </Text>
                      </View>
                      <Pressable onPress={() => removeMedia(index)} style={styles.removeMediaButton}>
                        <Feather color={theme.colors.textSoft} name="trash-2" size={14} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {postType === 'standard' ? (
              <View style={styles.standardStack}>
                {vehicle ? (
                  <View style={styles.vehicleRibbon}>
                    <View style={styles.vehicleRibbonBadge}>
                      <Feather color={theme.colors.primary} name="truck" size={14} />
                    </View>
                    <View style={styles.vehicleRibbonCopy}>
                      <Text style={styles.vehicleRibbonTitle}>Aktif araç bağlamı</Text>
                      <Text style={styles.vehicleRibbonText}>
                        {vehicle.year} {vehicle.brand} {vehicle.model} • {vehicle.packageName}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.copyCard}>
                  <Text style={styles.sectionTitle}>Ne paylaşmak istiyorsun?</Text>
                  <TextInput
                    multiline
                    onChangeText={setContent}
                    placeholder="Araç deneyimi, kısa video, soru, karşılaştırma veya yeni ilan duyurusu..."
                    placeholderTextColor={theme.colors.textSoft}
                    style={styles.primaryTextArea}
                    textAlignVertical="top"
                    value={content}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.listingStack}>
                <View style={styles.vehicleRibbon}>
                  <View style={styles.vehicleRibbonBadge}>
                    <Feather color={theme.colors.primary} name="truck" size={14} />
                  </View>
                  <View style={styles.vehicleRibbonCopy}>
                    <Text style={styles.vehicleRibbonTitle}>
                      {hasVehicle && vehicle ? 'Garajından otomatik dolduruldu' : 'İlan akışı hazır'}
                    </Text>
                    <Text style={styles.vehicleRibbonText}>
                      {vehicle
                        ? `${vehicle.year} ${vehicle.brand} ${vehicle.model} bilgileri hızlı başlangıç için eklendi.`
                        : 'Araç bağlı olmasa da ilan oluşturabilirsin; temel bilgileri aşağıdan tamamla.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>İlan özeti</Text>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Başlık</Text>
                    <TextInput
                      onChangeText={(value) => updateListingField('title', value)}
                      placeholder="2021 BMW 320i M Sport temiz kullanım"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={listing.title}
                    />
                  </View>
                  <View style={styles.twoColumnRow}>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>Fiyat</Text>
                      <TextInput
                        keyboardType="number-pad"
                        onChangeText={(value) => updateListingField('price', value)}
                        placeholder="1.850.000 TL"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.price}
                      />
                    </View>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>Telefon</Text>
                      <TextInput
                        keyboardType="phone-pad"
                        onChangeText={(value) => updateListingField('phone', value)}
                        placeholder="05xx xxx xx xx"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.phone}
                      />
                    </View>
                  </View>
                  <View style={styles.twoColumnRow}>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>Şehir</Text>
                      <TextInput
                        onChangeText={(value) => updateListingField('city', value)}
                        placeholder="İstanbul"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.city}
                      />
                    </View>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>İlçe</Text>
                      <TextInput
                        onChangeText={(value) => updateListingField('district', value)}
                        placeholder="Kadıköy"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.district}
                      />
                    </View>
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Konum satırı</Text>
                    <TextInput
                      onChangeText={(value) => updateListingField('location', value)}
                      placeholder="Kadıköy / İstanbul"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={listing.location}
                    />
                  </View>
                  <Pressable
                    onPress={() => {
                      void autofillLocation();
                    }}
                    style={styles.autofillButton}
                  >
                    <Feather color={theme.colors.primary} name="map-pin" size={14} />
                    <Text style={styles.autofillButtonText}>
                      {autofillPending ? 'Konum okunuyor...' : 'Konumu cihazdan doldur'}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>Araç ve açıklama</Text>
                  <View style={styles.twoColumnRow}>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>Yakıt</Text>
                      <TextInput
                        onChangeText={(value) => updateListingField('fuelType', value)}
                        placeholder="Benzin"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.fuelType}
                      />
                    </View>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>Vites</Text>
                      <TextInput
                        onChangeText={(value) => updateListingField('transmission', value)}
                        placeholder="Otomatik"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.transmission}
                      />
                    </View>
                  </View>
                  <View style={styles.twoColumnRow}>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>Kasa tipi</Text>
                      <TextInput
                        onChangeText={(value) => updateListingField('bodyType', value)}
                        placeholder="Sedan"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.bodyType}
                      />
                    </View>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>Renk</Text>
                      <TextInput
                        onChangeText={(value) => updateListingField('color', value)}
                        placeholder="Siyah"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.color}
                      />
                    </View>
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Kısa paylaşım metni</Text>
                    <TextInput
                      multiline
                      onChangeText={setContent}
                      placeholder="Bu araçla ilgili kısa not, dikkat çeken özellik veya sosyal paylaşım satırı..."
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.secondaryTextArea}
                      textAlignVertical="top"
                      value={content}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>İlan açıklaması</Text>
                    <TextInput
                      multiline
                      onChangeText={(value) => updateListingField('description', value)}
                      placeholder="Hasar, değişen, bakım, ekspertiz, takas ve pazarlık notlarını net şekilde yaz."
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.primaryTextArea}
                      textAlignVertical="top"
                      value={listing.description}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Ek donanım / not</Text>
                    <TextInput
                      onChangeText={(value) => updateListingField('extraEquipment', value)}
                      placeholder="Cam tavan, adaptif cruise, yeni lastik..."
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={listing.extraEquipment}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <View style={styles.switchCopy}>
                      <Text style={styles.switchTitle}>Ekspertiz kartını göster</Text>
                      <Text style={styles.switchHint}>
                        Araç bağlıysa özet sağlık bilgisini ilan önizlemesine taşı.
                      </Text>
                    </View>
                    <Switch
                      onValueChange={(value) => updateListingField('includeExpertiz', value)}
                      thumbColor={listing.includeExpertiz ? theme.colors.primary : '#FFFFFF'}
                      trackColor={{ false: '#C8CDD2', true: '#A4E2DA' }}
                      value={listing.includeExpertiz}
                    />
                  </View>
                </View>

                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>Yetki ve ruhsat</Text>
                  <View style={styles.optionGrid}>
                    {relationOptions.map((option) => {
                      const active = listing.sellerRelationType === option.key;
                      return (
                        <Pressable
                          key={option.key}
                          onPress={() => updateListingField('sellerRelationType', option.key)}
                          style={[styles.optionCard, active && styles.optionCardActive]}
                        >
                          <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Ruhsat sahibi / yetkili kişi</Text>
                    <TextInput
                      onChangeText={(value) => updateListingField('registrationOwnerFullNameDeclared', value)}
                      placeholder="Ad Soyad"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={listing.registrationOwnerFullNameDeclared}
                    />
                  </View>
                  {listing.sellerRelationType !== 'owner' ? (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Yetki beyanı</Text>
                      <TextInput
                        multiline
                        onChangeText={(value) => updateListingField('authorizationDeclarationText', value)}
                        placeholder="Araç sahibi adına ilan verme yetkimi ve ilişkimi kısaca açıklarım..."
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.secondaryTextArea}
                        textAlignVertical="top"
                        value={listing.authorizationDeclarationText}
                      />
                    </View>
                  ) : null}
                  <View style={styles.twoColumnRow}>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>Varsayılan plaka</Text>
                      <TextInput
                        onChangeText={(value) => updateListingField('plateNumber', value)}
                        placeholder="34 ABC 123"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.plateNumber}
                      />
                    </View>
                    <View style={styles.flexField}>
                      <Text style={styles.fieldLabel}>Plaka ili</Text>
                      <TextInput
                        onChangeText={(value) => updateListingField('plateOrigin', value)}
                        placeholder="34"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={listing.plateOrigin}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>Uyumluluk ve yayın güvenliği</Text>
                  <ConsentChecklist
                    items={[
                      {
                        key: 'listing_responsibility',
                        title: listingResponsibilityCopy.title,
                        description: listingResponsibilityCopy.description,
                        required: true,
                        value: listingResponsibilityAccepted,
                        onToggle: setListingResponsibilityAccepted,
                      },
                      {
                        key: 'safe_payment_information',
                        title: safePaymentCopy.confirmLabel,
                        description: safePaymentCopy.message,
                        required: true,
                        value: safePaymentInformationAccepted,
                        onToggle: setSafePaymentInformationAccepted,
                      },
                      ...(listing.sellerRelationType !== 'owner'
                        ? [
                            {
                              key: 'authorization_declaration',
                              title: 'Yetki beyanını onaylıyorum',
                              description:
                                'Araç sahibi dışında bir ilişki seçtiğim için ilan verme yetkimi ayrıca beyan ediyorum.',
                              required: true,
                              value: authorizationDeclarationAccepted,
                              onToggle: setAuthorizationDeclarationAccepted,
                            },
                          ]
                        : []),
                    ]}
                  />
                </View>

                {appFeatureFlags.enablePaidListings ? (
                  <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Vitrin ve ücretli yayın</Text>
                    <View style={styles.switchRow}>
                      <View style={styles.switchCopy}>
                        <Text style={styles.switchTitle}>Featured görünürlük iste</Text>
                        <Text style={styles.switchHint}>
                          Onaylıysa ödeme adımından sonra daha güçlü görünürlük talep edebilirsin.
                        </Text>
                      </View>
                      <Switch
                        onValueChange={(value) => {
                          setFeaturedRequested(value);
                          setBillingStatus(value ? 'pending' : 'not_required');
                        }}
                        thumbColor={featuredRequested ? theme.colors.primary : '#FFFFFF'}
                        trackColor={{ false: '#C8CDD2', true: '#A4E2DA' }}
                        value={featuredRequested}
                      />
                    </View>
                    <ConsentChecklist
                      items={[
                        {
                          key: 'subscription_terms',
                          title: subscriptionTermsCopy.confirmLabel,
                          description: subscriptionTermsCopy.message,
                          required: true,
                          value: subscriptionTermsAccepted,
                          onToggle: setSubscriptionTermsAccepted,
                        },
                      ]}
                    />
                  </View>
                ) : null}

                <View style={styles.noticeCard}>
                  <Text style={styles.noticeTitle}>Yayın akışı</Text>
                  <Text style={styles.noticeText}>
                    İlan gönderildikten sonra risk ve uyumluluk kontrolünden geçer. Düşük riskli ilanlar
                    doğrudan yayına alınır; orta ve yüksek riskte inceleme veya ek doğrulama istenebilir.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Vazgeç</Text>
            </Pressable>
            <Pressable
              disabled={submitting}
              onPress={() => {
                void submit();
              }}
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {submitting
                  ? 'Gönderiliyor...'
                  : editingPost
                    ? 'Güncelle'
                    : postType === 'listing'
                      ? 'İlanı yayına gönder'
                      : 'Paylaş'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    maxHeight: '94%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  modeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modeChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  modeChipActive: {
    backgroundColor: theme.colors.text,
  },
  modeChipText: {
    color: theme.colors.textSoft,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: theme.colors.card,
  },
  content: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  mediaCard: {
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow,
  },
  mediaHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHint: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  mediaActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  mediaActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
  },
  mediaActionText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedMediaList: {
    gap: theme.spacing.sm,
  },
  selectedMediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
  },
  selectedMediaImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  selectedMediaPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  selectedMediaCopy: {
    flex: 1,
    gap: 3,
  },
  selectedMediaTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  selectedMediaHint: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  removeMediaButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  standardStack: {
    gap: theme.spacing.md,
  },
  listingStack: {
    gap: theme.spacing.md,
  },
  vehicleRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySoft,
    padding: theme.spacing.md,
  },
  vehicleRibbonBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  vehicleRibbonCopy: {
    flex: 1,
    gap: 4,
  },
  vehicleRibbonTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  vehicleRibbonText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  copyCard: {
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow,
  },
  formCard: {
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryTextArea: {
    minHeight: 128,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryTextArea: {
    minHeight: 94,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  flexField: {
    flex: 1,
    gap: 6,
  },
  autofillButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
  },
  autofillButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionCard: {
    flexGrow: 1,
    minWidth: '47%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  optionCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  optionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  optionTitleActive: {
    color: theme.colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  switchHint: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  noticeCard: {
    borderRadius: 22,
    backgroundColor: '#FFF4E8',
    padding: theme.spacing.md,
    gap: 6,
  },
  noticeTitle: {
    color: theme.colors.warning,
    fontWeight: '800',
  },
  noticeText: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
});
