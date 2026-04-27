'use client';

import type { ReactNode } from 'react';

import clsx from 'clsx';

interface StateBlockProps {
  title: string;
  description: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

const toneMap = {
  neutral: 'border-slate-200 bg-white text-slate-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
} satisfies Record<NonNullable<StateBlockProps['tone']>, string>;

export function StateBlock({
  title,
  description,
  tone = 'neutral',
  action,
  actionLabel,
  onAction,
}: StateBlockProps) {
  const computedAction =
    action ||
    (actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="rounded-full border border-current/15 bg-white/80 px-4 py-2 text-sm font-semibold text-current"
      >
        {actionLabel}
      </button>
    ) : null);
  return (
    <div className={clsx('rounded-[28px] border p-5 shadow-card', toneMap[tone])}>
      <div className="space-y-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm leading-6 text-current/80">{description}</p>
      </div>
      {computedAction ? <div className="mt-4">{computedAction}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Yukleniyor...' }: { label?: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-32 rounded-full bg-slate-200" />
        <div className="h-3 w-full rounded-full bg-slate-100" />
        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
    </div>
  );
}
