import { adminMobileNavigation, adminPanels, roleCanAccessPanel } from '@carloi-v3/admin-core';
import type { AdminRoleKey, MobileCriticalScreenDefinition } from '@carloi-v3/admin-core';

export interface AdminMobileTabDefinition {
  key: string;
  label: string;
  panelKey: string;
}

export const adminMobileTabs: readonly AdminMobileTabDefinition[] = adminMobileNavigation
  .filter((item) => item.primary)
  .map((item) => ({
    key: item.panelKey,
    label: item.label,
    panelKey: item.panelKey
  }));

export const mobileCriticalScreens: readonly MobileCriticalScreenDefinition[] = [
  {
    id: 'mobile-dashboard',
    title: 'Dashboard',
    panelKey: 'dashboard',
    description: 'Kritik kuyruklar ve rol bazli ozetler.'
  },
  {
    id: 'mobile-commercial-review',
    title: 'Ticari inceleme',
    panelKey: 'commercial',
    description: 'Belge goruntuleme, onay, red ve eksik belge talebi.'
  },
  {
    id: 'mobile-insurance-review',
    title: 'Sigorta istekleri',
    panelKey: 'insurance',
    description: 'Teklif, odeme ve fatura sureci takibi.'
  },
  {
    id: 'mobile-user-actions',
    title: 'Kullanici aksiyonlari',
    panelKey: 'users',
    description: 'Uyari, ban ve gecici kisit gibi kritik islemler.'
  },
  {
    id: 'mobile-messages',
    title: 'Mesaj ve sikayet',
    panelKey: 'messages',
    description: 'Raporlanan mesajlar ve destek eskalasyonlari.'
  }
] as const;

export function getVisibleMobileTabs(roles: readonly AdminRoleKey[]) {
  return adminMobileNavigation.filter((item) => {
    const panel = adminPanels.find((entry) => entry.key === item.panelKey);
    return panel ? roles.some((role) => roleCanAccessPanel(role, panel)) : false;
  });
}
