import { PermissionsAndroid, Platform } from 'react-native';

import {
  FaultCode,
  LiveMetric,
  ObdDiscoveredDevice,
  PartPrediction,
  VehicleProfile,
} from '../types';

type ActiveConnection =
  | {
      transport: 'bluetooth';
      device: ObdDiscoveredDevice;
      bluetoothDevice: any;
    }
  | {
      transport: 'wifi';
      device: ObdDiscoveredDevice;
      socket: any;
      host: string;
      port: number;
    };

interface ConnectWifiOptions {
  password?: string;
}

type AndroidPermission = Parameters<typeof PermissionsAndroid.request>[0];

const likelyObdPattern = /(obd|elm|v-link|vlink|vgate|icar|konnwei|scanner|diag)/i;
const wifiCandidates = [
  { host: '192.168.0.10', port: 35000 },
  { host: '192.168.0.10', port: 23 },
  { host: '192.168.0.1', port: 35000 },
  { host: '192.168.0.1', port: 23 },
  { host: '10.0.0.10', port: 35000 },
  { host: '10.0.0.10', port: 23 },
];

const ANDROID_PERMISSIONS = {
  bluetoothLegacy: 'android.permission.BLUETOOTH' as AndroidPermission,
  bluetoothAdminLegacy: 'android.permission.BLUETOOTH_ADMIN' as AndroidPermission,
  accessWifiState: 'android.permission.ACCESS_WIFI_STATE' as AndroidPermission,
  changeWifiState: 'android.permission.CHANGE_WIFI_STATE' as AndroidPermission,
};

let activeConnection: ActiveConnection | null = null;

function getBluetoothModule() {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const module = require('react-native-bluetooth-classic');
    return module.default ?? module;
  } catch {
    return null;
  }
}

function getWifiManager() {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const module = require('react-native-wifi-reborn');
    return module.default ?? module;
  } catch {
    return null;
  }
}

function getTcpSocketModule() {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const module = require('react-native-tcp-socket');
    return module.default ?? module;
  } catch {
    return null;
  }
}

function toIsoNow() {
  return new Date().toISOString();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseHexBytes(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^0-9A-F]/g, ' ')
    .split(/\s+/)
    .filter((chunk) => chunk.length === 2);
}

function findModePidBytes(raw: string, mode: string, pid?: string) {
  const tokens = parseHexBytes(raw);
  const modeResponse = (Number.parseInt(mode, 16) + 0x40)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] !== modeResponse) {
      continue;
    }

    if (!pid) {
      return tokens.slice(index + 1);
    }

    if (tokens[index + 1] === pid) {
      return tokens.slice(index + 2);
    }
  }

  return [];
}

function looksLikeObd(name?: string) {
  return Boolean(name && likelyObdPattern.test(name));
}

function normalizeDeviceName(name?: string, fallback = 'Bilinmeyen cihaz') {
  const nextName = String(name || '').trim();
  return nextName || fallback;
}

async function requestAndroidPermission(permission: AndroidPermission) {
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestObdPermissions() {
  if (Platform.OS !== 'android') {
    return { granted: true, denied: [] as string[] };
  }

  const permissions: AndroidPermission[] = [];

  if (Number(Platform.Version) >= 31) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    );
  } else {
    permissions.push(
      ANDROID_PERMISSIONS.bluetoothLegacy,
      ANDROID_PERMISSIONS.bluetoothAdminLegacy,
    );
  }

  if (Number(Platform.Version) >= 33 && PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES) {
    permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
  }

  permissions.push(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ANDROID_PERMISSIONS.accessWifiState,
    ANDROID_PERMISSIONS.changeWifiState,
  );

  const denied: string[] = [];
  for (const permission of permissions) {
    const granted = await requestAndroidPermission(permission);
    if (!granted) {
      denied.push(permission);
    }
  }

  return {
    granted: denied.length === 0,
    denied,
  };
}

