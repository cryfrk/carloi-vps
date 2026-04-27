import type { AdminDashboardWidgetDefinition, AdminNavigationItem, AdminPanelDefinition, AdminPanelKey } from './types.js';

export const adminPanels: readonly AdminPanelDefinition[] = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    description: 'Gunluk kullanici, aktif ilan, bekleyen is ve kritik uyarilarin ozet ekranidir.',
    desktopRoute: '/dashboard',
    mobileRoute: '/dashboard',
    allowedRoles: [
      'super-admin',
      'insurance-admin',
      'commercial-admin',
      'user-admin',
      'moderation-admin',
      'finance-admin',
      'support-admin'
    ],
    requiredPermissions: ['dashboard.read'],
    supportsDesktop: true,
    supportsMobile: true,
    criticalActions: []
  },
  {
    key: 'users',
    title: 'Kullanicilar',
    description: 'Profil, ilan, gonderi, garaj, OBD ve hesap durumu denetimi.',
    desktopRoute: '/users',
    mobileRoute: '/users',
    allowedRoles: ['super-admin', 'user-admin', 'support-admin', 'commercial-admin'],
    requiredPermissions: ['users.read'],
    supportsDesktop: true,
    supportsMobile: true,
    criticalActions: ['Uyari ver', 'Banla', 'Gecici kisit uygula']
  },
  {
    key: 'commercial',
    title: 'Ticari Basvurular',
    description: 'Belge goruntuleme, onay, red, eksik belge talebi ve admin notlari.',
    desktopRoute: '/commercial',
    mobileRoute: '/commercial',
    allowedRoles: ['super-admin', 'commercial-admin'],
    requiredPermissions: ['commercial.read'],
    supportsDesktop: true,
    supportsMobile: true,
    criticalActions: ['Onayla', 'Reddet', 'Eksik belge iste']
  },
  {
    key: 'insurance',
    title: 'Sigorta Istekleri',
    description: 'Alici, satici, ruhsat, teklif PDF, odeme ve fatura sureci yonetimi.',
    desktopRoute: '/insurance',
    mobileRoute: '/insurance',
    allowedRoles: ['super-admin', 'insurance-admin', 'finance-admin'],
    requiredPermissions: ['insurance.read'],
    supportsDesktop: true,
    supportsMobile: true,
    criticalActions: ['Teklif yukle', 'Odeme kontrol et', 'Fatura yukle', 'Bildirim gonder']
  },
  {
    key: 'listings',
    title: 'Ilanlar',
    description: 'Ilan listesi, detay, gizleme, silme ve mevzuat kontrolu.',
    desktopRoute: '/listings',
    mobileRoute: '/listings',
    allowedRoles: ['super-admin', 'moderation-admin', 'commercial-admin'],
    requiredPermissions: ['listings.read'],
    supportsDesktop: true,
    supportsMobile: true,
    criticalActions: ['Gizle', 'Reddet', 'Geri ac']
  },
  {
    key: 'posts',
    title: 'Gonderiler',
    description: 'Gonderi listesi, yorumlar, raporlar ve icerik moderasyonu.',
    desktopRoute: '/posts',
    mobileRoute: '/posts',
    allowedRoles: ['super-admin', 'moderation-admin'],
    requiredPermissions: ['posts.read'],
    supportsDesktop: true,
    supportsMobile: true,
    criticalActions: ['Kaldir', 'Geri ac', 'Raporu kapat']
  },
  {
    key: 'messages',
    title: 'Mesaj ve Sikayetler',
    description: 'Raporlanan mesajlar, destek talepleri ve eskalasyon akislarinin yonetimi.',
    desktopRoute: '/messages',
    mobileRoute: '/messages',
    allowedRoles: ['super-admin', 'support-admin', 'user-admin', 'moderation-admin'],
    requiredPermissions: ['messages.read'],
    supportsDesktop: true,
    supportsMobile: true,
    criticalActions: ['Eskalasyon', 'Kanit iste', 'Destek notu ekle']
  },
  {
    key: 'payments',
    title: 'Odemeler',
    description: 'Garanti Sanal POS islem kayitlari ve odeme sonucu izleme.',
    desktopRoute: '/payments',
    mobileRoute: '/payments',
    allowedRoles: ['super-admin', 'finance-admin', 'insurance-admin'],
    requiredPermissions: ['payments.read'],
    supportsDesktop: true,
    supportsMobile: true,
    criticalActions: ['Islem incele', 'Finans notu ekle']
  },
  {
    key: 'invoices',
    title: 'Faturalar',
    description: 'Fatura PDF yukleme, metadata guncelleme ve teslim durumunu takip etme.',
    desktopRoute: '/invoices',
    mobileRoute: '/invoices',
    allowedRoles: ['super-admin', 'finance-admin', 'insurance-admin'],
    requiredPermissions: ['invoices.read'],
    supportsDesktop: true,
    supportsMobile: false,
    criticalActions: ['Fatura yukle', 'Yeniden gonder']
  },
  {
    key: 'settings',
    title: 'Sistem Ayarlari',
    description: 'Rol, yetki ve sistem parametrelerini yoneten panel.',
    desktopRoute: '/settings',
    mobileRoute: '/settings',
    allowedRoles: ['super-admin', 'finance-admin'],
    requiredPermissions: ['settings.read'],
    supportsDesktop: true,
    supportsMobile: false,
    criticalActions: ['Yetki guncelle', 'Parametre degistir']
  },
  {
    key: 'admin-users',
    title: 'Admin Kullanici',
    description: 'Admin hesaplari, roller ve 2FA hazirlik durumu yonetimi.',
    desktopRoute: '/admins',
    mobileRoute: '/admins',
    allowedRoles: ['super-admin'],
    requiredPermissions: ['admins.read'],
    supportsDesktop: true,
    supportsMobile: false,
    criticalActions: ['Rol ata', 'Admin kapat', '2FA zorunlu yap']
  }
] as const;

