import { create } from 'zustand';

import type { RegisterPayload } from '@carloi-v3/shared';

import {
  clearPersistedToken,
  extractSnapshot,
  fetchBootstrap,
  fetchHealth,
  getPublicProfile,
  loginUser,
  logoutUser,
  persistToken,
  registerUser,
  resendVerificationCode,
  sendSmsCode,
  toggleFollow,
  verifyEmailCode,
  verifyEmailToken,
  verifySmsCode,
} from '../lib/api';
import { toAppError } from '../lib/errors';
import type {
  AppErrorState,
  AppSnapshot,
  PendingVerificationState,
  PublicProfilePayload,
} from '../types/app';

type SessionStatus = 'booting' | 'guest' | 'authenticated';

interface SessionState {
  status: SessionStatus;
  snapshot: AppSnapshot | null;
  health: Record<string, unknown> | null;
  pendingVerification: PendingVerificationState | null;
  publicProfiles: Record<string, PublicProfilePayload>;
  error: AppErrorState | null;
  busyLabel: string | null;
  hydrate: () => Promise<void>;
  clearError: () => void;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  verifyEmailWithCode: (email: string, code: string) => Promise<boolean>;
  verifyEmailWithToken: (token: string) => Promise<boolean>;
  resendEmailCode: (email: string) => Promise<boolean>;
  sendPhoneCode: (phone?: string) => Promise<boolean>;
  verifyPhoneCode: (code: string, phone?: string) => Promise<boolean>;
  refreshSnapshot: () => Promise<void>;
  followHandle: (handle: string) => Promise<void>;
  fetchPublicProfile: (handle: string) => Promise<PublicProfilePayload | null>;
  setSnapshot: (snapshot: AppSnapshot | null) => void;
  setPendingVerification: (value: PendingVerificationState | null) => void;
  logout: () => Promise<void>;
}

