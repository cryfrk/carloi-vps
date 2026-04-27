import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  garageWizardSteps,
  getCompletedGarageSteps,
  isGarageWizardStepComplete,
  paintStatusPalette,
  vehicleBodyPanels,
} from '@carloi-v3/garage-obd';
import { listGenerations, listVehicleTypes, searchBrands, searchModels, vehicleCatalogSeed } from '@carloi-v3/vehicle-catalog';

import { SectionTabs } from '../components/SectionTabs';
import { StateCard } from '../components/StateCard';
import { pickImagesFromLibrary } from '../lib/api';
import { useGarageStore } from '../store/garage-store';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function AddVehicleWizardScreen() {
  const navigation = useNavigation<Navigation>();
  const snapshot = useSessionStore((state) => state.snapshot);
  const draft = useGarageStore((state) => state.draft);
  const updateDraft = useGarageStore((state) => state.updateDraft);
  const updateSelection = useGarageStore((state) => state.updateSelection);
  const toggleEquipment = useGarageStore((state) => state.toggleEquipment);
  const addCustomEquipment = useGarageStore((state) => state.addCustomEquipment);
  const setPaintStatus = useGarageStore((state) => state.setPaintStatus);
  const addPhoto = useGarageStore((state) => state.addPhoto);
  const removePhoto = useGarageStore((state) => state.removePhoto);
  const saveDraftAsVehicle = useGarageStore((state) => state.saveDraftAsVehicle);
  const resetDraft = useGarageStore((state) => state.resetDraft);

  const [stepIndex, setStepIndex] = useState(0);
  const [brandQuery, setBrandQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [trimQuery, setTrimQuery] = useState('');
  const [engineQuery, setEngineQuery] = useState('');
  const [manualEquipment, setManualEquipment] = useState('');

  const currentStep = garageWizardSteps[stepIndex];
  const typeOptions = listVehicleTypes(vehicleCatalogSeed);
  const brandOptions = searchBrands({ query: brandQuery, typeKey: draft.selection.typeKey || undefined }, vehicleCatalogSeed);
  const modelOptions = searchModels({
    query: modelQuery,
    typeKey: draft.selection.typeKey || undefined,
    brandSlug: draft.selection.brandSlug || undefined,
  }, vehicleCatalogSeed);
  const generations = listGenerations({
    typeKey: draft.selection.typeKey || undefined,
    brandSlug: draft.selection.brandSlug || undefined,
    modelSlug: draft.selection.modelSlug || undefined,
  }, vehicleCatalogSeed);
  const trims = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    for (const generation of generations) {
      for (const trim of generation.trims) {
        if (!map.has(trim.slug)) {
          map.set(trim.slug, { slug: trim.slug, name: trim.name });
        }
      }
    }
    return [...map.values()].filter((item) => item.name.toLowerCase().includes(trimQuery.toLowerCase()));
  }, [generations, trimQuery]);
  const engines = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    for (const generation of generations) {
      for (const engine of generation.engines) {
        if (!map.has(engine.slug)) {
          map.set(engine.slug, { slug: engine.slug, name: engine.name });
        }
      }
    }
    return [...map.values()].filter((item) => item.name.toLowerCase().includes(engineQuery.toLowerCase()));
  }, [engineQuery, generations]);
  const equipmentPackages = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    for (const generation of generations) {
      for (const pkg of generation.equipmentPackages) {
        if (!map.has(pkg.slug)) {
          map.set(pkg.slug, { slug: pkg.slug, name: pkg.name });
        }
      }
    }
    return [...map.values()];
  }, [generations]);

  const completedSteps = getCompletedGarageSteps(draft);

  function goNext() {
    if (!isGarageWizardStepComplete(currentStep.key, draft) && currentStep.required) {
      Alert.alert('Adim eksik', `${currentStep.title} adimini tamamlamadan devam edemezsin.`);
      return;
    }

    if (stepIndex === garageWizardSteps.length - 1) {
      const vehicle = saveDraftAsVehicle(snapshot?.profile.handle || 'local-user');
      resetDraft();
      navigation.replace('VehicleDetail', { vehicleId: vehicle.id, source: 'local' });
      return;
    }

    setStepIndex((value) => value + 1);
  }

  async function addPhotos() {
    const assets = await pickImagesFromLibrary();
    for (const asset of assets) {
      addPhoto({
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        localUri: asset.uri,
        type: asset.type,
        label: asset.fileName || 'Arac fotografi',
      });
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Arac ekle</Text>
        <Text style={styles.subtitle}>
          {currentStep.title} • {stepIndex + 1}/{garageWizardSteps.length}
        </Text>

        <View style={styles.progress}>
          {garageWizardSteps.map((step, index) => (
            <View
              key={step.key}
              style={[
                styles.progressDot,
                completedSteps.includes(step.key) ? styles.progressDone : null,
                stepIndex === index ? styles.progressCurrent : null,
              ]}
            />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{currentStep.title}</Text>
          <Text style={styles.sectionBody}>{currentStep.description}</Text>

          {currentStep.key === 'vehicle-type' ? (
            <View style={styles.chipWrap}>
              {typeOptions.map((typeItem) => (
                <Pressable
                  key={typeItem.key}
                  onPress={() => updateSelection({ typeKey: typeItem.key, brandSlug: null, modelSlug: null })}
                  style={[styles.chip, draft.selection.typeKey === typeItem.key ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipLabel, draft.selection.typeKey === typeItem.key ? styles.chipLabelActive : null]}>
                    {typeItem.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {currentStep.key === 'brand' ? (
            <>
              <TextInput value={brandQuery} onChangeText={setBrandQuery} placeholder="Marka ara" style={styles.input} />
              <View style={styles.optionList}>
                {brandOptions.map((brand) => (
                  <Pressable
                    key={brand.slug}
                    onPress={() => updateSelection({ brandSlug: brand.slug, brandNameManual: null, modelSlug: null, modelNameManual: null })}
                    style={[styles.optionRow, draft.selection.brandSlug === brand.slug ? styles.optionRowActive : null]}
                  >
                    <Text style={styles.optionText}>{brand.name}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={draft.selection.brandNameManual || ''}
                onChangeText={(value) => updateSelection({ brandNameManual: value, brandSlug: null })}
                placeholder="Listede yoksa manuel marka gir"
                style={styles.input}
              />
            </>
          ) : null}

          {currentStep.key === 'model' ? (
            <>
              <TextInput value={modelQuery} onChangeText={setModelQuery} placeholder="Model ara" style={styles.input} />
              <View style={styles.optionList}>
                {modelOptions.map((model) => (
                  <Pressable
                    key={model.slug}
                    onPress={() => updateSelection({ modelSlug: model.slug, modelNameManual: null })}
                    style={[styles.optionRow, draft.selection.modelSlug === model.slug ? styles.optionRowActive : null]}
                  >
                    <Text style={styles.optionText}>{model.name}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={draft.selection.modelNameManual || ''}
                onChangeText={(value) => updateSelection({ modelNameManual: value, modelSlug: null })}
                placeholder="Listede yoksa manuel model gir"
                style={styles.input}
              />
            </>
          ) : null}

          {currentStep.key === 'year' ? (
            <TextInput
              value={draft.selection.year ? String(draft.selection.year) : ''}
              onChangeText={(value) => updateSelection({ year: Number(value) || null })}
              placeholder="Model yili"
              keyboardType="number-pad"
              style={styles.input}
            />
          ) : null}

          {currentStep.key === 'trim' ? (
            <>
              <TextInput value={trimQuery} onChangeText={setTrimQuery} placeholder="Paket ara" style={styles.input} />
              <View style={styles.optionList}>
                {trims.map((trim) => (
                  <Pressable
                    key={trim.slug}
                    onPress={() => updateSelection({ trimSlug: trim.slug, trimNameManual: null })}
                    style={[styles.optionRow, draft.selection.trimSlug === trim.slug ? styles.optionRowActive : null]}
                  >
                    <Text style={styles.optionText}>{trim.name}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={draft.selection.trimNameManual || ''}
                onChangeText={(value) => updateSelection({ trimNameManual: value, trimSlug: null })}
                placeholder="Listede yoksa manuel paket gir"
                style={styles.input}
              />
            </>
          ) : null}

          {currentStep.key === 'engine' ? (
            <>
              <TextInput value={engineQuery} onChangeText={setEngineQuery} placeholder="Motor ara" style={styles.input} />
              <View style={styles.optionList}>
                {engines.map((engine) => (
                  <Pressable
                    key={engine.slug}
                    onPress={() => updateSelection({ engineSlug: engine.slug, engineNameManual: null })}
                    style={[styles.optionRow, draft.selection.engineSlug === engine.slug ? styles.optionRowActive : null]}
                  >
                    <Text style={styles.optionText}>{engine.name}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={draft.selection.engineNameManual || ''}
                onChangeText={(value) => updateSelection({ engineNameManual: value, engineSlug: null })}
                placeholder="Listede yoksa manuel motor gir"
                style={styles.input}
              />
            </>
          ) : null}

          {currentStep.key === 'mileage' ? (
            <TextInput
              value={typeof draft.mileageKm === 'number' ? String(draft.mileageKm) : ''}
              onChangeText={(value) => updateDraft({ mileageKm: Number(value) || 0 })}
              placeholder="Kilometre"
              keyboardType="number-pad"
              style={styles.input}
            />
          ) : null}

          {currentStep.key === 'color' ? (
            <TextInput
              value={draft.colorName || ''}
              onChangeText={(value) => updateDraft({ colorName: value })}
              placeholder="Renk"
              style={styles.input}
            />
          ) : null}

          {currentStep.key === 'plate' ? (
            <>
              <TextInput
                value={draft.plateNumber || ''}
                onChangeText={(value) => updateDraft({ plateNumber: value })}
                placeholder="Plaka"
                style={styles.input}
              />
              <SectionTabs
                tabs={['Goster', 'Maskele', 'Gizle'] as const}
                value={draft.plateVisibility === 'full' ? 'Goster' : draft.plateVisibility === 'hidden' ? 'Gizle' : 'Maskele'}
                onChange={(value) =>
                  updateDraft({
                    plateVisibility: value === 'Goster' ? 'full' : value === 'Gizle' ? 'hidden' : 'masked',
                  })
                }
              />
            </>
          ) : null}

          {currentStep.key === 'equipment' ? (
            <>
              <View style={styles.chipWrap}>
                {equipmentPackages.map((item) => (
                  <Pressable
                    key={item.slug}
                    onPress={() => toggleEquipment(item.slug)}
                    style={[
                      styles.chip,
                      draft.equipment.selectedPackageSlugs.includes(item.slug) ? styles.chipActive : null,
                    ]}
                  >
                    <Text style={[
                      styles.chipLabel,
                      draft.equipment.selectedPackageSlugs.includes(item.slug) ? styles.chipLabelActive : null,
                    ]}>
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={manualEquipment}
                onChangeText={setManualEquipment}
                placeholder="Ek donanim"
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  addCustomEquipment(manualEquipment);
                  setManualEquipment('');
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Ek donanim ekle</Text>
              </Pressable>
            </>
          ) : null}

          {currentStep.key === 'paint-map' ? (
            <>
              <View style={styles.paintGrid}>
                {vehicleBodyPanels.map((panel) => (
                  <Pressable
                    key={panel.key}
                    onPress={() => {
                      const current = draft.paintAssessment.map[panel.key]?.status || 'unknown';
                      const order = ['original', 'painted', 'local-painted', 'replaced'] as const;
                      const next = order[(order.indexOf(current as never) + 1) % order.length];
                      setPaintStatus(panel.key, next);
                    }}
                    style={[
                      styles.paintPanel,
                      { backgroundColor: paintStatusPalette[draft.paintAssessment.map[panel.key]?.status || 'unknown'] },
                    ]}
                  >
                    <Text style={styles.paintPanelText}>{panel.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.helperText}>Parcaya her dokunusta durum sirayla orijinal, boyali, lokal boyali, degisen olarak ilerler.</Text>
            </>
          ) : null}

          {currentStep.key === 'registration' ? (
            <>
              <TextInput
                value={draft.registration?.ownerName || ''}
                onChangeText={(value) => updateDraft({ registration: { ...(draft.registration || {}), ownerName: value } })}
                placeholder="Ruhsat sahibi"
                style={styles.input}
              />
              <TextInput
                value={draft.registration?.registrationCity || ''}
                onChangeText={(value) => updateDraft({ registration: { ...(draft.registration || {}), registrationCity: value } })}
                placeholder="Ruhsat ili"
                style={styles.input}
              />
              <Pressable onPress={() => updateDraft({ registrationSkipped: true })} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Bu adimi sonra tamamla</Text>
              </Pressable>
            </>
          ) : null}

          {currentStep.key === 'chassis' ? (
            <>
              <TextInput
                value={draft.chassisNumber || ''}
                onChangeText={(value) => updateDraft({ chassisNumber: value })}
                placeholder="Sasi no"
                style={styles.input}
              />
              <Pressable onPress={() => updateDraft({ chassisSkipped: true })} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Bu adimi sonra tamamla</Text>
              </Pressable>
            </>
          ) : null}

          {currentStep.key === 'photos' ? (
            <>
              <Pressable onPress={() => void addPhotos()} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Fotograf sec</Text>
              </Pressable>
              {draft.photos.map((photo) => (
                <View key={photo.id} style={styles.photoRow}>
                  <Text style={styles.photoLabel}>{photo.label || photo.localUri || photo.url}</Text>
                  <Pressable onPress={() => removePhoto(photo.id)}>
                    <Text style={styles.removeText}>Sil</Text>
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => setStepIndex((value) => Math.max(0, value - 1))}
            style={[styles.secondaryButton, stepIndex === 0 ? styles.disabled : null]}
            disabled={stepIndex === 0}
          >
            <Text style={styles.secondaryText}>Geri</Text>
          </Pressable>
          <Pressable onPress={goNext} style={styles.primaryButton}>
            <Text style={styles.primaryText}>
              {stepIndex === garageWizardSteps.length - 1 ? 'Araci kaydet' : 'Devam et'}
            </Text>
          </Pressable>
        </View>
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
  subtitle: {
    color: theme.colors.textSoft,
  },
  progress: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  progressDot: {
    width: 18,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  progressDone: {
    backgroundColor: theme.colors.accent,
  },
  progressCurrent: {
    width: 32,
    backgroundColor: theme.colors.text,
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
    fontSize: 18,
    color: theme.colors.text,
  },
  sectionBody: {
    color: theme.colors.textSoft,
    lineHeight: 21,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.text,
  },
  chipLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  chipLabelActive: {
    color: theme.colors.surface,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionList: {
    gap: 8,
  },
  optionRow: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  optionRowActive: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  optionText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  paintGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paintPanel: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  paintPanelText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  photoLabel: {
    flex: 1,
    color: theme.colors.textSoft,
  },
  removeText: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
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
  primaryButton: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 15,
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
