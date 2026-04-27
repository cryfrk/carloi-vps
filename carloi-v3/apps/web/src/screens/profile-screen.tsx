'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { extractGarageVehicles, extractListingPosts, extractPostsByHandle } from '@/lib/snapshot';
import { useSessionStore } from '@/store/session-store';
import { PageHeader } from '@/components/page-header';
import { PostCard } from '@/components/post-card';
import { StateBlock } from '@/components/state-block';
import { VehicleCard } from '@/components/vehicle-card';
import { SectionTabs } from '@/components/section-tabs';

type ProfileTab = 'posts' | 'listings' | 'vehicles';

export function ProfileScreen() {
  const status = useSessionStore((state) => state.status);
  const snapshot = useSessionStore((state) => state.snapshot);
  const [tab, setTab] = useState<ProfileTab>('posts');

  const profile = snapshot?.profile;
  const handle = profile?.handle || '';
  const posts = useMemo(() => extractPostsByHandle(snapshot, handle), [handle, snapshot]);
  const listings = useMemo(() => extractListingPosts(snapshot).filter((item) => item.handle === handle), [handle, snapshot]);
  const vehicles = useMemo(() => extractGarageVehicles(snapshot).filter((item) => item.showInProfile), [snapshot]);

  if (status !== 'authenticated' || !profile) {
    return (
      <StateBlock
        title="Profil icin giris yap"
        description="Profil, takip ve sergilenen arac kartlari icin once hesabina baglanmalisin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profil" subtitle="Instagram benzeri vitrinde gonderiler, ilanlar ve sergilenen araclar bir arada." />

      <section className="glass-card overflow-hidden">
        <div className="h-40 bg-[linear-gradient(135deg,#0f172a_0%,#0f9aa8_58%,#67e8f9_100%)]" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="inline-flex size-24 items-center justify-center rounded-full border-4 border-white bg-white text-3xl font-black text-slate-900 shadow-xl">
                {(profile.name || 'C').slice(0, 1)}
              </div>
              <div className="space-y-1 pb-1">
                <div className="text-2xl font-black tracking-tight text-slate-950">{profile.name}</div>
                <div className="text-sm font-semibold text-slate-500">@{profile.handle}</div>
                <div className="text-sm leading-6 text-slate-500">{profile.bio || 'Carloi V3 kullanicisi'}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/settings" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
                Profili duzenle
              </Link>
              <Link href="/commercial" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                Ticari hesap
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <Metric title="Takipci" value={String(profile.followers || 0)} />
            <Metric title="Takip edilen" value={String(profile.following || 0)} />
            <Metric title="Gonderi" value={String(profile.posts || posts.length)} />
            <Metric title="Ilan" value={String(listings.length)} />
          </div>
        </div>
      </section>

      <SectionTabs
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Gonderiler', value: 'posts' },
          { label: 'Ilanlar', value: 'listings' },
          { label: 'Araclar', value: 'vehicles' },
        ]}
      />

      {tab === 'posts' ? (
        posts.length ? (
          <div className="space-y-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <StateBlock title="Henuz gonderi yok" description="Ilk sosyal paylasimini olusturdugunda profil akisin burada dolacak." />
        )
      ) : null}

      {tab === 'listings' ? (
        listings.length ? (
          <div className="space-y-5">
            {listings.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <StateBlock title="Aktif ilan yok" description="Garajindaki bir araci ilana cikararak profilin ilan sekmesini doldurabilirsin." />
        )
      ) : null}

      {tab === 'vehicles' ? (
        vehicles.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {vehicles.map((vehicle) => (
              <Link key={vehicle.id} href={`/vehicle/${vehicle.id}`}>
                <VehicleCard vehicle={vehicle} />
              </Link>
            ))}
          </div>
        ) : (
          <StateBlock title="Sergilenen arac yok" description="Garajim icinden gorunurlugu acilan araclar bu sekmede gorunur." />
        )
      ) : null}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</div>
    </div>
  );
}
