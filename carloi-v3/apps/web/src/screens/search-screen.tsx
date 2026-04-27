'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { extractGarageVehicles, extractListingPosts } from '@/lib/snapshot';
import { useSessionStore } from '@/store/session-store';
import { StateBlock } from '@/components/state-block';
import { SectionTabs } from '@/components/section-tabs';
import { VehicleCard } from '@/components/vehicle-card';

type SearchTab = 'all' | 'users' | 'listings' | 'posts' | 'vehicles';

function includesQuery(values: Array<string | null | undefined>, query: string) {
  const normalized = query.trim().toLowerCase();
  return values.some((value) => String(value || '').toLowerCase().includes(normalized));
}

export function SearchScreen() {
  const searchParams = useSearchParams();
  const snapshot = useSessionStore((state) => state.snapshot);
  const [tab, setTab] = useState<SearchTab>('all');
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const users = useMemo(
    () =>
      (snapshot?.directoryUsers || []).filter((user) =>
        includesQuery([user.name, user.handle, user.note], query),
      ),
    [query, snapshot?.directoryUsers],
  );
  const posts = useMemo(
    () =>
      (snapshot?.posts || []).filter((post) =>
        includesQuery([post.content, post.authorName, post.handle, ...(post.hashtags || [])], query),
      ),
    [query, snapshot?.posts],
  );
  const listings = useMemo(
    () =>
      extractListingPosts(snapshot).filter((post) =>
        includesQuery([post.listing?.title, post.listing?.vehicleSummary, post.listing?.location], query),
      ),
    [query, snapshot],
  );
  const vehicles = useMemo(
    () =>
      extractGarageVehicles(snapshot).filter((vehicle) =>
        includesQuery([vehicle.brand, vehicle.model, vehicle.bodyType, vehicle.vehicleType], query),
      ),
    [query, snapshot],
  );

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Arama</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Kullanici, ilan, arac ve gonderi aramalarini dock uzerindeki arama dugmesi ile buradan yonet.
        </p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field-input mt-4"
          placeholder="Kullanici, ilan, arac, hashtag veya model ara"
        />
      </div>

      <SectionTabs
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Tumu', value: 'all' },
          { label: 'Kullanicilar', value: 'users' },
          { label: 'Ilanlar', value: 'listings' },
          { label: 'Gonderiler', value: 'posts' },
          { label: 'Araclar', value: 'vehicles' },
        ]}
      />

      {!query.trim() ? <StateBlock title="Arama bekleniyor" description="Marka, model, kullanici adi veya hashtag ile aramaya baslayabilirsin." /> : null}

      {(tab === 'all' || tab === 'users') && query.trim() ? (
        <section className="space-y-4">
          <h2 className="text-lg font-black tracking-tight text-slate-950">Kullanicilar</h2>
          {users.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {users.map((user) => (
                <Link key={user.id} href={`/profile/${user.handle}`} className="glass-card p-5">
                  <div className="font-semibold text-slate-950">{user.name}</div>
                  <div className="mt-1 text-sm text-slate-500">@{user.handle}</div>
                </Link>
              ))}
            </div>
          ) : tab !== 'all' ? (
            <StateBlock title="Kullanici bulunamadi" description="Sorgunu farkli handle veya isimle tekrar deneyebilirsin." />
          ) : null}
        </section>
      ) : null}

      {(tab === 'all' || tab === 'listings') && query.trim() ? (
        <section className="space-y-4">
          <h2 className="text-lg font-black tracking-tight text-slate-950">Ilanlar</h2>
          {listings.length ? (
            <div className="space-y-4">
              {listings.map((post) => (
                <Link key={post.id} href={`/feed#post-${post.id}`} className="glass-card block p-5">
                  <div className="font-semibold text-slate-950">{post.listing?.title || 'Ilan'}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {[post.listing?.location, post.listing?.price, post.listing?.vehicleSummary].filter(Boolean).join(' • ')}
                  </div>
                </Link>
              ))}
            </div>
          ) : tab !== 'all' ? (
            <StateBlock title="Ilan bulunamadi" description="Farkli marka, model veya konumla aramayi deneyebilirsin." />
          ) : null}
        </section>
      ) : null}

      {(tab === 'all' || tab === 'posts') && query.trim() ? (
        <section className="space-y-4">
          <h2 className="text-lg font-black tracking-tight text-slate-950">Gonderiler</h2>
          {posts.length ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <Link key={post.id} href={`/feed#post-${post.id}`} className="glass-card block p-5">
                  <div className="font-semibold text-slate-950">{post.authorName}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{post.content.slice(0, 180)}</div>
                </Link>
              ))}
            </div>
          ) : tab !== 'all' ? (
            <StateBlock title="Gonderi bulunamadi" description="Aramana daha genel bir kelime ekleyebilirsin." />
          ) : null}
        </section>
      ) : null}

      {(tab === 'all' || tab === 'vehicles') && query.trim() ? (
        <section className="space-y-4">
          <h2 className="text-lg font-black tracking-tight text-slate-950">Araclar</h2>
          {vehicles.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {vehicles.map((vehicle) => (
                <Link key={vehicle.id} href={`/vehicle/${vehicle.id}`}>
                  <VehicleCard vehicle={vehicle} />
                </Link>
              ))}
            </div>
          ) : tab !== 'all' ? (
            <StateBlock title="Arac bulunamadi" description="Arac tipi, marka veya model bilgisini degistirip tekrar ara." />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
