'use client';

import { useEffect, useState } from 'react';

import { getCommercialStatus, saveCommercialProfile, submitCommercialOnboarding } from '@/lib/api';
import { toAppError } from '@/lib/errors';
import { StateBlock } from '@/components/state-block';

export function CommercialScreen() {
  const [statusPayload, setStatusPayload] = useState<Record<string, unknown> | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [address, setAddress] = useState('');
  const [businessType, setBusinessType] = useState('galeri');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    void getCommercialStatus()
      .then((response) => setStatusPayload((response.snapshot as Record<string, unknown>) || response.data || null))
      .catch(() => null);
  }, []);

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await saveCommercialProfile({
        companyName,
        authorizedPersonName: authorizedPerson,
        taxOrIdentityNumber: taxNumber,
        city: '',
        district: '',
        address,
        notes: `Vergi dairesi: ${taxOffice}`,
        businessType,
      });
      await submitCommercialOnboarding({ status: 'submitted' });
    } catch (caughtError) {
      setError(toAppError(caughtError, 'Ticari basvuru kaydedilemedi'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Ticari hesap</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Firma bilgileri, belge akisina hazir onboarding ve admin onay sureci burada yonetilir.
        </p>
      </div>

      {statusPayload ? (
        <StateBlock
          title="Mevcut durum"
          description={`Sistem durumu: ${String((statusPayload as { commercial?: { status?: string } }).commercial?.status || 'Basvuru yapilmadi')}`}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Firma adi</span>
          <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="field-input" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Yetkili kisi</span>
          <input value={authorizedPerson} onChange={(event) => setAuthorizedPerson(event.target.value)} className="field-input" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">VKN / TCKN</span>
          <input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} className="field-input" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Vergi dairesi</span>
          <input value={taxOffice} onChange={(event) => setTaxOffice(event.target.value)} className="field-input" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Adres</span>
          <textarea value={address} onChange={(event) => setAddress(event.target.value)} className="min-h-[120px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Faaliyet turu</span>
          <select value={businessType} onChange={(event) => setBusinessType(event.target.value)} className="field-input">
            <option value="galeri">Galeri</option>
            <option value="bayi">Yetkili bayi</option>
            <option value="oto-alim-satim">Oto alim satim</option>
            <option value="ekspertiz">Ekspertiz</option>
            <option value="sigorta">Sigorta</option>
            <option value="servis">Servis</option>
            <option value="oto-yikama">Oto yikama</option>
            <option value="yedek-parca">Yedek parca</option>
            <option value="kiralama">Kiralama</option>
            <option value="diger">Diger</option>
          </select>
        </label>
      </div>

      <StateBlock
        title="Belge akisi"
        description="Vergi levhasi, yetki belgesi, oda kaydi ve imza sirkuleri yukleme akisi admin panelindeki ticari inceleme kuyruğu ile calisacak sekilde tasarlandi. Bu baseline'da belge metadata ve form akisina hazir state sunulur."
      />

      {error ? <StateBlock title={error.title} description={error.description} tone="danger" /> : null}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={busy || !companyName.trim() || !authorizedPerson.trim() || !taxNumber.trim()}
        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {busy ? 'Kaydediliyor...' : 'Basvuruyu kaydet'}
      </button>
    </div>
  );
}
