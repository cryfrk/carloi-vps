import type { DesktopWindowDefinition } from '@carloi-v3/admin-core';

export const adminDesktopWindows: readonly DesktopWindowDefinition[] = [
  {
    id: 'main-console',
    title: 'Carloi Admin Console',
    defaultWidth: 1600,
    defaultHeight: 980,
    panelKeys: ['dashboard', 'users', 'commercial', 'insurance', 'listings', 'posts', 'messages', 'payments']
  },
  {
    id: 'document-review',
    title: 'Belge Inceleme',
    defaultWidth: 1280,
    defaultHeight: 900,
    panelKeys: ['commercial', 'insurance', 'invoices']
  },
  {
    id: 'system-admin',
    title: 'Sistem ve Admin Yonetimi',
    defaultWidth: 1240,
    defaultHeight: 860,
    panelKeys: ['settings', 'admin-users']
  }
] as const;
