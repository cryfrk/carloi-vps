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
  onClose: () => void;
  onSubmit: (
    payload: ComposerPayload,
  ) => Promise<{ message?: string; url?: string; listingFlow?: ListingFlowResult } | void>;
}

type ListingStepKey =
  | 'vehicle_information'
  | 'pricing_description'
  | 'ownership_authorization'
  | 'compliance_responsibility'
  | 'billing_listing_fee'
  | 'preview_publish';

const mediaOptions: Array<{ key: MediaKind; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { key: 'image', label: 'Fotoğraf', icon: 'image' },
  { key: 'video', label: 'Video', icon: 'film' },
  { key: 'gif', label: 'GIF', icon: 'play-circle' },
];

const relationOptions: Array<{ key: ListingSellerRelationType; label: string }> = [
  { key: 'owner', label: 'Araç sahibi' },
  { key: 'spouse', label: 'Eş' },
  { key: 'relative_second_degree', label: '2. derece yakını' },
  { key: 'authorized_business', label: 'Yetkili işletme' },
  { key: 'other_authorized', label: 'Diğer yetkili' },
];

const listingBaseSteps: Array<{ key: ListingStepKey; title: string; helper: string }> = [
  {
    key: 'vehicle_information',
    title: 'Araç Bilgileri',
    helper: 'Temel araç, konum ve plaka alanları burada toplanır.',
  },
  {
    key: 'pricing_description',
    title: 'Fiyat ve Açıklama',
    helper: 'Fiyat, vitrin metni ve ilan açıklaması bu adımda tamamlanır.',
  },
  {
    key: 'ownership_authorization',
    title: 'Sahiplik / Yetki',
    helper: 'Aracı kim adına pazarladığınızı ve yetki beyanınızı ekleyin.',
  },
  {
    key: 'compliance_responsibility',
    title: 'Uyumluluk ve Sorumluluk',
    helper: 'Beyan ve güvenli ödeme bilgilendirmesi bu ekranda kabul edilir.',
  },
  {
    key: 'billing_listing_fee',
    title: 'Ücretlendirme',
    helper: 'Ücretli ilan özelliği açıksa ödeme durumu bu adımda kontrol edilir.',
  },
  {
    key: 'preview_publish',
    title: 'Önizleme ve Yayın',
    helper: 'Son kontrol sonrası yayın kararı risk sonucuna göre verilir.',
  },
];

type ListingFormState = ReturnType<typeof buildListingDefaults>;

function buildListingDefaults(vehicle?: VehicleProfile, post?: Post | null, settings?: UserSettings) {
  return {
    title:
      post?.listing?.title ??
      (vehicle ? `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName}` : ''),
    price: post?.listing?.price ?? '',
    city: post?.listing?.city ?? '',
    district: post?.listing?.district ?? '',
    location: post?.listing?.location ?? '',
    latitude: post?.listing?.latitude,
    longitude: post?.listing?.longitude,
    phone: post?.listing?.contactPhone ?? '',
    transmission: post?.listing?.specTable.find((item) => item.label === 'Vites')?.value ?? '',
    fuelType:
      post?.listing?.specTable.find((item) => item.label === 'Yakıt')?.value ?? vehicle?.fuelType ?? '',
    bodyType: post?.listing?.specTable.find((item) => item.label === 'Kasa tipi')?.value ?? '',
    color: post?.listing?.specTable.find((item) => item.label === 'Renk')?.value ?? '',
    plateOrigin: post?.listing?.specTable.find((item) => item.label === 'Plaka')?.value ?? '',
    damageRecord:
      post?.listing?.conditionTable.find((item) => item.label === 'Hasar kaydı')?.value ?? '',
    paintInfo: post?.listing?.conditionTable.find((item) => item.label === 'Boya')?.value ?? '',
    changedParts:
      post?.listing?.conditionTable.find((item) => item.label === 'Değişen')?.value ?? '',
    accidentInfo: post?.listing?.conditionTable.find((item) => item.label === 'Kaza')?.value ?? '',
    description:
      post?.listing?.description ??
      (vehicle
        ? `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName} aracıma ait güncel ilan.`
        : ''),
    extraEquipment: post?.listing?.extraEquipment ?? vehicle?.extraEquipment ?? '',
    includeExpertiz: post?.listing?.showExpertiz ?? Boolean(vehicle),
    registrationOwnerName:
      post?.listing?.registrationInfo?.ownerName ??
      settings?.registrationOwnerName ??
      settings?.legalFullName ??
      '',
    registrationOwnerIdentityNumber:
      post?.listing?.registrationInfo?.ownerIdentityNumber ??
      settings?.registrationOwnerIdentityNumber ??
      settings?.identityNumber ??
      '',
    registrationSerialNumber:
      post?.listing?.registrationInfo?.serialNumber ?? settings?.registrationSerialNumber ?? '',
    registrationDocumentNumber:
      post?.listing?.registrationInfo?.documentNumber ?? settings?.registrationDocumentNumber ?? '',
    plateNumber: post?.listing?.registrationInfo?.plateNumber ?? settings?.defaultPlateNumber ?? '',
    sellerRelationType: 'owner' as ListingSellerRelationType,
    registrationOwnerFullNameDeclared:
      settings?.registrationOwnerName ||
      settings?.legalFullName ||
      post?.listing?.registrationInfo?.ownerName ||
      '',
    isOwnerSameAsAccountHolder: true,
    authorizationDeclarationText: '',
  };
}

