import Constants from 'expo-constants';
import { createApiClient, DEFAULT_API_BASE_URL } from '@carloi/v2-shared';
import { useSessionStore } from '@/store/session-store';

type ExtraConfig = {
  apiBaseUrl?: string;
  expoClient?: {
    extra?: {
      apiBaseUrl?: string;
    };
  };
};

function normalizeBaseUrl(value: unknown) {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  return raw.replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const fromEnv = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  const expoExtra = (Constants.expoConfig?.extra || null) as ExtraConfig | null;
  const manifest2Extra = ((Constants as unknown as { manifest2?: { extra?: ExtraConfig } }).manifest2?.extra || null) as ExtraConfig | null;
  const fromExpoConfig = normalizeBaseUrl(expoExtra?.apiBaseUrl);
  const fromManifest2 = normalizeBaseUrl(manifest2Extra?.apiBaseUrl || manifest2Extra?.expoClient?.extra?.apiBaseUrl);

  return fromEnv || fromExpoConfig || fromManifest2 || DEFAULT_API_BASE_URL;
}

export const MOBILE_API_BASE_URL = resolveApiBaseUrl();

const REQUEST_TIMEOUT_MS = 15_000;

const loggingFetch: typeof fetch = async (input, init) => {
  const method = init?.method || 'GET';
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  console.info('[CarloiV2][API] request', { method, url, baseUrl: MOBILE_API_BASE_URL });

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId =
    controller && !init?.signal
      ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      : null;

  try {
    const response = await fetch(input, {
      ...init,
      signal: init?.signal || controller?.signal,
    });
    console.info('[CarloiV2][API] response', { method, url, status: response.status });
    return response;
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CarloiV2][API] network_error', {
      method,
      url,
      baseUrl: MOBILE_API_BASE_URL,
      name,
      message,
    });
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

console.info('[CarloiV2][API] base_url_resolved', { baseUrl: MOBILE_API_BASE_URL });

export function getMobileApiClient() {
  return createApiClient({
    baseUrl: MOBILE_API_BASE_URL,
    fetcher: loggingFetch,
    getToken: () => useSessionStore.getState().token,
    onUnauthorized: () => {
      useSessionStore.getState().clearSession();
    },
  });
}
