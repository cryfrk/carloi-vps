export type AdminRoleKey =
  | 'super-admin'
  | 'insurance-admin'
  | 'commercial-admin'
  | 'user-admin'
  | 'moderation-admin'
  | 'finance-admin'
  | 'support-admin';

export type BackendAdminRoleKey =
  | 'super_admin'
  | 'compliance_admin'
  | 'moderation_admin'
  | 'support_admin'
  | 'billing_admin'
  | 'analytics_admin'
  | 'legal_export_admin'
  | 'ops_admin';

export type AdminPanelKey =
  | 'dashboard'
  | 'users'
  | 'commercial'
  | 'insurance'
  | 'listings'
  | 'posts'
  | 'messages'
  | 'payments'
  | 'invoices'
  | 'settings'
  | 'admin-users';

export type AdminPermissionKey =
  | 'dashboard.read'
  | 'users.read'
  | 'users.detail.read'
  | 'users.enforce'
  | 'commercial.read'
  | 'commercial.review'
  | 'commercial.approve'
  | 'commercial.reject'
  | 'commercial.request_missing_document'
  | 'insurance.read'
  | 'insurance.write'
  | 'insurance.quote.upload'
  | 'insurance.invoice.upload'
  | 'insurance.notify'
  | 'listings.read'
  | 'listings.moderate'
  | 'posts.read'
  | 'posts.moderate'
  | 'messages.read'
  | 'messages.escalate'
  | 'payments.read'
  | 'payments.review'
  | 'invoices.read'
  | 'invoices.write'
  | 'settings.read'
  | 'settings.write'
  | 'admins.read'
  | 'admins.write'
  | 'audit.read'
  | 'audit.write';

export type AdminSurface = 'desktop' | 'mobile';

export interface AdminRoleDefinition {
  key: AdminRoleKey;
  title: string;
  description: string;
  backendRoleCandidates: BackendAdminRoleKey[];
  permissions: readonly AdminPermissionKey[] | readonly ['*'];
}

export interface AdminPanelDefinition {
  key: AdminPanelKey;
  title: string;
  description: string;
  desktopRoute: string;
  mobileRoute: string;
  allowedRoles: readonly AdminRoleKey[];
  requiredPermissions: readonly AdminPermissionKey[];
  supportsDesktop: boolean;
  supportsMobile: boolean;
  criticalActions: readonly string[];
}

export interface AdminNavigationItem {
  panelKey: AdminPanelKey;
  label: string;
  surface: AdminSurface;
  primary: boolean;
}

export interface AdminDashboardWidgetDefinition {
  id: string;
  title: string;
  metricKey: string;
  panelKey: AdminPanelKey;
  allowedRoles: readonly AdminRoleKey[];
}

export interface AdminSession {
  adminId: string;
  username: string;
  displayName: string;
  roles: AdminRoleKey[];
  backendRoles: BackendAdminRoleKey[];
  permissions: AdminPermissionKey[] | ['*'];
  sessionId: string;
  twoFactorEnabled: boolean;
  twoFactorVerified: boolean;
  issuedAt: string;
  expiresAt: string;
}

export interface AdminLoginPayload {
  username: string;
  password: string;
  otpCode?: string;
}

export interface AdminAuditActionRecord {
  id: string;
  adminId: string;
  actionKey: string;
  panelKey: AdminPanelKey;
  entityType: string;
  entityId: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface AdminEndpointDefinition {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  panelKey: AdminPanelKey | 'auth' | 'audit' | 'notifications';
  status: 'available' | 'missing' | 'needs-contract';
  notes: string;
}

export interface DesktopWindowDefinition {
  id: string;
  title: string;
  defaultWidth: number;
  defaultHeight: number;
  panelKeys: AdminPanelKey[];
}

export interface MobileCriticalScreenDefinition {
  id: string;
  title: string;
  panelKey: AdminPanelKey;
  description: string;
}
