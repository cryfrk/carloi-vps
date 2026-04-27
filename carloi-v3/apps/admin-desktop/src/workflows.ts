export interface AdminWorkflowStep {
  id: string;
  title: string;
  description: string;
  blocking: boolean;
}

export const insuranceWorkflow: readonly AdminWorkflowStep[] = [
  {
    id: 'deal-list',
    title: 'Istek listesi',
    description: 'Bekleyen sigorta talepleri kuyrukta gorunur.',
    blocking: true
  },
  {
    id: 'deal-detail',
    title: 'Talep detayi',
    description: 'Alici, satici, arac, ruhsat ve ilan bilgileri birlikte acilir.',
    blocking: true
  },
  {
    id: 'quote-upload',
    title: 'Teklif yukleme',
    description: 'PDF yuklenir ve teklif ucreti girilir.',
    blocking: true
  },
  {
    id: 'payment-watch',
    title: 'Odeme takibi',
    description: 'Garanti odeme durumu admin panelde izlenir.',
    blocking: true
  },
  {
    id: 'invoice-upload',
    title: 'Fatura yukleme',
    description: 'Odeme sonrasinda fatura PDF sisteme eklenir.',
    blocking: true
  },
  {
    id: 'delivery',
    title: 'Teslim ve bildirim',
    description: 'Kullaniciya bildirim ve mail gonderimi tetiklenir.',
    blocking: false
  }
] as const;

export const commercialWorkflow: readonly AdminWorkflowStep[] = [
  {
    id: 'review-list',
    title: 'Basvuru kuyrugu',
    description: 'Yeni ticari basvurular ve riskli profiller listelenir.',
    blocking: true
  },
  {
    id: 'document-review',
    title: 'Belge inceleme',
    description: 'Vergi levhasi, yetki belgesi ve diger dokumanlar kontrol edilir.',
    blocking: true
  },
  {
    id: 'decision',
    title: 'Karar',
    description: 'Onay, red veya eksik belge talebi verilir.',
    blocking: true
  },
  {
    id: 'admin-note',
    title: 'Admin notu',
    description: 'Karar gerekcesi ve ek risk notlari kayda gecilir.',
    blocking: false
  }
] as const;

export const userEnforcementWorkflow: readonly AdminWorkflowStep[] = [
  {
    id: 'user-profile',
    title: 'Kullanici detayi',
    description: 'Profil, ilanlar, gonderiler, garaj ve OBD ozetleri gorulur.',
    blocking: true
  },
  {
    id: 'action-select',
    title: 'Aksiyon secimi',
    description: 'Uyari, ban veya gecici kisit secilir.',
    blocking: true
  },
  {
    id: 'reason',
    title: 'Neden',
    description: 'Her zorlayici aksiyon icin gerekce zorunludur.',
    blocking: true
  },
  {
    id: 'audit-log',
    title: 'Audit kaydi',
    description: 'Islem merkezi audit log sistemine yazilir.',
    blocking: true
  }
] as const;
