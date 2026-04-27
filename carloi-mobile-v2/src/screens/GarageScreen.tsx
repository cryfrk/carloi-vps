import { useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppInput } from '@/components/ui/AppInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBadge } from '@/components/StatusBadge';
import { TopHeader } from '@/components/TopHeader';
import { vehicleCatalog, vehicleTypeOptions } from '@/lib/vehicle-catalog';
import { useGarageStore } from '@/store/garage-store';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

type WizardState = {
  vehicleType: string;
  brand: string;
  model: string;
  year: string;
  packageName: string;
  engineType: string;
  fuelType: string;
  gearbox: string;
  equipment: string;
  mileage: string;
  plate: string;
  photoUri: string;
};

function createWizardState(): WizardState {
  const category = vehicleCatalog[0];
  const brand = category.brands[0];
  const model = brand.models[0];

  return {
    vehicleType: category.type,
    brand: brand.name,
    model: model.name,
    year: '2024',
    packageName: model.packages[0] || 'Standart',
    engineType: model.engineOptions[0] || 'Standart',
    fuelType: model.fuels[0] || 'Bilinmiyor',
    gearbox: model.gearboxes[0] || 'Bilinmiyor',
    equipment: '',
    mileage: '',
    plate: '',
    photoUri: '',
  };
}

