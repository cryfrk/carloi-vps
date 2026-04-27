import { Suspense } from 'react';

import { RegisterWizardScreen } from '@/screens/register-wizard-screen';

function RegisterFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-card">
        Kayit alani hazirlaniyor...
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterWizardScreen />
    </Suspense>
  );
}
