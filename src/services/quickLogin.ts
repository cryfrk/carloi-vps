import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const QUICK_LOGIN_KEY = 'carloi:quick-login';
const LEGACY_QUICK_LOGIN_KEY = 'vcar:quick-login';

export interface QuickLoginPayload {
  token: string;
  email?: string;
  phone?: string;
  displayName?: string;
  biometricLock?: boolean;
}

export async function getQuickLoginPayload() {
  const raw = await SecureStore.getItemAsync(QUICK_LOGIN_KEY);
  if (!raw) {
    const legacyRaw = await SecureStore.getItemAsync(LEGACY_QUICK_LOGIN_KEY);
    if (!legacyRaw) {
      return null;
    }

    try {
      const payload = JSON.parse(legacyRaw) as QuickLoginPayload;
      await SecureStore.setItemAsync(QUICK_LOGIN_KEY, JSON.stringify(payload));
      await SecureStore.deleteItemAsync(LEGACY_QUICK_LOGIN_KEY);
      return payload;
    } catch {
      await SecureStore.deleteItemAsync(LEGACY_QUICK_LOGIN_KEY);
      return null;
    }
  }

  try {
    return JSON.parse(raw) as QuickLoginPayload;
  } catch {
    await SecureStore.deleteItemAsync(QUICK_LOGIN_KEY);
    return null;
  }
}

export async function saveQuickLoginPayload(payload: QuickLoginPayload) {
  await SecureStore.setItemAsync(QUICK_LOGIN_KEY, JSON.stringify(payload));
}

export async function clearQuickLoginPayload() {
  await SecureStore.deleteItemAsync(QUICK_LOGIN_KEY);
  await SecureStore.deleteItemAsync(LEGACY_QUICK_LOGIN_KEY);
}

export async function runQuickLoginSecurityCheck(biometricLock: boolean) {
  if (!biometricLock) {
    return true;
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Carloi hızlı giriş',
    fallbackLabel: 'Cihaz kilidini kullan',
    cancelLabel: 'Vazgeç',
    disableDeviceFallback: false,
  });

  return result.success;
}

