import { runtimeConfig } from '../config/runtimeConfig';
import {
  AppSnapshot,
  AuthLoginPayload,
  AuthRegisterPayload,
  AuthResendCodePayload,
  AuthVerifyEmailPayload,
  AuthVerificationStartPayload,
  ComposerPayload,
  ComposerSelectedMedia,
  ExternalPaymentSession,
  ListingFlowResult,
  MessageAttachment,
  OnboardingPayload,
  PremiumActivationRequest,
  SaleProcessSummary,
  SocialAuthPayload,
  UserSettings,
} from '../types';

interface PlatformResponse {
  success: boolean;
  message?: string;
  token?: string;
  snapshot?: AppSnapshot;
  provider?: string;
  relatedPostIds?: string[];
  url?: string;
  verificationId?: string;
  expiresAt?: string;
  maskedDestination?: string;
  email?: string;
  deliveryFailed?: boolean;
  payment?: ExternalPaymentSession;
  data?: unknown;
  membership?: {
    membershipPlan: string;
    membershipExpiresAt?: string;
    membershipSource?: string;
  };
  listingFlow?: ListingFlowResult;
  saleProcess?: SaleProcessSummary;
}

interface UploadableMedia {
  kind: 'image' | 'video' | 'gif' | 'audio';
  uri?: string;
  label: string;
  hint: string;
  fileName?: string;
  mimeType?: string;
}

const REQUEST_TIMEOUT_MS = 30000;

function getTimeoutMessage(path: string) {
  if (path.includes('/api/auth/register')) {
    return 'Kayit istegi su anda tamamlanamadi. Carloi sunucusu beklenenden uzun surede yanit veriyor. Lutfen kisa bir sure sonra tekrar deneyin.';
  }

  if (path.includes('/api/auth/login')) {
    return 'Giris istegi su anda tamamlanamadi. Carloi sunucusu beklenenden uzun surede yanit veriyor. Lutfen tekrar deneyin.';
  }

  return 'Sunucu su anda zamaninda yanit veremedi. Lutfen tekrar deneyin.';
}

function getNetworkMessage(path: string) {
  if (path.includes('/api/auth/register')) {
    return 'Uyelik olusturma servisine su anda ulasilamiyor. Baglantinizi kontrol edip kisa bir sure sonra tekrar deneyin.';
  }

  if (path.includes('/api/auth/login')) {
    return 'Giris servisine su anda ulasilamiyor. Baglantinizi kontrol edip tekrar deneyin.';
  }

  return 'Carloi sunucusuna su anda ulasilamiyor. Lutfen baglantinizi kontrol edip tekrar deneyin.';
}

async function request<TBody = unknown>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: TBody;
  } = {},
) {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(getTimeoutMessage(path));
    }
    throw new Error(getNetworkMessage(path));
  } finally {
    clearTimeout(timeout);
  }

  const data = (await response.json().catch(() => ({
    success: false,
    message: 'Sunucudan gecerli bir yanit alinamadi.',
  }))) as PlatformResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Sunucu isteği başarısız oldu.');
  }

  return data;
}

