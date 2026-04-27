import { Suspense } from 'react';

import { MessagesScreen } from '@/screens/messages-screen';

function MessagesFallback() {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 text-sm text-slate-500 shadow-card">
      Mesaj alani yukleniyor...
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesFallback />}>
      <MessagesScreen />
    </Suspense>
  );
}
