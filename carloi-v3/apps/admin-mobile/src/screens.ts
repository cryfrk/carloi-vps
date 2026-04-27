export interface AdminMobileScreenContract {
  route: string;
  title: string;
  supportsOfflineQueue: boolean;
  primaryActions: readonly string[];
}

export const adminMobileScreenContracts: readonly AdminMobileScreenContract[] = [
  {
    route: 'DashboardScreen',
    title: 'Dashboard',
    supportsOfflineQueue: false,
    primaryActions: ['Kuyruga git', 'Detay ac']
  },
  {
    route: 'CommercialReviewScreen',
    title: 'Ticari Basvuru Detayi',
    supportsOfflineQueue: false,
    primaryActions: ['Onayla', 'Reddet', 'Eksik belge iste']
  },
  {
    route: 'InsuranceQueueScreen',
    title: 'Sigorta Kuyrugu',
    supportsOfflineQueue: false,
    primaryActions: ['Detay ac', 'Durum guncelle']
  },
  {
    route: 'InsuranceDetailScreen',
    title: 'Sigorta Talep Detayi',
    supportsOfflineQueue: false,
    primaryActions: ['PDF gor', 'Bildirim gonder']
  },
  {
    route: 'UserModerationScreen',
    title: 'Kullanici Aksiyonlari',
    supportsOfflineQueue: false,
    primaryActions: ['Uyari ver', 'Banla', 'Kisitla']
  },
  {
    route: 'MessagesReportScreen',
    title: 'Mesaj ve Sikayet',
    supportsOfflineQueue: false,
    primaryActions: ['Eskalasyon', 'Not ekle']
  }
] as const;
