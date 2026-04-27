'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Bot,
  CarFront,
  Home,
  MessageSquareText,
  Plus,
  Search,
  UserRound,
} from 'lucide-react';
import clsx from 'clsx';

import { useSessionStore } from '@/store/session-store';
import { useUiStore } from '@/store/ui-store';

const navItems = [
  { href: '/feed', label: 'Ana Sayfa', icon: Home },
  { href: '/messages', label: 'Mesajlar', icon: MessageSquareText },
  { href: '/loi-ai', label: 'Loi AI', icon: Bot },
  { href: '/garage', label: 'Garajim', icon: CarFront },
  { href: '/profile', label: 'Profil', icon: UserRound },
] as const;

const utilityItems = [
  { href: '/search', label: 'Arama', icon: Search },
  { href: '/notifications', label: 'Bildirim', icon: Bell },
] as const;

export function FloatingIslandDock() {
  const pathname = usePathname();
  const router = useRouter();
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const status = useSessionStore((state) => state.status);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-3">
      <div className="pointer-events-auto flex w-full max-w-[920px] items-center justify-between gap-2 rounded-full border border-white/60 bg-white/75 px-3 py-3 shadow-dock backdrop-blur-dock supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-1 flex-wrap items-center justify-center gap-2 md:justify-start">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'group inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5',
                  active
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950',
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            if (status !== 'authenticated') {
              router.push('/login');
              return;
            }
            openCreateModal();
          }}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg transition hover:-translate-y-1 hover:bg-cyan-700"
          title="Yeni icerik olustur"
        >
          <Plus className="size-5" />
        </button>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-2 md:justify-end">
          {utilityItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5',
                  active
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950',
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
