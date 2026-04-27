export type LegalDocument = {
  id: string;
  title: string;
  required: boolean;
  audience: 'all' | 'commercial';
  version: string;
  updatedAt: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
};

export const legalConsentItems: LegalDocument[] = [
  {
    id: 'terms_of_service',
    title: 'Kullanici Sozlesmesi',
    required: true,
    audience: 'all',
    version: '2026-04',
    updatedAt: '26 Nisan 2026',
    sections: [
      {
        heading: 'Platform rolu',
        paragraphs: [
          'Carloi, kullanicilarin arac odakli gonderi paylasabildigi, ilan yayinlayabildigi, mesajlasabildigi ve araca iliskin dijital servislerden yararlanabildigi bir araci hizmet platformudur.',
          'Carloi, kullanicilar arasindaki satis, takas, teklif, ekspertiz, sigorta, noter, teslim veya benzeri islemlerin dogrudan tarafi degildir; ilgili islem ancak ayrica acikca belirtildigi durumda Carloi servis kosullari kapsaminda desteklenir.',
        ],
      },
      {
        heading: 'Kullanici yukumlulukleri',
        paragraphs: [
          'Kullanici, hesabina ekledigi kimlik, iletisim, ruhsat, temsil yetkisi, fiyat, kilometre, hasar, ekspertiz ve ilan bilgilerinin dogrulugundan bizzat sorumludur.',
          'Sahte ilan, dolandiricilik, yaniltici bilgi, ucuncu kisi hakki ihlali, marka-telif ihlali ve izinsiz fotograf kullanimi kullanicinin kendi sorumlulugundadir.',
        ],
      },
      {
        heading: 'Kotuye kullanim ve hesap yaptirimlari',
        paragraphs: [
          'Carloi; guvenlik, mevzuat uyumu, dolandiricilik onleme ve 6563 sayili mevzuata uyum amaciyla icerik kaldirma, hesap kisitlama, gecici askiya alma ve kalici kapatma yetkisini sakli tutar.',
          'Guvenlik, uyusmazlik ve denetim amaclariyla log, islem kaydi ve teknik olay kayitlari tutulabilir.',
        ],
      },
    ],
  },
  {
    id: 'kvkk_privacy',
    title: 'KVKK Aydinlatma Metni ve Gizlilik Politikasi',
    required: true,
    audience: 'all',
    version: '2026-04',
    updatedAt: '26 Nisan 2026',
    sections: [
      {
        heading: 'Veri sorumlusu ve isleme amaclari',
        paragraphs: [
          'Carloi; hesap olusturma, kimlik dogrulama, ilan ve gonderi yonetimi, mesajlasma, guvenli islem, destek, guvenlik, dolandiricilik onleme ve yasal yukumluluklerin yerine getirilmesi amaclariyla kisisel verileri isler.',
          'Islenen veriler; kimlik ve iletisim bilgileri, kullanim kayitlari, cihaz kayitlari, mesajlasma verileri, ilan icerigi, yuklenen belgeler ve arac verileri ile sinirlidir.',
        ],
      },
      {
        heading: 'Aktarim ve toplama yontemi',
        paragraphs: [
          'Veriler; mevzuatin izin verdigi olcude barindirma, bildirim, e-posta, SMS, odeme, sigorta, dogrulama ve destek altyapilarina aktarilabilir.',
          'Veriler; mobil uygulama, web arayuzu, API, formlar, belge yukleme alanlari ve otomatik loglama mekanizmalari uzerinden toplanir.',
        ],
      },
      {
        heading: 'Ilgili kisi haklari',
        paragraphs: [
          'Kullanici, KVKK kapsamindaki erisim, duzeltme, silme, islemeyi kisitlama, itiraz ve bilgi talebi haklarini ilgili mevzuat sinirlari icinde kullanabilir.',
          'Bu metin hukuki taslaktir; canli metinlerin hukuk danismani tarafindan son kontrole tabi tutulmasi gerekir.',
        ],
      },
    ],
  },
  {
    id: 'privacy_policy',
    title: 'Gizlilik Politikasi',
    required: true,
    audience: 'all',
    version: '2026-04',
    updatedAt: '26 Nisan 2026',
    sections: [
      {
        heading: 'Profil ve gorunurluk',
        paragraphs: [
          'Profil gorunurlugu, garaj gorunurlugu ve plaka gizleme gibi ayarlar kullanici tercihine gore sinirlandirilabilir.',
          'Kullanici tarafindan herkese acik paylasilan icerikler, ilanlar ve secili profil alanlari platform icinde diger kullanicilar tarafindan gorulebilir.',
        ],
      },
      {
        heading: 'Guvenlik',
        paragraphs: [
          'Carloi, hesap guvenligi, oturum yonetimi, iki adimli dogrulama ve suistimal tespiti gibi kontroller uygulayabilir.',
          'Guvenlik amacli loglama yapilmasi, kullanicinin teknik ve hukuki haklarini ortadan kaldirmaz.',
        ],
      },
    ],
  },
  {
    id: 'explicit_consent',
    title: 'Acik Riza Metni',
    required: true,
    audience: 'all',
    version: '2026-04',
    updatedAt: '26 Nisan 2026',
    sections: [
      {
        heading: 'Acik riza kapsaminda islemeler',
        paragraphs: [
          'Acik riza verilmesi halinde Carloi, kullanicinin ilgi alanina uygun arac, ilan ve icerik onerileri ile platform iyilestirme analizleri yapabilir.',
          'AI destekli ozetler, arac yorumlari ve karsilastirma ciktlari tavsiye niteligindedir; ekspertiz, teknik servis veya baglayici mali teklif yerine gecmez.',
        ],
      },
    ],
  },
  {
    id: 'listing_rules',
    title: 'Ilan Yayinlama Kurallari',
    required: true,
    audience: 'all',
    version: '2026-04',
    updatedAt: '26 Nisan 2026',
    sections: [
      {
        heading: 'Ilan dogrulugu',
        paragraphs: [
          'Ilan sahibi; arac durumu, fiyat, km, boya-degisen, hasar, ruhsat, temsil yetkisi ve satisa konu diger tum bilgilerin dogrulugundan sorumludur.',
          'Eksik, sahte, manipule veya mevzuata aykiri ilanlar kaldirilabilir; ilgili hesap gecici veya kalici olarak kisitlanabilir.',
        ],
      },
    ],
  },
  {
    id: 'commercial_undertaking',
    title: 'Ticari Kullanici Taahhutnamesi',
    required: true,
    audience: 'commercial',
    version: '2026-04',
    updatedAt: '26 Nisan 2026',
    sections: [
      {
        heading: 'Belge ve mevzuat uyumu',
        paragraphs: [
          'Ticari kullanici; firma, yetkili kisi, VKN/TCKN, vergi dairesi ve belge bilgilerinin guncel ve dogru oldugunu kabul eder.',
          'Ticari rozet, ticari ilan ve kurumsal ozellikler ancak admin onayi sonrasinda aktiflesir.',
        ],
      },
    ],
  },
  {
    id: 'vehicle_listing_responsibility',
    title: 'Arac Ilani Sorumluluk Beyani',
    required: true,
    audience: 'all',
    version: '2026-04',
    updatedAt: '26 Nisan 2026',
    sections: [
      {
        heading: 'Sorumluluk beyani',
        paragraphs: [
          'Kullanici, ilana konu aracin hukuki sahibi oldugunu veya ilan verme konusunda yetkili bulundugunu beyan eder.',
          'Araca ait fotograflar, videolar, ruhsat ve teknik bilgiler uzerinde ucuncu kisi hakki ihlali bulunmamasi kullanicinin sorumlulugundadir.',
        ],
      },
    ],
  },
  {
    id: 'messaging_safe_trade',
    title: 'Mesajlasma ve Guvenli Islem Bilgilendirmesi',
    required: true,
    audience: 'all',
    version: '2026-04',
    updatedAt: '26 Nisan 2026',
    sections: [
      {
        heading: 'Mesajlasma ve odeme akisi',
        paragraphs: [
          'Mesajlasma alani kullanici ile alici-satici arasindaki iletisim icindir; Carloi mesaj icerigini guvenlik, uyusmazlik ve mevzuat amaclariyla kayit altina alabilir.',
          'Guvenli islem, sigorta ve odeme adimlari platform icinde yonlendirici destek saglayabilir; nihai ticari ve hukuki sorumluluk isleme taraf kullanicilara aittir.',
        ],
      },
    ],
  },
  {
    id: 'marketing_optional',
    title: 'Ticari Elektronik Ileti ve Kampanya Onayi',
    required: false,
    audience: 'all',
    version: '2026-04',
    updatedAt: '26 Nisan 2026',
    sections: [
      {
        heading: 'Opsiyonel iletisim izni',
        paragraphs: [
          'Bu onay zorunlu degildir. Kabul edilmesi halinde Carloi size kampanya, duyuru ve platform guncellemeleri gonderebilir.',
          'Onay istediginiz zaman ayarlar ekranindan geri alinabilir.',
        ],
      },
    ],
  },
];

export function getLegalDocuments(accountType: 'individual' | 'commercial') {
  return legalConsentItems.filter((item) => item.audience === 'all' || accountType === 'commercial');
}

export function buildConsentPayload(
  acceptedDocumentIds: string[],
  accountType: 'individual' | 'commercial',
) {
  const allowedDocuments = getLegalDocuments(accountType);
  const acceptedSet = new Set(acceptedDocumentIds);

  return allowedDocuments
    .filter((item) => item.required || acceptedSet.has(item.id))
    .map((item) => ({
      type: item.id,
      accepted: acceptedSet.has(item.id),
      version: item.version,
      sourceScreen: 'mobile_v2_register',
    }));
}
