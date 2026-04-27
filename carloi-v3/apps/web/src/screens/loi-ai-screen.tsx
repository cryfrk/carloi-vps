'use client';

import { useMemo, useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';

import { chatWithAi, clearAiChat } from '@/lib/api';
import { useSessionStore } from '@/store/session-store';
import { StateBlock } from '@/components/state-block';

export function LoiAiScreen() {
  const snapshot = useSessionStore((state) => state.snapshot);
  const refreshSnapshot = useSessionStore((state) => state.refreshSnapshot);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedVehicle = snapshot?.garage?.vehicles?.[0] || null;
  const aiMessages = snapshot?.aiMessages || [];

  const prompts = useMemo(
    () => [
      'Butceme gore arac oner',
      'Garajimdaki aracin kronik sorunlari neler olabilir?',
      'Bu ilani benzerleriyle karsilastir',
      'OBD verilerinden riskli parcalari yorumla',
    ],
    [],
  );

  async function handleAsk(promptText?: string) {
    const content = (promptText || message).trim();
    if (!content) {
      return;
    }

    setBusy(true);
    setLocalError(null);
    try {
      await chatWithAi(content, {
        vehicleId: selectedVehicle?.id,
        vehicleSummary: selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : undefined,
      });
      setMessage('');
      await refreshSnapshot();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'AI servisi gecici olarak kullanilamiyor.');
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await clearAiChat();
      await refreshSnapshot();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-card flex min-h-[72vh] flex-col overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
              <Bot className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">Loi AI</h1>
              <p className="mt-1 text-sm text-slate-500">Ariza yorumu, ilan karsilastirma ve butceye gore arac asistani.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {aiMessages.length ? (
            aiMessages.map((item) => (
              <div
                key={item.id}
                className={`max-w-[86%] rounded-[26px] px-4 py-3 ${
                  item.role === 'assistant' ? 'bg-slate-100 text-slate-800' : 'ml-auto bg-slate-950 text-white'
                }`}
              >
                <div className="text-sm leading-7">{item.content}</div>
              </div>
            ))
          ) : (
            <StateBlock
              title="Loi AI hazir"
              description="Arac sec, bir soru yaz ve AI ile ariza, ekspertiz veya ilan karsilastirma akisina basla."
            />
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Loi AI'a sorunuzu yazin"
            className="min-h-[120px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleAsk()}
              disabled={!message.trim() || busy}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busy ? 'Gonderiliyor...' : 'Sor'}
            </button>
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={busy || !aiMessages.length}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sohbeti temizle
            </button>
          </div>
          {localError ? <div className="mt-3"><StateBlock title="Loi AI gecici olarak kullanilamiyor" description={localError} tone="warning" /></div> : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Sparkles className="size-4 text-cyan-700" />
            <span>Hazir promptlar</span>
          </div>
          <div className="mt-4 grid gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void handleAsk(prompt)}
                className="rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm font-semibold text-slate-700">Secili arac baglami</div>
          {selectedVehicle ? (
            <div className="mt-4 rounded-[24px] bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">
                {[selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(' ')}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {[selectedVehicle.year, selectedVehicle.fuelType, selectedVehicle.transmission].filter(Boolean).join(' • ')}
              </div>
            </div>
          ) : (
            <StateBlock
              title="Garaj baglami yok"
              description="Garajim alaninda arac eklediginde Loi AI, arac verilerini daha iyi yorumlayabilir."
            />
          )}
        </div>
      </section>
    </div>
  );
}
