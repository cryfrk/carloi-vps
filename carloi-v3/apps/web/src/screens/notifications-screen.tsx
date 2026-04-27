'use client';

import { useMemo } from 'react';

import { safeDateLabel } from '@/lib/date';
import { useSessionStore } from '@/store/session-store';
import { StateBlock } from '@/components/state-block';

export function NotificationsScreen() {
  const snapshot = useSessionStore((state) => state.snapshot);

  const items = useMemo(() => {
    const result: Array<{ id: string; title: string; description: string; createdAt?: string }> = [];
    for (const conversation of snapshot?.conversations || []) {
      if (conversation.unread) {
        result.push({
          id: `${conversation.id}-unread`,
          title: `${conversation.name} sohbetinde yeni mesaj`,
          description: conversation.lastMessage || 'Yeni mesaj geldi.',
          createdAt: conversation.lastSeen,
        });
      }
      if (conversation.insuranceStatus?.policySentAt) {
        result.push({
          id: `${conversation.id}-policy`,
          title: 'Sigorta poliçesi hazir',
          description: 'Admin panelinden poliçe dokumani gonderildi.',
          createdAt: conversation.insuranceStatus.policySentAt,
        });
      }
    }

    if (snapshot?.commercial?.status) {
      result.push({
        id: 'commercial-status',
        title: 'Ticari basvuru durumu',
        description: `Durum: ${snapshot.commercial.status}`,
        createdAt: snapshot.commercial.approvedAt,
      });
    }

    return result;
  }, [snapshot?.commercial, snapshot?.conversations]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Bildirimler</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Mesaj, sigorta ve ticari hesap akislarindan uretilen uygulama ici bildirimler burada toplanir.
        </p>
      </div>
      {items.length ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="glass-card p-5">
              <div className="font-semibold text-slate-950">{item.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{item.description}</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {safeDateLabel(item.createdAt, 'Bugun')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <StateBlock title="Bildirim yok" description="Yeni mesaj, ticari onay ve sigorta durumlari burada gorunecek." />
      )}
    </div>
  );
}
