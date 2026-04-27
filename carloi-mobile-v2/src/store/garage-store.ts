import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const GARAGE_KEY = 'carloi_v2_garage';

export interface LocalGarageVehicle {
  id: string;
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
  plateVisible: boolean;
  photoUri?: string;
  healthSummary: string;
  obdStatus: 'connected' | 'not_connected';
  maintenanceState: 'up_to_date' | 'attention_needed' | 'unknown';
}

interface GarageState {
  vehicles: LocalGarageVehicle[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addVehicle: (vehicle: LocalGarageVehicle) => Promise<void>;
  removeVehicle: (vehicleId: string) => Promise<void>;
  togglePlateVisibility: (vehicleId: string) => Promise<void>;
}

async function persistVehicles(vehicles: LocalGarageVehicle[]) {
  await SecureStore.setItemAsync(GARAGE_KEY, JSON.stringify(vehicles));
}

export const useGarageStore = create<GarageState>((set, get) => ({
  vehicles: [],
  hydrated: false,
  hydrate: async () => {
    const stored = await SecureStore.getItemAsync(GARAGE_KEY);
    if (!stored) {
      set({ hydrated: true });
      return;
    }

    try {
      const vehicles = JSON.parse(stored) as LocalGarageVehicle[];
      set({ vehicles: Array.isArray(vehicles) ? vehicles : [], hydrated: true });
    } catch {
      set({ vehicles: [], hydrated: true });
    }
  },
  addVehicle: async (vehicle) => {
    const nextVehicles = [vehicle, ...get().vehicles.filter((item) => item.id !== vehicle.id)];
    await persistVehicles(nextVehicles);
    set({ vehicles: nextVehicles });
  },
  removeVehicle: async (vehicleId) => {
    const nextVehicles = get().vehicles.filter((item) => item.id !== vehicleId);
    await persistVehicles(nextVehicles);
    set({ vehicles: nextVehicles });
  },
  togglePlateVisibility: async (vehicleId) => {
    const nextVehicles = get().vehicles.map((item) =>
      item.id === vehicleId ? { ...item, plateVisible: !item.plateVisible } : item,
    );
    await persistVehicles(nextVehicles);
    set({ vehicles: nextVehicles });
  },
}));
