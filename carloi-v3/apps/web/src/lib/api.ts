'use client';

import {
  buildConsentSubmissionBundle,
  buildPendingAcceptances,
  getRequiredDocumentsForFlow,
  legalDocuments,
} from '@carloi-v3/legal';
import { createApiClient, type ApiClientOptions } from '@carloi-v3/api-client';
import { API_BASE_URL, type BackendEnvelope, type RegisterPayload } from '@carloi-v3/shared';

import type {
  AppEnvelope,
  AppSnapshot,
  GarageVehicleRecord,
  PendingVerificationState,
  PublicProfilePayload,
} from '@/types/app';

const TOKEN_KEY = 'carloi-v3-web-token';

const browserTokenStorage = {
  getToken() {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(TOKEN_KEY);
  },
  setToken(value: string | null) {
    if (typeof window === 'undefined') {
      return;
    }

    if (!value) {
      window.localStorage.removeItem(TOKEN_KEY);
      return;
    }

    window.localStorage.setItem(TOKEN_KEY, value);
  },
  clearToken() {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

function resolveApiBaseUrl() {
  return String(process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_URL).replace(/\/+$/, '');
}

const baseUrl = resolveApiBaseUrl();

const clientOptions: ApiClientOptions = {
  baseUrl,
  tokenStorage: browserTokenStorage,
  timeoutMs: 20_000,
  debug: process.env.NODE_ENV !== 'production',
  onUnauthorized: async () => {
    browserTokenStorage.clearToken();
  },
};

export const apiClient = createApiClient(clientOptions);

export interface UploadedMediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
}

export function getApiBaseUrl() {
  return baseUrl;
}

export function extractSnapshot(envelope: BackendEnvelope | null | undefined): AppSnapshot | null {
  return (envelope?.snapshot as AppSnapshot | undefined) || null;
}

export function persistToken(token: string | null) {
  browserTokenStorage.setToken(token);
}

export function clearPersistedToken() {
  browserTokenStorage.clearToken();
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

export async function startSignupVerification(channel: 'email' | 'phone', destination: string) {
  return apiClient.request<BackendEnvelope>('/api/auth/verification/start', {
    method: 'POST',
    body: { channel, destination },
  });
}

export async function registerUser(payload: RegisterPayload & { verificationCode?: string }) {
  const nextPayload: Record<string, unknown> = {
    ...payload,
  };

  if (payload.primaryChannel === 'phone' && payload.verificationCode) {
    nextPayload.signupVerification = {
      code: payload.verificationCode,
    };
    nextPayload.smsCode = payload.verificationCode;
  }

  return apiClient.register(nextPayload as unknown as RegisterPayload);
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

export async function logoutUser() {
  return apiClient.request<BackendEnvelope>('/api/auth/logout', { method: 'POST' });
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

export async function repostPost(postId: string) {
  return apiClient.request<BackendEnvelope>(`/api/posts/${encodeURIComponent(postId)}/repost`, {
    method: 'POST',
  });
}

export async function getPublicProfile(handle: string) {
  return apiClient.request<BackendEnvelope<PublicProfilePayload>>(
    `/api/public/profiles/${encodeURIComponent(handle)}`,
  );
}

export async function toggleFollow(handle: string) {
  return apiClient.request<BackendEnvelope>('/api/profile/follow', {
    method: 'POST',
    body: { handle },
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

export async function createListingConversation(postId: string, message = '') {
  return apiClient.request<BackendEnvelope>('/api/conversations/listing', {
    method: 'POST',
    body: { postId, message },
  });
}

export async function toggleListingAgreement(conversationId: string) {
  return apiClient.request<BackendEnvelope>(
    `/api/conversations/${encodeURIComponent(conversationId)}/agreement`,
    {
      method: 'POST',
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
  return apiClient.request<BackendEnvelope>('/api/ai/clear', {
    method: 'POST',
  });
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

export async function submitCommercialOnboarding(payload: Record<string, unknown> = {}) {
  return apiClient.request<BackendEnvelope>('/api/commercial/submit', {
    method: 'POST',
    body: payload,
  });
}

export async function listGarageVehicles() {
  return apiClient.request<{ success: boolean; vehicles: GarageVehicleRecord[] }>('/api/garage/vehicles');
}

export async function createGarageVehicle(payload: Record<string, unknown>) {
  return apiClient.request<{ success: boolean; vehicle: GarageVehicleRecord }>('/api/garage/vehicles', {
    method: 'POST',
    body: payload,
  });
}

export async function updateGarageVehicle(vehicleId: string, payload: Record<string, unknown>) {
  return apiClient.request<{ success: boolean; vehicle: GarageVehicleRecord }>(
    `/api/garage/vehicles/${encodeURIComponent(vehicleId)}`,
    {
      method: 'PATCH',
      body: payload,
    },
  );
}

export async function deleteGarageVehicle(vehicleId: string) {
  return apiClient.request<{ success: boolean; vehicleId: string; deleted: boolean }>(
    `/api/garage/vehicles/${encodeURIComponent(vehicleId)}`,
    {
      method: 'DELETE',
    },
  );
}

export async function createExpertiseSession(vehicleId: string, payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>(
    `/api/garage/vehicles/${encodeURIComponent(vehicleId)}/expertise/sessions`,
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function listExpertiseReports(vehicleId: string) {
  return apiClient.request<{ success: boolean; reports: Array<Record<string, unknown>> }>(
    `/api/garage/vehicles/${encodeURIComponent(vehicleId)}/expertise/reports`,
  );
}

export async function uploadVehicleMedia(vehicleId: string, files: File[]) {
  const uploaded: UploadedMediaAsset[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', file.type.startsWith('video/') ? 'video' : 'photo');
    const result = await apiClient.request<{ success: boolean; media: { id: string; url: string; kind: string; fileName?: string } }>(
      `/api/garage/vehicles/${encodeURIComponent(vehicleId)}/media`,
      {
        method: 'POST',
        body: formData,
      },
    );
    uploaded.push({
      id: result.media.id,
      url: result.media.url,
      type: result.media.kind === 'video' ? 'video' : 'image',
      name: result.media.fileName || file.name,
    });
  }
  return uploaded;
}

export async function saveVehicleRegistration(vehicleId: string, payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>(
    `/api/garage/vehicles/${encodeURIComponent(vehicleId)}/registration`,
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function saveVehicleChassis(vehicleId: string, payload: Record<string, unknown>) {
  return apiClient.request<BackendEnvelope>(
    `/api/garage/vehicles/${encodeURIComponent(vehicleId)}/chassis`,
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function uploadFiles(files: File[]) {
  const uploaded: UploadedMediaAsset[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    const result = await apiClient.uploadMedia(formData);
    uploaded.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      url:
        (result as { url?: string; data?: { url?: string } }).url ||
        (result as { data?: { url?: string } }).data?.url ||
        '',
      type: file.type.startsWith('video/') ? 'video' : file.type === 'application/pdf' ? 'document' : 'image',
      name: file.name,
    });
  }
  return uploaded.filter((item) => item.url);
}

export function buildRegisterPendingVerification(
  payload: RegisterPayload,
  envelope: AppEnvelope,
): PendingVerificationState {
  return {
    channel: payload.primaryChannel,
    email: payload.email,
    phone: payload.phone,
    maskedDestination: envelope.maskedDestination,
    expiresAt: envelope.expiresAt,
    accountType: payload.accountType,
  };
}

export function buildRegisterConsents(
  accountType: 'individual' | 'commercial',
  acceptedVersions: Record<string, string>,
) {
  const flow = accountType === 'commercial' ? 'register-commercial' : 'register-individual';
  const audience = accountType === 'commercial' ? 'commercial' : 'individual';
  const requiredDocuments = getRequiredDocumentsForFlow(legalDocuments, flow, audience);
  const pending = buildPendingAcceptances(legalDocuments, flow, audience);
  const acceptedAt = new Date().toISOString();
  const bundle = buildConsentSubmissionBundle(
    pending.map((item) => ({
      ...item,
      accepted: acceptedVersions[item.documentId] === item.documentVersion,
      acceptedAt:
        acceptedVersions[item.documentId] === item.documentVersion ? acceptedAt : undefined,
    })),
    flow,
    acceptedAt,
  );

  return {
    requiredDocuments,
    bundle,
  };
}
