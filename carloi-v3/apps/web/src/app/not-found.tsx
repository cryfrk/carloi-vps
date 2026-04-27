export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-card">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Carloi V3</div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Bu sayfa bulunamadi</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Aradigin ekran tasinmis olabilir. Akisa donerek uygulamada gezinmeye devam edebilirsin.
        </p>
        <div className="mt-6 flex justify-center">
          <a href="/feed" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">
            Ana akisa don
          </a>
        </div>
      </div>
    </div>
  );
}
