import type { AdminEndpointDefinition } from './types.js';

export const existingAdminEndpoints: readonly AdminEndpointDefinition[] = [
  { method: 'GET', path: '/api/admin/system/status', panelKey: 'dashboard', status: 'available', notes: 'Genel sistem sagligi ve operational durum.' },
  { method: 'GET', path: '/api/admin/dashboard', panelKey: 'dashboard', status: 'available', notes: 'Dashboard KPI ozetleri.' },
  { method: 'GET', path: '/api/admin/users', panelKey: 'users', status: 'available', notes: 'Kullanici listeleme.' },
  { method: 'GET', path: '/api/admin/users/:userId', panelKey: 'users', status: 'available', notes: 'Kullanici detay payloadi.' },
  { method: 'GET', path: '/api/admin/commercial/reviews', panelKey: 'commercial', status: 'available', notes: 'Ticari basvuru review kuyrugu.' },
  { method: 'GET', path: '/api/admin/commercial/:profileId', panelKey: 'commercial', status: 'available', notes: 'Tek ticari basvuru detayi.' },
  { method: 'POST', path: '/api/admin/commercial/:profileId/approve', panelKey: 'commercial', status: 'available', notes: 'Ticari basvuru onayi.' },
  { method: 'POST', path: '/api/admin/commercial/:profileId/reject', panelKey: 'commercial', status: 'available', notes: 'Ticari basvuru reddi.' },
  { method: 'POST', path: '/api/admin/commercial/:profileId/notes', panelKey: 'commercial', status: 'available', notes: 'Admin notu ekleme.' },
  { method: 'GET', path: '/api/admin/deals', panelKey: 'insurance', status: 'available', notes: 'Sigorta/satis deal listesi.' },
  { method: 'POST', path: '/api/admin/deals/:conversationId/quote', panelKey: 'insurance', status: 'available', notes: 'Teklif metadata ve quote aksiyonu.' },
  { method: 'POST', path: '/api/admin/deals/:conversationId/policy', panelKey: 'insurance', status: 'available', notes: 'Police/fatura benzeri son belge akisinin mevcut ucu.' },
  { method: 'GET', path: '/api/admin/listings', panelKey: 'listings', status: 'available', notes: 'Ilan listeleme.' },
  { method: 'POST', path: '/api/admin/listings/:postId/suspend', panelKey: 'listings', status: 'available', notes: 'Ilan askiya alma.' },
  { method: 'POST', path: '/api/admin/listings/:postId/reject', panelKey: 'listings', status: 'available', notes: 'Ilan reddi.' },
  { method: 'POST', path: '/api/admin/listings/:postId/restore', panelKey: 'listings', status: 'available', notes: 'Ilan geri acma.' },
  { method: 'GET', path: '/api/admin/messages', panelKey: 'messages', status: 'available', notes: 'Mesaj metadata listesi.' },
  { method: 'GET', path: '/api/admin/messages/content', panelKey: 'messages', status: 'available', notes: 'Mesaj icerigi goruntuleme.' },
  { method: 'GET', path: '/api/admin/messages/export', panelKey: 'messages', status: 'available', notes: 'Mesaj veya kanit export akisinin mevcut ucu.' },
  { method: 'GET', path: '/api/admin/payments', panelKey: 'payments', status: 'available', notes: 'Odeme listeleme.' },
  { method: 'GET', path: '/api/admin/payments/:paymentId', panelKey: 'payments', status: 'available', notes: 'Tek odeme detayi.' },
  { method: 'GET', path: '/api/admin/audit', panelKey: 'audit', status: 'available', notes: 'Audit log okuma.' }
] as const;

export const missingAdminEndpoints: readonly AdminEndpointDefinition[] = [
  { method: 'POST', path: '/api/admin/auth/login', panelKey: 'auth', status: 'missing', notes: 'Ayrik admin auth gerekli.' },
  { method: 'POST', path: '/api/admin/auth/2fa/verify', panelKey: 'auth', status: 'missing', notes: '2FA hazir altyapiyi gercek akisla tamamlar.' },
  { method: 'GET', path: '/api/admin/deals/:conversationId', panelKey: 'insurance', status: 'missing', notes: 'Sigorta paneli detayinda alici/satici/arac/ruhsat tek payload olmali.' },
  { method: 'POST', path: '/api/admin/deals/:conversationId/quote-file', panelKey: 'insurance', status: 'missing', notes: 'Teklif PDF yukleme ucu ayrik olmali.' },
  { method: 'POST', path: '/api/admin/deals/:conversationId/invoice-file', panelKey: 'invoices', status: 'missing', notes: 'Fatura PDF yukleme ucu ayrik olmali.' },
  { method: 'POST', path: '/api/admin/deals/:conversationId/notify', panelKey: 'insurance', status: 'missing', notes: 'Kullaniciya manuel bildirim/mail gonderim kontrolu.' },
  { method: 'GET', path: '/api/admin/posts', panelKey: 'posts', status: 'missing', notes: 'Gonderi paneli icin acik bir liste endpointi gerekli.' },
  { method: 'POST', path: '/api/admin/posts/:postId/remove', panelKey: 'posts', status: 'missing', notes: 'Gonderi moderasyon aksiyonunu ayrik endpoint ile netlestir.' },
  { method: 'GET', path: '/api/admin/messages/reports', panelKey: 'messages', status: 'missing', notes: 'Mesaj sikayetleri ve eskalasyonlari icin ayrik queue gerekli.' },
  { method: 'GET', path: '/api/admin/invoices', panelKey: 'invoices', status: 'missing', notes: 'Fatura listesi ayri panel gerektiriyor.' },
  { method: 'GET', path: '/api/admin/admin-users', panelKey: 'admin-users', status: 'missing', notes: 'Admin kullanici ve rol yonetimi icin ayrik liste gerekir.' },
  { method: 'POST', path: '/api/admin/admin-users/:adminId/roles', panelKey: 'admin-users', status: 'missing', notes: 'V3 rol atama ve RBAC yonetimi.' },
  { method: 'POST', path: '/api/admin/users/:userId/actions', panelKey: 'users', status: 'missing', notes: 'Uyari, ban, kisitlama ve neden kaydi icin tek davranis ucu.' }
] as const;