export const adminDashboardWidgets: readonly AdminDashboardWidgetDefinition[] = [
  { id: 'daily-users', title: 'Gunluk kullanici', metricKey: 'dailyUsers', panelKey: 'dashboard', allowedRoles: ['super-admin', 'user-admin', 'support-admin'] },
  { id: 'active-listings', title: 'Aktif ilan', metricKey: 'activeListings', panelKey: 'listings', allowedRoles: ['super-admin', 'moderation-admin', 'commercial-admin'] },
  { id: 'commercial-queue', title: 'Yeni ticari basvuru', metricKey: 'newCommercialApplications', panelKey: 'commercial', allowedRoles: ['super-admin', 'commercial-admin'] },
  { id: 'insurance-queue', title: 'Bekleyen sigorta istegi', metricKey: 'pendingInsuranceRequests', panelKey: 'insurance', allowedRoles: ['super-admin', 'insurance-admin', 'finance-admin'] },
  { id: 'reported-content', title: 'Raporlanan icerikler', metricKey: 'reportedContent', panelKey: 'posts', allowedRoles: ['super-admin', 'moderation-admin'] },
  { id: 'payment-exceptions', title: 'Odeme istisnalari', metricKey: 'paymentExceptions', panelKey: 'payments', allowedRoles: ['super-admin', 'finance-admin', 'insurance-admin'] }
] as const;

export const adminDesktopNavigation: readonly AdminNavigationItem[] = [
  { panelKey: 'dashboard', label: 'Dashboard', surface: 'desktop', primary: true },
  { panelKey: 'users', label: 'Kullanicilar', surface: 'desktop', primary: true },
  { panelKey: 'commercial', label: 'Ticari basvurular', surface: 'desktop', primary: true },
  { panelKey: 'insurance', label: 'Sigorta istekleri', surface: 'desktop', primary: true },
  { panelKey: 'listings', label: 'Ilanlar', surface: 'desktop', primary: true },
  { panelKey: 'posts', label: 'Gonderiler', surface: 'desktop', primary: true },
  { panelKey: 'messages', label: 'Mesaj / sikayetler', surface: 'desktop', primary: true },
  { panelKey: 'payments', label: 'Odemeler', surface: 'desktop', primary: true },
  { panelKey: 'invoices', label: 'Faturalar', surface: 'desktop', primary: false },
  { panelKey: 'settings', label: 'Sistem ayarlari', surface: 'desktop', primary: false },
  { panelKey: 'admin-users', label: 'Admin kullanici', surface: 'desktop', primary: false }
] as const;

export const adminMobileNavigation: readonly AdminNavigationItem[] = [
  { panelKey: 'dashboard', label: 'Dashboard', surface: 'mobile', primary: true },
  { panelKey: 'commercial', label: 'Ticari', surface: 'mobile', primary: true },
  { panelKey: 'insurance', label: 'Sigorta', surface: 'mobile', primary: true },
  { panelKey: 'messages', label: 'Sikayetler', surface: 'mobile', primary: true },
  { panelKey: 'users', label: 'Kullanicilar', surface: 'mobile', primary: true },
  { panelKey: 'listings', label: 'Ilanlar', surface: 'mobile', primary: false },
  { panelKey: 'posts', label: 'Gonderiler', surface: 'mobile', primary: false },
  { panelKey: 'payments', label: 'Odemeler', surface: 'mobile', primary: false }
] as const;

export function getPanelDefinition(panelKey: AdminPanelKey): AdminPanelDefinition | undefined {
  return adminPanels.find((panel) => panel.key === panelKey);
}
