import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ENGINE_OPTIONS, VEHICLE_CATALOG, VEHICLE_YEARS } from '../data/vehicleCatalog';
import {
  getVerifiedEngines,
  getVerifiedEquipment,
  getVerifiedPackages,
  getVerifiedVehicleSpec,
  getVerifiedYears,
} from '../data/vehicleSpecs';
import { createVehicleProfileFromInput } from '../services/vehicleFactory';
import { theme, typeScale } from '../theme';
import { OnboardingPayload, SocialProfile, UserSettings, VehicleProfile } from '../types';
import { AdaptiveModal } from './AdaptiveModal';
import { SelectField } from './SelectField';

interface OnboardingModalProps {
  visible: boolean;
  mode: 'register' | 'edit';
  initialProfile: SocialProfile;
  initialVehicle?: VehicleProfile;
  initialSettings?: UserSettings;
  onDismiss?: () => void;
  onComplete: (payload: OnboardingPayload) => void;
}

type OpenField = 'brand' | 'model' | 'year' | 'package' | 'engine' | null;
type ManualField = 'brand' | 'model' | 'packageName' | 'engineVolume';

const emptyVehicle = {
  brand: '',
  model: '',
  year: '',
  packageName: '',
  mileage: '',
  engineVolume: '',
  vin: '',
  extraEquipment: '',
};

function hasCatalogBrand(brand: string) {
  return Boolean(brand && VEHICLE_CATALOG[brand]);
}

function inferFuelType(engine: string) {
  const lower = engine.toLocaleLowerCase('tr');
  if (lower.includes('lpg')) {
    return 'Benzin + LPG';
  }
  if (lower.includes('hybrid') || lower.includes('hibrit')) {
    return 'Hibrit';
  }
  if (lower.includes('electric') || lower.includes('elektrik')) {
    return 'Elektrik';
  }
  if (lower.includes('multijet') || lower.includes('tdi') || lower.includes('dci')) {
    return 'Dizel';
  }
  return 'Benzin';
}

