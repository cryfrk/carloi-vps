import type { LegalDocumentDefinition } from './types.js';

export const legalDocuments: readonly LegalDocumentDefinition[] = [
  {
    id: 'terms-of-service',
    slug: 'kullanici-sozlesmesi',
    title: 'Kullanıcı Sözleşmesi',
    shortTitle: 'Kullanıcı Sözleşmesi',
    kind: 'contract',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'Carloi platformunun kullanım şartlarını, tarafların sorumluluklarını ve hesap kurallarını düzenler.',
    tags: ['üyelik', 'platform', 'hesap', 'sorumluluk'],
    flowRequirements: [
      {
        flow: 'register-individual',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Auth > Register > Sözleşmeler'
      },
      {
        flow: 'register-commercial',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Auth > Ticari Register > Sözleşmeler'
      }
    ],
    sections: [
      {
        id: 'platform-role',
        heading: 'Platformın rolü',
        paragraphs: [
          'Carloi; kullanıcıların sosyal otomotiv içeriği paylaşabildiği, araçlarını Garajım alanında yönetebildiği, ilan oluşturabildiği, mesajlaşabildiği ve belirli finansal veya sigorta süreçlerine yönlendirilebildiği dijital bir platformdur.',
          'Carloi, kullanıcılar arasındaki satış, devir, ödeme, ekspertiz, teslim ve hukuki uyuşmazlık süreçlerinin asli tarafı değildir; aksi açıkça belirtilmedikçe aracı hizmet ve teknik altyapı sağlayıcısı olarak hareket eder.'
        ]
      },
      {
        id: 'account-usage',
        heading: 'Hesap kullanımı ve güvenlik',
        paragraphs: [
          'Kullanıcı, Carloi hesabı üzerinden yapılan işlemlerin kendi bilgisi ve iradesi dâhilinde olduğunu, giriş bilgilerini korumakla yükümlü olduğunu ve hesabın izinsiz kullanımını derhâl Carloi’ye bildireceğini kabul eder.',
          'Carloi; sahte hesap, kimlik taklidi, izinsiz veri paylaşımı, hukuka aykırı içerik, dolandırıcılık şüphesi veya mevzuata aykırı ticari kullanım tespit ettiğinde hesabı askıya alma, erişimi kısıtlama veya tamamen kapatma hakkını saklı tutar.'
        ]
      },
      {
        id: 'user-content',
        heading: 'Kullanıcı içerikleri ve ilanlar',
        paragraphs: [
          'Kullanıcı tarafından yüklenen fotoğraf, video, açıklama, araç bilgisi, ruhsat beyanı, boya/değişen bilgisi, ekspertiz notu, fiyat ve diğer tüm içeriklerden münhasıran kullanıcı sorumludur.',
          'Kullanıcı; başkasına ait fotoğraf, marka, logo, telif konusu görsel, üçüncü kişiye ait araç veya yetkisiz temsil edilen ticari varlıklar üzerinde yanıltıcı içerik yayınlamayacağını, aksi durumda tüm hukuki ve cezai sorumluluğun kendisine ait olduğunu kabul eder.'
        ]
      },
      {
        id: 'messaging-and-transactions',
        heading: 'Mesajlaşma, ilan ve işlem güvenliği',
        paragraphs: [
          'Carloi üzerindeki mesajlaşma ve teklif süreçleri kullanıcılar arasındaki iletişimi kolaylaştırır; nihai anlaşma, teslim, noter, ödeme ve sigorta işlemleri ayrıca kayıt altına alınabilir ve güvenlik amacıyla loglanabilir.',
          'Platform, şüpheli davranışları, spam kullanımı, organize dolandırıcılık sinyallerini, ticari mevzuat uyumsuzluklarını ve kullanıcı şikâyetlerini inceleme hakkını saklı tutar.'
        ]
      },
      {
        id: 'dispute-and-enforcement',
        heading: 'Uyuşmazlık, denetim ve yaptırımlar',
        paragraphs: [
          'Carloi; hizmet kalitesini, güvenliği ve mevzuata uyumu sağlamak amacıyla içerik kaldırma, görünürlük azaltma, geçici kısıtlama, belge talep etme, ticari başvuruyu askıya alma veya hesabı kapatma tedbirlerini uygulayabilir.',
          'Bu sözleşme kapsamındaki metinler ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'kvkk-notice',
    slug: 'kvkk-aydinlatma-metni',
    title: 'KVKK Aydınlatma Metni',
    shortTitle: 'KVKK Aydınlatma',
    kind: 'privacy-notice',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'Kişisel verilerin işlenme amaçlarını, hukuki sebeplerini, aktarımlarını ve ilgili kişi haklarını açıklar.',
    tags: ['kvkk', 'kişisel veri', 'aydınlatma'],
    flowRequirements: [
      {
        flow: 'register-individual',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Auth > Register > KVKK'
      },
      {
        flow: 'register-commercial',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Auth > Ticari Register > KVKK'
      }
    ],
    sections: [
      {
        id: 'controller',
        heading: 'Veri sorumlusu',
        paragraphs: [
          'Carloi platformu kapsamında işlenen kişisel veriler bakımından veri sorumlusu, ilgili ticari işletme veya şirket unvanı ile faaliyet gösteren Carloi organizasyonudur.',
          'İletişim, başvuru, talep ve ilgili kişi haklarına ilişkin başvurular için ürün içi destek kanalları ve ayrıca bildirilecek kurumsal başvuru yöntemleri kullanılacaktır.'
        ]
      },
      {
        id: 'processing-purposes',
        heading: 'İşleme amaçları',
        paragraphs: [
          'Kişisel veriler; üyelik oluşturma, kimlik doğrulama, hesap güvenliği, ilan ve içerik yayınlama, mesajlaşma, ticari başvuru değerlendirmesi, ödeme ve sigorta süreçleri, dolandırıcılık önleme, müşteri desteği, yasal yükümlülüklerin yerine getirilmesi ve hizmet geliştirme amaçlarıyla işlenebilir.',
          'Araç bilgileri, OBD verileri, ekspertiz çıktıları ve sigorta talep verileri; kullanıcı deneyimini iyileştirmek, araç bazlı öneri sunmak, riskli davranışları tespit etmek ve ilgili ürün fonksiyonlarını çalıştırmak amacıyla ek olarak işlenebilir.'
        ]
      },
      {
        id: 'legal-bases',
        heading: 'Hukuki sebepler ve toplama yöntemi',
        paragraphs: [
          'Veriler; elektronik ortamda kullanıcı girişleri, formlar, yüklenen medya, araç girişleri, müşteri desteği görüşmeleri, ödeme adımları, ticari başvuru belgeleri, OBD eşleştirme verileri ve uygulama içi log kayıtları üzerinden toplanabilir.',
          'İşleme faaliyetleri; sözleşmenin kurulması ve ifası, veri sorumlusunun meşru menfaati, hukuki yükümlülüğün yerine getirilmesi, hakkın tesisi, kullanılması veya korunması ve gerekli hâllerde açık rıza hukuki sebeplerine dayanabilir.'
        ]
      },
      {
        id: 'transfers',
        heading: 'Aktarımlar',
        paragraphs: [
          'Kişisel veriler; barındırma, e-posta, SMS, ödeme, sigorta, güvenlik, analitik, müşteri desteği ve teknik operasyon sağlayıcılarına, hizmetin sunulması için gerekli ölçüde aktarılabilir.',
          'Yetkili kamu kurum ve kuruluşları, mahkemeler, icra makamları veya mevzuat gereği yetkili diğer merciler tarafından talep edilmesi hâlinde ilgili veriler hukuki çerçevede paylaşılabilir.'
        ]
      },
      {
        id: 'data-subject-rights',
        heading: 'İlgili kişi hakları',
        paragraphs: [
          'Kullanıcı; kişisel verisinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, amaca uygun kullanılıp kullanılmadığını öğrenme, eksik veya yanlış işlenmişse düzeltilmesini isteme ve mevzuatta öngörülen diğer haklarını kullanabilir.',
          'Bu metin ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'privacy-policy',
    slug: 'gizlilik-politikasi',
    title: 'Gizlilik Politikası',
    shortTitle: 'Gizlilik Politikası',
    kind: 'policy',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'Profil görünürlüğü, veri güvenliği, saklama ve kullanıcı tercihleri bakımından gizlilik yaklaşımını açıklar.',
    tags: ['gizlilik', 'profil', 'saklama'],
    flowRequirements: [
      {
        flow: 'register-individual',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Auth > Register > Gizlilik'
      },
      {
        flow: 'register-commercial',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Auth > Ticari Register > Gizlilik'
      }
    ],
    sections: [
      {
        id: 'visibility-controls',
        heading: 'Görünürlük ve paylaşım tercihleri',
        paragraphs: [
          'Kullanıcı, profil görünürlüğü, Garajım araç görünürlüğü, plaka maskeleme ve belirli içeriklerin kimler tarafından görülebileceği konusunda sunulan ayarları kullanabilir.',
          'İlanlar ve kamusal sosyal içerikler, ürün tasarımı gereği daha geniş görünürlüğe sahip olabilir; buna karşılık bazı araç, ruhsat, OBD ve iletişim verileri daha dar erişim kuralları ile korunur.'
        ]
      },
      {
        id: 'security-practices',
        heading: 'Veri güvenliği',
        paragraphs: [
          'Carloi, erişim kontrolü, loglama, oturum güvenliği, dosya erişim politikaları ve gerekli görülen teknik-idari tedbirlerle kullanıcı verilerini korumayı hedefler.',
          'Bununla birlikte internet üzerinden yapılan hiçbir veri iletimi veya dijital saklama yöntemi mutlak güvenlik garantisi sunmadığından, kullanıcılar da kendi hesap güvenliklerinden sorumludur.'
        ]
      },
      {
        id: 'retention',
        heading: 'Saklama ve silme',
        paragraphs: [
          'Kişisel veriler, işleme amacının gerektirdiği süre boyunca veya ilgili mevzuatın zorunlu kıldığı süreler boyunca saklanır; süre sonunda anonimleştirme, silme veya yok etme yöntemleri uygulanabilir.',
          'Uyuşmazlık, dolandırıcılık incelemesi, ödeme ve sigorta kaydı, ticari başvuru doğrulaması gibi süreçlerde bazı kayıtlar daha uzun süre saklanabilir.'
        ]
      },
      {
        id: 'third-party-services',
        heading: 'Üçüncü taraf hizmetler',
        paragraphs: [
          'Carloi içerisinde kullanılan ödeme, bildirim, kimlik doğrulama, depolama ve benzeri hizmetler üçüncü taraf teknik sağlayıcılara dayanabilir; bu sağlayıcılarla veri işleme ilişkileri ayrı sözleşmeler ve teknik tedbirlerle düzenlenir.',
          'Bu politika ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'explicit-consent',
    slug: 'acik-riza-metni',
    title: 'Açık Rıza Metni',
    shortTitle: 'Açık Rıza',
    kind: 'explicit-consent',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'Açık rıza gerektiren kişisel veri işleme alanları için kullanıcıdan bilinçli onay alınmasına yönelik taslak metindir.',
    tags: ['rıza', 'açık rıza', 'özel veri'],
    flowRequirements: [
      {
        flow: 'register-individual',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Auth > Register > Açık Rıza'
      },
      {
        flow: 'register-commercial',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Auth > Ticari Register > Açık Rıza'
      }
    ],
    sections: [
      {
        id: 'scope',
        heading: 'Rızanın kapsamı',
        paragraphs: [
          'Açık rıza gerektirdiği değerlendirilen alanlarda; araç sağlık verileri, OBD kayıtları, gelişmiş analiz çıktıları, belirli iletişim tercihleri ve ek zenginleştirme verileri kullanıcı onayına tabi tutulabilir.',
          'Kullanıcı, açık rızasını bilgilendirilmiş olarak verdiğini ve mevzuatın izin verdiği ölçüde bunu sonradan geri alabileceğini kabul eder.'
        ]
      },
      {
        id: 'withdrawal',
        heading: 'Rızanın geri alınması',
        paragraphs: [
          'Açık rıza geri alındığında, rızaya dayalı işleme faaliyetleri ileriye dönük olarak durdurulur; ancak sözleşme, güvenlik veya yasal yükümlülük sebebiyle gerekli bazı işleme faaliyetleri bundan etkilenmeyebilir.',
          'Rızanın geri alınması, bazı ürün özelliklerinin sınırlanmasına veya kullanılamamasına neden olabilir.'
        ]
      },
      {
        id: 'notice',
        heading: 'Önemli not',
        paragraphs: [
          'Açık rıza metninin hangi alanlarda gerçekten zorunlu olduğu ve hangi işleme faaliyetlerinin başka hukuki sebebe dayanabileceği hukuk danışmanı tarafından ayrıca değerlendirilmelidir.',
          'Bu metin ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'listing-rules',
    slug: 'ilan-yayinlama-kurallari',
    title: 'İlan Yayınlama Kuralları',
    shortTitle: 'İlan Kuralları',
    kind: 'policy',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'İlan yayınlarken uyulması gereken doğruluk, yetki, mevzuat ve güvenlik kurallarını açıklar.',
    tags: ['ilan', 'mevzuat', 'araç satış'],
    flowRequirements: [
      {
        flow: 'create-listing',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Create Listing > Kurallar'
      },
      {
        flow: 'register-commercial',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Ticari Register > İlan Kuralları'
      }
    ],
    sections: [
      {
        id: 'accuracy',
        heading: 'Doğruluk yükümlülüğü',
        paragraphs: [
          'İlanda yer alan fiyat, model yılı, kilometre, hasar kaydı, boya/değişen bilgisi, donanım, ruhsat durumu ve temsil yetkisi dâhil tüm bilgiler doğru ve güncel olmalıdır.',
          'Eksik veya doğrulanmamış bilgi, kullanıcı güvenini zedeleyebileceği gibi mevzuat ve platform kuralları bakımından da ihlal oluşturabilir.'
        ]
      },
      {
        id: 'ownership-and-authority',
        heading: 'Araç sahipliği ve temsil yetkisi',
        paragraphs: [
          'Kullanıcı, yalnızca satma veya ilana koyma yetkisine sahip olduğu araçlar için içerik yayınlayacağını; üçüncü kişiye ait araçlar bakımından gerekli vekâlet, yetki veya kurumsal temsil ilişkisinin kendisinde bulunduğunu beyan eder.',
          'Yetkisiz ilan, başkasına ait araç üzerinden dolandırıcılık girişimi, sahte ruhsat veya yanıltıcı temsil beyanı Carloi tarafından ağır ihlal olarak değerlendirilir.'
        ]
      },
      {
        id: 'content-restrictions',
        heading: 'Yasaklı içerikler',
        paragraphs: [
          'Gerçek dışı fiyatlama, clickbait açıklamalar, telif hakkı ihlali taşıyan görseller, yanıltıcı ekspertiz iddiaları, üçüncü kişi iletişim numarası kullanımı ve mevzuata aykırı satış vaadi yasaktır.',
          'Carloi, ilanı yayından kaldırma, görünürlüğü sınırlama, kullanıcıdan ek belge isteme ve ilgili hesabı kısıtlama hakkını saklı tutar.'
        ]
      },
      {
        id: 'commercial-compliance',
        heading: 'Ticari kullanıcı yükümlülükleri',
        paragraphs: [
          'Ticari kullanıcılar, ticaret ve elektronik ticaret mevzuatı, tüketici hukuku, vergisel yükümlülükler ve platformun belge/doğrulama kuralları çerçevesinde hareket etmekle yükümlüdür.',
          'Bu metin ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'commercial-undertaking',
    slug: 'ticari-kullanici-taahhutnamesi',
    title: 'Ticari Kullanıcı Taahhütnamesi',
    shortTitle: 'Ticari Taahhüt',
    kind: 'contract',
    audience: 'commercial',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'Ticari hesap sahiplerinin belge, yetki, mevzuat ve temsil yükümlülüklerini düzenler.',
    tags: ['ticari', 'galeri', 'belge', 'yetki'],
    flowRequirements: [
      {
        flow: 'register-commercial',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Ticari Register > Ticari Taahhüt'
      },
      {
        flow: 'commercial-onboarding',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Commercial Onboarding > Taahhüt'
      }
    ],
    sections: [
      {
        id: 'documents',
        heading: 'Belge ve beyan yükümlülüğü',
        paragraphs: [
          'Ticari kullanıcı; firma adı, yetkili kişi, vergi numarası, vergi dairesi, adres, faaliyet türü ve yüklediği tüm belgelerin doğru, güncel ve kendisine ait olduğunu taahhüt eder.',
          'Vergi levhası, yetki belgesi, imza sirküleri, oda kaydı ve benzeri belgelerin eksik, geçersiz veya yanıltıcı olması hâlinde Carloi başvuruyu reddedebilir ya da hesabı askıya alabilir.'
        ]
      },
      {
        id: 'commercial-permissions',
        heading: 'Ticari özelliklerin açılması',
        paragraphs: [
          'Ticari rozet, kurumsal ilan görünürlüğü ve diğer ticari avantajlar yalnızca başvurusu onaylanan hesaplarda aktif edilir.',
          'Onay öncesi ticari kullanıcı, bireysel görünümde temel ürün fonksiyonlarını kullanabilse de onaylı ticari ayrıcalıkları kullanamaz.'
        ]
      },
      {
        id: 'regulatory-compliance',
        heading: 'Mevzuata uyum',
        paragraphs: [
          'Ticari kullanıcı; 6563 sayılı elektronik ticaret mevzuatı, tüketici mevzuatı, vergi düzenlemeleri, ilan mevzuatı ve araç satışına ilişkin ilgili diğer düzenlemelere uymayı kabul eder.',
          'Bu metin ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'vehicle-listing-liability',
    slug: 'arac-ilani-sorumluluk-beyani',
    title: 'Araç İlanı Sorumluluk Beyanı',
    shortTitle: 'Araç İlanı Beyanı',
    kind: 'responsibility-notice',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'Araç ilanındaki teknik, hukuki ve temsil bilgilerinin doğruluğuna ilişkin kullanıcı beyanıdır.',
    tags: ['araç', 'sorumluluk', 'beyan'],
    flowRequirements: [
      {
        flow: 'create-listing',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Create Listing > Sorumluluk Beyanı'
      }
    ],
    sections: [
      {
        id: 'seller-declaration',
        heading: 'Satıcı beyanı',
        paragraphs: [
          'Kullanıcı; ilanda yer alan aracın kendisine ait olduğunu veya aracı ilana koymaya ve satmaya yetkili bulunduğunu, yanıltıcı veya gerçek dışı bilgi vermediğini beyan eder.',
          'Araçta mevcut olan boya, değişen, hasar, eksper, OBD, bakım, kilometre ve hukuki kayıt bilgilerinin bilinçli şekilde gizlenmesi durumunda tüm sorumluluk kullanıcıya aittir.'
        ]
      },
      {
        id: 'contact-restriction',
        heading: 'İletişim ve temsil kısıtı',
        paragraphs: [
          'İlan iletişim bilgileri Carloi hesabındaki doğrulanmış iletişim verilerinden alınır; üçüncü bir kişinin telefon numarası veya yanıltıcı satıcı bilgisi kullanılamaz.',
          'Araç başka bir kişi veya kurum adına satılıyorsa gerekli temsil ilişkisi ve yetki belgeleri kullanıcı tarafından sağlanmalıdır.'
        ]
      },
      {
        id: 'notice',
        heading: 'Önemli not',
        paragraphs: [
          'Carloi, ilan doğruluğunu teknik araçlarla veya ek belge talepleriyle sınırlı ölçüde kontrol edebilir; bu kontrol, kullanıcının doğruluk sorumluluğunu ortadan kaldırmaz.',
          'Bu metin ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'messaging-safe-transaction',
    slug: 'mesajlasma-ve-guvenli-islem-bilgilendirmesi',
    title: 'Mesajlaşma ve Güvenli İşlem Bilgilendirmesi',
    shortTitle: 'Güvenli İşlem',
    kind: 'feature-notice',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'Mesajlaşma, anlaşma, ruhsat paylaşımı ve güvenli işlem akışındaki temel risk ve kuralları açıklar.',
    tags: ['mesaj', 'güvenli işlem', 'ruhsat', 'anlaşma'],
    flowRequirements: [
      {
        flow: 'messaging-safe-transaction',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Listing Chat > Güvenli İşlem'
      },
      {
        flow: 'insurance-quote',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Insurance Quote > Bilgilendirme'
      }
    ],
    sections: [
      {
        id: 'chat-context',
        heading: 'Mesajlaşma bağlamı',
        paragraphs: [
          'İlan sohbetleri, ilgili ilan kartı ve işlem bağlamı ile birlikte tutulabilir. Bu sayede taraflar hangi araç ve hangi şartlar üzerinden görüştüğünü açık biçimde takip eder.',
          'Mesajlaşma içerikleri güvenlik, dolandırıcılık incelemesi, kullanıcı şikâyeti ve yasal yükümlülükler çerçevesinde loglanabilir veya incelenebilir.'
        ]
      },
      {
        id: 'agreement-step',
        heading: 'Anlaştık ve ruhsat paylaşımı',
        paragraphs: [
          'Taraflardan her birinin “Anlaştık” onayı vermesi, ön mutabakat niteliğindedir; nihai satış, devir ve sigorta süreçleri ayrıca tamamlanmalıdır.',
          'Ruhsat veya benzeri hassas belge bilgileri yalnızca ilgili süreç için gerekli olduğu ölçüde paylaşılmalı, kullanıcılar belge ve kişisel veri güvenliğine dikkat etmelidir.'
        ]
      },
      {
        id: 'safe-transaction',
        heading: 'Güvenli işlem uyarısı',
        paragraphs: [
          'Carloi, teknik ve akış bazlı güvenlik önlemleri sunsa da tüm dolandırıcılık risklerini ortadan kaldırmayı garanti etmez; kullanıcıların bağımsız doğrulama ve dikkat yükümlülüğü devam eder.',
          'Bu metin ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'obd-data-notice',
    slug: 'obd-veri-kullanim-aydinlatmasi',
    title: 'OBD Veri Kullanım Aydınlatması',
    shortTitle: 'OBD Veri Aydınlatması',
    kind: 'privacy-notice',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'OBD bağlantısı ile toplanan araç verilerinin nasıl işlendiğini ve hangi amaçlarla kullanıldığını açıklar.',
    tags: ['obd', 'araç verisi', 'telematik'],
    flowRequirements: [
      {
        flow: 'obd-onboarding',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'OBD Setup > Aydınlatma'
      }
    ],
    sections: [
      {
        id: 'obd-scope',
        heading: 'Toplanan veri kapsamı',
        paragraphs: [
          'OBD bağlantısı üzerinden motor devri, sıcaklık, hız, voltaj, yakıt, hata kodları, sensör okumaları ve benzeri araç verileri işlenebilir.',
          'Bu veriler, araç sağlığı analizi, ekspertiz raporu, arıza tespiti, AI destekli yorumlar ve kullanıcıya özelleştirilmiş araç içgörüleri sunmak amacıyla kullanılabilir.'
        ]
      },
      {
        id: 'obd-risk',
        heading: 'Riskler ve sınırlar',
        paragraphs: [
          'OBD verileri araçtaki tüm mekanik veya hukuki sorunları tek başına kesin olarak ortaya koymaz; yorumlar her zaman veri kalitesi, cihaz uyumluluğu ve araç koşullarından etkilenebilir.',
          'Kullanıcı, OBD cihazının kendisine ait veya kullanma yetkisi bulunan bir cihaza takıldığını ve araç sahibinin gerekli izinlerini aldığını kabul eder.'
        ]
      },
      {
        id: 'obd-legal-note',
        heading: 'Önemli not',
        paragraphs: [
          'OBD verisi özel nitelikli veri sayılmasa dahi araç ve kullanıcı davranışı hakkında hassas sonuçlar doğurabileceğinden, ek gizlilik ve güvenlik tedbirleri uygulanmalıdır.',
          'Bu metin ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'ai-usage-disclaimer',
    slug: 'ai-kullanim-ve-sorumluluk-reddi',
    title: 'AI Kullanım ve Sorumluluk Reddi',
    shortTitle: 'AI Sorumluluk Reddi',
    kind: 'feature-notice',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'Loi AI çıktılarının tavsiye niteliğinde olduğunu ve nihai ekspertiz, finansal veya hukuki karar yerine geçmediğini açıklar.',
    tags: ['ai', 'loi ai', 'sorumluluk reddi'],
    flowRequirements: [
      {
        flow: 'ai-session',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Loi AI > Bilgilendirme'
      }
    ],
    sections: [
      {
        id: 'advisory',
        heading: 'Tavsiye niteliği',
        paragraphs: [
          'Loi AI tarafından sunulan araç önerileri, arıza yorumları, bütçe tavsiyeleri, ilan kıyasları ve benzeri çıktılar yalnızca destekleyici niteliktedir.',
          'Bu çıktılar kesin ekspertiz raporu, teknik servis teşhisi, mali danışmanlık, hukuki görüş veya bağlayıcı satış beyanı yerine geçmez.'
        ]
      },
      {
        id: 'data-quality',
        heading: 'Veri kalitesi ve sınırlamalar',
        paragraphs: [
          'AI sonuçları, kullanıcının sağladığı veri, katalog bilgisi, OBD verisi, ilan içeriği ve geçmiş kayıtların doğruluğuna bağlıdır; eksik veya yanlış veri, yanıltıcı sonuçlar doğurabilir.',
          'Kullanıcı, önemli kararlarını bağımsız teknik inceleme, ekspertiz, noter, sigorta ve finans doğrulaması ile desteklemekle yükümlüdür.'
        ]
      },
      {
        id: 'legal-note',
        heading: 'Önemli not',
        paragraphs: [
          'AI özellikleri, özellikle yüksek maliyetli araç işlemleri ve güvenlik açısından kritik bakım kararlarında nihai doğrulama katmanı olarak kullanılmamalıdır.',
          'Bu metin ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  },
  {
    id: 'insurance-quote-notice',
    slug: 'sigorta-teklif-sureci-bilgilendirmesi',
    title: 'Sigorta Teklif Süreci Bilgilendirmesi',
    shortTitle: 'Sigorta Süreci',
    kind: 'feature-notice',
    audience: 'all',
    version: '2026-04',
    locale: 'tr-TR',
    updatedAt: '2026-04-26',
    legalReviewRequired: true,
    summary: 'İlan sohbetinden teklif üretimine, ödeme ve fatura teslimine kadar sigorta sürecinin nasıl işlediğini açıklar.',
    tags: ['sigorta', 'teklif', 'ödeme', 'fatura'],
    flowRequirements: [
      {
        flow: 'insurance-quote',
        required: true,
        blocksCompletion: true,
        suggestedEntryPoint: 'Insurance Flow > Bilgilendirme'
      }
    ],
    sections: [
      {
        id: 'workflow',
        heading: 'Süreç akışı',
        paragraphs: [
          'İlgili ilan sohbetinde taraflar karşılıklı mutabakat sağladıktan ve gerekli araç/ruhsat bilgileri paylaşıldıktan sonra sigorta teklifi talebi oluşturulabilir.',
          'Teklif, Carloi yönetim panelinde yetkili ekip tarafından hazırlanabilir; teklif PDF’i, bedel bilgisi, ödeme durumu ve fatura dokümanı süreç içinde kullanıcıya iletilir.'
        ]
      },
      {
        id: 'payment',
        heading: 'Ödeme ve finansal işlem',
        paragraphs: [
          'Sigorta ödemesi, entegre ödeme altyapıları üzerinden gerçekleştirilebilir. 3D Secure, işlem doğrulama ve ödeme sonucu kayıtları süreç güvenliği için saklanabilir.',
          'Ödeme tamamlanmadan poliçe veya nihai işlem sonucunun doğacağı garanti edilmez; iptal, başarısız ödeme, manuel inceleme veya ek belge ihtiyacı gibi durumlar oluşabilir.'
        ]
      },
      {
        id: 'delivery',
        heading: 'Belge teslimi ve bildirimler',
        paragraphs: [
          'Teklif PDF’i, fatura PDF’i ve ilgili süreç bildirimleri e-posta, uygulama içi bildirim veya Carloi mesajı ile gönderilebilir; iletim hataları yaşanması halinde kayıt ve yeniden gönderim mekanizmaları kullanılabilir.',
          'Bu metin ürün içi hukuki taslaktır. Bu metinler hukukçu onayından geçirilmelidir.'
        ]
      }
    ]
  }
] as const;
