import type { AdminAuditActionRecord, AdminSession } from './types.js';

export type AdminAuthPhase =
  | 'username-password'
  | 'awaiting-2fa'
  | 'authenticated'
  | 'locked'
  | 'expired';

export interface AdminAuthPolicy {
  requiresTwoFactorForAllAdmins: boolean;
  supportsStepUpForSensitiveActions: boolean;
  passwordRotationDays: number;
}

export const defaultAdminAuthPolicy: AdminAuthPolicy = {
  requiresTwoFactorForAllAdmins: false,
  supportsStepUpForSensitiveActions: true,
  passwordRotationDays: 90
};

export const sensitiveAdminActionsRequiringReason = [
  'commercial.reject',
  'commercial.request_missing_document',
  'users.enforce',
  'listings.moderate',
  'posts.moderate',
  'insurance.quote.upload',
  'insurance.invoice.upload',
  'payments.review',
  'settings.write',
  'admins.write'
] as const;

export function needsTwoFactorChallenge(session: Pick<AdminSession, 'twoFactorEnabled' | 'twoFactorVerified'>): boolean {
  return session.twoFactorEnabled && !session.twoFactorVerified;
}

export function createAdminAuditActionRecord(
  input: Omit<AdminAuditActionRecord, 'id' | 'createdAt'>
): AdminAuditActionRecord {
  return {
    ...input,
    id: `audit_${Date.now()}`,
    createdAt: new Date().toISOString()
  };
}