export const platformApi = {
  health: () => request('/health'),
  startVerification: (payload: AuthVerificationStartPayload) =>
    request('/api/auth/verification/start', { method: 'POST', body: payload }),
  register: (payload: AuthRegisterPayload) =>
    request('/api/auth/register', { method: 'POST', body: payload }),
  verifyEmail: (payload: AuthVerifyEmailPayload) =>
    request('/verify-email', { method: 'POST', body: payload }),
  resendCode: (payload: AuthResendCodePayload) =>
    request('/resend-code', { method: 'POST', body: payload }),
  login: (payload: AuthLoginPayload) =>
    request('/api/auth/login', { method: 'POST', body: payload }),
  socialAuth: (payload: SocialAuthPayload) =>
    request('/api/auth/social', { method: 'POST', body: payload }),
  logout: (token: string) => request('/api/auth/logout', { method: 'POST', token }),
  bootstrap: (token: string) => request('/api/bootstrap', { token }),
  saveOnboarding: (token: string, payload: OnboardingPayload) =>
    request('/api/onboarding', { method: 'PUT', token, body: payload }),
  createOrUpdatePost: (token: string, payload: ComposerPayload) =>
    request('/api/posts', { method: 'POST', token, body: payload }),
  deletePost: (token: string, postId: string) =>
    request(`/api/posts/${postId}`, { method: 'DELETE', token }),
  setListingSoldStatus: (token: string, postId: string, isSold: boolean) =>
    request(`/api/posts/${postId}/sold`, { method: 'POST', token, body: { isSold } }),
  toggleLike: (token: string, postId: string) =>
    request(`/api/posts/${postId}/like`, { method: 'POST', token }),
  toggleSave: (token: string, postId: string) =>
    request(`/api/posts/${postId}/save`, { method: 'POST', token }),
  toggleRepost: (token: string, postId: string) =>
    request(`/api/posts/${postId}/repost`, { method: 'POST', token }),
  addComment: (token: string, postId: string, content: string) =>
    request(`/api/posts/${postId}/comment`, {
      method: 'POST',
      token,
      body: { content },
    }),
  updateProfileMedia: (
    token: string,
    payload: {
      avatarUri?: string;
      coverUri?: string;
    },
  ) => request('/api/profile/media', { method: 'PATCH', token, body: payload }),
  updateSettings: (token: string, payload: Partial<UserSettings>) =>
    request('/api/profile/settings', { method: 'PATCH', token, body: payload }),
  toggleFollow: (token: string, handle: string) =>
    request('/api/profile/follow', { method: 'POST', token, body: { handle } }),
  trackListing: (
    token: string,
    postId: string,
    kind: 'view' | 'share' | 'call' | 'message',
  ) => request(`/api/posts/${postId}/track`, { method: 'POST', token, body: { kind } }),
  ensureConversation: (token: string, handle: string) =>
    request('/api/conversations/direct', { method: 'POST', token, body: { handle } }),
  ensureListingConversation: (token: string, postId: string) =>
    request('/api/conversations/listing', { method: 'POST', token, body: { postId } }),
  createGroupConversation: (token: string, handles: string[], name: string) =>
    request('/api/conversations/group', { method: 'POST', token, body: { handles, name } }),
  toggleListingAgreement: (token: string, conversationId: string) =>
    request(`/api/conversations/${conversationId}/agreement`, { method: 'POST', token }),
  shareListingRegistration: (token: string, conversationId: string) =>
    request(`/api/conversations/${conversationId}/registration/share`, { method: 'POST', token }),
  createInsurancePayment: async (token: string, conversationId: string) => {
    const response = await request('/api/payment/initiate', {
      method: 'POST',
      token,
      body: {
        flow: 'insurance',
        conversationId,
      },
    });

    return {
      ...response,
      payment:
        response.payment ||
        (response.data && typeof response.data === 'object'
          ? (response.data as ExternalPaymentSession)
          : undefined),
      url:
        response.url ||
        (response.data && typeof response.data === 'object'
          ? String((response.data as ExternalPaymentSession).paymentUrl || '')
          : undefined),
    };
  },
  startSaleProcess: (token: string, listingId: string) =>
    request(`/api/sales/${listingId}/start`, { method: 'POST', token }),
  acknowledgeSafePayment: (token: string, listingId: string, consents: Array<{ type: string; accepted?: boolean; version?: string; sourceScreen?: string }>) =>
    request(`/api/sales/${listingId}/ack-safe-payment`, {
      method: 'POST',
      token,
      body: { consents },
    }),
  markSaleReadyForNotary: (token: string, listingId: string) =>
    request(`/api/sales/${listingId}/ready-for-notary`, { method: 'POST', token }),
  completeSaleProcess: (token: string, listingId: string) =>
    request(`/api/sales/${listingId}/complete`, { method: 'POST', token }),
  activatePremiumMembership: (token: string, payload: PremiumActivationRequest) =>
    request('/api/billing/premium/activate', { method: 'POST', token, body: payload }),
  sendConversationMessage: (
    token: string,
    conversationId: string,
    payload: {
      text: string;
      attachments?: MessageAttachment[];
    },
  ) =>
    request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      token,
      body: payload,
    }),
  editConversationMessage: (token: string, conversationId: string, messageId: string, text: string) =>
    request(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      token,
      body: { text },
    }),
  deleteConversationMessage: (
    token: string,
    conversationId: string,
    messageId: string,
    scope: 'self' | 'everyone',
  ) =>
    request(`/api/conversations/${conversationId}/messages/${messageId}/delete`, {
      method: 'POST',
      token,
      body: { scope },
    }),
  aiChat: (
    token: string,
    message: string,
    location?: {
      latitude: number;
      longitude: number;
      city?: string;
      district?: string;
      locationLine?: string;
    },
  ) =>
    request('/api/ai/chat', { method: 'POST', token, body: { message, location } }),
  editAiMessage: (
    token: string,
    messageId: string,
    content: string,
    location?: {
      latitude: number;
      longitude: number;
      city?: string;
      district?: string;
      locationLine?: string;
    },
  ) =>
    request(`/api/ai/messages/${messageId}`, {
      method: 'PATCH',
      token,
      body: { content, location },
    }),
  deleteAiMessage: (token: string, messageId: string) =>
    request(`/api/ai/messages/${messageId}`, { method: 'DELETE', token }),
  clearAiMessages: (token: string) => request('/api/ai/clear', { method: 'POST', token }),
  uploadMedia: async (token: string, file: ComposerSelectedMedia | UploadableMedia) => {
    if (!file.uri) {
      throw new Error('Yüklenecek medya URI bilgisi eksik.');
    }

    const formData = new FormData();
    const extension =
      file.mimeType?.split('/')[1] ||
      file.uri.split('.').pop()?.split('?')[0] ||
      (file.kind === 'video'
        ? 'mp4'
        : file.kind === 'gif'
          ? 'gif'
          : file.kind === 'audio'
            ? 'm4a'
            : 'jpg');
    const fileName = file.fileName || `${file.kind}-${Date.now()}.${extension}`;

    if (typeof window !== 'undefined') {
      const blob = await fetch(file.uri).then((response) => response.blob());
      formData.append('file', blob, fileName);
    } else {
      formData.append('file', {
        uri: file.uri,
        name: fileName,
        type:
          file.mimeType ||
          (file.kind === 'video'
            ? 'video/mp4'
            : file.kind === 'gif'
              ? 'image/gif'
              : file.kind === 'audio'
                ? 'audio/m4a'
                : 'image/jpeg'),
      } as never);
    }

    formData.append('kind', file.kind);

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = (await response.json()) as PlatformResponse;
    if (!response.ok || !data.success || !data.url) {
      throw new Error(data.message || 'Medya yüklenemedi.');
    }

    return data.url;
  },
};

