'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { buildRegisterConsents } from '@/lib/api';
import { fixMojibake } from '@/lib/mojibake';
import { AuthShell } from '@/components/auth-shell';
import { LegalModal } from '@/components/legal-modal';
import { SectionTabs } from '@/components/section-tabs';
import { StateBlock } from '@/components/state-block';
import { useSessionStore } from '@/store/session-store';

export function RegisterWizardScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useSessionStore((state) => state.register);
  const requestSignupCode = useSessionStore((state) => state.requestSignupCode);
  const error = useSessionStore((state) => state.error);
  const busyLabel = useSessionStore((state) => state.busyLabel);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountType, setAccountType] = useState<'individual' | 'commercial'>(
    searchParams.get('type') === 'commercial' ? 'commercial' : 'individual',
  );
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [acceptedVersions, setAcceptedVersions] = useState<Record<string, string>>({});
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [channelPrimed, setChannelPrimed] = useState(false);

  const { requiredDocuments } = useMemo(
    () => buildRegisterConsents(accountType, acceptedVersions),
    [acceptedVersions, accountType],
  );
  const activeDocument = requiredDocuments.find((document) => document.id === activeDocumentId) || null;

  const docsAccepted = requiredDocuments.every((document) => acceptedVersions[document.id] === document.version);
  const baseValid =
    name.trim() &&
    surname.trim() &&
    handle.trim() &&
    password.length >= 6 &&
    password === passwordRepeat &&
    (channel === 'email' ? email.trim() : phone.trim());
  const commercialValid =
    accountType === 'individual' ? true : companyName.trim() && taxOffice.trim() && (identityNumber.trim() || taxNumber.trim());
  const canSubmit = Boolean(baseValid && commercialValid && docsAccepted);

  async function handlePhoneVerificationStart() {
    if (!phone.trim()) {
      return;
    }
    const success = await requestSignupCode('phone', phone.trim());
    if (success) {
      setChannelPrimed(true);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    if (channel === 'phone' && !channelPrimed) {
      await handlePhoneVerificationStart();
      return;
    }

    if (channel === 'phone' && !verificationCode.trim()) {
      return;
    }

    const success = await register({
      name: `${name} ${surname}`.trim(),
      handle,
      password,
      accountType,
      primaryChannel: channel,
      email: channel === 'email' ? email.trim() : undefined,
      phone: channel === 'phone' ? phone.trim() : undefined,
      bio: accountType === 'commercial' ? `${companyName} • Ticari hesap` : '',
      verificationCode: channel === 'phone' ? verificationCode.trim() : undefined,
      consents: requiredDocuments.map((document) => ({
        type: document.id,
        accepted: acceptedVersions[document.id] === document.version,
        version: document.version,
        sourceScreen: 'RegisterWizard',
      })),
      commercialProfile:
        accountType === 'commercial'
          ? {
              companyName,
              taxOrIdentityType: identityNumber ? 'TCKN' : 'VKN',
              taxOrIdentityNumber: identityNumber || taxNumber,
              tradeName: companyName,
              authorizedPersonName: `${name} ${surname}`.trim(),
              phone: phone.trim(),
              city: '',
              district: '',
              address: '',
              notes: taxOffice ? `Vergi dairesi: ${taxOffice}` : '',
            }
          : undefined,
    });

    if (!success) {
      return;
    }

    if (channel === 'phone') {
      router.push('/feed');
      return;
    }

    router.push('/verify');
  }

  return (
    <AuthShell
      title="Uye ol"
      subtitle="Bireysel veya ticari hesapla Carloi V3 akisini baslat."
      footer={
        <div className="text-center text-sm text-slate-500">
          Zaten hesabin var mi?{' '}
          <Link href="/login" className="font-semibold text-cyan-700">
            Giris yap
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {[1, 2, 3].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStep(value as 1 | 2 | 3)}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
              step === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {value === 1 ? 'Hesap tipi' : value === 2 ? 'Kanal' : 'Bilgiler'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                value: 'individual',
                title: 'Bireysel',
                description: 'Sosyal akis, Garajim ve ilan deneyimi icin bireysel kayit.',
              },
              {
                value: 'commercial',
                title: 'Ticari',
                description: 'Belge ve onay sureciyle profesyonel yayin haklarini acar.',
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setAccountType(option.value as 'individual' | 'commercial');
                  setStep(2);
                }}
                className={`rounded-[28px] border p-5 text-left transition ${
                  accountType === option.value ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="text-lg font-black tracking-tight text-slate-950">{option.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">{option.description}</div>
              </button>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <SectionTabs
            value={channel}
            onChange={(value) => {
              setChannel(value);
              setStep(3);
            }}
            options={[
              { label: 'E-posta ile kayit', value: 'email' },
              { label: 'Telefon ile kayit', value: 'phone' },
            ]}
          />
        ) : null}

        {step === 3 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Isim</span>
                <input value={name} onChange={(event) => setName(event.target.value)} className="field-input" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Soyisim</span>
                <input value={surname} onChange={(event) => setSurname(event.target.value)} className="field-input" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Kullanici adi</span>
                <input value={handle} onChange={(event) => setHandle(event.target.value)} className="field-input" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">{channel === 'email' ? 'E-posta' : 'Telefon'}</span>
                <input
                  value={channel === 'email' ? email : phone}
                  onChange={(event) => (channel === 'email' ? setEmail(event.target.value) : setPhone(event.target.value))}
                  className="field-input"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Sifre</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Sifre tekrar</span>
                <input type="password" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} className="field-input" />
              </label>
            </div>

            {accountType === 'commercial' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Firma adi</span>
                  <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Vergi dairesi</span>
                  <input value={taxOffice} onChange={(event) => setTaxOffice(event.target.value)} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">T.C. kimlik no</span>
                  <input value={identityNumber} onChange={(event) => setIdentityNumber(event.target.value)} className="field-input" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Vergi no</span>
                  <input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} className="field-input" />
                </label>
                {channel !== 'phone' ? (
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Yetkili telefon</span>
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} className="field-input" />
                  </label>
                ) : null}
              </div>
            ) : null}

            {channel === 'phone' ? (
              <div className="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700">SMS dogrulamasi</div>
                <p className="text-sm leading-6 text-slate-500">
                  Telefon kaydinda once dogrulama kodu gonderilir. Kod gelince asagidaki alana girerek kaydi tamamlarsin.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handlePhoneVerificationStart()}
                    disabled={!phone.trim()}
                    className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {channelPrimed ? 'Kodu tekrar gonder' : 'SMS kodu gonder'}
                  </button>
                  <input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    placeholder="6 haneli kod"
                    className="field-input sm:max-w-[220px]"
                  />
                </div>
              </div>
            ) : (
              <StateBlock
                title="E-posta dogrulamasi"
                description="Kaydi tamamladiginda e-posta dogrulama baglantisi ve kodu gonderilir. Dogrulama sonrasi otomatik giris akisa tasinir."
              />
            )}

            <div className="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-700">Sozlesmeler</div>
              <div className="space-y-3">
                {requiredDocuments.map((document) => {
                  const accepted = acceptedVersions[document.id] === document.version;
                  return (
                    <div key={document.id} className="flex flex-col gap-3 rounded-[22px] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{fixMojibake(document.shortTitle)}</div>
                        <div className="mt-1 text-sm text-slate-500">Surum {document.version}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveDocumentId(document.id)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          accepted ? 'bg-cyan-50 text-cyan-800' : 'bg-slate-950 text-white'
                        }`}
                      >
                        {accepted ? 'Kabul edildi' : 'Ac ve kabul et'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}

        {passwordRepeat && password !== passwordRepeat ? (
          <StateBlock
            title="Sifreler uyusmuyor"
            description="Kaydi tamamlamak icin sifre ve sifre tekrar alanlari ayni olmali."
            tone="warning"
          />
        ) : null}

        {error ? <StateBlock title={error.title} description={error.description} tone="danger" /> : null}

        <div className="flex flex-wrap gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Geri
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((current) => (current === 1 ? 2 : 3))}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Devam et
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit || (channel === 'phone' && channelPrimed && !verificationCode.trim())}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busyLabel || (channel === 'phone' ? (channelPrimed ? 'Kaydi tamamla' : 'SMS kodu gonder') : 'Kaydi tamamla')}
            </button>
          )}
        </div>
      </form>

      <LegalModal
        open={Boolean(activeDocument)}
        document={activeDocument}
        flow={accountType === 'commercial' ? 'register-commercial' : 'register-individual'}
        onClose={() => setActiveDocumentId(null)}
        onAccept={(documentId, version) => {
          setAcceptedVersions((state) => ({ ...state, [documentId]: version }));
          setActiveDocumentId(null);
        }}
      />
    </AuthShell>
  );
}
