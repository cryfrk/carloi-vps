'use client';

import Link from 'next/link';
import { Bell, Plus, Search } from 'lucide-react';

import { useUiStore } from '@/store/ui-store';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const openCreateModal = useUiStore((state) => state.openCreateModal);

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
        {subtitle ? <p className="max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
        >
          <Plus className="size-4" />
          <span>Olustur</span>
        </button>
        <Link
          href="/search"
          className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300"
        >
          <Search className="size-4" />
        </Link>
        <Link
          href="/notifications"
          className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300"
        >
          <Bell className="size-4" />
        </Link>
      </div>
    </div>
  );
}
