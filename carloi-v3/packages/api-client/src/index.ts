import {
  API_BASE_URL,
  type BackendEnvelope,
  type HealthPayload,
  type LoginPayload,
  normalizeBaseUrl,
  type NetworkFailureKind,
  type RegisterPayload,
  type TokenStorage,
  type UploadResult
} from '@carloi-v3/shared';

export class ApiClientError extends Error {
  statusCode: number;
  kind: NetworkFailureKind;
  responseBody: unknown;

  constructor(message: string, statusCode: number, kind: NetworkFailureKind, responseBody: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.kind = kind;
    this.responseBody = responseBody;
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  tokenStorage?: TokenStorage;
  timeoutMs?: number;
  debug?: boolean;
  onUnauthorized?: () => void | Promise<void>;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | object | null;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function serializeRequestBody(rawBody: RequestOptions['body']): BodyInit | null | undefined {
  if (rawBody == null) {
    return rawBody;
  }

  if (isFormData(rawBody)) {
    return rawBody;
  }

  if (
    typeof rawBody === 'string' ||
    rawBody instanceof Blob ||
    rawBody instanceof URLSearchParams ||
    rawBody instanceof ArrayBuffer ||
    ArrayBuffer.isView(rawBody)
  ) {
    return rawBody as BodyInit;
  }

  return JSON.stringify(rawBody);
}

function normalizeErrorMessage(statusCode: number, payload: unknown) {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }

  switch (statusCode) {
    case 400:
      return 'Istek gecersiz veya eksik.';
    case 401:
      return 'Oturum gecersiz veya sona ermis.';
    case 403:
      return 'Bu islem icin yetki bulunmuyor.';
    case 404:
      return 'Istenen kaynak bulunamadi.';
    case 408:
      return 'Sunucu zamaninda yanit vermedi.';
    case 413:
    case 415:
      return 'Yuklenen dosya formati veya boyutu desteklenmiyor.';
    case 429:
      return 'Cok fazla istek gonderildi.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'API gecici olarak kullanilamiyor.';
    default:
      return 'Istek islenemedi.';
  }
}

function normalizeThrownError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error || '');
  const lowered = message.toLowerCase();

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiClientError('Istek zaman asimina ugradi.', 0, 'timeout', null);
  }

  if (lowered.includes('abort') || lowered.includes('timeout')) {
    return new ApiClientError('Istek zaman asimina ugradi.', 0, 'timeout', null);
  }

  if (
    lowered.includes('network') ||
    lowered.includes('fetch') ||
    lowered.includes('internet') ||
    lowered.includes('failed to fetch')
  ) {
    return new ApiClientError('Sunucuya ulasilamiyor.', 0, 'offline', null);
  }

  return new ApiClientError(message || 'Beklenmeyen bir hata olustu.', 0, 'unknown', null);
}

async function parseResponse<T>(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl, API_BASE_URL);
  const fetcher = options.fetcher || fetch;
  const timeoutMs = options.timeoutMs ?? 15000;

  async function request<T = BackendEnvelope>(path: string, init: RequestOptions = {}) {
    const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const { body: rawBody, ...restInit } = init;
    const headers = new Headers(init.headers || {});
    const token = options.tokenStorage ? await options.tokenStorage.getToken() : null;

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!isFormData(rawBody) && rawBody && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId =
      controller && !init.signal
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    const requestBody = serializeRequestBody(rawBody);

    try {
      if (options.debug) {
        console.info('[CarloiV3][API] request', { method: init.method || 'GET', url, baseUrl });
      }

      const response = await fetcher(url, {
        ...restInit,
        headers,
        body: requestBody,
        signal: init.signal || controller?.signal
      });

      const payload = await parseResponse<T | BackendEnvelope | string>(response);

      if (options.debug) {
        console.info('[CarloiV3][API] response', { method: init.method || 'GET', url, status: response.status });
      }

      if (!response.ok) {
        const error = new ApiClientError(
          normalizeErrorMessage(response.status, payload),
          response.status,
          response.status === 401
            ? 'unauthorized'
            : response.status >= 500
              ? 'api_unavailable'
              : response.status === 413 || response.status === 415
                ? 'upload_invalid'
                : 'unknown',
          payload
        );

        if (response.status === 401 && options.onUnauthorized) {
          await options.onUnauthorized();
        }

        throw error;
      }

      return payload as T;
    } catch (error) {
      if (options.debug) {
        console.error('[CarloiV3][API] error', {
          method: init.method || 'GET',
          url,
          message: error instanceof Error ? error.message : String(error)
        });
      }
      throw normalizeThrownError(error);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  return {
    baseUrl,
    request,
    upload(path: string, formData: FormData) {
      return request<BackendEnvelope<UploadResult>>(path, {
        method: 'POST',
        body: formData
      });
    },
    health() {
      return request<HealthPayload>('/health');
    },
    bootstrap() {
      return request<BackendEnvelope>('/api/bootstrap');
    },
    login(payload: LoginPayload) {
      return request<BackendEnvelope>('/api/auth/login', {
        method: 'POST',
        body: payload
      });
    },
    register(payload: RegisterPayload) {
      return request<BackendEnvelope>('/api/auth/register', {
        method: 'POST',
        body: payload
      });
    },
    verifyEmailToken(token: string) {
      return request<BackendEnvelope>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    },
    sendSmsCode(phone?: string) {
      return request<BackendEnvelope>('/api/auth/send-sms-code', {
        method: 'POST',
        body: phone ? { phone } : {}
      });
    },
    uploadMedia(formData: FormData) {
      return this.upload('/api/media/upload', formData);
    }
  };
}
