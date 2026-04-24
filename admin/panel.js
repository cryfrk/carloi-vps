const tokenInput = document.querySelector('#adminToken');
const saveTokenButton = document.querySelector('#saveToken');
const statusText = document.querySelector('#statusText');
const dealCount = document.querySelector('#dealCount');
const dealList = document.querySelector('#dealList');
const template = document.querySelector('#dealTemplate');
const systemCards = document.querySelector('#systemCards');
const systemWarnings = document.querySelector('#systemWarnings');
const refreshSystemStatusButton = document.querySelector('#refreshSystemStatus');

const storageKey = 'vcarx-admin-token';

function getToken() {
  return window.localStorage.getItem(storageKey) || '';
}

function setToken(value) {
  window.localStorage.setItem(storageKey, value);
}

function setStatus(message) {
  statusText.textContent = message;
}

function renderLines(container, lines) {
  container.innerHTML = '';
  lines.filter(Boolean).forEach((line) => {
    const div = document.createElement('div');
    div.textContent = line;
    container.appendChild(div);
  });
}

function renderSystemStatus(system) {
  systemCards.innerHTML = '';

  const sections = [
    {
      title: 'Güvenlik',
      ready: system.security?.ready,
      lines: [
        system.security?.hasAdminToken ? 'Admin token hazır' : 'Admin token eksik',
        system.security?.hasStrongSessionSecret ? 'Session secret güçlü' : 'Session secret eksik/zayıf',
        system.security?.hasDataEncryptionSecret ? 'Veri şifreleme anahtarı hazır' : 'Veri şifreleme anahtarı eksik',
        system.security?.hasLookupSecret ? 'Lookup secret hazır' : 'Lookup secret eksik',
        system.security?.requireHttps ? 'HTTPS zorunlu' : 'HTTPS zorunlu değil',
      ],
    },
    {
      title: 'Premium',
      ready: system.premium?.googlePlayReady && system.premium?.appStoreReady,
      lines: [
        system.premium?.monthlyProductConfigured ? 'Aylık premium SKU hazır' : 'Aylık premium SKU eksik',
        system.premium?.yearlyProductConfigured ? 'Yıllık premium SKU hazır' : 'Yıllık premium SKU eksik',
        system.premium?.googlePlayReady ? 'Google Play doğrulaması hazır' : 'Google Play doğrulaması eksik',
        system.premium?.appStoreReady ? 'App Store doğrulaması hazır' : 'App Store doğrulaması eksik',
        `App Store ortamı: ${system.premium?.appStoreEnvironment || 'bilinmiyor'}`,
      ],
    },
    {
      title: 'Ödemeler',
      ready: system.insurancePayments?.ready,
      lines: [
        system.insurancePayments?.paymentProxyUrlConfigured
          ? 'Garanti / payment proxy hattı bağlı'
          : 'Payment proxy URL eksik',
      ],
    },
    {
      title: 'Doğrulama',
      ready: system.otp?.emailReady || system.otp?.smsReady,
      lines: [
        system.otp?.emailReady ? 'E-posta OTP hazır' : 'E-posta OTP eksik',
        system.otp?.smsReady ? 'SMS OTP hazır' : 'SMS OTP eksik',
      ],
    },
    {
      title: 'AI',
      ready: system.ai?.deepseekReady || system.ai?.openaiReady,
      lines: [
        system.ai?.deepseekReady ? 'DeepSeek hazır' : 'DeepSeek key eksik',
        system.ai?.openaiReady ? 'OpenAI hazır' : 'OpenAI key eksik',
      ],
    },
  ];

  sections.forEach((section) => {
    const card = document.createElement('section');
    card.className = 'system-card';

    const title = document.createElement('h3');
    title.textContent = section.title;
    card.appendChild(title);

    const badge = document.createElement('span');
    badge.className = `system-badge ${section.ready ? 'ready' : 'waiting'}`;
    badge.textContent = section.ready ? 'Hazır' : 'Eksik yapılandırma';
    card.appendChild(badge);

    const lines = document.createElement('div');
    lines.className = 'detail-lines';
    renderLines(lines, section.lines);
    card.appendChild(lines);

    systemCards.appendChild(card);
  });

  renderLines(
    systemWarnings,
    Array.isArray(system.warnings) && system.warnings.length
      ? system.warnings
      : ['Şu anda kritik uyarı görünmüyor.'],
  );
}

async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'İşlem başarısız oldu.');
  }

  return data;
}

