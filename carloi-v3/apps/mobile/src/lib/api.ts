import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

import { createApiClient, type ApiClientOptions } from '@carloi-v3/api-client';
import { API_BASE_URL, type BackendEnvelope, type RegisterPayload } from '@carloi-v3/shared';

import type { AppSnapshot, PublicProfilePayload } from '../types/app';

const TOKEN_KEY = 'carloi-v3-token';

const secureTokenStorage = {
  async getToken() {
    return (await SecureStore.getItemAsync(TOKEN_KEY)) || null;
  },
  async setToken(value: string | null) {
    if (!value) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      return;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, value);
  },
  async clearToken() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

function resolveApiBaseUrl() {
  const expoExtra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return String(process.env.EXPO_PUBLIC_API_BASE_URL || expoExtra?.apiBaseUrl || API_BASE_URL).replace(/\/+$/, '');
}

const baseUrl = resolveApiBaseUrl();

const clientOptions: ApiClientOptions = {
  baseUrl,
  tokenStorage: secureTokenStorage,
  timeoutMs: 20000,
  debug: __DEV__,
  onUnauthorized: async () => {
    await secureTokenStorage.clearToken();
  },
};

export const apiClient = createApiClient(clientOptions);

export interface UploadedMediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
}

export interface PickedUploadAsset {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  type: 'image' | 'video' | 'document';
}

export function getApiBaseUrl() {
  return baseUrl;
}

export async function persistToken(token: string | null) {
  await secureTokenStorage.setToken(token);
}

export async function clearPersistedToken() {
  await secureTokenStorage.clearToken();
}

export function extractSnapshot(envelope: BackendEnvelope | null | undefined): AppSnapshot | null {
  return (envelope?.snapshot as AppSnapshot | undefined) || null;
}

export async function fetchHealth() {
  return apiClient.health();
}

export async function fetchBootstrap() {
  return apiClient.bootstrap();
}

export async function loginUser(identifier: string, password: string) {
  return apiClient.login({ identifier, password });
}

export async function registerUser(payload: RegisterPayload) {
  return apiClient.register(payload);
}

export async function verifyEmailCode(email: string, code: string) {
  return apiClient.request<BackendEnvelope>('/api/auth/verify-email', {
    method: 'POST',
    body: { email, code },
  });
}

export async function verifyEmailToken(token: string) {
  return apiClient.verifyEmailToken(token);
}

export async function resendVerificationCode(email: string) {
  return apiClient.request<BackendEnvelope>('/api/auth/resend-verification-code', {
    method: 'POST',
    body: { email },
  });
}

export async function sendSmsCode(phone?: string) {
  return apiClient.sendSmsCode(phone);
}

export async function verifySmsCode(code: string, phone?: string) {
  return apiClient.request<BackendEnvelope>('/api/auth/verify-sms-code', {
    method: 'POST',
    body: { code, phone },
  });
}

export async function logoutUser() {
  return apiClient.request<BackendEnvelope>('/api/auth/logout', { method: 'POST' });
}

export async function saveOnboarding(payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>('/api/onboarding', {
    method: 'PUT',
    body: payload,
  });
}

export async function updateProfileSettings(payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>('/api/profile/settings', {
    method: 'PATCH',
    body: payload,
  });
}

export async function updateProfileMedia(payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>('/api/profile/media', {
    method: 'PATCH',
    body: payload,
  });
}

export async function toggleFollow(handle: string) {
  return apiClient.request<BackendEnvelope>('/api/profile/follow', {
    method: 'POST',
    body: { handle },
  });
}

export async function createPost(payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>('/api/posts', {
    method: 'POST',
    body: payload,
  });
}

