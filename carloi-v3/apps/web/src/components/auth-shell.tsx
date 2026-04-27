'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { SessionBootstrap } from '@/components/session-bootstrap';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(236,254,255,0.95),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_100%)] px-4 py-10 sm:px-6">
      <SessionBootstrap />
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6">
          <Link href="/" className="inline-flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-slate-950 text-white">C</span>
            <span>Carloi V3</span>
          </Link>
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Sosyal otomotiv platformu</p>
            <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Aracini sergile, ilan ac, mesajlas ve tum sureci tek akista yonet.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              Carloi; sosyal akis, Garajim, ticari hesap, AI ve guvenli islem mantigini tek premium deneyimde birlestirir.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoPill title="Canli API" value="api.carloi.com" />
            <InfoPill title="Garaj" value="Coklu arac" />
            <InfoPill title="Akis" value="Sosyal + ilan" />
          </div>
        </section>

        <section className="rounded-[36px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] sm:p-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-slate-950">{title}</h2>
            <p className="text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 border-t border-slate-100 pt-5">{footer}</div> : null}
        </section>
      </div>
    </div>
  );
}

function InfoPill({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</div>
      <div className="mt-2 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
