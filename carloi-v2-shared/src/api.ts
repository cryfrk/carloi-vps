import type {
  AuthResult,
  BackendResponse,
  CommercialReviewDetail,
  CommercialReviewSummary,
  CommercialStatusSummary,
  CreatePostPayload,
  PublicProfilePayload,
  RegisterPayload,
} from './types';

export const DEFAULT_API_BASE_URL = 'https://api.carloi.com';

export class ApiError extends Error {
  statusCode: number;
  responseBody: unknown;
  code?: string;

  constructor(message: string, statusCode: number, responseBody: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.code = code;
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  getToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void | Promise<void>;
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null;
};

type ApiPayload = BackendResponse | Record<string, unknown> | string | null;

async function normalizeResponse<T>(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  const text = await response.text();
  return text as T;
}

async function buildHeaders(
  init: RequestOptions,
  getToken?: ApiClientOptions['getToken'],
) {
  const headers = new Headers(init.headers || {});
  const token = getToken ? await getToken() : null;

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const body = init.body;
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  if (!isFormData && body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

function extractServerMessage(payload: ApiPayload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const message = (payload as Record<string, unknown>).message;
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}

function normalizeStatusMessage(statusCode: number, payload: ApiPayload) {
  const serverMessage = extractServerMessage(payload);
  if (serverMessage) {
    return serverMessage;
  }

  switch (statusCode) {
    case 400:
      return 'Istek eksik veya gecersiz gorunuyor. Bilgileri kontrol edip tekrar deneyin.';
    case 401:
      return 'Oturumunuz sona erdi. Lutfen tekrar giris yapin.';
    case 403:
      return 'Bu islem icin yetkiniz bulunmuyor.';
    case 404:
      return 'Aradiginiz icerik bulunamadi.';
    case 408:
      return 'Sunucu zamaninda yanit vermedi. Lutfen tekrar deneyin.';
    case 413:
      return 'Secilen dosya boyutu izin verilen siniri asiyor.';
    case 415:
      return 'Dosya formati desteklenmiyor.';
    case 422:
      return 'Gonderdiginiz bilgiler islenemedi. Alanlari kontrol edin.';
    case 429:
      return 'Cok sik istek gonderdiniz. Kisa bir sure sonra tekrar deneyin.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Sunucu gecici olarak kullanilamiyor. Lutfen biraz sonra tekrar deneyin.';
    default:
      return 'Istek islenemedi.';
  }
}

function normalizeNetworkError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error || '');
  const normalizedMessage = String(message || '').toLowerCase();

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError(
      'Sunucu zamaninda yanit vermedi. Lutfen tekrar deneyin.',
      0,
      null,
      'timeout',
    );
  }

  if (normalizedMessage.includes('aborted') || normalizedMessage.includes('timeout')) {
    return new ApiError(
      'Sunucu zamaninda yanit vermedi. Lutfen tekrar deneyin.',
      0,
      null,
      'timeout',
    );
  }

  if (
    normalizedMessage.includes('network request failed') ||
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('fetch') ||
    normalizedMessage.includes('load failed') ||
    normalizedMessage.includes('internet')
  ) {
    return new ApiError(
      'Sunucuya ulasilamiyor. Internet baglantinizi kontrol edip tekrar deneyin.',
      0,
      null,
      'network_error',
    );
  }

  return new ApiError(
    message || 'Beklenmeyen bir hata olustu.',
    0,
    null,
    'unknown_error',
  );
}

