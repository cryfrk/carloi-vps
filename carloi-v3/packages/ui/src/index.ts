export const designTokens = {
  colors: {
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    accent: '#0f9aa8',
    accentSoft: '#ecfeff',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#dc2626'
  },
  radius: {
    card: 24,
    pill: 999
  },
  spacing: {
    screen: 20,
    section: 16,
    compact: 12
  }
} as const;

export const consumerSidebarItems = [
  'Ana Sayfa',
  'Kesfet',
  'Ilanlar',
  'Mesajlar',
  'Bildirimler',
  'Garajim',
  'Ticari hesap',
  'Profil',
  'Ayarlar'
] as const;

export const mobilePrimaryTabs = [
  'Ana Sayfa',
  'Mesajlar',
  'Loi AI',
  'Garajim',
  'Profil'
] as const;