async function ensureBluetoothReady() {
  const bluetooth = getBluetoothModule();
  if (!bluetooth) {
    throw new Error('Bluetooth Classic modülü bu build içinde hazır değil.');
  }

  const available = await bluetooth.isBluetoothAvailable?.();
  if (available === false) {
    throw new Error('Bu cihazda Bluetooth kullanılamıyor.');
  }

  const enabled = await bluetooth.isBluetoothEnabled?.();
  if (!enabled) {
    const activated = await bluetooth.requestBluetoothEnabled?.();
    if (!activated) {
      throw new Error('Bluetooth açılmadan OBD cihazı aranamaz.');
    }
  }

  return bluetooth;
}

function uniqueDevices(devices: ObdDiscoveredDevice[]) {
  return devices.filter(
    (device, index) =>
      devices.findIndex(
        (item) => item.transport === device.transport && item.id === device.id,
      ) === index,
  );
}

export async function scanNearbyObdDevices() {
  const permission = await requestObdPermissions();
  if (!permission.granted) {
    throw new Error('Bluetooth, Wi-Fi ve konum izinleri olmadan OBD cihazı aranamaz.');
  }

  const bluetooth = await ensureBluetoothReady();
  const wifiManager = getWifiManager();

  const bluetoothDevicesRaw = [
    ...((await bluetooth.getBondedDevices?.().catch(() => [])) ?? []),
    ...((await bluetooth.startDiscovery?.().catch(() => [])) ?? []),
  ];

  const bluetoothDevices: ObdDiscoveredDevice[] = bluetoothDevicesRaw.map((device: any) => ({
    id: device.address || device.id,
    name: normalizeDeviceName(device.name, device.address || 'Bluetooth cihazı'),
    address: device.address || device.id,
    transport: 'bluetooth',
    signalLevel: typeof device.rssi === 'number' ? Number(device.rssi) : undefined,
    isLikelyObd: looksLikeObd(device.name || device.address),
    hint: 'Bluetooth OBD cihazı',
  }));

  let wifiEntries: any[] = [];
  if (wifiManager) {
    wifiEntries =
      (await wifiManager.reScanAndLoadWifiList?.().catch(() => wifiManager.loadWifiList?.())) ?? [];
  }

  const wifiDevices: ObdDiscoveredDevice[] = wifiEntries.map((entry: any) => {
    const ssid = normalizeDeviceName(entry.SSID, 'Wi-Fi ağı');
    const secure = /WEP|WPA|SAE/i.test(String(entry.capabilities || ''));

    return {
      id: entry.BSSID || ssid,
      name: ssid,
      address: entry.BSSID,
      transport: 'wifi',
      secure,
      signalLevel: typeof entry.level === 'number' ? Number(entry.level) : undefined,
      isLikelyObd: looksLikeObd(ssid),
      hint: secure ? 'Şifreli Wi-Fi OBD ağı olabilir' : 'Açık Wi-Fi OBD ağı olabilir',
    };
  });

  return uniqueDevices([...bluetoothDevices, ...wifiDevices]).sort((first, second) => {
    const firstScore = Number(Boolean(first.isLikelyObd)) * 10 + (first.signalLevel ?? -999);
    const secondScore = Number(Boolean(second.isLikelyObd)) * 10 + (second.signalLevel ?? -999);
    return secondScore - firstScore;
  });
}

function cleanElmResponse(raw: string) {
  return raw
    .replace(/\r/g, '\n')
    .replace(/>/g, '')
    .replace(/SEARCHING\.\.\./gi, '')
    .replace(/NO DATA/gi, 'NO DATA')
    .trim();
}

async function readBluetoothCommand(device: any, command: string, timeoutMs = 3500) {
  await device.clear?.().catch(() => undefined);
  await device.write?.(`${command}\r`, 'ascii');

  return await Promise.race<string>([
    device.read?.().then((response: string) => cleanElmResponse(String(response || ''))),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error(`${command} komutu zaman aşımına uğradı.`)), timeoutMs),
    ),
  ]);
}

function createWifiCommandReader(socket: any, command: string, timeoutMs = 3500) {
  return new Promise<string>((resolve, reject) => {
    let buffer = '';

    const cleanup = () => {
      socket.removeListener?.('data', onData);
      socket.removeListener?.('error', onError);
      socket.removeListener?.('close', onClose);
      clearTimeout(timeoutHandle);
    };

    const onData = (chunk: any) => {
      buffer += typeof chunk === 'string' ? chunk : chunk?.toString?.('utf8') || String(chunk);
      if (buffer.includes('>')) {
        cleanup();
        resolve(cleanElmResponse(buffer));
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('Wi-Fi OBD soketi kapandı.'));
    };

    const timeoutHandle = setTimeout(() => {
      cleanup();
      reject(new Error(`${command} komutu zaman aşımına uğradı.`));
    }, timeoutMs);

    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('close', onClose);
    socket.write(`${command}\r`);
  });
}

