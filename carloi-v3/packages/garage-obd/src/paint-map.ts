import type {
  PaintStatus,
  VehicleBodyPanelKey,
  VehiclePaintMap,
  VehiclePaintPanelState
} from './types.js';

export interface VehicleBodyPanelDefinition {
  key: VehicleBodyPanelKey;
  label: string;
  region: 'front' | 'center' | 'rear' | 'left' | 'right' | 'upper';
  shape: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const paintStatusPalette: Record<PaintStatus, string> = {
  unknown: '#cbd5e1',
  original: '#94a3b8',
  painted: '#facc15',
  'local-painted': '#fb923c',
  replaced: '#ef4444'
};

export const vehicleBodyPanels: readonly VehicleBodyPanelDefinition[] = [
  { key: 'hood', label: 'Kaput', region: 'front', shape: { x: 32, y: 8, width: 36, height: 14 } },
  { key: 'roof', label: 'Tavan', region: 'upper', shape: { x: 34, y: 24, width: 32, height: 18 } },
  { key: 'trunk', label: 'Bagaj', region: 'rear', shape: { x: 32, y: 76, width: 36, height: 14 } },
  {
    key: 'front-bumper',
    label: 'On tampon',
    region: 'front',
    shape: { x: 26, y: 0, width: 48, height: 8 }
  },
  {
    key: 'rear-bumper',
    label: 'Arka tampon',
    region: 'rear',
    shape: { x: 26, y: 90, width: 48, height: 8 }
  },
  {
    key: 'front-left-fender',
    label: 'Sol on camurluk',
    region: 'left',
    shape: { x: 18, y: 14, width: 12, height: 16 }
  },
  {
    key: 'front-right-fender',
    label: 'Sag on camurluk',
    region: 'right',
    shape: { x: 70, y: 14, width: 12, height: 16 }
  },
  {
    key: 'rear-left-fender',
    label: 'Sol arka camurluk',
    region: 'left',
    shape: { x: 18, y: 66, width: 12, height: 16 }
  },
  {
    key: 'rear-right-fender',
    label: 'Sag arka camurluk',
    region: 'right',
    shape: { x: 70, y: 66, width: 12, height: 16 }
  },
  {
    key: 'front-left-door',
    label: 'Sol on kapi',
    region: 'left',
    shape: { x: 22, y: 34, width: 16, height: 26 }
  },
  {
    key: 'front-right-door',
    label: 'Sag on kapi',
    region: 'right',
    shape: { x: 62, y: 34, width: 16, height: 26 }
  },
  {
    key: 'rear-left-door',
    label: 'Sol arka kapi',
    region: 'left',
    shape: { x: 22, y: 60, width: 16, height: 22 }
  },
  {
    key: 'rear-right-door',
    label: 'Sag arka kapi',
    region: 'right',
    shape: { x: 62, y: 60, width: 16, height: 22 }
  }
] as const;

export function createEmptyPaintMap(): VehiclePaintMap {
  return vehicleBodyPanels.reduce<VehiclePaintMap>((accumulator, panel) => {
    accumulator[panel.key] = {
      panelKey: panel.key,
      label: panel.label,
      status: 'unknown'
    };
    return accumulator;
  }, {} as VehiclePaintMap);
}

export function updatePaintPanelStatus(
  currentMap: VehiclePaintMap,
  panelKey: VehicleBodyPanelKey,
  status: PaintStatus,
  note?: string
): VehiclePaintMap {
  return {
    ...currentMap,
    [panelKey]: {
      ...currentMap[panelKey],
      status,
      note,
      updatedAt: new Date().toISOString()
    }
  };
}

export function summarizePaintMap(map: VehiclePaintMap): Record<PaintStatus, number> {
  return Object.values(map).reduce<Record<PaintStatus, number>>(
    (summary, panel) => {
      summary[panel.status] += 1;
      return summary;
    },
    {
      unknown: 0,
      original: 0,
      painted: 0,
      'local-painted': 0,
      replaced: 0
    }
  );
}

export function listMarkedPanels(map: VehiclePaintMap): VehiclePaintPanelState[] {
  return Object.values(map).filter((panel) => panel.status !== 'unknown');
}
