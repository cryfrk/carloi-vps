'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { resolveSelectionOptions, searchBrands, searchModels, vehicleCatalogSeed } from '@carloi-v3/vehicle-catalog';

import { useSessionStore } from '@/store/session-store';
import { toAppError } from '@/lib/errors';
import {
  createEmptyPaintMap,
  createInitialGarageDraft,
  cyclePaintStatus,
  garageWizardSteps,
  updatePaintPanel,
  type GarageVehicleDraft,
  type PaintStatus,
  type VehicleBodyPanelKey,
} from '@/lib/vehicle';
import { saveVehicleChassis, saveVehicleRegistration, uploadVehicleMedia } from '@/lib/api';
import { StateBlock } from '@/components/state-block';

const panelLabels: Array<{ key: VehicleBodyPanelKey; label: string }> = [
  { key: 'hood', label: 'Kaput' },
  { key: 'roof', label: 'Tavan' },
  { key: 'trunk', label: 'Bagaj' },
  { key: 'front-bumper', label: 'On tampon' },
  { key: 'rear-bumper', label: 'Arka tampon' },
  { key: 'front-left-fender', label: 'Sol on camurluk' },
  { key: 'front-right-fender', label: 'Sag on camurluk' },
  { key: 'rear-left-fender', label: 'Sol arka camurluk' },
  { key: 'rear-right-fender', label: 'Sag arka camurluk' },
  { key: 'front-left-door', label: 'Sol on kapi' },
  { key: 'front-right-door', label: 'Sag on kapi' },
  { key: 'rear-left-door', label: 'Sol arka kapi' },
  { key: 'rear-right-door', label: 'Sag arka kapi' },
] as const;

const paintClassMap: Record<PaintStatus, string> = {
  unknown: 'bg-slate-100 text-slate-600',
  original: 'bg-slate-200 text-slate-800',
  painted: 'bg-amber-100 text-amber-900',
  'local-painted': 'bg-orange-100 text-orange-900',
  replaced: 'bg-rose-100 text-rose-900',
};

interface GarageWizardModalProps {
  open: boolean;
  onClose: () => void;
}