async function readWifiCommand(socket: any, command: string, timeoutMs = 3500) {
  return createWifiCommandReader(socket, command, timeoutMs);
}

async function sendCommand(command: string, timeoutMs = 3500) {
  if (!activeConnection) {
    throw new Error('Bağlı OBD oturumu bulunamadı.');
  }

  if (activeConnection.transport === 'bluetooth') {
    return readBluetoothCommand(activeConnection.bluetoothDevice, command, timeoutMs);
  }

  return readWifiCommand(activeConnection.socket, command, timeoutMs);
}

async function initializeElm() {
  const commands = ['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0'];
  for (const command of commands) {
    await sendCommand(command, command === 'ATZ' ? 5000 : 3000);
  }
}

function parseMetricResponses(responses: Record<string, string>) {
  const rpmBytes = findModePidBytes(responses['010C'] || '', '01', '0C');
  const speedBytes = findModePidBytes(responses['010D'] || '', '01', '0D');
  const coolantBytes = findModePidBytes(responses['0105'] || '', '01', '05');
  const intakeBytes = findModePidBytes(responses['010F'] || '', '01', '0F');
  const pressureBytes = findModePidBytes(responses['010B'] || '', '01', '0B');
  const throttleBytes = findModePidBytes(responses['0111'] || '', '01', '11');
  const voltageBytes = findModePidBytes(responses['0142'] || '', '01', '42');
  const engineLoadBytes = findModePidBytes(responses['0104'] || '', '01', '04');
  const shortTrimBytes = findModePidBytes(responses['0106'] || '', '01', '06');
  const longTrimBytes = findModePidBytes(responses['0107'] || '', '01', '07');

  const rpm =
    rpmBytes.length >= 2
      ? Math.round(
          ((Number.parseInt(rpmBytes[0], 16) * 256 + Number.parseInt(rpmBytes[1], 16)) / 4) * 10,
        ) / 10
      : undefined;
  const speed = speedBytes.length ? Number.parseInt(speedBytes[0], 16) : undefined;
  const coolant = coolantBytes.length ? Number.parseInt(coolantBytes[0], 16) - 40 : undefined;
  const intake = intakeBytes.length ? Number.parseInt(intakeBytes[0], 16) - 40 : undefined;
  const manifoldPressure = pressureBytes.length ? Number.parseInt(pressureBytes[0], 16) : undefined;
  const throttle = throttleBytes.length
    ? Math.round((Number.parseInt(throttleBytes[0], 16) * 100) / 255)
    : undefined;
  const voltage =
    voltageBytes.length >= 2
      ? Math.round(
          ((Number.parseInt(voltageBytes[0], 16) * 256 + Number.parseInt(voltageBytes[1], 16)) /
            1000) *
            100,
        ) / 100
      : undefined;
  const engineLoad = engineLoadBytes.length
    ? Math.round((Number.parseInt(engineLoadBytes[0], 16) * 100) / 255)
    : undefined;
  const shortFuelTrim = shortTrimBytes.length
    ? Math.round((((Number.parseInt(shortTrimBytes[0], 16) - 128) * 100) / 128) * 10) / 10
    : undefined;
  const longFuelTrim = longTrimBytes.length
    ? Math.round((((Number.parseInt(longTrimBytes[0], 16) - 128) * 100) / 128) * 10) / 10
    : undefined;

  return {
    rpm,
    speed,
    coolant,
    intake,
    manifoldPressure,
    throttle,
    voltage,
    engineLoad,
    shortFuelTrim,
    longFuelTrim,
  };
}