export async function likePost(postId: string) {
  return apiClient.request<BackendEnvelope>(`/api/posts/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
  });
}

export async function savePost(postId: string) {
  return apiClient.request<BackendEnvelope>(`/api/posts/${encodeURIComponent(postId)}/save`, {
    method: 'POST',
  });
}

export async function commentOnPost(postId: string, content: string) {
  return apiClient.request<BackendEnvelope>(`/api/posts/${encodeURIComponent(postId)}/comment`, {
    method: 'POST',
    body: { content },
  });
}

export async function trackPost(postId: string) {
  return apiClient.request<BackendEnvelope>(`/api/posts/${encodeURIComponent(postId)}/track`, {
    method: 'POST',
  });
}

export async function startListingConversation(postId: string) {
  return apiClient.request<BackendEnvelope>('/api/conversations/listing', {
    method: 'POST',
    body: { postId },
  });
}

export async function sendConversationMessage(
  conversationId: string,
  text: string,
  attachments: Array<{ url: string; type: string; name?: string }> = [],
) {
  return apiClient.request<BackendEnvelope>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: { text, attachments },
    },
  );
}

export async function toggleListingAgreement(conversationId: string) {
  return apiClient.request<BackendEnvelope>(
    `/api/conversations/${encodeURIComponent(conversationId)}/agreement`,
    { method: 'POST' },
  );
}

export async function shareListingRegistration(conversationId: string, payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>(
    `/api/conversations/${encodeURIComponent(conversationId)}/registration/share`,
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function requestInsurancePayment(conversationId: string, payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>(
    `/api/conversations/${encodeURIComponent(conversationId)}/insurance/pay`,
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function chatWithAi(message: string, context: Record<string, unknown> = {}) {
  return apiClient.request<BackendEnvelope>('/api/ai/chat', {
    method: 'POST',
    body: { message, ...context },
  });
}

export async function clearAiChat() {
  return apiClient.request<BackendEnvelope>('/api/ai/clear', { method: 'POST' });
}

export async function getCommercialStatus() {
  return apiClient.request<BackendEnvelope>('/api/commercial/status');
}

export async function saveCommercialProfile(payload: Record<string, unknown>, patch = false) {
  return apiClient.request<BackendEnvelope>('/api/commercial/profile', {
    method: patch ? 'PATCH' : 'POST',
    body: payload,
  });
}

export async function uploadCommercialDocument(payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>('/api/commercial/documents', {
    method: 'POST',
    body: payload,
  });
}

export async function submitCommercialOnboarding(payload: Record<string, unknown> = {}) {
  return apiClient.request<BackendEnvelope>('/api/commercial/submit', {
    method: 'POST',
    body: payload,
  });
}

export async function resubmitCommercialOnboarding(payload: Record<string, unknown> = {}) {
  return apiClient.request<BackendEnvelope>('/api/commercial/resubmit', {
    method: 'POST',
    body: payload,
  });
}

export async function getPublicProfile(handle: string) {
  return apiClient.request<BackendEnvelope<PublicProfilePayload>>(
    `/api/public/profiles/${encodeURIComponent(handle)}`,
  );
}

export async function pickImagesFromLibrary() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.85,
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: 10,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map<PickedUploadAsset>((asset) => ({
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
    type: asset.type === 'video' ? 'video' : 'image',
  }));
}

export async function pickDocuments() {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map<PickedUploadAsset>((asset) => ({
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileName: asset.name,
    type: 'document',
  }));
}

export async function uploadPickedAssets(assets: PickedUploadAsset[]) {
  const uploaded: UploadedMediaAsset[] = [];

  for (const asset of assets) {
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName || `carloi-${Date.now()}`,
      type: asset.mimeType || 'application/octet-stream',
    } as unknown as Blob);

    const result = await apiClient.uploadMedia(formData);
    uploaded.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      url: (result as unknown as { url?: string; data?: { url?: string } }).url || (result as unknown as { data?: { url?: string } }).data?.url || '',
      type: asset.type,
      name: asset.fileName || 'Dosya',
    });
  }

  return uploaded.filter((item) => item.url);
}