function renderDeals(deals) {
  dealList.innerHTML = '';
  dealCount.textContent = String(deals.length);

  if (!deals.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Henüz aktif satış/sigorta kaydı yok.';
    dealList.appendChild(empty);
    return;
  }

  deals.forEach((deal) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.deal-title').textContent = deal.listing?.title || 'İlan bulunamadı';
    node.querySelector('.deal-meta').textContent =
      `${deal.listing?.price || ''} • ${deal.listing?.location || ''}`.trim();
    node.querySelector('.deal-status').textContent = deal.status || 'missing';

    renderLines(node.querySelector('.buyer-lines'), [
      deal.buyer?.name,
      deal.buyer?.handle,
      deal.buyer?.email,
      deal.buyer?.phone,
      deal.buyer?.identityNumber ? `T.C.: ${deal.buyer.identityNumber}` : '',
      deal.buyer?.addressLine,
      [deal.buyer?.district, deal.buyer?.city].filter(Boolean).join(' / '),
    ]);

    renderLines(node.querySelector('.seller-lines'), [
      deal.seller?.name,
      deal.seller?.handle,
      deal.seller?.email,
      deal.seller?.phone,
      deal.seller?.identityNumber ? `T.C.: ${deal.seller.identityNumber}` : '',
      deal.seller?.addressLine,
      [deal.seller?.district, deal.seller?.city].filter(Boolean).join(' / '),
    ]);

    renderLines(node.querySelector('.registration-lines'), [
      deal.registrationInfo?.ownerName,
      deal.registrationInfo?.ownerIdentityNumber
        ? `Kimlik: ${deal.registrationInfo.ownerIdentityNumber}`
        : '',
      deal.registrationInfo?.serialNumber ? `Seri: ${deal.registrationInfo.serialNumber}` : '',
      deal.registrationInfo?.documentNumber ? `Belge: ${deal.registrationInfo.documentNumber}` : '',
      deal.registrationInfo?.plateNumber ? `Plaka: ${deal.registrationInfo.plateNumber}` : '',
      deal.registrationSharedAt ? `Paylaşıldı: ${deal.registrationSharedAt}` : '',
    ]);

    renderLines(node.querySelector('.insurance-lines'), [
      deal.quoteAmount ? `Teklif: ${deal.quoteAmount}` : 'Teklif girilmedi',
      deal.paymentReference ? `Ödeme ref: ${deal.paymentReference}` : '',
      deal.paymentPaidAt ? `Ödendi: ${deal.paymentPaidAt}` : '',
      deal.policyUri ? `Poliçe: ${deal.policyUri}` : '',
      deal.policySentAt ? `Mail gönderildi: ${deal.policySentAt}` : '',
    ]);

    const quoteForm = node.querySelector('.quote-form');
    quoteForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const amount = new FormData(quoteForm).get('amount');
      try {
        setStatus('Teklif kaydediliyor...');
        const data = await api(`/api/admin/deals/${deal.conversationId}/quote`, {
          method: 'POST',
          body: { amount },
        });
        setStatus('Teklif kaydedildi');
        renderDeals(data.deals || []);
      } catch (error) {
        setStatus(error.message);
      }
    });

    const policyForm = node.querySelector('.policy-form');
    policyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const policyUrl = new FormData(policyForm).get('policyUrl');
      try {
        setStatus('Poliçe maili gönderiliyor...');
        const data = await api(`/api/admin/deals/${deal.conversationId}/policy`, {
          method: 'POST',
          body: { policyUrl },
        });
        setStatus('Poliçe maili gönderildi');
        renderDeals(data.deals || []);
      } catch (error) {
        setStatus(error.message);
      }
    });

    dealList.appendChild(node);
  });
}

async function loadDeals() {
  try {
    setStatus('Kayıtlar yükleniyor...');
    const data = await api('/api/admin/deals');
    renderDeals(data.deals || []);
    setStatus('Bağlı');
  } catch (error) {
    setStatus(error.message);
    dealList.innerHTML = '';
  }
}

async function loadSystemStatus() {
  try {
    const data = await api('/api/admin/system/status');
    renderSystemStatus(data.system || {});
  } catch (error) {
    renderLines(systemWarnings, [error.message]);
    systemCards.innerHTML = '';
  }
}

saveTokenButton.addEventListener('click', () => {
  setToken(tokenInput.value.trim());
  loadDeals();
  loadSystemStatus();
});

refreshSystemStatusButton.addEventListener('click', () => {
  loadSystemStatus();
});

tokenInput.value = getToken();
if (getToken()) {
  loadDeals();
  loadSystemStatus();
}