function decodeTroubleCodes(raw: string) {
  const bytes = findModePidBytes(raw, '03');
  const codes: string[] = [];

  for (let index = 0; index < bytes.length; index += 2) {
    const first = Number.parseInt(bytes[index] || '00', 16);
    const second = Number.parseInt(bytes[index + 1] || '00', 16);
    if (!first && !second) {
      continue;
    }

    const family = ['P', 'C', 'B', 'U'][(first & 0xc0) >> 6];
    const digit2 = ((first & 0x30) >> 4).toString(16).toUpperCase();
    const digit3 = (first & 0x0f).toString(16).toUpperCase();
    const digit45 = second.toString(16).toUpperCase().padStart(2, '0');
    codes.push(`${family}${digit2}${digit3}${digit45}`);
  }

  return codes;
}

function faultFromCode(code: string): FaultCode {
  if (/^P03\d{2}$/i.test(code)) {
    return {
      code,
      title: 'Silindir ateşleme problemi',
      severity: 'Yuksek',
      detail: 'Ateşleme bobini, buji veya enjektör hattı kontrol edilmelidir.',
    };
  }

  if (/^P0171$/i.test(code) || /^P0174$/i.test(code)) {
    return {
      code,
      title: 'Karışım fakir',
      severity: 'Orta',
      detail: 'Vakum kaçağı, MAF sensörü veya yakıt besleme hattı kontrol edilmelidir.',
    };
  }

  if (/^P0420$/i.test(code)) {
    return {
      code,
      title: 'Katalitik verim düşük',
      severity: 'Orta',
      detail: 'Katalitik konvertör ve oksijen sensörü testi önerilir.',
    };
  }

  if (/^P0/i.test(code)) {
    return {
      code,
      title: 'Genel güç aktarım arızası',
      severity: 'Orta',
      detail: 'Kod özelinde detaylı servis taraması yapılmalıdır.',
    };
  }

  return {
    code,
    title: 'Diagnostik arıza kodu',
    severity: 'Dikkat',
    detail: 'Kodun üretici özel açıklaması servis cihazı ile doğrulanmalıdır.',
  };
}

function metricListFromParsed(parsed: ReturnType<typeof parseMetricResponses>): LiveMetric[] {
  const metrics: LiveMetric[] = [];

  if (typeof parsed.rpm === 'number') {
    metrics.push({
      id: 'rpm',
      label: 'Motor devri',
      value: `${parsed.rpm} rpm`,
      helper: 'PID 010C',
    });
  }
  if (typeof parsed.speed === 'number') {
    metrics.push({
      id: 'speed',
      label: 'Araç hızı',
      value: `${parsed.speed} km/h`,
      helper: 'PID 010D',
    });
  }
  if (typeof parsed.coolant === 'number') {
    metrics.push({
      id: 'coolant',
      label: 'Soğutma suyu',
      value: `${parsed.coolant} °C`,
      helper: 'PID 0105',
    });
  }
  if (typeof parsed.intake === 'number') {
    metrics.push({
      id: 'intake',
      label: 'Emiş havası',
      value: `${parsed.intake} °C`,
      helper: 'PID 010F',
    });
  }
  if (typeof parsed.throttle === 'number') {
    metrics.push({
      id: 'throttle',
      label: 'Gaz konumu',
      value: `%${parsed.throttle}`,
      helper: 'PID 0111',
    });
  }
  if (typeof parsed.engineLoad === 'number') {
    metrics.push({
      id: 'load',
      label: 'Motor yükü',
      value: `%${parsed.engineLoad}`,
      helper: 'PID 0104',
    });
  }
  if (typeof parsed.manifoldPressure === 'number') {
    metrics.push({
      id: 'map',
      label: 'Manifold basıncı',
      value: `${parsed.manifoldPressure} kPa`,
      helper: 'PID 010B',
    });
  }
  if (typeof parsed.voltage === 'number') {
    metrics.push({
      id: 'voltage',
      label: 'ECU voltajı',
      value: `${parsed.voltage} V`,
      helper: 'PID 0142',
    });
  }
  if (typeof parsed.shortFuelTrim === 'number') {
    metrics.push({
      id: 'short-trim',
      label: 'Kısa yakıt trim',
      value: `%${parsed.shortFuelTrim}`,
      helper: 'PID 0106',
    });
  }
  if (typeof parsed.longFuelTrim === 'number') {
    metrics.push({
      id: 'long-trim',
      label: 'Uzun yakıt trim',
      value: `%${parsed.longFuelTrim}`,
      helper: 'PID 0107',
    });
  }

  return metrics;
}

