'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CarloiV3][Web] route-error', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-card">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">Carloi V3</div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Bu ekran acilamadi</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Beklenmeyen bir arayuz sorunu olustu. Sayfayi yenileyebilir ya da akisa geri donebilirsin.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Tekrar dene
          </button>
          <a href="/feed" className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700">
            Ana akisa don
          </a>
        </div>
      </div>
    </div>
  );
}
