import { Suspense } from 'react';

import { SearchScreen } from '@/screens/search-screen';

function SearchFallback() {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 text-sm text-slate-500 shadow-card">
      Arama ekrani yukleniyor...
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchScreen />
    </Suspense>
  );
}