export function createApiClient(options: ApiClientOptions = {}) {
  const fetcher = options.fetcher || fetch;
  const baseUrl = String(options.baseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

  async function request<T = BackendResponse>(path: string, init: RequestOptions = {}) {
    const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    try {
      const headers = await buildHeaders(init, options.getToken);
      const body =
        init.body && typeof FormData !== 'undefined' && init.body instanceof FormData
          ? init.body
          : init.body && typeof init.body === 'object' && !(init.body instanceof Blob)
            ? JSON.stringify(init.body)
            : (init.body as BodyInit | undefined);

      const response = await fetcher(url, {
        ...init,
        headers,
        body,
      });

      const payload = await normalizeResponse<T | BackendResponse | string>(response);

      if (!response.ok) {
        const error = new ApiError(
          normalizeStatusMessage(response.status, payload as ApiPayload),
          response.status,
          payload,
          response.status === 401 ? 'unauthorized' : undefined,
        );

        if (response.status === 401 && options.onUnauthorized) {
          await options.onUnauthorized();
        }

        throw error;
      }

      return payload as T;
    } catch (error) {
      throw normalizeNetworkError(error);
    }
  }

  return {
    request,
    health: () => request<{ success: boolean; name: string; storageDriver: string; databaseMode: string }>('/health'),
    bootstrap: () => request<BackendResponse>('/api/bootstrap'),
    login: (identifier: string, password: string) =>
      request<BackendResponse<AuthResult>>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password },
      }),
    register: (payload: RegisterPayload) =>
      request<BackendResponse<AuthResult>>('/api/auth/register', {
        method: 'POST',
        body: payload,
      }),
    startVerification: (channel: 'email' | 'phone', destination: string) =>
      request<BackendResponse<AuthResult>>('/api/auth/verification/start', {
        method: 'POST',
        body: { channel, destination },
      }),
    verifyEmailToken: (token: string) =>
      request<BackendResponse<AuthResult>>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`),
    verifyEmailCode: (email: string, code: string) =>
      request<BackendResponse<AuthResult>>('/api/auth/verify-email', {
        method: 'POST',
        body: { email, code },
      }),
    resendVerificationCode: (email: string) =>
      request<BackendResponse<AuthResult>>('/api/auth/resend-verification-code', {
        method: 'POST',
        body: { email },
      }),
    forgotPassword: (email: string) =>
      request<BackendResponse<AuthResult>>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      }),
    resetPassword: (payload: { token?: string; email?: string; code?: string; newPassword: string }) =>
      request<BackendResponse<AuthResult>>('/api/auth/reset-password', {
        method: 'POST',
        body: payload,
      }),
    sendSmsCode: (phone?: string) =>
      request<BackendResponse<AuthResult>>('/api/auth/send-sms-code', {
        method: 'POST',
        body: phone ? { phone } : {},
      }),
    verifySmsCode: (code: string, phone?: string) =>
      request<BackendResponse<AuthResult>>('/api/auth/verify-sms-code', {
        method: 'POST',
        body: phone ? { code, phone } : { code },
      }),
    uploadMedia: (formData: FormData) =>
      request<BackendResponse<{ url: string }>>('/api/media/upload', {
        method: 'POST',
        body: formData,
      }),
    createPost: (payload: CreatePostPayload) =>
      request<BackendResponse>('/api/posts', {
        method: 'POST',
        body: payload,
      }),
    toggleReaction: (postId: string, action: 'like' | 'save' | 'repost') =>
      request<BackendResponse>(`/api/posts/${postId}/${action}`, {
        method: 'POST',
      }),
    commentOnPost: (postId: string, content: string) =>
      request<BackendResponse>(`/api/posts/${postId}/comment`, {
        method: 'POST',
        body: { content },
      }),
    getPublicPost: (postId: string) =>
      request<BackendResponse>(`/api/public/posts/${encodeURIComponent(postId)}`),
    getPublicListing: (postId: string) =>
      request<BackendResponse>(`/api/public/listings/${encodeURIComponent(postId)}`),
    getPublicProfile: (handle: string) =>
      request<BackendResponse<PublicProfilePayload>>(`/api/public/profiles/${encodeURIComponent(handle)}`),
    getCommercialStatus: () => request<BackendResponse<{ commercial: CommercialStatusSummary }>>('/api/commercial/status'),
    saveCommercialProfile: (payload: Record<string, unknown>, method: 'POST' | 'PATCH' = 'POST') =>
      request<BackendResponse>('/api/commercial/profile', {
        method,
        body: payload,
      }),
    uploadCommercialDocument: (payload: Record<string, unknown>) =>
      request<BackendResponse>('/api/commercial/documents', {
        method: 'POST',
        body: payload,
      }),
    submitCommercial: (payload: Record<string, unknown> = {}) =>
      request<BackendResponse>('/api/commercial/submit', {
        method: 'POST',
        body: payload,
      }),
    resubmitCommercial: (payload: Record<string, unknown> = {}) =>
      request<BackendResponse>('/api/commercial/resubmit', {
        method: 'POST',
        body: payload,
      }),
    updateProfileSettings: (payload: Record<string, unknown>) =>
      request<BackendResponse>('/api/profile/settings', {
        method: 'PATCH',
        body: payload,
      }),
    updateProfileMedia: (payload: Record<string, unknown>) =>
      request<BackendResponse>('/api/profile/media', {
        method: 'PATCH',
        body: payload,
      }),
    followProfile: (handle: string) =>
      request<BackendResponse>('/api/profile/follow', {
        method: 'POST',
        body: { handle },
      }),
    ensureDirectConversation: (handle: string) =>
      request<BackendResponse>('/api/conversations/direct', {
        method: 'POST',
        body: { handle },
      }),
    ensureListingConversation: (postId: string) =>
      request<BackendResponse>('/api/conversations/listing', {
        method: 'POST',
        body: { postId },
      }),
    sendConversationMessage: (
      conversationId: string,
      text: string,
      attachments: Array<Record<string, unknown>> = [],
    ) =>
      request<BackendResponse>(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        body: { text, attachments },
      }),
    toggleConversationAgreement: (conversationId: string) =>
      request<BackendResponse>(`/api/conversations/${encodeURIComponent(conversationId)}/agreement`, {
        method: 'POST',
      }),
    startConversationInsurancePayment: (conversationId: string, payload: Record<string, unknown> = {}) =>
      request<BackendResponse>(`/api/conversations/${encodeURIComponent(conversationId)}/insurance/pay`, {
        method: 'POST',
        body: payload,
      }),
    shareConversationRegistration: (conversationId: string, payload: Record<string, unknown>) =>
      request<BackendResponse>(`/api/conversations/${encodeURIComponent(conversationId)}/registration/share`, {
        method: 'POST',
        body: payload,
      }),
    aiChat: (message: string, payload: Record<string, unknown> = {}) =>
      request<BackendResponse>('/api/ai/chat', {
        method: 'POST',
        body: { message, ...payload },
      }),
    clearAi: () =>
      request<BackendResponse>('/api/ai/clear', {
        method: 'POST',
      }),
    getAdminCommercialReviews: (status = 'all') =>
      request<BackendResponse<{ reviews: CommercialReviewSummary[] }>>(
        `/api/admin/commercial/reviews?status=${encodeURIComponent(status)}`,
      ),
    getAdminCommercialDetail: (profileId: string) =>
      request<BackendResponse<{ review: CommercialReviewDetail }>>(
        `/api/admin/commercial/${encodeURIComponent(profileId)}`,
      ),
    adminCommercialDecision: (
      profileId: string,
      action: 'approve' | 'reject' | 'suspend' | 'revoke',
      payload: Record<string, unknown> = {},
    ) =>
      request<BackendResponse>(`/api/admin/commercial/${encodeURIComponent(profileId)}/${action}`, {
        method: 'POST',
        body: payload,
      }),
    adminCommercialNote: (profileId: string, note: string, noteType = 'general') =>
      request<BackendResponse>(`/api/admin/commercial/${encodeURIComponent(profileId)}/notes`, {
        method: 'POST',
        body: { note, noteType },
      }),
  };
}
