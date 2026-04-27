'use client';

import clsx from 'clsx';

interface SectionTabsProps<TValue extends string> {
  options: Array<{
    label: string;
    value: TValue;
    disabled?: boolean;
    hint?: string;
  }>;
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
}

export function SectionTabs<TValue extends string>({
  options,
  value,
  onChange,
  className,
}: SectionTabsProps<TValue>) {
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition',
              active
                ? 'border-cyan-200 bg-cyan-50 text-cyan-800 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
              option.disabled && 'cursor-not-allowed opacity-45',
            )}
            title={option.hint}
          >
            <span>{option.label}</span>
            {option.disabled && option.hint ? (
              <span className="text-[11px] font-medium text-slate-400">{option.hint}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
