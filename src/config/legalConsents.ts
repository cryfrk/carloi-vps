import { ConsentInput } from '../types';

// Not: Bu metinler ürün içi hukuki taslak olarak hazırlanmıştır.
// Canlıya çıkmadan önce Türkiye mevzuatı bakımından yetkin hukuk danışmanı tarafından gözden geçirilmelidir.

export const LEGAL_CONSENT_VERSION = '2026-04';
export const LEGAL_CONSENT_LAST_UPDATED = '24 Nisan 2026';
export const LEGAL_DRAFT_NOTICE =
  'Bu metin, Carloi ürün akışı için hazırlanmış hukuki taslaktır; yürürlüğe alınmadan önce avukat incelemesi yapılmalıdır.';

type SignupConsentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'content_responsibility'
  | 'marketing_optional';

interface LegalConsentSection {
  heading: string;
  bullets: string[];
}

interface SignupConsentDocument {
  type: SignupConsentType;
  required: boolean;
  checkboxLabel: string;
  helperText: string;
  title: string;
  linkLabel: string;
  version: string;
  lastUpdated: string;
  legalDraftNotice: string;
  sections: LegalConsentSection[];
}

const signupConsentDocuments: Record<SignupConsentType, SignupConsentDocument> = {
  terms_of_service: {
    type: 'terms_of_service',
    required: true,
    checkboxLabel: 'Kullanıcı Sözleşmesi’ni kabul ediyorum.',
    helperText: 'Carloi’nin platform rolünü, kullanıcı yükümlülüklerini ve hesap kurallarını inceleyebilirsin.',
    title: 'Kullanıcı Sözleşmesi',
    linkLabel: 'Sözleşmeyi görüntüle',
    version: LEGAL_CONSENT_VERSION,
    lastUpdated: LEGAL_CONSENT_LAST_UPDATED,
    legalDraftNotice: LEGAL_DRAFT_NOTICE,
    sections: [
      {
        heading: '1. Hizmetin kapsamı ve Carloi’nin rolü',
        bullets: [
          'Carloi; araç ilanları, sosyal akış, kullanıcı içerikleri, mesajlaşma, ticari hesap akışları, sigorta operasyon yönlendirmeleri ve analiz/AI destekli öneriler sunan bir dijital platformdur.',
          'Carloi, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamındaki yükümlülüklerine uygun şekilde aracı hizmet sağlayıcı niteliğinde hareket eder; aracın satıcısı, alıcısı, resmi eksperi, noterlik kurumu veya ödeme kuruluşu olarak hareket etmez.',
          'Platform üzerinde sunulan Loi AI ve benzeri analiz/öneri çıktıları yalnızca tavsiye niteliğindedir; resmi ekspertiz, hukuki görüş, mali tavsiye, garanti, doğrulama veya bağlayıcı fiyat tespiti yerine geçmez.',
        ],
      },
      {
        heading: '2. Üyelik, hesap güvenliği ve doğruluk yükümlülüğü',
        bullets: [
          'Kullanıcı; kayıt sırasında paylaştığı ad, kullanıcı adı, e-posta, ticari kimlik bilgileri ve diğer tüm hesap verilerinin doğru, güncel ve kendisine ait olduğunu beyan eder.',
          'Kullanıcı hesabının gizliliği, şifre güvenliği, cihaz erişimi ve hesap üzerinden yapılan işlemlerden kullanıcı sorumludur. Şüpheli erişim, yetkisiz kullanım veya güvenlik ihlali derhal Carloi’ye bildirilmelidir.',
          'Carloi, mevzuata uyum, güvenlik, sahtecilik önleme veya operasyonel gereklilikler sebebiyle ek doğrulama, belge talebi, geçici kısıtlama veya yeniden onay süreci uygulayabilir.',
        ],
      },
      {
        heading: '3. İlanlar, araç bilgileri ve kullanıcı beyanı',
        bullets: [
          'Araç durumu, kilometre, hasar geçmişi, fiyat, takas bilgisi, ruhsat bilgisi, fotoğraflar, temsil yetkisi ve satış yetkisine ilişkin tüm beyanların doğruluğu ilanı oluşturan kullanıcıya aittir.',
          'Kullanıcı; araç üzerinde satış, pazarlama veya ilan verme yetkisine sahip olduğunu, yanıltıcı fiyat, sahte ruhsat, sahte kimlik, taklit belge, üçüncü kişi adına izinsiz ilan veya dolandırıcılık amacı taşımadığını beyan eder.',
          'Carloi, ilanları otomatik kurallar, manuel inceleme, kullanıcı bildirimi veya resmi talep doğrultusunda askıya alabilir, görünürlüğünü azaltabilir, ek incelemeye alabilir veya kaldırabilir.',
        ],
      },
      {
        heading: '4. Mesajlaşma, anlaşma ve işlem süreçleri',
        bullets: [
          'Kullanıcılar arasındaki mesajlaşma, pazarlık, teklif ve anlaşma süreçleri doğrudan kullanıcılar arasında yürür; Carloi bu iletişimin içeriğine taraf değildir.',
          'Araç satışı, noter devri, ruhsat paylaşımı, sigorta kesimi, güvenli ödeme adımları ve diğer işlem süreçlerinde resmi prosedürlerin izlenmesi kullanıcıların sorumluluğundadır.',
          'Carloi, güvenli ödeme bilgilendirmesi veya sigorta operasyon desteği sunsa dahi, ödeme emanetçisi, garanti veren satıcı, alıcı temsilcisi veya resmi işlem kurumu değildir.',
        ],
      },
      {
        heading: '5. Ticari hesaplar ve mevzuata uyum',
        bullets: [
          'Ticari hesap açan kullanıcı; vergi kimliği, unvan, yetkili kişi, belge ve başvuru bilgilerinin doğru olduğunu, ilgili mevzuata uyduğunu ve gerekli izin/yetkilere sahip olduğunu beyan eder.',
          'Carloi, ticari başvuruları belge yükleme, platform incelemesi, ek doğrulama, risk analizi ve gerektiğinde manuel admin kararı ile değerlendirebilir.',
          'Onay bekleyen, reddedilen, askıya alınan veya geri alınan ticari hesaplar; ticari ilan ayrıcalıkları, ücretli yayınlama ve belirli operasyonel yetkilerden mahrum bırakılabilir.',
        ],
      },
      {
        heading: '6. Yasaklı davranışlar ve içerik kaldırma',
        bullets: [
          'Sahte ilan, dolandırıcılık, kimlik veya yetki taklidi, üçüncü kişi haklarını ihlal, telif/marka ihlali, manipülatif fiyatlama, spam, kötüye kullanım ve hukuka aykırı içerik kesin olarak yasaktır.',
          'Carloi; platform güvenliği, kullanıcı şikâyeti, risk işaretleri, resmi makam talepleri veya sözleşme ihlali hallerinde içerik kaldırabilir, hesabı askıya alabilir, erişimi sınırlayabilir ve gerekli kayıtları saklayabilir.',
          'İhlalin niteliğine göre Carloi; iç kayıtlar, audit loglar, risk notları ve gerekli durumlarda yetkili kurum taleplerine yanıt verecek delil paketleri oluşturabilir.',
        ],
      },
      {
        heading: '7. Log kayıtları, denetim izi ve sorumluluk sınırı',
        bullets: [
          'Güvenlik, hata takibi, dolandırıcılık önleme, yasal uyum ve operasyon yönetimi amacıyla giriş kayıtları, cihaz/IP verileri, moderasyon kayıtları, audit loglar ve ödeme/sigorta işlem izleri tutulabilir.',
          'Carloi; hizmetin kesintisiz, hatasız veya her ihtilafı çözecek şekilde işleyeceğini taahhüt etmez. Kullanıcı, platformun aracılık ve teknoloji sağlayıcı rolünü kabul eder.',
          'Carloi’nin sorumluluğu, emredici hukuk kuralları saklı kalmak üzere, yalnızca kendi ağır kusurundan doğan ve doğrudan ispatlanabilen zararlarla sınırlı değerlendirilir.',
        ],
      },
      {
        heading: '8. Uyuşmazlık, fesih ve yürürlük',
        bullets: [
          'Carloi; sözleşme ihlali, güvenlik riski, yasal yükümlülük, kötüye kullanım veya operasyonel gereklilik hallerinde hesabı kapatabilir, askıya alabilir ya da belirli özellikleri sonlandırabilir.',
          'Kullanıcı, sözleşme versiyonunun ve kabul zamanının sistemde saklanmasını kabul eder. Yeni sürüm yayınlandığında ilgili akışlarda yeniden onay talep edilebilir.',
          'Uyuşmazlıklarda Türk Hukuku uygulanır. Emredici tüketici hükümleri saklı kalmak üzere İstanbul Merkez mahkeme ve icra daireleri yetkili kabul edilir.',
        ],
      },
    ],
  },
  privacy_policy: {
    type: 'privacy_policy',
    required: true,
    checkboxLabel: 'Aydınlatma Metni ve Gizlilik Politikası’nı okudum, anladım.',
    helperText: 'KVKK kapsamındaki işleme amaçları, aktarım başlıkları ve hakların burada yer alır.',
    title: 'Aydınlatma Metni ve Gizlilik Politikası',
    linkLabel: 'Metni görüntüle',
    version: LEGAL_CONSENT_VERSION,
    lastUpdated: LEGAL_CONSENT_LAST_UPDATED,
    legalDraftNotice: LEGAL_DRAFT_NOTICE,
    sections: [
      {
        heading: '1. Veri sorumlusu ve kapsam',
        bullets: [
          'Carloi platformunda işlenen kişisel veriler bakımından veri sorumlusu Carloi’dir.',
          'Bu metin; bireysel ve ticari kullanıcı hesapları, ilanlar, mesajlaşma, moderasyon, ödeme yönlendirmeleri, sigorta operasyonları, müşteri destek süreçleri ve güvenlik kayıtlarını kapsar.',
          'Metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca aydınlatma yükümlülüğünü yerine getirmek amacıyla hazırlanmıştır.',
        ],
      },
      {
        heading: '2. İşlenen veri kategorileri',
        bullets: [
          'Kimlik ve iletişim verileri: ad-soyad, kullanıcı adı, e-posta, telefon, profil bilgileri, ticari hesap başvurularında şirket/unvan/vergi bilgileri.',
          'İşlem ve kullanım verileri: oturum kayıtları, cihaz bilgileri, IP adresi, mesajlaşma metadata’ları, giriş zamanları, audit loglar, risk işaretleri, moderasyon notları.',
          'İçerik verileri: ilan metinleri, araç bilgileri, fiyat, fotoğraf/video, belge yüklemeleri, mesaj içeriği ve kullanıcının sisteme sunduğu diğer içerikler.',
          'Finansal ve operasyonel veriler: ödeme kayıtları, sigorta ödeme referansları, fatura/poliçe teslim kayıtları ve ticari hesap doğrulama durumu.',
        ],
      },
      {
        heading: '3. Kişisel verilerin işlenme amaçları',
        bullets: [
          'Üyelik oluşturulması, hesap yönetimi, e-posta doğrulaması, şifre sıfırlama ve güvenlik süreçlerinin yürütülmesi.',
          'İlan, sosyal akış, mesajlaşma, ticari başvuru, satış ve sigorta akışlarının teknik olarak işletilmesi.',
          'Dolandırıcılık önleme, sahtecilik tespiti, çoklu hesap/risk analizi, kötüye kullanım incelemesi ve platform güvenliğinin sağlanması.',
          'Mevzuata uyum, iç denetim, kayıt saklama, kullanıcı destek operasyonları, hukuki taleplerin değerlendirilmesi ve resmi kurum yükümlülüklerinin yerine getirilmesi.',
          'Loi AI ve analiz özelliklerinin çalıştırılması, ancak bu sonuçların öneri niteliğinde sunulması.',
        ],
      },
      {
        heading: '4. Hukuki sebepler',
        bullets: [
          'KVKK m.5/2-c kapsamında sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması.',
          'KVKK m.5/2-ç kapsamında veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi.',
          'KVKK m.5/2-e kapsamında bir hakkın tesisi, kullanılması veya korunması için veri işlemenin zorunlu olması.',
          'KVKK m.5/2-f kapsamında Carloi’nin meşru menfaati için veri işlemenin zorunlu olması.',
          'Opsiyonel ticari elektronik ileti onayı gibi hallerde açık rıza hukuki sebebine dayanılması.',
        ],
      },
      {
        heading: '5. Aktarım yapılan taraflar',
        bullets: [
          'Bulut altyapısı, veri tabanı, depolama, e-posta hizmeti, güvenlik, loglama ve hata izleme sağlayıcıları gibi teknik hizmet ortakları.',
          'Ödeme ve sigorta süreçlerinde ilgili banka, ödeme hizmet sağlayıcısı, sigorta operasyon ortağı veya entegrasyon tedarikçileri.',
          'Hukuki yükümlülük veya yetkili kurum talebi bulunduğunda mahkemeler, savcılıklar, düzenleyici kurumlar ve diğer yetkili kamu otoriteleri.',
          'Mesaj/evidence erişimi gibi hassas veriler yalnızca yetkilendirilmiş roller ve kayıtlı denetim izi çerçevesinde sınırlandırılmış olarak işlenir.',
        ],
      },
      {
        heading: '6. Toplama yöntemi ve saklama süreleri',
        bullets: [
          'Veriler; kullanıcı tarafından formlar, yüklemeler, mesajlaşma, ödeme akışları, mobil/web uygulama kullanımı ve destek başvuruları üzerinden elektronik ortamda toplanır.',
          'Log kayıtları, audit verileri, ticari başvuru belgeleri, risk kayıtları ve ödeme trail verileri; yasal yükümlülükler, olası uyuşmazlıklar ve güvenlik gereklilikleri doğrultusunda saklanabilir.',
          'Zorunlu olmayan veriler için saklama süresi işleme amacına göre belirlenir; amaç sona erdiğinde mevzuatın izin verdiği ölçüde silme, yok etme veya anonimleştirme değerlendirilir.',
        ],
      },
      {
        heading: '7. Güvenlik, erişim ve kullanıcı hakları',
        bullets: [
          'Carloi; erişim kontrolü, audit log, rol bazlı yetkilendirme, imzalı callback, güvenli depolama ve benzeri teknik/idari tedbirler uygulamayı hedefler.',
          'Kart verileri uygulama içinde tutulmaz; güvenli ödeme sayfasında banka altyapısı üzerinden işlenir.',
          'İlgili kişi; KVKK m.11 kapsamındaki bilgi talebi, düzeltme, silme, itiraz ve diğer haklarını Carloi’ye başvurarak kullanabilir.',
        ],
      },
    ],
  },
  content_responsibility: {
    type: 'content_responsibility',
    required: true,
    checkboxLabel: 'İçerik ve İlan Sorumluluğu Beyanı’nı kabul ediyorum.',
    helperText: 'İlan, mesaj, fotoğraf, yetki ve belge beyanlarının kime ait olduğunu burada açıkça görürsün.',
    title: 'İçerik ve İlan Sorumluluğu Beyanı',
    linkLabel: 'Beyanı görüntüle',
    version: LEGAL_CONSENT_VERSION,
    lastUpdated: LEGAL_CONSENT_LAST_UPDATED,
    legalDraftNotice: LEGAL_DRAFT_NOTICE,
    sections: [
      {
        heading: '1. Beyanın konusu',
        bullets: [
          'Kullanıcı; Carloi’ye yüklediği tüm ilan, açıklama, fiyat, fotoğraf, video, belge, ruhsat bilgisi, temsil yetkisi bilgisi, ticari belge ve mesaj içeriğinin kendi sorumluluğunda olduğunu kabul eder.',
          'Araç sahibi sıfatı, ikinci derece yakını adına ilan verme, eş/akraba ilişkisi, yetkili galeri veya temsil yetkisi gibi hukuki dayanaklar doğru şekilde beyan edilmelidir.',
        ],
      },
      {
        heading: '2. İlan ve araç bilgileri',
        bullets: [
          'Araç markası, model yılı, plaka, hasar kaydı, kilometre, boya/değişen bilgisi, ekspertiz durumu, fiyat ve pazarlık bilgileri gerçeğe uygun olmalıdır.',
          'Kullanıcı; sahte fiyat, yanıltıcı açıklama, manipülatif ekspertiz söylemi, olmayan araç ilanı, kopya ilan veya üçüncü kişi aracına izinsiz ilan verilmesi gibi işlemlerden doğrudan sorumludur.',
          'Carloi’nin görüntüleme, risk işareti veya moderasyon yapması; ilanın, aracın veya satış yetkisinin doğruluğuna dair garanti verildiği anlamına gelmez.',
        ],
      },
      {
        heading: '3. Fikri mülkiyet, fotoğraf ve üçüncü kişi hakları',
        bullets: [
          'Yüklenen fotoğraf, video, marka, logo, kurumsal görsel, ekspertiz ekran görüntüsü ve diğer içeriklerin kullanım hakkı kullanıcıya ait olmalı veya kullanıcı bu içerikleri kullanmaya yetkili olmalıdır.',
          'Telif, marka, kişilik hakkı, ticari itibar veya diğer üçüncü kişi haklarını ihlal eden içerikler derhal kaldırılabilir ve hesap yaptırıma tabi tutulabilir.',
        ],
      },
      {
        heading: '4. Dolandırıcılık, sahtecilik ve kötüye kullanım',
        bullets: [
          'Sahte belge, sahte ruhsat, kimlik taklidi, temsile yetkisiz satış, kapora dolandırıcılığı, sahte alıcı/satıcı profili, spam mesaj veya güvenli ödeme sürecini taklit eden yönlendirmeler yasaktır.',
          'Carloi; risk işaretleri, kullanıcı bildirimi, admin incelemesi veya resmi talepler doğrultusunda içeriği sınırlayabilir, hesabı askıya alabilir ve gerekli verileri delil olarak saklayabilir.',
        ],
      },
      {
        heading: '5. Ticari hesaplar ve mevzuata uyum',
        bullets: [
          'Ticari kullanıcı; vergi, fatura, yetki belgesi, şirket bilgisi ve pazarlama faaliyetlerinin kendi faaliyet alanı ile uyumlu olduğunu beyan eder.',
          'Ticari hesap için paylaşılan belgelerin platform tarafından incelenmesi, resmi veya tam doğrulama garantisi oluşturmaz; ek teyit ve ilave belge talebi istenebilir.',
        ],
      },
      {
        heading: '6. Yaptırımlar',
        bullets: [
          'Bu beyana aykırılık hâlinde içerik kaldırma, ilanı yayından alma, risk bayrağı oluşturma, hesap kısıtlama, askıya alma, ticari ayrıcalıkları geri çekme ve hukuki süreçlere destek amacıyla kayıt saklama uygulanabilir.',
          'Kullanıcı, kendi beyan ve içeriklerinden doğan idari, hukuki ve cezai sorumluluğun kendisine ait olduğunu kabul eder.',
        ],
      },
    ],
  },
  marketing_optional: {
    type: 'marketing_optional',
    required: false,
    checkboxLabel: 'Ticari Elektronik İleti ve kampanya iletişimi almak istiyorum.',
    helperText: 'Bu izin ayrı ve isteğe bağlıdır; kayıt için zorunlu değildir.',
    title: 'Ticari Elektronik İleti / Kampanya Onayı',
    linkLabel: 'Onay metnini görüntüle',
    version: LEGAL_CONSENT_VERSION,
    lastUpdated: LEGAL_CONSENT_LAST_UPDATED,
    legalDraftNotice: LEGAL_DRAFT_NOTICE,
    sections: [
      {
        heading: '1. Onayın niteliği',
        bullets: [
          'Bu onay, 6563 sayılı Kanun ve ilgili ikincil mevzuat kapsamında Carloi’nin ürün, kampanya, özellik duyurusu, bilgilendirme ve pazarlama içerikli iletiler gönderebilmesine ilişkindir.',
          'Onay tamamen isteğe bağlıdır; bu kutunun işaretlenmemesi üyelik oluşturulmasına veya temel platform kullanımına engel olmaz.',
        ],
      },
      {
        heading: '2. İletişim kanalları ve kapsam',
        bullets: [
          'Onay verilmesi hâlinde e-posta, push bildirimi, uygulama içi mesaj veya benzeri dijital kanallar üzerinden ticari elektronik ileti gönderilebilir.',
          'İleti içeriği; kampanya, yeni özellik, ürün güncellemesi, davet, tekrar etkileşim ve benzeri pazarlama/duyuru içeriklerini kapsayabilir.',
        ],
      },
      {
        heading: '3. Geri alma hakkı',
        bullets: [
          'Kullanıcı, verdiği onayı dilediği zaman ayarlar ekranı, iletideki çıkış bağlantısı veya destek kanalı üzerinden ücretsiz şekilde geri alabilir.',
          'Onayın geri alınması, daha önce hukuka uygun şekilde gönderilmiş iletileri geçersiz kılmaz; ancak geri alma sonrasındaki yeni pazarlama iletileri durdurulur.',
        ],
      },
      {
        heading: '4. Kayıt ve ispat',
        bullets: [
          'Onayın verildiği tarih, versiyon, kaynak ekran ve ilgili hesap bilgileri, ispat ve mevzuata uyum amacıyla saklanabilir.',
          'Carloi, ticari elektronik ileti tercihlerini kullanıcı bazında güncelleyebilir ve yasal saklama yükümlülükleri çerçevesinde kayıt tutabilir.',
        ],
      },
    ],
  },
};

