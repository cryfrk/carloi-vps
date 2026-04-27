'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCheck, Shield } from 'lucide-react';

import { sendConversationMessage, toggleListingAgreement } from '@/lib/api';
import { safeRelativeTime } from '@/lib/date';
import { useSessionStore } from '@/store/session-store';
import { StateBlock } from '@/components/state-block';

export function MessagesScreen() {
  const searchParams = useSearchParams();
  const status = useSessionStore((state) => state.status);
  const snapshot = useSessionStore((state) => state.snapshot);
  const refreshSnapshot = useSessionStore((state) => state.refreshSnapshot);
  const [selectedId, setSelectedId] = useState(searchParams.get('conversation') || snapshot?.conversations?.[0]?.id || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const conversations = snapshot?.conversations || [];
  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || conversations[0] || null,
    [conversations, selectedId],
  );

  useEffect(() => {
    if (!selectedId && conversations[0]?.id) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  async function handleSend() {
    if (!selectedConversation || !message.trim()) {
      return;
    }
    setBusy(true);
    try {
      await sendConversationMessage(selectedConversation.id, message.trim());
      setMessage('');
      await refreshSnapshot();
    } finally {
      setBusy(false);
    }
  }

  async function handleAgreement() {
    if (!selectedConversation) {
      return;
    }
    setBusy(true);
    try {
      await toggleListingAgreement(selectedConversation.id);
      await refreshSnapshot();
    } finally {
      setBusy(false);
    }
  }

  if (status !== 'authenticated') {
    return (
      <StateBlock
        title="Mesajlar icin giris yap"
        description="Birebir sohbetler, ilan mesajlasmasi ve sigorta sureci icin oturum gerekli."
      />
    );
  }

  return (
    <div className="grid min-h-[72vh] gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="glass-card p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">Sohbetler</div>
        <div className="space-y-2">
          {conversations.length ? (
            conversations.map((conversation) => {
              const active = conversation.id === selectedConversation?.id;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full rounded-[24px] px-4 py-4 text-left transition ${
                    active ? 'bg-cyan-50 text-cyan-900' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{conversation.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{conversation.lastMessage || 'Henüz mesaj yok'}</div>
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {conversation.unread ? `${conversation.unread} yeni` : 'hazir'}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <StateBlock title="Mesaj kutun bos" description="Ilk sohbetlerini ilanlar veya profiller uzerinden baslatabilirsin." />
          )}
        </div>
      </section>

      <section className="glass-card flex min-h-[72vh] flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xl font-black tracking-tight text-slate-950">{selectedConversation.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {selectedConversation.type === 'listing' ? 'Ilan baglamli sohbet' : 'Dogrudan mesaj'}
                  </div>
                </div>
                {selectedConversation.type === 'listing' ? (
                  <button
                    type="button"
                    onClick={() => void handleAgreement()}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800"
                  >
                    <CheckCheck className="size-4" />
                    <span>Anlastik</span>
                  </button>
                ) : null}
              </div>

              {selectedConversation.listingContext?.listing ? (
                <div className="mt-4 rounded-[24px] bg-slate-50 p-4">
                  <div className="font-semibold text-slate-900">
                    {selectedConversation.listingContext.listing.title || 'Ilan karti'}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {[selectedConversation.listingContext.listing.location, selectedConversation.listingContext.listing.price]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                </div>
              ) : null}

              {selectedConversation.agreement?.buyerAgreed || selectedConversation.agreement?.sellerAgreed ? (
                <div className="mt-4 rounded-[24px] bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  Taraflar arasinda anlasma sinyali var. Her iki taraf da onaylarsa ruhsat ve sigorta akisi acilir.
                </div>
              ) : null}
              {selectedConversation.insuranceStatus?.registrationSharedAt ? (
                <div className="mt-4 rounded-[24px] bg-cyan-50 p-4 text-sm leading-6 text-cyan-900">
                  Ruhsat paylasildi. Sigorta teklifi olusturma ve admin paneli akisi aktif.
                </div>
              ) : null}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {selectedConversation.messages.map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[80%] rounded-[24px] px-4 py-3 ${
                    item.isMine ? 'ml-auto bg-slate-950 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="text-sm leading-6">{item.text}</div>
                  <div className={`mt-2 text-[11px] ${item.isMine ? 'text-white/70' : 'text-slate-500'}`}>
                    {safeRelativeTime(item.time || item.editedAt)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <div className="mb-3 flex items-center gap-2 text-xs leading-5 text-slate-500">
                <Shield className="size-4" />
                <span>Ilan sohbetlerinde anlastik ve sigorta sureci bu ekrandan devam eder.</span>
              </div>
              <div className="flex gap-3">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Mesajini yaz"
                  className="field-input"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!message.trim() || busy}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Gonder
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="m-auto max-w-md">
            <StateBlock
              title="Sohbet sec"
              description="Ilan mesajlasmasi, birebir iletisim ve sigorta surecini baslatmak icin soldan bir sohbet ac."
            />
          </div>
        )}
      </section>
    </div>
  );
}
