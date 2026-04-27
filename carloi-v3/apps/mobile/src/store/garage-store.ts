import { create } from 'zustand';

import {
  createEmptyPaintMap,
  getVehicleListingReadiness,
  updatePaintPanelStatus,
  type GarageVehicleDraft,
  type PaintStatus,
  type VehicleBodyPanelKey,
} from '@carloi-v3/garage-obd';

import type { LocalGarageVehicle } from '../types/app';

function makeEmptyDraft(): GarageVehicleDraft {
  return {
    selection: {
      equipmentPackageSlugs: [],
      customFeatures: [],
    },
    ownershipBasis: 'registered-owner',
    plateVisibility: 'masked',
    equipment: {
      selectedPackageSlugs: [],
      customEntries: [],
      confirmed: false,
    },
    paintAssessment: {
      map: createEmptyPaintMap(),
      confirmed: false,
    },
    photos: [],
    visibilityScope: 'garage',
  };
}

interface GarageState {
  vehicles: LocalGarageVehicle[];
  draft: GarageVehicleDraft;
  selectedVehicleId: string | null;
  resetDraft: () => void;
  updateDraft: (patch: Partial<GarageVehicleDraft>) => void;
  updateSelection: (patch: Partial<GarageVehicleDraft['selection']>) => void;
  toggleEquipment: (value: string) => void;
  addCustomEquipment: (value: string) => void;
  setPaintStatus: (panelKey: VehicleBodyPanelKey, status: PaintStatus) => void;
  addPhoto: (photo: GarageVehicleDraft['photos'][number]) => void;
  removePhoto: (id: string) => void;
  saveDraftAsVehicle: (ownerUserId: string) => LocalGarageVehicle;
  removeVehicle: (vehicleId: string) => void;
  selectVehicle: (vehicleId: string | null) => void;
}

export const useGarageStore = create<GarageState>((set, get) => ({
  vehicles: [],
  draft: makeEmptyDraft(),
  selectedVehicleId: null,
  resetDraft() {
    set({ draft: makeEmptyDraft() });
  },
  updateDraft(patch) {
    set((state) => ({
      draft: {
        ...state.draft,
        ...patch,
      },
    }));
  },
  updateSelection(patch) {
    set((state) => ({
      draft: {
        ...state.draft,
        selection: {
          ...state.draft.selection,
          ...patch,
        },
      },
    }));
  },
  toggleEquipment(value) {
    set((state) => {
      const selected = state.draft.equipment.selectedPackageSlugs.includes(value)
        ? state.draft.equipment.selectedPackageSlugs.filter((item) => item !== value)
        : [...state.draft.equipment.selectedPackageSlugs, value];

      return {
        draft: {
          ...state.draft,
          equipment: {
            ...state.draft.equipment,
            selectedPackageSlugs: selected,
            confirmed: selected.length > 0 || state.draft.equipment.customEntries.length > 0,
          },
        },
      };
    });
  },
  addCustomEquipment(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    set((state) => ({
      draft: {
        ...state.draft,
        equipment: {
          ...state.draft.equipment,
          customEntries: Array.from(new Set([...state.draft.equipment.customEntries, trimmed])),
          confirmed: true,
        },
      },
    }));
  },
  setPaintStatus(panelKey, status) {
    set((state) => ({
      draft: {
        ...state.draft,
        paintAssessment: {
          ...state.draft.paintAssessment,
          map: updatePaintPanelStatus(state.draft.paintAssessment.map, panelKey, status),
          confirmed: true,
        },
      },
    }));
  },
  addPhoto(photo) {
    set((state) => ({
      draft: {
        ...state.draft,
        photos: [...state.draft.photos, photo],
      },
    }));
  },
  removePhoto(id) {
    set((state) => ({
      draft: {
        ...state.draft,
        photos: state.draft.photos.filter((item) => item.id !== id),
      },
    }));
  },
  saveDraftAsVehicle(ownerUserId) {
    const draft = get().draft;
    const now = new Date().toISOString();
    const readiness = getVehicleListingReadiness(draft);
    const vehicle: LocalGarageVehicle = {
      ...draft,
      id: `garage-${Date.now()}`,
      ownerUserId,
      createdAt: now,
      updatedAt: now,
      primaryTypeKey: draft.selection.typeKey || 'otomobil',
      healthScore: readiness.convenienceHints.hasObdProfile ? 84 : 72,
      driveScore: readiness.convenienceHints.hasObdProfile ? 81 : 68,
      currentFaultCount: 0,
      source: 'local',
    };

    set((state) => ({
      vehicles: [vehicle, ...state.vehicles],
      selectedVehicleId: vehicle.id,
      draft: makeEmptyDraft(),
    }));
    return vehicle;
  },
  removeVehicle(vehicleId) {
    set((state) => ({
      vehicles: state.vehicles.filter((item) => item.id !== vehicleId),
      selectedVehicleId: state.selectedVehicleId === vehicleId ? null : state.selectedVehicleId,
    }));
  },
  selectVehicle(vehicleId) {
    set({ selectedVehicleId: vehicleId });
  },
}));