function applyEnvelopeSession(
  envelope: { token?: string; snapshot?: Record<string, unknown> | null } | null | undefined,
  set: (partial: Partial<SessionState>) => void,
) {
  const snapshot = extractSnapshot(envelope as never);
  const token = envelope?.token || snapshot?.auth?.sessionToken || null;

  if (token) {
    void persistToken(token);
  }

  set({
    status: token || snapshot ? 'authenticated' : 'guest',
    snapshot,
    error: null,
    busyLabel: null,
  });
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'booting',
  snapshot: null,
  health: null,
  pendingVerification: null,
  publicProfiles: {},
  error: null,
  busyLabel: null,
  async hydrate() {
    set({ busyLabel: 'Baglanti kontrol ediliyor...' });
    try {
      const health = await fetchHealth();
      set({ health: health as unknown as Record<string, unknown> });
    } catch (error) {
      set({
        health: null,
        error: toAppError(error, 'Sunucuya baglanilamadi'),
      });
    }

    try {
      const envelope = await fetchBootstrap();
      applyEnvelopeSession(envelope, set);
    } catch (error) {
      set({
        status: 'guest',
        busyLabel: null,
      });
      if ((error as { statusCode?: number }).statusCode && (error as { statusCode?: number }).statusCode !== 401) {
        set({ error: toAppError(error, 'Oturum yenilenemedi') });
      }
    }
  },
  clearError() {
    set({ error: null });
  },
  async login(identifier, password) {
    set({ busyLabel: 'Giris yapiliyor...', error: null });
    try {
      const envelope = await loginUser(identifier, password);
      applyEnvelopeSession(envelope, set);
      set({ pendingVerification: null });
      return true;
    } catch (error) {
      set({
        error: toAppError(error, 'Giris yapilamadi'),
        busyLabel: null,
      });
      return false;
    }
  },
  async register(payload) {
    set({ busyLabel: 'Hesap olusturuluyor...', error: null });
    try {
      const envelope = await registerUser(payload);
      applyEnvelopeSession(envelope, set);
      set({
        pendingVerification: {
          channel: payload.primaryChannel,
          email: payload.email,
          phone: payload.phone,
          maskedDestination: (envelope as { maskedDestination?: string }).maskedDestination,
          expiresAt: (envelope as { expiresAt?: string }).expiresAt,
          accountType: payload.accountType,
        },
      });
      return true;
    } catch (error) {
      set({
        error: toAppError(error, 'Kayit tamamlanamadi'),
        busyLabel: null,
      });
      return false;
    }
  },
  async verifyEmailWithCode(email, code) {
    set({ busyLabel: 'E-posta dogrulaniyor...', error: null });
    try {
      const envelope = await verifyEmailCode(email, code);
      applyEnvelopeSession(envelope, set);
      set({ pendingVerification: null });
      return true;
    } catch (error) {
      set({
        error: toAppError(error, 'E-posta dogrulanamadi'),
        busyLabel: null,
      });
      return false;
    }
  },
  async verifyEmailWithToken(token) {
    set({ busyLabel: 'Dogrulama baglantisi isleniyor...', error: null });
    try {
      const envelope = await verifyEmailToken(token);
      applyEnvelopeSession(envelope, set);
      set({ pendingVerification: null });
      return true;
    } catch (error) {
      set({
        error: toAppError(error, 'Dogrulama baglantisi gecersiz'),
        busyLabel: null,
      });
      return false;
    }
  },
  async resendEmailCode(email) {
    set({ busyLabel: 'Dogrulama e-postasi gonderiliyor...', error: null });
    try {
      await resendVerificationCode(email);
      set({ busyLabel: null });
      return true;
    } catch (error) {
      set({
        error: toAppError(error, 'Dogrulama e-postasi gonderilemedi'),
        busyLabel: null,
      });
      return false;
    }
  },
  async sendPhoneCode(phone) {
    set({ busyLabel: 'SMS kodu gonderiliyor...', error: null });
    try {
      await sendSmsCode(phone);
      set({ busyLabel: null });
      return true;
    } catch (error) {
      set({
        error: toAppError(error, 'SMS kodu gonderilemedi'),
        busyLabel: null,
      });
      return false;
    }
  },
  async verifyPhoneCode(code, phone) {
    set({ busyLabel: 'SMS kodu dogrulaniyor...', error: null });
    try {
      await verifySmsCode(code, phone);
      const envelope = await fetchBootstrap();
      applyEnvelopeSession(envelope, set);
      set({ pendingVerification: null });
      return true;
    } catch (error) {
      set({
        error: toAppError(error, 'SMS kodu dogrulanamadi'),
        busyLabel: null,
      });
      return false;
    }
  },
  async refreshSnapshot() {
    set({ busyLabel: 'Akis guncelleniyor...', error: null });
    try {
      const envelope = await fetchBootstrap();
      applyEnvelopeSession(envelope, set);
    } catch (error) {
      set({
        error: toAppError(error, 'Veriler guncellenemedi'),
        busyLabel: null,
      });
    }
  },
  async followHandle(handle) {
    set({ busyLabel: 'Takip bilgisi guncelleniyor...', error: null });
    try {
      const envelope = await toggleFollow(handle);
      applyEnvelopeSession(envelope, set);
    } catch (error) {
      set({
        error: toAppError(error, 'Takip islemi tamamlanamadi'),
        busyLabel: null,
      });
    }
  },
  async fetchPublicProfile(handle) {
    const normalizedHandle = handle.trim().replace(/^@/, '');
    if (!normalizedHandle) {
      return null;
    }

    const existing = get().publicProfiles[normalizedHandle];
    if (existing) {
      return existing;
    }

    set({ busyLabel: 'Profil getiriliyor...', error: null });
    try {
      const response = await getPublicProfile(normalizedHandle);
      const payload = {
        profile: (response as unknown as { profile: PublicProfilePayload['profile'] }).profile,
        posts: (response as unknown as { posts: PublicProfilePayload['posts'] }).posts || [],
        listings: (response as unknown as { listings: PublicProfilePayload['listings'] }).listings || [],
        followers: (response as unknown as { followers: PublicProfilePayload['followers'] }).followers || [],
        following: (response as unknown as { following: PublicProfilePayload['following'] }).following || [],
      };
      set((state) => ({
        publicProfiles: {
          ...state.publicProfiles,
          [normalizedHandle]: payload,
        },
        busyLabel: null,
      }));
      return payload;
    } catch (error) {
      set({
        error: toAppError(error, 'Profil acilamadi'),
        busyLabel: null,
      });
      return null;
    }
  },
  setSnapshot(snapshot) {
    set({ snapshot });
  },
  setPendingVerification(value) {
    set({ pendingVerification: value });
  },
  async logout() {
    set({ busyLabel: 'Cikis yapiliyor...', error: null });
    try {
      await logoutUser();
    } catch {
      // ignore
    }
    await clearPersistedToken();
    set({
      status: 'guest',
      snapshot: null,
      pendingVerification: null,
      busyLabel: null,
    });
  },
}));