function inferPartPredictions(
  parsed: ReturnType<typeof parseMetricResponses>,
  faultCodes: FaultCode[],
): PartPrediction[] {
  const predictions: PartPrediction[] = [];

  const add = (part: PartPrediction) => {
    if (!predictions.find((item) => item.name === part.name)) {
      predictions.push(part);
    }
  };

  if (typeof parsed.coolant === 'number' && parsed.coolant >= 105) {
    add({
      name: 'Termostat / fan sistemi',
      probability: 76,
      marketPrice: 'Parça tedariki değişken',
      repairCost: 'Servis kontrolü gerekli',
      explanation:
        'Yüksek soğutma suyu sıcaklığı termostat, fan müşürü veya devirdaim hattını işaret edebilir.',
    });
  }

  const trimMagnitude = Math.max(
    Math.abs(parsed.shortFuelTrim ?? 0),
    Math.abs(parsed.longFuelTrim ?? 0),
  );
  if (trimMagnitude >= 12) {
    add({
      name: 'MAF / vakum kaçağı hattı',
      probability: clamp(Math.round(trimMagnitude * 3), 44, 88),
      marketPrice: 'Parça tedariki değişken',
      repairCost: 'Kaçak ve sensör testi gerekli',
      explanation:
        'Yakıt trim sapması hava kaçakları, MAF sensörü veya yakıt basıncı sorunlarıyla ilişkili olabilir.',
    });
  }

  if (typeof parsed.voltage === 'number' && (parsed.voltage < 12 || parsed.voltage > 15)) {
    add({
      name: 'Akü / alternatör',
      probability: 68,
      marketPrice: 'Parça tedariki değişken',
      repairCost: 'Şarj sistemi testi gerekli',
      explanation: 'Anormal ECU voltajı akü sağlığı veya şarj dinamosu kaynaklı olabilir.',
    });
  }

  for (const fault of faultCodes) {
    if (/^P03/i.test(fault.code)) {
      add({
        name: 'Ateşleme bobini / buji',
        probability: 84,
        marketPrice: 'Parça tedariki değişken',
        repairCost: 'Silindir bazlı kontrol gerekli',
        explanation: 'Misfire kodlarında ilk kontrol noktası bobin, buji ve ilgili enjektör hattıdır.',
      });
    }
    if (/^P0171$/i.test(fault.code) || /^P0174$/i.test(fault.code)) {
      add({
        name: 'Yakıt besleme / hava kaçak hattı',
        probability: 78,
        marketPrice: 'Parça tedariki değişken',
        repairCost: 'MAF ve kaçak testi gerekli',
        explanation:
          'Fakir karışım kodlarında vakum kaçağı, MAF sensörü veya düşük yakıt basıncı öne çıkar.',
      });
    }
    if (/^P0420$/i.test(fault.code)) {
      add({
        name: 'Katalizör / oksijen sensörü',
        probability: 72,
        marketPrice: 'Parça tedariki değişken',
        repairCost: 'Emisyon testi gerekli',
        explanation:
          'Katalitik verim düşüklüğü oksijen sensörleri veya katalizör yıpranmasıyla ilişkili olabilir.',
      });
    }
  }

  return predictions;
}

function computeHealthScore(
  parsed: ReturnType<typeof parseMetricResponses>,
  faultCodes: FaultCode[],
  predictions: PartPrediction[],
) {
  let score = 100;
  score -= Math.min(faultCodes.length * 12, 40);
  score -= Math.min(predictions.length * 4, 16);

  if (typeof parsed.coolant === 'number' && parsed.coolant >= 105) {
    score -= 15;
  }
  if (typeof parsed.coolant === 'number' && parsed.coolant < 70) {
    score -= 4;
  }
  if (typeof parsed.voltage === 'number' && (parsed.voltage < 12 || parsed.voltage > 15)) {
    score -= 12;
  }
  if (typeof parsed.shortFuelTrim === 'number' && Math.abs(parsed.shortFuelTrim) >= 10) {
    score -= 10;
  }
  if (typeof parsed.longFuelTrim === 'number' && Math.abs(parsed.longFuelTrim) >= 10) {
    score -= 10;
  }

  return clamp(Math.round(score), 0, 100);
}