export function buildConsent(type: ConsentInput['type'], sourceScreen: string): ConsentInput {
  return {
    type,
    accepted: true,
    version: LEGAL_CONSENT_VERSION,
    sourceScreen,
  };
}

export function getSignupConsentCopy(_language = 'tr') {
  return (Object.values(signupConsentDocuments) as SignupConsentDocument[]).map((item) => ({
    type: item.type,
    title: item.checkboxLabel,
    description: item.helperText,
  }));
}

export function getSignupConsentDocuments(_language = 'tr') {
  return signupConsentDocuments;
}

export function getListingResponsibilityCopy(_language = 'tr') {
  return {
    title: 'İlan sorumluluğu onayı',
    description:
      'İlan veren kişi; araç üzerinde satış, pazarlama veya temsil yetkisine sahip olduğunu beyan eder. Gerekirse ek doğrulama ve manuel inceleme istenebilir.',
  };
}

export function getSafePaymentGuidanceText(_language = 'tr') {
  return {
    title: 'Güvenli ödeme bilgilendirmesi',
    message:
      'Resmî güvenli ödeme, noter ve sigorta adımlarının ilgili kurum süreçlerine uygun şekilde takip edilmesi gerekir. Carloi doğrudan satıcı, alıcı temsilcisi veya ödeme emanetçisi değildir.',
    confirmLabel: 'Bilgilendirmeyi anladım',
  };
}

export function getSubscriptionTermsText(_language = 'tr') {
  return {
    title: 'Abonelik koşulları onayı',
    message:
      'Bu onay; dijital hizmet kapsamı, yenileme, iptal, hak kaybı ve ücretli görünürlük kurallarının ilgili premium/abonelik akışında uygulanabileceğini belirtir.',
    confirmLabel: 'Abonelik koşullarını kabul ediyorum',
  };
}
