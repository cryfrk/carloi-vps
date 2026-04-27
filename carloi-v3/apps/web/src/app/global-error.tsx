'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[CarloiV3][Web] global-error', error);

  return (
    <html lang="tr">
      <body className="bg-slate-50">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-lg rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-card">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Carloi V3</div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Beklenmeyen bir hata olustu</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Sayfa yeniden denenebilir. Sorun devam ederse giris ekranindan akisa tekrar don.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={reset}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Tekrar dene
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
