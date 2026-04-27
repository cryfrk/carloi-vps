'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, ShieldCheck, UserRound } from 'lucide-react';

import { useSessionStore } from '@/store/session-store';
import { AuthShell } from '@/components/auth-shell';
import { LoadingBlock } from '@/components/state-block';

export function AuthLandingScreen() {
  const status = useSessionStore((state) => state.status);
  const bootstrapReady = useSessionStore((state) => state.bootstrapReady);

  if (!bootstrapReady && status === 'booting') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <LoadingBlock label="Carloi V3 web hazirlaniyor..." />
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title="Carloi'ye hos geldin"
      subtitle="Mobil deneyimin web'e uyarlanmis, dock odakli yeni V3 arayuzu."
      footer={
        <div className="text-center text-sm text-slate-500">
          Zaten hesabin var mi?{' '}
          <Link href="/login" className="font-semibold text-cyan-700">
            Giris yap
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <LandingCard
          href="/register?type=individual"
          icon={<UserRound className="size-5" />}
          title="Bireysel hesap olustur"
          description="Profil, garaj, sosyal akis ve ilan icin bireysel V3 kaydini baslat."
        />
        <LandingCard
          href="/register?type=commercial"
          icon={<Building2 className="size-5" />}
          title="Ticari hesap olustur"
          description="Belge, rozet ve profesyonel yayin haklari icin ticari kayit wizard'ini ac."
        />
        <LandingCard
          href={status === 'authenticated' ? '/feed' : '/login'}
          icon={<ShieldCheck className="size-5" />}
          title={status === 'authenticated' ? 'Ana akisa don' : 'Giris yap'}
          description={status === 'authenticated' ? 'Oturumun hazir. Akis, mesajlar ve Garajim burada.' : 'E-posta, telefon veya kullanici adi ile hesabina gir.'}
        />
      </div>
    </AuthShell>
  );
}

function LandingCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50/70"
    >
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-cyan-700 shadow-sm">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-black tracking-tight text-slate-950">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-500">{description}</span>
      </span>
      <ArrowRight className="size-5 text-slate-400 transition group-hover:text-cyan-700" />
    </Link>
  );
}
