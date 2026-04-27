import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { AppSnapshot, AuthResult } from '@carloi/v2-shared';

const TOKEN_KEY = 'carloi_v2_token';

type ApiStatus = 'idle' | 'checking' | 'online' | 'offline' | 'degraded';

interface SessionState {
  token: string | null;
  snapshot: AppSnapshot | null;
  pendingAuth: AuthResult | null;
  hydrated: boolean;
  bootstrapping: boolean;
  apiStatus: ApiStatus;
  apiMessage: string;
  setSession: (payload: { token?: string | null; snapshot?: AppSnapshot | null }) => Promise<void>;
  setPendingAuth: (payload: AuthResult | null) => void;
  setSnapshot: (snapshot: AppSnapshot | null) => void;
  setBootstrapping: (bootstrapping: boolean) => void;
  setApiState: (payload: { status: ApiStatus; message?: string }) => void;
  hydrate: () => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  snapshot: null,
  pendingAuth: null,
  hydrated: false,
  bootstrapping: false,
  apiStatus: 'idle',
  apiMessage: '',
  setSession: async ({ token, snapshot }) => {
    if (typeof token !== 'undefined') {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    }

    set((state) => ({
      token: typeof token === 'undefined' ? state.token : token || null,
      snapshot: typeof snapshot === 'undefined' ? state.snapshot : snapshot || null,
      pendingAuth: null,
      apiStatus: 'online',
      apiMessage: '',
    }));
  },
  setPendingAuth: (pendingAuth) => set({ pendingAuth }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setBootstrapping: (bootstrapping) => set({ bootstrapping }),
  setApiState: ({ status, message }) =>
    set({
      apiStatus: status,
      apiMessage: message || '',
    }),
  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token: token || null, hydrated: true });
  },
  clearSession: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({
      token: null,
      snapshot: null,
      pendingAuth: null,
      bootstrapping: false,
      apiStatus: 'idle',
      apiMessage: '',
    });
  },
}));
