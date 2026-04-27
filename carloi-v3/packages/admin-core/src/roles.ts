import type { AdminPanelDefinition, AdminPermissionKey, AdminRoleDefinition, AdminRoleKey } from './types.js';

export const adminRoles: readonly AdminRoleDefinition[] = [
  {
    key: 'super-admin',
    title: 'Super Admin',
    description: 'Tum paneller, roller, finans, ticari ve audit alanlari icin tam yetki.',
    backendRoleCandidates: ['super_admin'],
    permissions: ['*']
  },
  {
    key: 'insurance-admin',
    title: 'Sigorta Admini',
    description: 'Sigorta talebi, teklif, police ve surec bildirimi operasyonlarini yonetir.',
    backendRoleCandidates: ['billing_admin', 'ops_admin'],
    permissions: [
      'dashboard.read',
      'insurance.read',
      'insurance.write',
      'insurance.quote.upload',
      'insurance.invoice.upload',
      'insurance.notify',
      'payments.read',
      'payments.review',
      'invoices.read',
      'invoices.write'
    ]
  },
  {
    key: 'commercial-admin',
    title: 'Ticari Hesap Admini',
    description: 'Ticari basvurulari, belgeleri, eksik belge taleplerini ve onay/red surecini yonetir.',
    backendRoleCandidates: ['compliance_admin'],
    permissions: [
      'dashboard.read',
      'commercial.read',
      'commercial.review',
      'commercial.approve',
      'commercial.reject',
      'commercial.request_missing_document',
      'users.read',
      'users.detail.read'
    ]
  },
  {
    key: 'user-admin',
    title: 'Kullanici Admini',
    description: 'Kullanici profili, hesap durumu, ban, uyari ve kisit aksiyonlarini yonetir.',
    backendRoleCandidates: ['support_admin', 'compliance_admin'],
    permissions: [
      'dashboard.read',
      'users.read',
      'users.detail.read',
      'users.enforce',
      'messages.read'
    ]
  },
  {
    key: 'moderation-admin',
    title: 'Moderasyon Admini',
    description: 'Ilanlar, gonderiler ve raporlanan iceriklerin moderasyonundan sorumludur.',
    backendRoleCandidates: ['moderation_admin'],
    permissions: [
      'dashboard.read',
      'listings.read',
      'listings.moderate',
      'posts.read',
      'posts.moderate',
      'messages.read'
    ]
  },
  {
    key: 'finance-admin',
    title: 'Finans Admini',
    description: 'Odeme, finans, fatura ve islem kayitlarini yonetir.',
    backendRoleCandidates: ['billing_admin', 'legal_export_admin'],
    permissions: [
      'dashboard.read',
      'payments.read',
      'payments.review',
      'invoices.read',
      'invoices.write',
      'insurance.read',
      'audit.read'
    ]
  },
  {
    key: 'support-admin',
    title: 'Destek Admini',
    description: 'Kullanici destek taleplerini, mesaj/sikayet akislarini ve eskalasyonlari yonetir.',
    backendRoleCandidates: ['support_admin'],
    permissions: [
      'dashboard.read',
      'users.read',
      'users.detail.read',
      'messages.read',
      'messages.escalate'
    ]
  }
] as const;

export function hasAdminPermission(
  permissions: readonly AdminPermissionKey[] | readonly ['*'],
  permission: AdminPermissionKey
): boolean {
  if (permissions[0] === '*') {
    return true;
  }

  return (permissions as readonly AdminPermissionKey[]).some((entry) => entry === permission);
}

export function roleCanAccessPanel(roleKey: AdminRoleKey, panel: AdminPanelDefinition): boolean {
  return panel.allowedRoles.includes(roleKey);
}

export function getRoleDefinition(roleKey: AdminRoleKey): AdminRoleDefinition | undefined {
  return adminRoles.find((role) => role.key === roleKey);
}