export function GarageWizardModal({ open, onClose }: GarageWizardModalProps) {
  const createGarageVehicle = useSessionStore((state) => state.createGarageVehicle);
  const refreshSnapshot = useSessionStore((state) => state.refreshSnapshot);

  const [draft, setDraft] = useState<GarageVehicleDraft>(createInitialGarageDraft());
  const [stepIndex, setStepIndex] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [customFeature, setCustomFeature] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; description: string } | null>(null);

  const step = garageWizardSteps[stepIndex];
  const options = resolveSelectionOptions(draft.selection, vehicleCatalogSeed);
  const brandOptions = draft.selection.typeKey
    ? searchBrands({ typeKey: draft.selection.typeKey, query: '' }, vehicleCatalogSeed)
    : [];
  const modelOptions = draft.selection.brandSlug
    ? searchModels(
        { typeKey: draft.selection.typeKey || undefined, brandSlug: draft.selection.brandSlug || undefined, query: '' },
        vehicleCatalogSeed,
      )
    : [];
  const selectedGeneration = options.generations.find((generation) => generation.slug === draft.selection.generationSlug) || null;

  const canContinue = useMemo(() => {
    switch (step.key) {
      case 'vehicle-type':
        return Boolean(draft.selection.typeKey);
      case 'brand':
        return Boolean(draft.selection.brandSlug || draft.selection.brandNameManual);
      case 'model':
        return Boolean(draft.selection.modelSlug || draft.selection.modelNameManual);
      case 'year':
        return Boolean(draft.selection.year);
      case 'trim':
        return Boolean(draft.selection.trimSlug || draft.selection.trimNameManual);
      case 'engine':
        return Boolean(draft.selection.engineSlug || draft.selection.engineNameManual);
      case 'mileage':
        return typeof draft.mileageKm === 'number' && draft.mileageKm >= 0;
      case 'color':
        return Boolean(draft.colorName?.trim());
      case 'plate':
        return draft.plateVisibility === 'hidden' || Boolean(draft.plateNumber?.trim());
      case 'equipment':
        return draft.equipment.confirmed;
      case 'paint-map':
        return draft.paintAssessment.confirmed;
      case 'registration':
        return draft.registrationSkipped === true || Boolean(draft.registration);
      case 'chassis':
        return draft.chassisSkipped === true || Boolean(draft.chassisNumber?.trim());
      case 'photos':
        return files.length > 0 || draft.photos.length > 0;
      default:
        return true;
    }
  }, [draft, files.length, step.key]);

  if (!open) {
    return null;
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const vehicle = await createGarageVehicle({
        vehicleType: draft.selection.typeKey || 'otomobil',
        brand:
          brandOptions.find((brand) => brand.slug === draft.selection.brandSlug)?.name ||
          draft.selection.brandNameManual ||
          '',
        model:
          modelOptions.find((model) => model.slug === draft.selection.modelSlug)?.name ||
          draft.selection.modelNameManual ||
          '',
        generation: selectedGeneration?.name || draft.selection.generationNameManual || '',
        year: draft.selection.year,
        trim: selectedGeneration?.trims.find((trim) => trim.slug === draft.selection.trimSlug)?.name || draft.selection.trimNameManual || '',
        engine:
          selectedGeneration?.engines.find((engine) => engine.slug === draft.selection.engineSlug)?.name ||
          draft.selection.engineNameManual ||
          '',
        fuelType: draft.selection.fuelType,
        transmission: draft.selection.transmission,
        drivetrain: draft.selection.drivetrain,
        bodyType: draft.selection.bodyType,
        mileageKm: draft.mileageKm,
        color: draft.colorName,
        plate: draft.plateNumber,
        plateIsHidden: draft.plateVisibility !== 'full',
        equipment: [...draft.equipment.customEntries, ...(draft.selection.customFeatures || [])],
        paintMap: draft.paintAssessment.map,
        showInProfile: draft.visibilityScope !== 'private',
      });

      if (!vehicle) {
        throw new Error('Arac kaydedilemedi.');
      }

      if (draft.registration) {
        await saveVehicleRegistration(vehicle.id, draft.registration as Record<string, unknown>);
      }

      if (draft.chassisNumber) {
        await saveVehicleChassis(vehicle.id, { chassisNo: draft.chassisNumber });
      }

      if (files.length) {
        await uploadVehicleMedia(vehicle.id, files);
      }
      await refreshSnapshot();
      onClose();
      setDraft(createInitialGarageDraft());
      setStepIndex(0);
      setFiles([]);
    } catch (caughtError) {
      setError(toAppError(caughtError, 'Arac garaja eklenemedi'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-[36px] border border-white/70 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">Garajima arac ekle</h3>
            <p className="mt-1 text-sm text-slate-500">Coklu arac destekli yeni Garajim akisi.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {garageWizardSteps.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStepIndex(index)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
                  index === stepIndex
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="mb-5">
            <div className="text-sm font-semibold text-cyan-700">{step.title}</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
          </div>

          {step.key === 'vehicle-type' ? (
            <div className="grid gap-3 md:grid-cols-3">
              {options.vehicleTypes.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() =>
                    setDraft((state) => ({
                      ...state,
                      selection: {
                        ...state.selection,
                        typeKey: type.key,
                        brandSlug: null,
                        modelSlug: null,
                        generationSlug: null,
                      },
                    }))
                  }
                  className={`rounded-[26px] border p-4 text-left transition ${
                    draft.selection.typeKey === type.key ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{type.label}</div>
                  <div className="mt-1 text-sm text-slate-500">{type.supportsObd ? 'OBD destekli' : 'OBD kisitli'}</div>
                </button>
              ))}
            </div>
          ) : null}

          {step.key === 'brand' ? (
            <div className="space-y-4">
              <input
                list="brand-options"
                value={draft.selection.brandSlug || ''}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    selection: { ...state.selection, brandSlug: event.target.value, modelSlug: null, generationSlug: null },
                  }))
                }
                className="field-input"
                placeholder="Marka sec"
              />
              <datalist id="brand-options">
                {brandOptions.map((brand) => (
                  <option key={brand.slug} value={brand.slug}>
                    {brand.name}
                  </option>
                ))}
              </datalist>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Listede yoksa manuel ekle</label>
                <input
                  value={draft.selection.brandNameManual || ''}
                  onChange={(event) =>
                    setDraft((state) => ({
                      ...state,
                      selection: { ...state.selection, brandNameManual: event.target.value },
                    }))
                  }
                  className="field-input"
                />
              </div>
            </div>
          ) : null}

          {step.key === 'model' ? (
            <div className="space-y-4">
              <input
                list="model-options"
                value={draft.selection.modelSlug || ''}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    selection: { ...state.selection, modelSlug: event.target.value, generationSlug: null },
                  }))
                }
                className="field-input"
                placeholder="Model sec"
              />
              <datalist id="model-options">
                {modelOptions.map((model) => (
                  <option key={model.slug} value={model.slug}>
                    {model.name}
                  </option>
                ))}
              </datalist>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Manuel model</label>
                <input
                  value={draft.selection.modelNameManual || ''}
                  onChange={(event) =>
                    setDraft((state) => ({
                      ...state,
                      selection: { ...state.selection, modelNameManual: event.target.value },
                    }))
                  }
                  className="field-input"
                />
              </div>
            </div>
          ) : null}

          {step.key === 'year' ? (
            <input
              type="number"
              value={draft.selection.year || ''}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  selection: { ...state.selection, year: Number(event.target.value) || null },
                }))
              }
              className="field-input"
              placeholder="Yil"
            />
          ) : null}

          {step.key === 'trim' ? (
            <div className="space-y-4">
              {options.generations.length ? (
                <input
                  list="generation-options"
                  value={draft.selection.generationSlug || ''}
                  onChange={(event) =>
                    setDraft((state) => ({
                      ...state,
                      selection: { ...state.selection, generationSlug: event.target.value },
                    }))
                  }
                  className="field-input"
                  placeholder="Kasa / jenerasyon"
                />
              ) : null}
              <datalist id="generation-options">
                {options.generations.map((generation) => (
                  <option key={generation.slug} value={generation.slug}>
                    {generation.name}
                  </option>
                ))}
              </datalist>
              <input
                list="trim-options"
                value={draft.selection.trimSlug || ''}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    selection: { ...state.selection, trimSlug: event.target.value },
                  }))
                }
                className="field-input"
                placeholder="Paket sec"
              />
              <datalist id="trim-options">
                {options.trims.map((trim) => (
                  <option key={trim.slug} value={trim.slug}>
                    {trim.name}
                  </option>
                ))}
              </datalist>
              <input
                value={draft.selection.trimNameManual || ''}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    selection: { ...state.selection, trimNameManual: event.target.value },
                  }))
                }
                className="field-input"
                placeholder="Manuel paket"
              />
            </div>
          ) : null}

          {step.key === 'engine' ? (
            <div className="space-y-4">
              <input
                list="engine-options"
                value={draft.selection.engineSlug || ''}
                onChange={(event) => {
                  const engine = options.engines.find((item) => item.slug === event.target.value);
                  setDraft((state) => ({
                    ...state,
                    selection: {
                      ...state.selection,
                      engineSlug: event.target.value,
                      fuelType: engine?.fuelType || state.selection.fuelType,
                      transmission: engine?.transmissionOptions?.[0] || state.selection.transmission,
                      drivetrain: engine?.drivetrainOptions?.[0] || state.selection.drivetrain,
                    },
                  }));
                }}
                className="field-input"
                placeholder="Motor sec"
              />
              <datalist id="engine-options">
                {options.engines.map((engine) => (
                  <option key={engine.slug} value={engine.slug}>
                    {engine.name}
                  </option>
                ))}
              </datalist>
              <input
                value={draft.selection.engineNameManual || ''}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    selection: { ...state.selection, engineNameManual: event.target.value },
                  }))
                }
                className="field-input"
                placeholder="Manuel motor"
              />
            </div>
          ) : null}

          {step.key === 'mileage' ? (
            <input
              type="number"
              value={draft.mileageKm || ''}
              onChange={(event) =>
                setDraft((state) => ({ ...state, mileageKm: Number(event.target.value) || 0 }))
              }
              className="field-input"
              placeholder="Kilometre"
            />
          ) : null}

          {step.key === 'color' ? (
            <input
              value={draft.colorName || ''}
              onChange={(event) => setDraft((state) => ({ ...state, colorName: event.target.value }))}
              className="field-input"
              placeholder="Renk"
            />
          ) : null}

          {step.key === 'plate' ? (
            <div className="space-y-4">
              <input
                value={draft.plateNumber || ''}
                onChange={(event) => setDraft((state) => ({ ...state, plateNumber: event.target.value }))}
                className="field-input"
                placeholder="Plaka"
              />
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Tam goster', value: 'full' },
                  { label: 'Maskele', value: 'masked' },
                  { label: 'Gizle', value: 'hidden' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDraft((state) => ({ ...state, plateVisibility: option.value as never }))}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      draft.plateVisibility === option.value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step.key === 'equipment' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {options.equipmentPackages.map((item) => {
                  const active = draft.equipment.customEntries.includes(item.name);
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() =>
                        setDraft((state) => ({
                          ...state,
                          equipment: {
                            ...state.equipment,
                            customEntries: active
                              ? state.equipment.customEntries.filter((entry) => entry !== item.name)
                              : [...state.equipment.customEntries, item.name],
                          },
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        active ? 'bg-cyan-50 text-cyan-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  value={customFeature}
                  onChange={(event) => setCustomFeature(event.target.value)}
                  className="field-input"
                  placeholder="Ekstra ozellik"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customFeature.trim()) {
                      return;
                    }
                    setDraft((state) => ({
                      ...state,
                      equipment: {
                        ...state.equipment,
                        customEntries: [...state.equipment.customEntries, customFeature.trim()],
                        confirmed: true,
                      },
                    }));
                    setCustomFeature('');
                  }}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  Ekle
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {draft.equipment.customEntries.map((entry) => (
                  <span key={entry} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                    {entry}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDraft((state) => ({ ...state, equipment: { ...state.equipment, confirmed: true } }))}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Donanimi onayla
              </button>
            </div>
          ) : null}

          {step.key === 'paint-map' ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {panelLabels.map((panel) => {
                  const state = draft.paintAssessment.map[panel.key] || createEmptyPaintMap()[panel.key];
                  return (
                    <button
                      key={panel.key}
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          paintAssessment: {
                            ...current.paintAssessment,
                            map: updatePaintPanel(
                              current.paintAssessment.map,
                              panel.key,
                              cyclePaintStatus((current.paintAssessment.map[panel.key]?.status || 'unknown') as PaintStatus),
                            ),
                          },
                        }))
                      }
                      className={`rounded-[24px] px-4 py-4 text-left ${paintClassMap[state.status]}`}
                    >
                      <div className="font-semibold">{panel.label}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em]">
                        {state.status === 'unknown'
                          ? 'Belirsiz'
                          : state.status === 'original'
                            ? 'Orijinal'
                            : state.status === 'painted'
                              ? 'Boyali'
                              : state.status === 'local-painted'
                                ? 'Lokal boyali'
                                : 'Degisen'}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((state) => ({
                    ...state,
                    paintAssessment: { ...state.paintAssessment, confirmed: true },
                  }))
                }
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Boya haritasini onayla
              </button>
            </div>
          ) : null}

          {step.key === 'registration' ? (
            <div className="space-y-4">
              <StateBlock
                title="Ruhsat bilgisi opsiyoneldir"
                description="Ilana cikarma ve sigorta surecinde kolaylik saglar. Eklemek istemezsen bu adimi atlayabilirsin."
              />
              <input
                value={draft.registration?.ownerName || ''}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    registration: { ...(state.registration || {}), ownerName: event.target.value },
                  }))
                }
                className="field-input"
                placeholder="Ruhsat sahibi"
              />
              <input
                value={draft.registration?.registrationCity || ''}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    registration: { ...(state.registration || {}), registrationCity: event.target.value },
                  }))
                }
                className="field-input"
                placeholder="Ruhsat ili"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraft((state) => ({ ...state, registrationSkipped: true }))}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Bu adimi atla
                </button>
              </div>
            </div>
          ) : null}

          {step.key === 'chassis' ? (
            <div className="space-y-4">
              <StateBlock
                title="Sasi numarasi opsiyoneldir"
                description="Parca uyumu, ariza analizi ve OBD yorumlari icin fayda saglar."
              />
              <input
                value={draft.chassisNumber || ''}
                onChange={(event) => setDraft((state) => ({ ...state, chassisNumber: event.target.value }))}
                className="field-input"
                placeholder="Sasi numarasi"
              />
              <button
                type="button"
                onClick={() => setDraft((state) => ({ ...state, chassisSkipped: true }))}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Bu adimi atla
              </button>
            </div>
          ) : null}

          {step.key === 'photos' ? (
            <div className="space-y-4">
              <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-cyan-300 hover:bg-cyan-50/40">
                <span className="text-sm font-semibold text-slate-800">Arac fotograflari ekle</span>
                <span className="mt-2 text-xs leading-5 text-slate-500">Ilan ve profil kartlari icin kullanilir.</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(event) => setFiles(Array.from(event.target.files || []))}
                />
              </label>
              {files.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {files.map((file) => (
                    <div key={file.name} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {file.name}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <div className="mt-5"><StateBlock title={error.title} description={error.description} /></div> : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            disabled={stepIndex === 0}
            className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Geri
          </button>
          <div className="flex items-center gap-3">
            {stepIndex < garageWizardSteps.length - 1 ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStepIndex((index) => Math.min(garageWizardSteps.length - 1, index + 1))}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Devam et
              </button>
            ) : (
              <button
                type="button"
                disabled={!canContinue || busy}
                onClick={() => void handleSubmit()}
                className="rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? 'Kaydediliyor...' : 'Garaja ekle'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
