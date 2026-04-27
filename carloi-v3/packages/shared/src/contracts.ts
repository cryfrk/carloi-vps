export type VerificationChannel = 'email' | 'phone';
export type NetworkFailureKind =
  | 'timeout'
  | 'offline'
  | 'unauthorized'
  | 'api_unavailable'
  | 'upload_invalid'
  | 'unknown';

export interface BackendEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  token?: string;
  data?: T;
  snapshot?: Record<string, unknown>;
  url?: string;
  emailDisabled?: boolean;
  emailNotConfigured?: boolean;
  smsDisabled?: boolean;
  smsNotConfigured?: boolean;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  handle: string;
  password: string;
  accountType: 'individual' | 'commercial';
  primaryChannel: VerificationChannel;
  email?: string;
  phone?: string;
  bio?: string;
  consents: Array<{
    type: string;
    accepted?: boolean;
    version?: string;
    sourceScreen?: string;
  }>;
  commercialProfile?: Record<string, unknown>;
}

export interface UploadResult {
  url: string;
}

export interface HealthPayload {
  success: boolean;
  name: string;
  storageDriver: string;
  databaseMode: string;
}

export interface TokenStorage {
  getToken(): string | null | Promise<string | null>;
  setToken?(value: string | null): void | Promise<void>;
  clearToken?(): void | Promise<void>;
}
