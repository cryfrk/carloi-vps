import type {
  ObdConnectionEvent,
  ObdConnectionState,
  ObdPermissionRequirement,
  ObdProtocol,
  ObdSensorKey
} from './types.js';

export const knownObdProtocols: readonly ObdProtocol[] = [
  'can-11-500',
  'can-29-500',
  'can-11-250',
  'can-29-250',
  'iso-9141-2',
  'iso-14230-4',
  'sae-j1850-vpw',
  'sae-j1850-pwm',
  'uds',
  'unknown'
] as const;

export const liveSensorCatalog: readonly { key: ObdSensorKey; label: string; unit: string }[] = [
  { key: 'rpm', label: 'Motor devri', unit: 'rpm' },
  { key: 'coolant-temperature', label: 'Sogutma sicakligi', unit: 'C' },
  { key: 'vehicle-speed', label: 'Arac hizi', unit: 'km/h' },
  { key: 'battery-voltage', label: 'Aku voltaji', unit: 'V' },
  { key: 'fuel-level', label: 'Yakit seviyesi', unit: '%' },
  { key: 'engine-load', label: 'Motor yuku', unit: '%' },
  { key: 'intake-air-temperature', label: 'Emis havasi sicakligi', unit: 'C' },
  { key: 'maf', label: 'MAF', unit: 'g/s' },
  { key: 'map', label: 'MAP', unit: 'kPa' },
  { key: 'short-fuel-trim-bank-1', label: 'Kisa yakit duzeltme B1', unit: '%' },
  { key: 'long-fuel-trim-bank-1', label: 'Uzun yakit duzeltme B1', unit: '%' },
  { key: 'lambda-bank-1', label: 'Lambda B1', unit: 'lambda' },
  { key: 'throttle-position', label: 'Gaz kelebeği', unit: '%' },
  { key: 'o2-bank-1-sensor-1', label: 'O2 B1S1', unit: 'V' },
  { key: 'o2-bank-1-sensor-2', label: 'O2 B1S2', unit: 'V' }
] as const;

export function getAndroidObdPermissionRequirements(): ObdPermissionRequirement[] {
  return [
    {
      key: 'bluetooth',
      required: true,
      rationale: 'Bluetooth OBD cihazlariyla iletisim kurmak icin gerekir.'
    },
    {
      key: 'nearbyDevices',
      required: true,
      rationale: 'Android yakin cihazlar izni tarama ve baglanti icin gerekir.'
    },
    {
      key: 'bluetoothScan',
      required: true,
      rationale: 'Bluetooth cihaz taramasi icin gerekir.'
    },
    {
      key: 'bluetoothConnect',
      required: true,
      rationale: 'Secilen OBD cihaza baglanmak icin gerekir.'
    },
    {
      key: 'location',
      required: false,
      rationale: 'Bazi Android surumlerinde cihaz kesfi icin ek izin gerekebilir.'
    },
    {
      key: 'wifiState',
      required: false,
      rationale: 'Wi-Fi OBD adaptorleri icin ag durumu okunabilir.'
    }
  ];
}

export function getIosObdPermissionRequirements(): ObdPermissionRequirement[] {
  return [
    {
      key: 'bluetooth',
      required: true,
      rationale: 'Bluetooth veya BLE OBD baglantilari icin gerekir.'
    },
    {
      key: 'localNetwork',
      required: false,
      rationale: 'Wi-Fi OBD adaptorleri lokal ag izni isteyebilir.'
    }
  ];
}

export function nextObdConnectionState(
  currentState: ObdConnectionState,
  event: ObdConnectionEvent
): ObdConnectionState {
  switch (currentState) {
    case 'idle':
      if (event === 'start-scan') return 'requesting-permissions';
      return currentState;
    case 'requesting-permissions':
      if (event === 'permissions-granted') return 'scanning';
      if (event === 'permissions-denied' || event === 'failure') return 'error';
      return currentState;
    case 'scanning':
      if (event === 'device-detected') return 'device-selection';
      if (event === 'failure') return 'error';
      if (event === 'reset') return 'idle';
      return currentState;
    case 'device-selection':
      if (event === 'device-selected') return 'connecting';
      if (event === 'pin-required') return 'auth-required';
      if (event === 'reset') return 'idle';
      return currentState;
    case 'auth-required':
      if (event === 'pin-submitted') return 'connecting';
      if (event === 'failure') return 'error';
      return currentState;
    case 'connecting':
      if (event === 'socket-opened') return 'protocol-negotiation';
      if (event === 'failure') return 'error';
      return currentState;
    case 'protocol-negotiation':
      if (event === 'protocol-detected') return 'connected';
      if (event === 'failure') return 'error';
      return currentState;
    case 'connected':
      if (event === 'stream-started') return 'streaming';
      if (event === 'disconnect') return 'disconnected';
      return currentState;
    case 'streaming':
      if (event === 'disconnect') return 'disconnected';
      if (event === 'failure') return 'error';
      return currentState;
    case 'disconnected':
      if (event === 'start-scan') return 'requesting-permissions';
      if (event === 'reset') return 'idle';
      return currentState;
    case 'error':
      if (event === 'reset') return 'idle';
      return currentState;
    default:
      return currentState;
  }
}