function computeDriveScore(parsed: ReturnType<typeof parseMetricResponses>) {
  if (
    typeof parsed.rpm !== 'number' ||
    typeof parsed.throttle !== 'number' ||
    typeof parsed.speed !== 'number'
  ) {
    return undefined;
  }

  let score = 100;
  if (parsed.speed === 0 && (parsed.rpm < 650 || parsed.rpm > 1000)) {
    score -= 12;
  }
  if (parsed.speed < 15 && parsed.throttle > 55) {
    score -= 15;
  }
  if (parsed.speed > 90 && parsed.rpm > 3200) {
    score -= 10;
  }
  if (typeof parsed.engineLoad === 'number' && parsed.engineLoad > 85) {
    score -= 8;
  }

  return clamp(Math.round(score), 0, 100);
}

function buildSummary(
  currentVehicle: VehicleProfile,
  parsed: ReturnType<typeof parseMetricResponses>,
  faultCodes: FaultCode[],
  predictions: PartPrediction[],
) {
  const lines = [
    `${currentVehicle.year} ${currentVehicle.brand} ${currentVehicle.model} için canlı OBD taraması tamamlandı.`,
  ];

  if (faultCodes.length) {
    lines.push(`${faultCodes.length} adet aktif arıza kodu bulundu.`);
  } else {
    lines.push('Aktif arıza kodu bulunmadı.');
  }

  if (typeof parsed.coolant === 'number') {
    lines.push(`Soğutma suyu sıcaklığı ${parsed.coolant} °C olarak okundu.`);
  }

  if (predictions.length) {
    lines.push(`Canlı veriler en çok ${predictions[0].name} tarafında risk işaret ediyor.`);
  }

  return lines.join(' ');
}

function buildActions(
  parsed: ReturnType<typeof parseMetricResponses>,
  faultCodes: FaultCode[],
  predictions: PartPrediction[],
) {
  const actions: string[] = [];

  if (typeof parsed.coolant === 'number' && parsed.coolant >= 105) {
    actions.push('Hararet riski için fan, termostat ve soğutma suyu devrini hemen kontrol edin.');
  }
  if (faultCodes.some((fault) => /^P03/i.test(fault.code))) {
    actions.push('Misfire kodları için buji, bobin ve enjektörleri silindir bazında test edin.');
  }
  if (predictions.some((part) => part.name.includes('Akü'))) {
    actions.push('Akü ve alternatör voltajını yük altında ölçerek şarj sistemini doğrulayın.');
  }
  if (typeof parsed.shortFuelTrim === 'number' && Math.abs(parsed.shortFuelTrim) >= 10) {
    actions.push('Yakıt trim sapması için vakum kaçağı ve MAF sensörü temizliği/kontrolü yapın.');
  }

  if (!actions.length) {
    actions.push('Motor sıcaklığını ve hata lambasını izleyerek düzenli OBD taraması yapın.');
  }

  return actions;
}

function buildVehicleFromSnapshot(
  currentVehicle: VehicleProfile,
  device: ObdDiscoveredDevice,
  parsed: ReturnType<typeof parseMetricResponses>,
  faultCodes: FaultCode[],
  predictions: PartPrediction[],
) {
  const liveMetrics = metricListFromParsed(parsed);
  const healthScore =
    liveMetrics.length || faultCodes.length || predictions.length
      ? computeHealthScore(parsed, faultCodes, predictions)
      : undefined;
  const driveScore = computeDriveScore(parsed);

  return {
    ...currentVehicle,
    obdConnected: true,
    obdTransport: device.transport,
    obdDeviceId: device.id,
    obdDeviceName: device.name,
    obdLastSyncAt: toIsoNow(),
    liveMetrics,
    faultCodes,
    probableFaultyParts: predictions,
    healthScore,
    driveScore,
    summary: buildSummary(currentVehicle, parsed, faultCodes, predictions),
    actions: buildActions(parsed, faultCodes, predictions),
  };
}

export function buildPersistedObdVehicleSnapshot(vehicle: VehicleProfile): VehicleProfile {
  return {
    ...vehicle,
    obdConnected: false,
  };
}