export function OnboardingModal({
  visible,
  mode,
  initialProfile,
  initialVehicle,
  initialSettings,
  onDismiss,
  onComplete,
}: OnboardingModalProps) {
  const [profileForm, setProfileForm] = useState<SocialProfile>(initialProfile);
  const [email, setEmail] = useState(initialSettings?.email ?? '');
  const [phone, setPhone] = useState(initialSettings?.phone ?? '');
  const [vehicleEnabled, setVehicleEnabled] = useState(Boolean(initialVehicle));
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [manualMode, setManualMode] = useState<Record<ManualField, boolean>>({
    brand: false,
    model: false,
    packageName: false,
    engineVolume: false,
  });
  const [openField, setOpenField] = useState<OpenField>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const brand = initialVehicle?.brand ?? '';
    const brandExists = hasCatalogBrand(brand);
    const nextModels = brandExists ? VEHICLE_CATALOG[brand].models : [];

    setProfileForm(initialProfile);
    setEmail(initialSettings?.email ?? '');
    setPhone(initialSettings?.phone ?? '');
    setVehicleEnabled(Boolean(initialVehicle));
    setVehicleForm({
      brand,
      model: initialVehicle?.model ?? '',
      year: initialVehicle?.year ?? '',
      packageName: initialVehicle?.packageName ?? '',
      mileage: initialVehicle?.mileage?.replace(' km', '') ?? '',
      engineVolume: initialVehicle?.engineVolume ?? '',
      vin: initialVehicle?.vin ?? '',
      extraEquipment: initialVehicle?.extraEquipment ?? '',
    });
    setManualMode({
      brand: Boolean(brand && !brandExists),
      model: Boolean(initialVehicle?.model && !nextModels.includes(initialVehicle.model)),
      packageName: false,
      engineVolume: false,
    });
    setOpenField(null);
  }, [visible, initialProfile, initialSettings, initialVehicle]);

  const brands = useMemo(() => Object.keys(VEHICLE_CATALOG), []);
  const models = useMemo(() => {
    if (!vehicleForm.brand || !VEHICLE_CATALOG[vehicleForm.brand]) {
      return [];
    }

    return VEHICLE_CATALOG[vehicleForm.brand].models;
  }, [vehicleForm.brand]);

  const verifiedSpec = useMemo(
    () => getVerifiedVehicleSpec(vehicleForm.brand, vehicleForm.model),
    [vehicleForm.brand, vehicleForm.model],
  );

  const years = useMemo(() => {
    const verifiedYears = getVerifiedYears(vehicleForm.brand, vehicleForm.model);
    return verifiedYears.length ? verifiedYears.slice().reverse() : VEHICLE_YEARS;
  }, [vehicleForm.brand, vehicleForm.model]);

  const packages = useMemo(() => {
    const verifiedPackages = getVerifiedPackages(
      vehicleForm.brand,
      vehicleForm.model,
      vehicleForm.year,
    );
    if (verifiedPackages.length) {
      return verifiedPackages;
    }

    if (!vehicleForm.brand || !VEHICLE_CATALOG[vehicleForm.brand]) {
      return [];
    }

    return VEHICLE_CATALOG[vehicleForm.brand].packages;
  }, [vehicleForm.brand, vehicleForm.model, vehicleForm.year]);

  const engines = useMemo(() => {
    const verifiedEngines = getVerifiedEngines(
      vehicleForm.brand,
      vehicleForm.model,
      vehicleForm.year,
      vehicleForm.packageName,
    );
    return verifiedEngines.length ? verifiedEngines : [...ENGINE_OPTIONS];
  }, [vehicleForm.brand, vehicleForm.model, vehicleForm.packageName, vehicleForm.year]);

  const equipmentPreview = useMemo(
    () => getVerifiedEquipment(vehicleForm.brand, vehicleForm.model, vehicleForm.packageName),
    [vehicleForm.brand, vehicleForm.model, vehicleForm.packageName],
  );

  const normalizedVehicle = {
    brand: vehicleForm.brand.trim(),
    model: vehicleForm.model.trim(),
    year: vehicleForm.year.trim(),
    packageName: vehicleForm.packageName.trim(),
    mileage: vehicleForm.mileage.trim(),
    engineVolume: vehicleForm.engineVolume.trim(),
    vin: vehicleForm.vin.trim(),
    extraEquipment: vehicleForm.extraEquipment.trim(),
  };

  const canSubmit =
    profileForm.name.trim().length > 0 &&
    profileForm.handle.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    (!vehicleEnabled ||
      (normalizedVehicle.brand &&
        normalizedVehicle.model &&
        normalizedVehicle.year &&
        normalizedVehicle.packageName &&
        normalizedVehicle.engineVolume));
  const canContinueWithoutVehicle =
    profileForm.name.trim().length > 0 &&
    profileForm.handle.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0;

  const complete = () => {
    const normalizedHandle = profileForm.handle.startsWith('@')
      ? profileForm.handle
      : `@${profileForm.handle}`;

    const payload: OnboardingPayload = {
      profile: {
        ...profileForm,
        handle: normalizedHandle,
      },
      settings: {
        email,
        phone,
      },
    };

    if (vehicleEnabled) {
      payload.vehicle = createVehicleProfileFromInput(
        {
          brand: normalizedVehicle.brand,
          model: normalizedVehicle.model,
          year: normalizedVehicle.year,
          packageName: normalizedVehicle.packageName,
          mileage: normalizedVehicle.mileage,
          engineVolume: normalizedVehicle.engineVolume,
          vin: normalizedVehicle.vin,
          fuelType: inferFuelType(normalizedVehicle.engineVolume),
          extraEquipment: normalizedVehicle.extraEquipment,
        },
        initialVehicle,
      );
    }

    onComplete(payload);
  };

  const setManualField = (field: ManualField) => {
    setManualMode((current) => ({ ...current, [field]: !current[field] }));
    setOpenField(null);
  };

  const title = mode === 'register' ? 'Carloi kayıt akışı' : 'Araç profilini düzenle';
  const description =
    mode === 'register'
      ? 'Kullanıcı bilgilerini gir. Araç bilgisi istersen şimdi, istersen daha sonra eklenebilir.'
      : 'Marka, model, yıl, paket ve VIN bilgilerini güncelleyerek araç analizlerini netleştir.';

  return (
    <AdaptiveModal animationType="slide" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <View style={styles.heroHeader}>
                <View style={styles.heroCopy}>
                  <Text style={styles.kicker}>CARLOI</Text>
                  <Text style={styles.title}>{title}</Text>
                </View>
                {mode === 'edit' && onDismiss ? (
                  <Pressable onPress={onDismiss} style={styles.dismissButton}>
                    <Text style={styles.dismissText}>Kapat</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.description}>{description}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hesap bilgileri</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ad soyad</Text>
                <TextInput
                  onChangeText={(value) => setProfileForm((current) => ({ ...current, name: value }))}
                  placeholder="Örn. Faruk Yılmaz"
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.input}
                  value={profileForm.name}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kullanıcı adı</Text>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={(value) => setProfileForm((current) => ({ ...current, handle: value }))}
                  placeholder="@kullaniciadi"
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.input}
                  value={profileForm.handle}
                />
              </View>

              <View style={styles.twoColumnRow}>
                <View style={styles.flexColumn}>
                  <Text style={styles.label}>E-posta</Text>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setEmail}
                    placeholder="eposta@ornek.com"
                    placeholderTextColor={theme.colors.textSoft}
                    style={styles.input}
                    value={email}
                  />
                </View>
                <View style={styles.flexColumn}>
                  <Text style={styles.label}>Telefon</Text>
                  <TextInput
                    keyboardType="phone-pad"
                    onChangeText={setPhone}
                    placeholder="05xx xxx xx xx"
                    placeholderTextColor={theme.colors.textSoft}
                    style={styles.input}
                    value={phone}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kısa bio</Text>
                <TextInput
                  multiline
                  onChangeText={(value) => setProfileForm((current) => ({ ...current, bio: value }))}
                  placeholder="Topluluğa kendinizi ve araç ilginizi kısaca tanıtın."
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.textArea}
                  textAlignVertical="top"
                  value={profileForm.bio}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.sectionTitle}>Araç bilgisi ekle</Text>
                  <Text style={styles.helper}>
                    Araç bilgilerini burada ekleyebilir, daha sonra Aracım ekranından tekrar
                    düzenleyebilirsin.
                  </Text>
                </View>
                <Switch
                  onValueChange={(value) => {
                    setVehicleEnabled(value);
                    if (!value) {
                      setVehicleForm(emptyVehicle);
                      setManualMode({
                        brand: false,
                        model: false,
                        packageName: false,
                        engineVolume: false,
                      });
                      setOpenField(null);
                    }
                  }}
                  thumbColor={vehicleEnabled ? theme.colors.primary : '#FFFFFF'}
                  trackColor={{ false: '#C8CDD2', true: '#A4E2DA' }}
                  value={vehicleEnabled}
                />
              </View>

              {vehicleEnabled ? (
                <View style={styles.vehicleSection}>
                  {!manualMode.brand ? (
                    <SelectField
                      helperText="Markalar alfabetik sıralanır. Listede olmayan araçlar için manuel giriş açabilirsiniz."
                      label="Marka"
                      onSelect={(value) => {
                        setVehicleForm((current) => ({
                          ...current,
                          brand: value,
                          model: '',
                          year: '',
                          packageName: '',
                          engineVolume: '',
                        }));
                        setManualMode((current) => ({
                          ...current,
                          model: false,
                          packageName: false,
                          engineVolume: false,
                        }));
                        setOpenField(null);
                      }}
                      onToggle={() => setOpenField((current) => (current === 'brand' ? null : 'brand'))}
                      open={openField === 'brand'}
                      options={brands}
                      placeholder="Marka seçin"
                      value={vehicleForm.brand}
                    />
                  ) : (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Marka</Text>
                      <TextInput
                        onChangeText={(value) => setVehicleForm((current) => ({ ...current, brand: value }))}
                        placeholder="Örn. Rover"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={vehicleForm.brand}
                      />
                    </View>
                  )}

                  <Pressable onPress={() => setManualField('brand')} style={styles.inlineAction}>
                    <Text style={styles.inlineActionText}>
                      {manualMode.brand ? 'Markayı listeden seç' : 'Listede yoksa markayı manuel gir'}
                    </Text>
                  </Pressable>

                  {!manualMode.model ? (
                    <SelectField
                      emptyText="Önce marka seçin ya da modeli manuel girin."
                      label="Model"
                      onSelect={(value) => {
                        setVehicleForm((current) => ({
                          ...current,
                          model: value,
                          year: '',
                          packageName: '',
                          engineVolume: '',
                        }));
                        setOpenField(null);
                      }}
                      onToggle={() => setOpenField((current) => (current === 'model' ? null : 'model'))}
                      open={openField === 'model'}
                      options={models}
                      placeholder="Model seçin"
                      value={vehicleForm.model}
                    />
                  ) : (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Model</Text>
                      <TextInput
                        onChangeText={(value) => setVehicleForm((current) => ({ ...current, model: value }))}
                        placeholder="Örn. 75 Tourer"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={vehicleForm.model}
                      />
                    </View>
                  )}

                  <Pressable onPress={() => setManualField('model')} style={styles.inlineAction}>
                    <Text style={styles.inlineActionText}>
                      {manualMode.model ? 'Modeli listeden seç' : 'Listede yoksa modeli manuel gir'}
                    </Text>
                  </Pressable>

                  <SelectField
                    helperText={
                      verifiedSpec
                        ? 'Bu model için doğrulanmış yıl aralığına göre filtrelenir.'
                        : 'Model için doğrulanmış veri yoksa genel yıl listesi kullanılır.'
                    }
                    label="Yıl"
                    onSelect={(value) => {
                      setVehicleForm((current) => ({ ...current, year: value, packageName: '', engineVolume: '' }));
                      setOpenField(null);
                    }}
                    onToggle={() => setOpenField((current) => (current === 'year' ? null : 'year'))}
                    open={openField === 'year'}
                    options={years}
                    placeholder="Yıl seçin"
                    value={vehicleForm.year}
                  />

                  {!manualMode.packageName ? (
                    <SelectField
                      emptyText="Önce marka, model ve mümkünse yıl seçin."
                      helperText={
                        verifiedSpec
                          ? 'Paketler seçilen yıl için doğrulanmış listeye göre gösterilir.'
                          : 'Doğrulanmış veri yoksa genel paket listesi kullanılır.'
                      }
                      label="Paket"
                      onSelect={(value) => {
                        setVehicleForm((current) => ({ ...current, packageName: value, engineVolume: '' }));
                        setOpenField(null);
                      }}
                      onToggle={() => setOpenField((current) => (current === 'package' ? null : 'package'))}
                      open={openField === 'package'}
                      options={packages}
                      placeholder="Paket seçin"
                      value={vehicleForm.packageName}
                    />
                  ) : (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Paket</Text>
                      <TextInput
                        onChangeText={(value) => setVehicleForm((current) => ({ ...current, packageName: value }))}
                        placeholder="Örn. 2.0 HSE Dynamic"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={vehicleForm.packageName}
                      />
                    </View>
                  )}

                  <Pressable onPress={() => setManualField('packageName')} style={styles.inlineAction}>
                    <Text style={styles.inlineActionText}>
                      {manualMode.packageName ? 'Paketi listeden seç' : 'Listede yoksa paketi manuel gir'}
                    </Text>
                  </Pressable>

                  {!manualMode.engineVolume ? (
                    <SelectField
                      helperText={
                        verifiedSpec
                          ? 'Seçilen paket ve yıla göre geçerli motorlar gösterilir.'
                          : 'Doğrulanmış veri yoksa genel motor listesi kullanılır.'
                      }
                      label="Motor hacmi / motor tipi"
                      onSelect={(value) => {
                        setVehicleForm((current) => ({ ...current, engineVolume: value }));
                        setOpenField(null);
                      }}
                      onToggle={() => setOpenField((current) => (current === 'engine' ? null : 'engine'))}
                      open={openField === 'engine'}
                      options={engines}
                      placeholder="Motor seçin"
                      searchable={false}
                      value={vehicleForm.engineVolume}
                    />
                  ) : (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Motor hacmi / motor tipi</Text>
                      <TextInput
                        onChangeText={(value) => setVehicleForm((current) => ({ ...current, engineVolume: value }))}
                        placeholder="Örn. 1.5 TSI"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={vehicleForm.engineVolume}
                      />
                    </View>
                  )}

                  <Pressable onPress={() => setManualField('engineVolume')} style={styles.inlineAction}>
                    <Text style={styles.inlineActionText}>
                      {manualMode.engineVolume ? 'Motoru listeden seç' : 'Listede yoksa motoru manuel gir'}
                    </Text>
                  </Pressable>

                  {equipmentPreview.length ? (
                    <View style={styles.equipmentCard}>
                      <Text style={styles.sectionTitle}>Doğrulanmış donanım</Text>
                      <View style={styles.equipmentWrap}>
                        {equipmentPreview.map((item) => (
                          <View key={item} style={styles.equipmentChip}>
                            <Text style={styles.equipmentChipText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Kilometre</Text>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) => setVehicleForm((current) => ({ ...current, mileage: value }))}
                      placeholder="Örn. 68400"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={vehicleForm.mileage}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Şasi numarası (VIN)</Text>
                    <Text style={styles.helper}>
                      VIN bilgisi, olası arızalar ve uygun parça önerileri için kullanılır.
                    </Text>
                    <TextInput
                      autoCapitalize="characters"
                      onChangeText={(value) => setVehicleForm((current) => ({ ...current, vin: value }))}
                      placeholder="WVWZZZAUZMP021847"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={vehicleForm.vin}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Ek donanım</Text>
                    <TextInput
                      onChangeText={(value) =>
                        setVehicleForm((current) => ({ ...current, extraEquipment: value }))
                      }
                      placeholder="Sonradan eklenen donanımlar varsa yazın"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={vehicleForm.extraEquipment}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {mode === 'register' ? (
              <Pressable
                disabled={!canContinueWithoutVehicle}
                onPress={() =>
                  onComplete({
                    profile: {
                      ...profileForm,
                      handle: profileForm.handle.startsWith('@')
                        ? profileForm.handle
                        : `@${profileForm.handle || 'yeniuye'}`,
                    },
                    settings: {
                      email,
                      phone,
                    },
                  })
                }
                style={[styles.secondaryButton, !canContinueWithoutVehicle && styles.primaryDisabled]}
              >
                <Text style={styles.secondaryText}>Araçsız devam et</Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={!canSubmit}
              onPress={complete}
              style={[styles.primaryButton, !canSubmit && styles.primaryDisabled]}
            >
              <Text style={styles.primaryText}>{mode === 'register' ? 'Kaydı tamamla' : 'Güncelle'}</Text>
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
    maxHeight: '96%',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  hero: {
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  kicker: {
    color: '#9DDCD4',
    fontSize: typeScale.caption,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: theme.colors.card,
    fontSize: typeScale.title,
    fontWeight: '800',
  },
  dismissButton: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: theme.colors.card,
    fontWeight: '700',
    fontSize: typeScale.caption,
  },
  description: {
    color: '#DDE7F0',
    fontSize: typeScale.body,
    lineHeight: 22,
  },
  section: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: typeScale.subtitle,
  },
  inputGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  helper: {
    color: theme.colors.textSoft,
    fontSize: typeScale.caption,
    lineHeight: 18,
  },
  input: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 96,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  vehicleSection: {
    gap: theme.spacing.sm,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  inlineActionText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: typeScale.caption,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  flexColumn: {
    flex: 1,
  },
  equipmentCard: {
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  equipmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  equipmentChip: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  equipmentChipText: {
    color: theme.colors.primary,
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: {
    opacity: 0.45,
  },
  primaryText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
});