export function GarageScreen({ navigation }: { navigation: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const vehicles = useGarageStore((state) => state.vehicles);
  const addVehicle = useGarageStore((state) => state.addVehicle);
  const removeVehicle = useGarageStore((state) => state.removeVehicle);
  const togglePlateVisibility = useGarageStore((state) => state.togglePlateVisibility);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizard, setWizard] = useState<WizardState>(createWizardState);

  const selectedCategory = useMemo(
    () => vehicleCatalog.find((item) => item.type === wizard.vehicleType) || vehicleCatalog[0],
    [wizard.vehicleType],
  );
  const selectedBrand = useMemo(
    () => selectedCategory.brands.find((item) => item.name === wizard.brand) || selectedCategory.brands[0],
    [selectedCategory, wizard.brand],
  );
  const selectedModel = useMemo(
    () => selectedBrand.models.find((item) => item.name === wizard.model) || selectedBrand.models[0],
    [selectedBrand, wizard.model],
  );

  function updateWizard(partial: Partial<WizardState>) {
    setWizard((current) => ({ ...current, ...partial }));
  }

  function resetWizard() {
    setWizard(createWizardState());
    setWizardStep(0);
    setWizardOpen(false);
  }

  function selectVehicleType(value: string) {
    const category = vehicleCatalog.find((item) => item.type === value) || vehicleCatalog[0];
    const brand = category.brands[0];
    const model = brand.models[0];

    setWizard((current) => ({
      ...current,
      vehicleType: value,
      brand: brand.name,
      model: model.name,
      packageName: model.packages[0] || 'Standart',
      engineType: model.engineOptions[0] || 'Standart',
      fuelType: model.fuels[0] || 'Bilinmiyor',
      gearbox: model.gearboxes[0] || 'Bilinmiyor',
      equipment: '',
    }));
  }

  function selectBrand(value: string) {
    const brand = selectedCategory.brands.find((item) => item.name === value) || selectedCategory.brands[0];
    const model = brand.models[0];

    setWizard((current) => ({
      ...current,
      brand: value,
      model: model.name,
      packageName: model.packages[0] || 'Standart',
      engineType: model.engineOptions[0] || 'Standart',
      fuelType: model.fuels[0] || 'Bilinmiyor',
      gearbox: model.gearboxes[0] || 'Bilinmiyor',
      equipment: '',
    }));
  }

  function selectModel(value: string) {
    const model = selectedBrand.models.find((item) => item.name === value) || selectedBrand.models[0];

    setWizard((current) => ({
      ...current,
      model: value,
      packageName: model.packages[0] || 'Standart',
      engineType: model.engineOptions[0] || 'Standart',
      fuelType: model.fuels[0] || 'Bilinmiyor',
      gearbox: model.gearboxes[0] || 'Bilinmiyor',
      equipment: '',
    }));
  }

  function toggleEquipment(option: string) {
    const current = wizard.equipment
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];

    updateWizard({ equipment: next.join(', ') });
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.92,
    });

    if (!result.canceled) {
      updateWizard({ photoUri: result.assets[0].uri });
    }
  }

  async function saveVehicle() {
    await addVehicle({
      id: `garage-${Date.now()}`,
      vehicleType: wizard.vehicleType,
      brand: wizard.brand,
      model: wizard.model,
      year: wizard.year,
      packageName: wizard.packageName,
      engineType: wizard.engineType,
      fuelType: wizard.fuelType,
      gearbox: wizard.gearbox,
      equipment: wizard.equipment,
      mileage: wizard.mileage || 'Kilometre bekleniyor',
      plate: wizard.plate || 'Plaka gizli',
      plateVisible: Boolean(wizard.plate),
      photoUri: wizard.photoUri || undefined,
      healthSummary: 'Bakim, ekspertiz ve OBD kayitlari geldikce bu arac karti zenginlesir.',
      obdStatus: 'not_connected',
      maintenanceState: 'unknown',
    });

    resetWizard();
  }

  return (
    <ScreenContainer>
      <TopHeader
        title="Garajim"
        subtitle="Araclarini, saglik durumunu ve ilan akislarini tek merkezde yonet"
        onPressCreate={() => navigation.getParent()?.navigate('Create', { mode: 'vehicle' })}
        onPressSearch={() => navigation.getParent()?.navigate('Search')}
      />

      {snapshot?.vehicle ? (
        <SectionCard>
          <View style={styles.heroHeader}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.title}>
                {snapshot.vehicle.brand} {snapshot.vehicle.model}
              </Text>
              <Text style={styles.meta}>
                {snapshot.vehicle.year} | {snapshot.vehicle.packageName} | {snapshot.vehicle.mileage}
              </Text>
            </View>
            <StatusBadge
              label={snapshot.vehicle.obdConnected ? 'OBD bagli' : 'OBD bekleniyor'}
              tone={snapshot.vehicle.obdConnected ? 'success' : 'warning'}
            />
          </View>

          <View style={styles.metricRow}>
            <MetricCard label="Saglik" value={snapshot.vehicle.healthScore ? `%${snapshot.vehicle.healthScore}` : 'Hazirlaniyor'} />
            <MetricCard label="Surus" value={snapshot.vehicle.driveScore ? `%${snapshot.vehicle.driveScore}` : 'Veri yok'} />
            <MetricCard label="Risk" value={snapshot.vehicle.upcomingRisks?.length ? `${snapshot.vehicle.upcomingRisks.length}` : '0'} />
          </View>

          <Text style={styles.copy}>{snapshot.vehicle.summary}</Text>

          <View style={styles.actionGroup}>
            <PrimaryButton
              label="Arac detayini ac"
              onPress={() => navigation.getParent()?.navigate('VehicleDetail', { id: 'primary' })}
            />
            <PrimaryButton
              label="Araci ilana cikar"
              variant="secondary"
              onPress={() => navigation.getParent()?.navigate('Create', { mode: 'listing' })}
            />
          </View>
        </SectionCard>
      ) : null}

      <SectionCard>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title}>Tum araclar</Text>
            <Text style={styles.copy}>Birden fazla araci saklayabilir, sergileyebilir ve ilana cikarabilirsin.</Text>
          </View>
          <PrimaryButton label="Arac ekle" onPress={() => setWizardOpen(true)} />
        </View>

        {vehicles.length ? (
          <View style={styles.vehicleGrid}>
            {vehicles.map((vehicle) => (
              <Pressable
                key={vehicle.id}
                style={styles.vehicleCard}
                onPress={() => navigation.getParent()?.navigate('VehicleDetail', { id: vehicle.id })}
              >
                {vehicle.photoUri ? (
                  <Image source={{ uri: vehicle.photoUri }} style={styles.vehicleImage} resizeMode="cover" />
                ) : (
                  <View style={styles.vehiclePlaceholder}>
                    <Text style={styles.vehiclePlaceholderText}>{vehicle.brand.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}

                <View style={{ gap: 6 }}>
                  <Text style={styles.vehicleTitle}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  <Text style={styles.meta}>
                    {vehicle.vehicleType} | {vehicle.year} | {vehicle.mileage}
                  </Text>
                  <Text style={styles.meta}>
                    {vehicle.plateVisible ? vehicle.plate : 'Plaka gizli'} | {vehicle.obdStatus === 'connected' ? 'OBD bagli' : 'OBD bekleniyor'}
                  </Text>
                </View>

                <View style={styles.vehicleFooter}>
                  <StatusBadge
                    label={vehicle.obdStatus === 'connected' ? 'OBD bagli' : 'OBD hazir degil'}
                    tone={vehicle.obdStatus === 'connected' ? 'success' : 'neutral'}
                  />
                  <View style={styles.inlineActions}>
                    <PrimaryButton
                      label={vehicle.plateVisible ? 'Plakayi gizle' : 'Plakayi goster'}
                      variant="secondary"
                      onPress={() => togglePlateVisibility(vehicle.id)}
                    />
                    <PrimaryButton label="Sil" variant="ghost" onPress={() => removeVehicle(vehicle.id)} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            title="Garajin hazir"
            description="Arac ekleyerek saglik, OBD, bakim ve ilan akisini arac bazli yonetmeye baslayabilirsin."
            actionLabel="Arac ekle"
            onAction={() => setWizardOpen(true)}
          />
        )}
      </SectionCard>

      <VehicleWizard
        visible={wizardOpen}
        step={wizardStep}
        wizard={wizard}
        selectedCategory={selectedCategory}
        selectedBrand={selectedBrand}
        selectedModel={selectedModel}
        onClose={resetWizard}
        onSetStep={setWizardStep}
        onPickPhoto={pickPhoto}
        onChange={updateWizard}
        onSave={saveVehicle}
        onSelectVehicleType={selectVehicleType}
        onSelectBrand={selectBrand}
        onSelectModel={selectModel}
        onToggleEquipment={toggleEquipment}
      />
    </ScreenContainer>
  );
}

function VehicleWizard({
  visible,
  step,
  wizard,
  selectedCategory,
  selectedBrand,
  selectedModel,
  onClose,
  onSetStep,
  onPickPhoto,
  onChange,
  onSave,
  onSelectVehicleType,
  onSelectBrand,
  onSelectModel,
  onToggleEquipment,
}: {
  visible: boolean;
  step: number;
  wizard: WizardState;
  selectedCategory: (typeof vehicleCatalog)[number];
  selectedBrand: (typeof vehicleCatalog)[number]['brands'][number];
  selectedModel: (typeof vehicleCatalog)[number]['brands'][number]['models'][number];
  onClose: () => void;
  onSetStep: (value: number) => void;
  onPickPhoto: () => Promise<void>;
  onChange: (partial: Partial<WizardState>) => void;
  onSave: () => Promise<void>;
  onSelectVehicleType: (value: string) => void;
  onSelectBrand: (value: string) => void;
  onSelectModel: (value: string) => void;
  onToggleEquipment: (value: string) => void;
}) {
  const finalStep = 5;
  const selectedEquipment = wizard.equipment
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>Arac ekle</Text>
              <Text style={styles.meta}>Adim {step + 1} / {finalStep + 1}</Text>
            </View>
            <PrimaryButton label="Kapat" variant="ghost" onPress={onClose} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {step === 0 ? (
              <>
                <Text style={styles.sectionTitle}>1. Arac tipi</Text>
                <View style={styles.optionWrap}>
                  {vehicleTypeOptions.map((option) => (
                    <PrimaryButton
                      key={option}
                      label={option}
                      variant={wizard.vehicleType === option ? 'primary' : 'secondary'}
                      onPress={() => onSelectVehicleType(option)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Text style={styles.sectionTitle}>2. Marka ve model</Text>
                <Text style={styles.subSectionTitle}>Marka</Text>
                <View style={styles.optionWrap}>
                  {selectedCategory.brands.map((brand) => (
                    <PrimaryButton
                      key={brand.name}
                      label={brand.name}
                      variant={wizard.brand === brand.name ? 'primary' : 'secondary'}
                      onPress={() => onSelectBrand(brand.name)}
                    />
                  ))}
                </View>
                <Text style={styles.subSectionTitle}>Model</Text>
                <View style={styles.optionWrap}>
                  {selectedBrand.models.map((model) => (
                    <PrimaryButton
                      key={model.name}
                      label={model.name}
                      variant={wizard.model === model.name ? 'primary' : 'secondary'}
                      onPress={() => onSelectModel(model.name)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={styles.sectionTitle}>3. Teknik bilgiler</Text>
                <AppInput label="Yil" value={wizard.year} onChangeText={(value) => onChange({ year: value })} placeholder="2024" />
                <Text style={styles.subSectionTitle}>Paket</Text>
                <View style={styles.optionWrap}>
                  {selectedModel.packages.map((item) => (
                    <PrimaryButton
                      key={item}
                      label={item}
                      variant={wizard.packageName === item ? 'primary' : 'secondary'}
                      onPress={() => onChange({ packageName: item })}
                    />
                  ))}
                </View>
                <Text style={styles.subSectionTitle}>Motor tipi</Text>
                <View style={styles.optionWrap}>
                  {selectedModel.engineOptions.map((item) => (
                    <PrimaryButton
                      key={item}
                      label={item}
                      variant={wizard.engineType === item ? 'primary' : 'secondary'}
                      onPress={() => onChange({ engineType: item })}
                    />
                  ))}
                </View>
                <Text style={styles.subSectionTitle}>Yakit</Text>
                <View style={styles.optionWrap}>
                  {selectedModel.fuels.map((item) => (
                    <PrimaryButton
                      key={item}
                      label={item}
                      variant={wizard.fuelType === item ? 'primary' : 'secondary'}
                      onPress={() => onChange({ fuelType: item })}
                    />
                  ))}
                </View>
                <Text style={styles.subSectionTitle}>Sanziman</Text>
                <View style={styles.optionWrap}>
                  {selectedModel.gearboxes.map((item) => (
                    <PrimaryButton
                      key={item}
                      label={item}
                      variant={wizard.gearbox === item ? 'primary' : 'secondary'}
                      onPress={() => onChange({ gearbox: item })}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={styles.sectionTitle}>4. Donanim ve kullanim</Text>
                <Text style={styles.subSectionTitle}>One cikan donanimlar</Text>
                <View style={styles.optionWrap}>
                  {selectedModel.equipmentOptions.map((item) => (
                    <PrimaryButton
                      key={item}
                      label={item}
                      variant={selectedEquipment.includes(item) ? 'primary' : 'secondary'}
                      onPress={() => onToggleEquipment(item)}
                    />
                  ))}
                </View>
                <AppInput
                  label="Ek donanim / notlar"
                  value={wizard.equipment}
                  onChangeText={(value) => onChange({ equipment: value })}
                  placeholder="Cam tavan, adaptif cruise, vinç..."
                  multiline
                />
                <AppInput label="Kilometre" value={wizard.mileage} onChangeText={(value) => onChange({ mileage: value })} placeholder="125000 km" />
                <AppInput label="Plaka" value={wizard.plate} onChangeText={(value) => onChange({ plate: value })} placeholder="34 ABC 123" />
              </>
            ) : null}

            {step === 4 ? (
              <>
                <Text style={styles.sectionTitle}>5. Fotograf</Text>
                <PrimaryButton label="Fotograf sec" onPress={onPickPhoto} />
                {wizard.photoUri ? (
                  <Image source={{ uri: wizard.photoUri }} style={styles.wizardImage} resizeMode="cover" />
                ) : (
                  <EmptyState title="Fotograf hazir degil" description="Arac kartini daha guclu gostermek icin bir kapak fotografi ekleyebilirsin." />
                )}
              </>
            ) : null}

            {step === 5 ? (
              <SectionCard>
                <Text style={styles.sectionTitle}>6. Son kontrol</Text>
                <Text style={styles.meta}>
                  {wizard.vehicleType} | {wizard.brand} {wizard.model} | {wizard.year}
                </Text>
                <Text style={styles.meta}>
                  {wizard.packageName} | {wizard.engineType} | {wizard.fuelType} | {wizard.gearbox}
                </Text>
                <Text style={styles.meta}>
                  {wizard.mileage || 'Kilometre bekleniyor'} | {wizard.plate || 'Plaka gizli'}
                </Text>
                <Text style={styles.copy}>
                  Kaydedilen arac, Garajim ekraninda saklanir ve istersen tek dokunusla ilana cikarilabilir.
                </Text>
                <PrimaryButton label="Garaja ekle" onPress={onSave} />
              </SectionCard>
            ) : null}
          </ScrollView>

          <View style={styles.wizardFooter}>
            <PrimaryButton
              label="Geri"
              variant="secondary"
              onPress={() => onSetStep(Math.max(0, step - 1))}
              disabled={step === 0}
            />
            <PrimaryButton
              label={step === finalStep ? 'Kaydet' : 'Ileri'}
              onPress={step === finalStep ? onSave : () => onSetStep(Math.min(finalStep, step + 1))}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  meta: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  copy: {
    color: tokens.colors.text,
    lineHeight: 22,
  },
  actionGroup: {
    gap: 10,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    color: tokens.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: tokens.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  vehicleGrid: {
    gap: 14,
  },
  vehicleCard: {
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 12,
  },
  vehicleImage: {
    width: '100%',
    height: 190,
    borderRadius: 18,
  },
  vehiclePlaceholder: {
    width: '100%',
    height: 190,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  vehiclePlaceholderText: {
    fontSize: 40,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  vehicleFooter: {
    gap: 10,
  },
  inlineActions: {
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalContent: {
    gap: 16,
    paddingBottom: 12,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wizardImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
  },
  wizardFooter: {
    flexDirection: 'row',
    gap: 10,
  },
});