function getListingSteps() {
  return listingBaseSteps.filter(
    (step) => step.key !== 'billing_listing_fee' || appFeatureFlags.enablePaidListings,
  );
}

function buildListingFlowPayload(
  listingForm: ListingFormState,
  content: string,
  accepts: {
    listingResponsibilityAccepted: boolean;
    safePaymentInformationAccepted: boolean;
    authorizationDeclarationAccepted: boolean;
  },
  billingStatus: ListingBillingStatus,
  featuredRequested: boolean,
): ListingCreateFlowPayload {
  return {
    vehicleInformation: {
      title: listingForm.title.trim(),
      city: listingForm.city.trim(),
      district: listingForm.district.trim(),
      location: listingForm.location.trim(),
      latitude: listingForm.latitude,
      longitude: listingForm.longitude,
      phone: listingForm.phone.trim(),
      transmission: listingForm.transmission.trim(),
      fuelType: listingForm.fuelType.trim(),
      bodyType: listingForm.bodyType.trim(),
      color: listingForm.color.trim(),
      plateOrigin: listingForm.plateOrigin.trim(),
      plateNumber: listingForm.plateNumber.trim(),
      includeExpertiz: listingForm.includeExpertiz,
    },
    pricingDescription: {
      price: listingForm.price.trim(),
      description: listingForm.description.trim(),
      content: content.trim(),
      damageRecord: listingForm.damageRecord.trim(),
      paintInfo: listingForm.paintInfo.trim(),
      changedParts: listingForm.changedParts.trim(),
      accidentInfo: listingForm.accidentInfo.trim(),
      extraEquipment: listingForm.extraEquipment.trim(),
    },
    ownershipAuthorization: {
      sellerRelationType: listingForm.sellerRelationType,
      registrationOwnerFullNameDeclared:
        listingForm.registrationOwnerFullNameDeclared.trim(),
      isOwnerSameAsAccountHolder: listingForm.isOwnerSameAsAccountHolder,
      authorizationDeclarationText:
        listingForm.authorizationDeclarationText.trim(),
      registrationOwnerName: listingForm.registrationOwnerName.trim(),
      registrationOwnerIdentityNumber:
        listingForm.registrationOwnerIdentityNumber.trim(),
      registrationSerialNumber: listingForm.registrationSerialNumber.trim(),
      registrationDocumentNumber:
        listingForm.registrationDocumentNumber.trim(),
    },
    complianceResponsibility: {
      listingResponsibilityAccepted: accepts.listingResponsibilityAccepted,
      safePaymentInformationAccepted: accepts.safePaymentInformationAccepted,
      authorizationDeclarationAccepted: accepts.authorizationDeclarationAccepted,
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

function getStepError(
  step: ListingStepKey,
  listingForm: ListingFormState,
  content: string,
  accepts: {
    listingResponsibilityAccepted: boolean;
    safePaymentInformationAccepted: boolean;
    authorizationDeclarationAccepted: boolean;
    subscriptionTermsAccepted: boolean;
  },
) {
  switch (step) {
    case 'vehicle_information':
      if (!listingForm.title.trim()) {
        return 'İlan başlığı zorunludur.';
      }
      if (!listingForm.city.trim() || !listingForm.district.trim()) {
        return 'Şehir ve ilçe bilgilerini tamamlayın.';
      }
      return '';
    case 'pricing_description':
      if (!listingForm.price.trim()) {
        return 'Fiyat zorunludur.';
      }
      if (listingForm.description.trim().length < 20) {
        return 'İlan açıklaması en az 20 karakter olmalıdır.';
      }
      return '';
    case 'ownership_authorization':
      if (!listingForm.registrationOwnerFullNameDeclared.trim()) {
        return 'Ruhsat sahibi adı soyadı zorunludur.';
      }
      if (
        listingForm.sellerRelationType !== 'owner' &&
        !listingForm.authorizationDeclarationText.trim()
      ) {
        return 'Yetki beyan metni gereklidir.';
      }
      return '';
    case 'compliance_responsibility':
      if (!accepts.listingResponsibilityAccepted) {
        return 'İlan sorumluluğu onayı gereklidir.';
      }
      if (!accepts.safePaymentInformationAccepted) {
        return 'Güvenli ödeme bilgilendirmesi onayı gereklidir.';
      }
      if (
        listingForm.sellerRelationType !== 'owner' &&
        !accepts.authorizationDeclarationAccepted
      ) {
        return 'Yetki beyanı onayını tamamlayın.';
      }
      return '';
    case 'billing_listing_fee':
      if (!accepts.subscriptionTermsAccepted) {
        return 'Ucretli yayin adimi icin abonelik kosullari onayi gereklidir.';
      }
      return '';
    case 'preview_publish':
      return '';
    default:
      return content.trim().length ? '' : 'İçerik zorunludur.';
  }
}

export function CreatePostModal({
  visible,
  hasVehicle,
  autoLocationEnabled,
  vehicle,
  settings,
  editingPost,
  onClose,
  onSubmit,
}: CreatePostModalProps) {
  const [postType, setPostType] = useState<'standard' | 'listing'>('standard');
  const [content, setContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ComposerPayload['selectedMedia']>([]);
  const [listingForm, setListingForm] = useState(buildListingDefaults(vehicle, editingPost, settings));
  const [listingResponsibilityAccepted, setListingResponsibilityAccepted] = useState(false);
  const [safePaymentInformationAccepted, setSafePaymentInformationAccepted] = useState(false);
  const [authorizationDeclarationAccepted, setAuthorizationDeclarationAccepted] = useState(false);
  const [billingStatus, setBillingStatus] = useState<ListingBillingStatus>('not_required');
  const [subscriptionTermsAccepted, setSubscriptionTermsAccepted] = useState(false);
  const [featuredRequested, setFeaturedRequested] = useState(false);
  const [autofillPending, setAutofillPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeListingStep, setActiveListingStep] = useState<ListingStepKey>('vehicle_information');

  const listingSteps = useMemo(() => getListingSteps(), []);
  const selectedMediaKinds = useMemo(
    () => Array.from(new Set((selectedMedia ?? []).map((item) => item.kind))),
    [selectedMedia],
  );
  const listingResponsibilityCopy = getListingResponsibilityCopy(settings?.language || 'tr');
  const safePaymentCopy = getSafePaymentGuidanceText(settings?.language || 'tr');
  const subscriptionTermsCopy = getSubscriptionTermsText(settings?.language || 'tr');
  const currentStep = listingSteps.find((step) => step.key === activeListingStep) || listingSteps[0];
  const currentStepIndex = listingSteps.findIndex((step) => step.key === activeListingStep);
  const stepError =
    postType === 'listing'
      ? getStepError(
          activeListingStep,
          listingForm,
          content,
          {
            listingResponsibilityAccepted,
            safePaymentInformationAccepted,
            authorizationDeclarationAccepted,
            subscriptionTermsAccepted,
          },
        )
      : content.trim().length > 0
        ? ''
        : 'Gönderi içeriği zorunludur.';

  useEffect(() => {
    if (!visible) {
      return;
    }

    setPostType(editingPost?.type ?? 'standard');
    setContent(editingPost?.content ?? '');
    setSelectedMedia(
      editingPost?.media
        .filter((media) => media.kind !== 'report')
        .map((media) => ({
          kind: media.kind,
          uri: media.uri,
          label: media.label,
          hint: media.hint,
        })) ?? [],
    );
    setListingForm(buildListingDefaults(vehicle, editingPost, settings));
    setListingResponsibilityAccepted(Boolean(editingPost?.type === 'listing'));
    setSafePaymentInformationAccepted(Boolean(editingPost?.type === 'listing'));
    setAuthorizationDeclarationAccepted(Boolean(editingPost?.type === 'listing'));
    setBillingStatus(appFeatureFlags.enablePaidListings ? 'pending' : 'not_required');
    setSubscriptionTermsAccepted(false);
    setFeaturedRequested(false);
    setActiveListingStep('vehicle_information');
    setSubmitting(false);
  }, [editingPost, settings, vehicle, visible]);

  useEffect(() => {
    if (
      !visible ||
      postType !== 'listing' ||
      !autoLocationEnabled ||
      listingForm.city ||
      listingForm.district ||
      listingForm.location
    ) {
      return;
    }

    void autofillLocation();
  }, [
    autoLocationEnabled,
    listingForm.city,
    listingForm.district,
    listingForm.location,
    postType,
    visible,
  ]);

  const updateListingField = <T extends keyof ListingFormState>(
    field: T,
    value: ListingFormState[T],
  ) => {
    setListingForm((current) => ({ ...current, [field]: value }));
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
      Alert.alert('Medya seçilemedi', 'Galeri izni vermeniz veya başka bir dosya seçmeniz gerekiyor.');
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia((current) => current?.filter((_, itemIndex) => itemIndex !== index) ?? []);
  };

  const autofillLocation = async () => {
    setAutofillPending(true);
    try {
      const location = await getCurrentResolvedLocation();
      setListingForm((current) => ({
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

  const goToNextStep = () => {
    if (stepError) {
      Alert.alert('Adım tamamlanmadı', stepError);
      return;
    }

    const nextStep = listingSteps[currentStepIndex + 1];
    if (nextStep) {
      setActiveListingStep(nextStep.key);
    }
  };

  const goToPreviousStep = () => {
    const previousStep = listingSteps[currentStepIndex - 1];
    if (previousStep) {
      setActiveListingStep(previousStep.key);
    }
  };

  const submit = async () => {
    if (stepError) {
      Alert.alert('Adım tamamlanmadı', stepError);
      return;
    }

    setSubmitting(true);
    try {
      const listingFlow =
        postType === 'listing'
          ? buildListingFlowPayload(
              listingForm,
              content,
              {
                listingResponsibilityAccepted,
                safePaymentInformationAccepted,
                authorizationDeclarationAccepted,
              },
              billingStatus,
              featuredRequested,
            )
          : undefined;

      await onSubmit({
        content: content.trim(),
        postType,
        selectedMediaKinds,
        selectedMedia,
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
        editingPostId: editingPost?.id,
        listingFlow,
        listingDraft:
          postType === 'listing'
            ? {
                title: listingForm.title.trim(),
                price: listingForm.price.trim(),
                city: listingForm.city.trim(),
                district: listingForm.district.trim(),
                location: listingForm.location.trim(),
                latitude: listingForm.latitude,
                longitude: listingForm.longitude,
                phone: listingForm.phone.trim(),
                transmission: listingForm.transmission.trim(),
                fuelType: listingForm.fuelType.trim(),
                bodyType: listingForm.bodyType.trim(),
                color: listingForm.color.trim(),
                plateOrigin: listingForm.plateOrigin.trim(),
                damageRecord: listingForm.damageRecord.trim(),
                paintInfo: listingForm.paintInfo.trim(),
                changedParts: listingForm.changedParts.trim(),
                accidentInfo: listingForm.accidentInfo.trim(),
                description: listingForm.description.trim(),
                extraEquipment: listingForm.extraEquipment.trim(),
                includeExpertiz: listingForm.includeExpertiz,
                registrationOwnerName: listingForm.registrationOwnerName.trim(),
                registrationOwnerIdentityNumber:
                  listingForm.registrationOwnerIdentityNumber.trim(),
                registrationSerialNumber: listingForm.registrationSerialNumber.trim(),
                registrationDocumentNumber:
                  listingForm.registrationDocumentNumber.trim(),
                plateNumber: listingForm.plateNumber.trim(),
                sellerRelationType: listingForm.sellerRelationType,
                registrationOwnerFullNameDeclared:
                  listingForm.registrationOwnerFullNameDeclared.trim(),
                isOwnerSameAsAccountHolder:
                  listingForm.isOwnerSameAsAccountHolder,
                authorizationDeclarationText:
                  listingForm.authorizationDeclarationText.trim(),
              }
            : undefined,
      });
    } catch (error) {
      Alert.alert(
        postType === 'listing' ? 'İlan kaydedilemedi' : 'Paylaşım kaydedilemedi',
        error instanceof Error ? error.message : 'İşlem şu anda tamamlanamadı.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderListingStep = () => {
    switch (activeListingStep) {
      case 'vehicle_information':
        return (
          <>
            {hasVehicle && vehicle ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Araç profilinden gelen özet</Text>
                <Text style={styles.previewText}>
                  {vehicle.year} {vehicle.brand} {vehicle.model} {vehicle.packageName}
                </Text>
                <Text style={styles.previewMeta}>
                  {vehicle.mileage} • {vehicle.engineVolume} •{' '}
                  {typeof vehicle.healthScore === 'number'
                    ? `Sağlık %${vehicle.healthScore}`
                    : 'OBD verisi yok'}
                </Text>
              </View>
            ) : (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Araç profili gerekli</Text>
                <Text style={styles.warningText}>
                  İlan v2 akışı için önce araç ekranında temel profilinizi oluşturun.
                </Text>
              </View>
            )}

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.sectionTitle}>Ekspertiz görselini ekle</Text>
                <Text style={styles.sectionHelper}>
                  Carloi ekspertiz özeti isteğe bağlı olarak ilanda gösterilir.
                </Text>
              </View>
              <Switch
                onValueChange={(value) => updateListingField('includeExpertiz', value)}
                thumbColor={listingForm.includeExpertiz ? theme.colors.primary : '#FFFFFF'}
                trackColor={{ false: '#C8CDD2', true: '#A4E2DA' }}
                value={listingForm.includeExpertiz}
              />
            </View>

            <TextInput
              onChangeText={(value) => updateListingField('title', value)}
              placeholder="İlan başlığı"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              value={listingForm.title}
            />

            <View style={styles.twoColumnRow}>
              <TextInput
                onChangeText={(value) => updateListingField('city', value)}
                placeholder="Şehir"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, styles.flexColumn]}
                value={listingForm.city}
              />
              <TextInput
                onChangeText={(value) => updateListingField('district', value)}
                placeholder="İlçe"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, styles.flexColumn]}
                value={listingForm.district}
              />
            </View>

            <Pressable
              disabled={autofillPending}
              onPress={() => {
                void autofillLocation();
              }}
              style={styles.locationButton}
            >
              <Feather color={theme.colors.primary} name="map-pin" size={14} />
              <Text style={styles.locationButtonText}>
                {autofillPending ? 'Konum alınıyor...' : 'Konumu otomatik doldur'}
              </Text>
            </Pressable>

            <TextInput
              onChangeText={(value) => updateListingField('location', value)}
              placeholder="Konum satırı"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              value={listingForm.location}
            />

            <View style={styles.twoColumnRow}>
              <TextInput
                onChangeText={(value) => updateListingField('fuelType', value)}
                placeholder="Yakıt"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, styles.flexColumn]}
                value={listingForm.fuelType}
              />
              <TextInput
                onChangeText={(value) => updateListingField('transmission', value)}
                placeholder="Vites"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, styles.flexColumn]}
                value={listingForm.transmission}
              />
            </View>

            <View style={styles.twoColumnRow}>
              <TextInput
                onChangeText={(value) => updateListingField('bodyType', value)}
                placeholder="Kasa tipi"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, styles.flexColumn]}
                value={listingForm.bodyType}
              />
              <TextInput
                onChangeText={(value) => updateListingField('color', value)}
                placeholder="Renk"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, styles.flexColumn]}
                value={listingForm.color}
              />
            </View>

            <View style={styles.twoColumnRow}>
              <TextInput
                onChangeText={(value) => updateListingField('plateOrigin', value)}
                placeholder="Plaka kökeni"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, styles.flexColumn]}
                value={listingForm.plateOrigin}
              />
              <TextInput
                onChangeText={(value) => updateListingField('plateNumber', value)}
                placeholder="Plaka (opsiyonel)"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, styles.flexColumn]}
                value={listingForm.plateNumber}
              />
            </View>

            <TextInput
              onChangeText={(value) => updateListingField('phone', value)}
              placeholder="İletişim telefonu"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              value={listingForm.phone}
            />
          </>
        );
      case 'pricing_description':
        return (
          <>
            <TextInput
              onChangeText={(value) => updateListingField('price', value)}
              placeholder="Fiyat"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              value={listingForm.price}
            />
            <TextInput
              multiline
              onChangeText={setContent}
              placeholder="Vitrinde gözükecek kısa özet"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.shortTextArea}
              textAlignVertical="top"
              value={content}
            />
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Hasar ve geçmiş</Text>
              <TextInput
                onChangeText={(value) => updateListingField('damageRecord', value)}
                placeholder="Hasar kaydı / Tramer"
                placeholderTextColor={theme.colors.textSoft}
                style={styles.input}
                value={listingForm.damageRecord}
              />
              <TextInput
                onChangeText={(value) => updateListingField('paintInfo', value)}
                placeholder="Boya durumu"
                placeholderTextColor={theme.colors.textSoft}
                style={styles.input}
                value={listingForm.paintInfo}
              />
              <TextInput
                onChangeText={(value) => updateListingField('changedParts', value)}
                placeholder="Değişen parçalar"
                placeholderTextColor={theme.colors.textSoft}
                style={styles.input}
                value={listingForm.changedParts}
              />
              <TextInput
                onChangeText={(value) => updateListingField('accidentInfo', value)}
                placeholder="Kaza geçmişi"
                placeholderTextColor={theme.colors.textSoft}
                style={styles.input}
                value={listingForm.accidentInfo}
              />
            </View>
            <TextInput
              onChangeText={(value) => updateListingField('extraEquipment', value)}
              placeholder="Ek donanım"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              value={listingForm.extraEquipment}
            />
            <TextInput
              multiline
              onChangeText={(value) => updateListingField('description', value)}
              placeholder="Araç kullanım durumu, bakım geçmişi ve diğer detaylar"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.detailTextArea}
              textAlignVertical="top"
              value={listingForm.description}
            />
          </>
        );
      case 'ownership_authorization':
        return (
          <>
            <Text style={styles.sectionHelper}>
              Araç sahibi değilseniz platform ek belge veya ek doğrulama isteyebilir.
            </Text>
            <View style={styles.optionGrid}>
              {relationOptions.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => updateListingField('sellerRelationType', option.key)}
                  style={[
                    styles.optionCard,
                    listingForm.sellerRelationType === option.key && styles.optionCardActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionTitle,
                      listingForm.sellerRelationType === option.key && styles.optionTitleActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              onChangeText={(value) =>
                updateListingField('registrationOwnerFullNameDeclared', value)
              }
              placeholder="Ruhsat sahibi adı soyadı"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              value={listingForm.registrationOwnerFullNameDeclared}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.sectionTitle}>Ruhsat sahibi hesap sahibi ile aynı mı?</Text>
                <Text style={styles.sectionHelper}>
                  Değilse pazarlama yetkisi için beyan zorunludur.
                </Text>
              </View>
              <Switch
                onValueChange={(value) => updateListingField('isOwnerSameAsAccountHolder', value)}
                thumbColor={listingForm.isOwnerSameAsAccountHolder ? theme.colors.primary : '#FFFFFF'}
                trackColor={{ false: '#C8CDD2', true: '#A4E2DA' }}
                value={Boolean(listingForm.isOwnerSameAsAccountHolder)}
              />
            </View>

            {listingForm.sellerRelationType !== 'owner' ? (
              <TextInput
                multiline
                onChangeText={(value) => updateListingField('authorizationDeclarationText', value)}
                placeholder="Bu aracı pazarlamak için yetkili olduğunuzu beyan eden metni yazın."
                placeholderTextColor={theme.colors.textSoft}
                style={styles.detailTextArea}
                textAlignVertical="top"
                value={listingForm.authorizationDeclarationText}
              />
            ) : null}

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Ruhsat kayıt bilgileri</Text>
              <Text style={styles.sectionHelper}>
                Bu alanlar ilan sohbetinde alıcıyla kayıt paylaşımı yapmanız gerekirse kullanılır.
              </Text>
              <TextInput
                onChangeText={(value) => updateListingField('registrationOwnerName', value)}
                placeholder="Ruhsat sahibi"
                placeholderTextColor={theme.colors.textSoft}
                style={styles.input}
                value={listingForm.registrationOwnerName}
              />
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  updateListingField('registrationOwnerIdentityNumber', value)
                }
                placeholder="Kimlik numarası"
                placeholderTextColor={theme.colors.textSoft}
                style={styles.input}
                value={listingForm.registrationOwnerIdentityNumber}
              />
              <View style={styles.twoColumnRow}>
                <TextInput
                  onChangeText={(value) => updateListingField('registrationSerialNumber', value)}
                  placeholder="Ruhsat seri no"
                  placeholderTextColor={theme.colors.textSoft}
                  style={[styles.input, styles.flexColumn]}
                  value={listingForm.registrationSerialNumber}
                />
                <TextInput
                  onChangeText={(value) =>
                    updateListingField('registrationDocumentNumber', value)
                  }
                  placeholder="Belge no"
                  placeholderTextColor={theme.colors.textSoft}
                  style={[styles.input, styles.flexColumn]}
                  value={listingForm.registrationDocumentNumber}
                />
              </View>
            </View>
          </>
        );
      case 'compliance_responsibility':
        return (
          <>
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>{listingResponsibilityCopy.title}</Text>
              <Text style={styles.warningText}>{listingResponsibilityCopy.description}</Text>
            </View>
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>{safePaymentCopy.title}</Text>
              <Text style={styles.previewMeta}>{safePaymentCopy.message}</Text>
            </View>
            <ConsentChecklist
              items={[
                {
                  key: 'listing_responsibility',
                  title: 'İlan sorumluluğunu kabul ediyorum',
                  description:
                    'İlan bilgilerinin hesap sahibi tarafından beyan edildiğini ve ek doğrulama istenebileceğini biliyorum.',
                  required: true,
                  value: listingResponsibilityAccepted,
                  onToggle: setListingResponsibilityAccepted,
                },
                ...(listingForm.sellerRelationType !== 'owner'
                  ? [
                      {
                        key: 'authorization_declaration',
                        title: 'Yetki beyanını onaylıyorum',
                        description:
                          'Ruhsat sahibi adına pazarlama yetkisinin beyan edildiğini onaylıyorum.',
                        required: true,
                        value: authorizationDeclarationAccepted,
                        onToggle: setAuthorizationDeclarationAccepted,
                      },
                    ]
                  : []),
                {
                  key: 'safe_payment_information',
                  title: safePaymentCopy.confirmLabel,
                  description:
                    'Platform doğrudan satıcı veya ödeme emanetçisi değildir; resmi süreçler izlenmelidir.',
                  required: true,
                  value: safePaymentInformationAccepted,
                  onToggle: setSafePaymentInformationAccepted,
                },
              ]}
            />
          </>
        );
      case 'billing_listing_fee':
        return (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Ucretli ilan hazirligi</Text>
            <Text style={styles.sectionHelper}>
              Bu adim yalniz ucretli ilan ozelligi acildiginda gorunur. Gerekli odeme veya abonelik backend tarafindan onaylanmadan yayin acilmaz.
            </Text>
            <View style={styles.optionGrid}>
              {[
                { key: 'pending' as ListingBillingStatus, label: 'Standart yayin' },
                { key: 'paid' as ListingBillingStatus, label: 'Featured talebi' },
              ].map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    setBillingStatus(option.key);
                    setFeaturedRequested(option.key === 'paid');
                    setSubscriptionTermsAccepted(true);
                  }}
                  style={[
                    styles.optionCard,
                    billingStatus === option.key && styles.optionCardActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionTitle,
                      billingStatus === option.key && styles.optionTitleActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
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
            <Text style={styles.sectionHelper}>
              Devam ettiginizde Carloi gerekli ise sizi Garanti POS tabanli odeme adimina yonlendirir.
            </Text>
          </View>
        );
      case 'preview_publish':
        return (
          <>
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Final kontrol</Text>
              <Text style={styles.previewText}>{listingForm.title || 'Başlıksız ilan'}</Text>
              <Text style={styles.previewMeta}>
                {listingForm.price || 'Fiyat yok'} • {listingForm.city || 'Şehir yok'} /{' '}
                {listingForm.district || 'İlçe yok'}
              </Text>
              <Text style={styles.previewMeta}>
                İlişki: {relationOptions.find((item) => item.key === listingForm.sellerRelationType)?.label}
              </Text>
              <Text style={styles.previewMeta}>
                Güvenli ödeme: {safePaymentInformationAccepted ? 'Onaylandı' : 'Bekliyor'}
              </Text>
              {appFeatureFlags.enablePaidListings ? (
                <>
                  <Text style={styles.previewMeta}>Odeme dogrulamasi backend onayiyla tamamlanir</Text>
                  <Text style={styles.previewMeta}>
                    Featured: {featuredRequested ? 'Talep edildi' : 'Standart yayin'}
                  </Text>
                </>
              ) : null}
            </View>
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Yayın kararı risk sonucuna göre verilir</Text>
              <Text style={styles.warningText}>
                Düşük riskte ilan yayına alınır. Orta riskte incelemeye düşer. Yüksek riskte ek doğrulama gerekebilir.
              </Text>
            </View>
          </>
        );
      default:
        return null;
    }
  };

  const canSubmit =
    postType === 'standard'
      ? content.trim().length > 0
      : activeListingStep === 'preview_publish' && !stepError;

  return (
    <AdaptiveModal animationType="slide" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{editingPost ? 'İçeriği düzenle' : 'Yeni içerik'}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather color={theme.colors.textSoft} name="x" size={18} />
            </Pressable>
          </View>

          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setPostType('standard')}
              style={[styles.segment, postType === 'standard' && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, postType === 'standard' && styles.segmentTextActive]}>
                Standart
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPostType('listing')}
              style={[styles.segment, postType === 'listing' && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, postType === 'listing' && styles.segmentTextActive]}>
                İlan v2
              </Text>
            </Pressable>
          </View>

          {postType === 'listing' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepRow}>
              {listingSteps.map((step, index) => {
                const isActive = step.key === activeListingStep;
                const isDone = index < currentStepIndex;
                return (
                  <Pressable
                    key={step.key}
                    onPress={() => setActiveListingStep(step.key)}
                    style={[styles.stepPill, isActive && styles.stepPillActive, isDone && styles.stepPillDone]}
                  >
                    <Text style={[styles.stepIndex, (isActive || isDone) && styles.stepIndexActive]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.stepText, (isActive || isDone) && styles.stepTextActive]}>
                      {step.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.uploadCard}>
              <View style={styles.uploadHeader}>
                <Text style={styles.sectionTitle}>Medya yükle</Text>
                <Text style={styles.sectionHelper}>
                  Fotoğraf, video veya GIF ekleyebilirsin. Medya alanı ilanda ana yüzeyi oluşturur.
                </Text>
              </View>

              <View style={styles.mediaRow}>
                {mediaOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      void addMedia(option.key);
                    }}
                    style={styles.mediaChip}
                  >
                    <Feather color={theme.colors.primary} name={option.icon} size={14} />
                    <Text style={styles.mediaChipText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>

              {selectedMedia?.length ? (
                <View style={styles.selectedMediaStack}>
                  {selectedMedia.map((media, index) => (
                    <View
                      key={`${media.kind}-${media.uri ?? media.label}-${index}`}
                      style={styles.selectedMediaCard}
                    >
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
                        <Text style={styles.selectedMediaTitle}>{media.label}</Text>
                        <Text style={styles.selectedMediaHint}>{media.hint}</Text>
                      </View>
                      <Pressable onPress={() => removeMedia(index)} style={styles.mediaRemoveButton}>
                        <Feather color={theme.colors.textSoft} name="trash-2" size={14} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {postType === 'standard' ? (
              <TextInput
                multiline
                onChangeText={setContent}
                placeholder="Ne paylaşmak istiyorsun?"
                placeholderTextColor={theme.colors.textSoft}
                style={styles.textArea}
                textAlignVertical="top"
                value={content}
              />
            ) : (
              <View style={styles.stepCard}>
                <Text style={styles.sectionTitle}>{currentStep.title}</Text>
                <Text style={styles.sectionHelper}>{currentStep.helper}</Text>
                {renderListingStep()}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {postType === 'listing' && currentStepIndex > 0 ? (
              <Pressable onPress={goToPreviousStep} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Geri</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onClose} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Kapat</Text>
              </Pressable>
            )}

            {postType === 'listing' && currentStepIndex < listingSteps.length - 1 ? (
              <Pressable onPress={goToNextStep} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>İleri</Text>
              </Pressable>
            ) : (
              <Pressable
                disabled={!canSubmit || submitting}
                onPress={() => {
                  void submit();
                }}
                style={[styles.primaryButton, (!canSubmit || submitting) && styles.primaryButtonDisabled]}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting
                    ? 'Kaydediliyor...'
                    : editingPost
                      ? 'Güncelle'
                      : postType === 'listing'
                        ? 'Yayın kararını uygula'
                        : 'Paylaş'}
                </Text>
              </Pressable>
            )}
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
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  segmentRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  segmentActive: {
    backgroundColor: theme.colors.text,
  },
  segmentText: {
    color: theme.colors.textSoft,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: theme.colors.card,
  },
  stepRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  stepPillActive: {
    backgroundColor: theme.colors.primary,
  },
  stepPillDone: {
    backgroundColor: theme.colors.primarySoft,
  },
  stepIndex: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  stepIndexActive: {
    color: '#FFFFFF',
  },
  stepText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  content: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  stepCard: {
    gap: theme.spacing.md,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  textArea: {
    minHeight: 132,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 15,
  },
  shortTextArea: {
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    color: theme.colors.text,
  },
  detailTextArea: {
    minHeight: 128,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  uploadCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  uploadHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  sectionHelper: {
    color: theme.colors.textSoft,
    lineHeight: 18,
    fontSize: 13,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  mediaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  mediaChipText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedMediaStack: {
    gap: theme.spacing.sm,
  },
  selectedMediaCard: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  selectedMediaImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  selectedMediaPlaceholder: {
    width: 60,
    height: 60,
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
    fontSize: 13,
  },
  mediaRemoveButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  previewBox: {
    borderRadius: 18,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  previewTitle: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  previewText: {
    color: theme.colors.text,
    lineHeight: 18,
    fontWeight: '700',
  },
  previewMeta: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  warningBox: {
    borderRadius: 18,
    padding: theme.spacing.md,
    backgroundColor: '#FFF4E8',
    gap: 6,
  },
  warningTitle: {
    color: theme.colors.warning,
    fontWeight: '800',
  },
  warningText: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  formSection: {
    gap: theme.spacing.sm,
  },
  locationButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
  },
  locationButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  flexColumn: {
    flex: 1,
  },
  input: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionCard: {
    minWidth: '48%',
    flexGrow: 1,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionCardActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  optionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  optionTitleActive: {
    color: theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
});
