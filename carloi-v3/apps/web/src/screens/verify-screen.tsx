'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { AuthShell } from '@/components/auth-shell';
import { StateBlock } from '@/components/state-block';
import { useSessionStore } from '@/store/session-store';

export function VerifyScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingVerification = useSessionStore((state) => state.pendingVerification);
  const verifyEmailWithCode = useSessionStore((state) => state.verifyEmailWithCode);
  const verifyEmailWithToken = useSessionStore((state) => state.verifyEmailWithToken);
  const resendEmailCode = useSessionStore((state) => state.resendEmailCode);
  const error = useSessionStore((state) => state.error);
  const busyLabel = useSessionStore((state) => state.busyLabel);

  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState(pendingVerification?.email || '');
  const [code, setCode] = useState('');
  const [tokenResult, setTokenResult] = useState<'idle' | 'busy' | 'done'>('idle');

  useEffect(() => {
    if (!token || tokenResult !== 'idle') {
      return;
    }

    setTokenResult('busy');
    void verifyEmailWithToken(token).then((success) => {
      setTokenResult(success ? 'done' : 'idle');
      if (success) {
        router.push('/feed');
      }
    });
  }, [router, token, tokenResult, verifyEmailWithToken]);

  async function handleCodeVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await verifyEmailWithCode(email, code);
    if (success) {
      router.push('/feed');
    }
  }

  return (
    <AuthShell
      title="Dogrulama"
      subtitle="E-posta baglantini veya kodunu kullanarak hesabini etkinlestir."
      footer={
        <div className="text-center text-sm text-slate-500">
          Tekrar kayit ekranina donmek icin{' '}
          <Link href="/register" className="font-semibold text-cyan-700">
            uye ol
          </Link>
          .
        </div>
      }
    >
      {token ? (
        <StateBlock
          title="Baglanti isleniyor"
          description={tokenResult === 'done' ? 'Dogrulama basarili. Akisa geciyorsun.' : 'Dogrulama baglantisi kontrol ediliyor.'}
          tone={tokenResult === 'done' ? 'success' : 'neutral'}
        />
      ) : (
        <form onSubmit={handleCodeVerify} className="space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">E-posta</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Dogrulama kodu</span>
            <input value={code} onChange={(event) => setCode(event.target.value)} className="field-input" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!email.trim() || !code.trim()}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busyLabel || 'Dogrula'}
            </button>
            <button
              type="button"
              onClick={() => void resendEmailCode(email)}
              disabled={!email.trim()}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Kodu tekrar gonder
            </button>
          </div>
          {pendingVerification?.maskedDestination ? (
            <div className="text-sm text-slate-500">
              Kod hedefi: <span className="font-semibold text-slate-700">{pendingVerification.maskedDestination}</span>
            </div>
          ) : null}
          {error ? <StateBlock title={error.title} description={error.description} tone="danger" /> : null}
        </form>
      )}
    </AuthShell>
  );
}
