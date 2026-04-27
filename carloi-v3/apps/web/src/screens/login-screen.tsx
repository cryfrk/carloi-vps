'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AuthShell } from '@/components/auth-shell';
import { StateBlock } from '@/components/state-block';
import { useSessionStore } from '@/store/session-store';

export function LoginScreen() {
  const router = useRouter();
  const login = useSessionStore((state) => state.login);
  const error = useSessionStore((state) => state.error);
  const busyLabel = useSessionStore((state) => state.busyLabel);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await login(identifier, password);
    if (success) {
      router.push('/feed');
    }
  }

  return (
    <AuthShell
      title="Giris yap"
      subtitle="E-posta, telefon veya kullanici adi ile hesabina eris."
      footer={
        <div className="text-center text-sm text-slate-500">
          Hesabin yok mu?{' '}
          <Link href="/register" className="font-semibold text-cyan-700">
            Uye ol
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Kullanici adi / e-posta / telefon</span>
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="field-input"
            autoComplete="username"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Sifre</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field-input"
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={!identifier.trim() || password.length < 6}
          className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busyLabel || 'Giris yap'}
        </button>
        <div className="text-center text-sm text-slate-500">
          E-posta dogrulama baglantin varsa{' '}
          <Link href="/verify" className="font-semibold text-cyan-700">
            dogrulama ekranini ac
          </Link>
          .
        </div>
        {error ? <StateBlock title={error.title} description={error.description} tone="danger" /> : null}
      </form>
    </AuthShell>
  );
}