async function openBluetoothConnection(device: ObdDiscoveredDevice) {
  const bluetooth = await ensureBluetoothReady();
  const connection = await bluetooth.connectToDevice(device.address || device.id, {
    delimiter: '>',
    charset: 'ascii',
    readTimeout: 0,
  });

  activeConnection = {
    transport: 'bluetooth',
    device,
    bluetoothDevice: connection,
  };
}

async function createWifiSocket(host: string, port: number) {
  const TcpSocket = getTcpSocketModule();
  if (!TcpSocket) {
    throw new Error('TCP soket modülü bu build içinde hazır değil.');
  }

  return await new Promise<any>((resolve, reject) => {
    const socket = TcpSocket.createConnection({ host, port });

    const timeout = setTimeout(() => {
      socket.destroy?.();
      reject(new Error('Wi-Fi OBD bağlantısı zaman aşımına uğradı.'));
    }, 5000);

    socket.once('error', (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });
  });
}

async function connectWifiDevice(device: ObdDiscoveredDevice, options?: ConnectWifiOptions) {
  const wifiManager = getWifiManager();
  if (!wifiManager) {
    throw new Error('Wi-Fi modülü bu build içinde hazır değil.');
  }

  if (device.secure && !options?.password) {
    throw new Error('Bu Wi-Fi ağı şifre korumalı. Bağlanmak için ağ şifresi girin.');
  }

  if (device.secure) {
    await wifiManager.connectToProtectedWifiSSID({
      ssid: device.name,
      password: options?.password ?? null,
      isWEP: false,
      isHidden: false,
      timeout: 20,
    });
  } else {
    await wifiManager.connectToSSID(device.name);
  }

  let lastError: Error | null = null;
  for (const candidate of wifiCandidates) {
    try {
      const socket = await createWifiSocket(candidate.host, candidate.port);
      activeConnection = {
        transport: 'wifi',
        device,
        socket,
        host: candidate.host,
        port: candidate.port,
      };
      return;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Wi-Fi OBD soketi açılamadı.');
    }
  }

  throw lastError ?? new Error('Wi-Fi OBD cihazına bağlanılamadı.');
}

async function readCurrentSnapshot(currentVehicle: VehicleProfile, device: ObdDiscoveredDevice) {
  await initializeElm();

  const commands = ['010C', '010D', '0105', '010F', '010B', '0111', '0142', '0104', '0106', '0107', '03'];
  const responses: Record<string, string> = {};

  for (const command of commands) {
    responses[command] = await sendCommand(command, command === '03' ? 4500 : 3500);
  }

  const parsed = parseMetricResponses(responses);
  const faultCodes = decodeTroubleCodes(responses['03'] || '').map(faultFromCode);
  const predictions = inferPartPredictions(parsed, faultCodes);

  return buildVehicleFromSnapshot(currentVehicle, device, parsed, faultCodes, predictions);
}

export async function connectAndReadObdSnapshot(
  currentVehicle: VehicleProfile,
  device: ObdDiscoveredDevice,
  options?: ConnectWifiOptions,
) {
  if (Platform.OS === 'web') {
    throw new Error('Web önizlemede gerçek OBD bağlantısı desteklenmez. Android build kullanın.');
  }

  await disconnectActiveObd().catch(() => undefined);

  if (device.transport === 'bluetooth') {
    await openBluetoothConnection(device);
  } else {
    await connectWifiDevice(device, options);
  }

  return await readCurrentSnapshot(currentVehicle, device);
}

export async function refreshConnectedObdSnapshot(currentVehicle: VehicleProfile) {
  if (!activeConnection) {
    throw new Error('Önce bir OBD cihazına bağlanın.');
  }

  return await readCurrentSnapshot(currentVehicle, activeConnection.device);
}

export async function disconnectActiveObd() {
  if (!activeConnection) {
    return false;
  }

  const connection = activeConnection;
  activeConnection = null;

  if (connection.transport === 'bluetooth') {
    return Boolean(await connection.bluetoothDevice.disconnect?.().catch(() => false));
  }

  connection.socket.destroy?.();
  return true;
}

export function getActiveObdDevice() {
  return activeConnection?.device ?? null;
}
