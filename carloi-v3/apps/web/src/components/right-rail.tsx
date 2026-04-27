'use client';

import Link from 'next/link';
import { ArrowUpRight, Bot, CarFront, MapPin, Search } from 'lucide-react';

import { buildTrendingTopics, extractGarageVehicles, extractListingPosts } from '@/lib/snapshot';
import { safeDateLabel } from '@/lib/date';
import type { AppSnapshot } from '@/types/app';

export function RightRail({ snapshot }: { snapshot: AppSnapshot | null }) {
  const trending = buildTrendingTopics(snapshot?.posts || []);
  const listings = extractListingPosts(snapshot).slice(0, 3);
  const vehicles = extractGarageVehicles(snapshot).slice(0, 2);

  return (
    <aside className="space-y-4 xl:sticky xl:top-10">
      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Search className="size-4 text-cyan-700" />
          <span>Hizli erisim</span>
        </div>
        <div className="mt-4 grid gap-2">
          <Link className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100" href="/search?q=elektrik">
            Elektrikli arac ara
          </Link>
          <Link className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100" href="/search?q=suv">
            SUV trendlerini ac
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CarFront className="size-4 text-cyan-700" />
          <span>Trend araclar</span>
        </div>
        <div className="mt-4 space-y-3">
          {vehicles.length ? (
            vehicles.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/vehicle/${vehicle.id}`}
                className="block rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100"
              >
                <div className="font-semibold text-slate-900">
                  {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {[vehicle.year, vehicle.bodyType, vehicle.fuelType].filter(Boolean).join(' • ') || 'Garaj verisi'}
                </div>
              </Link>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              Garajinda sergilenen araclar burada trend kutularina duser.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MapPin className="size-4 text-cyan-700" />
          <span>One cikan ilanlar</span>
        </div>
        <div className="mt-4 space-y-3">
          {listings.length ? (
            listings.map((post) => (
              <Link
                key={post.id}
                href={`/feed#post-${post.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-cyan-200 hover:bg-cyan-50/40"
              >
                <div className="font-semibold text-slate-900">
                  {post.listing?.title || post.listing?.vehicleSummary || 'Carloi ilani'}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {[post.listing?.location, post.listing?.price].filter(Boolean).join(' • ') || 'Detaylar hazir'}
                </div>
              </Link>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              Ilan akisinda yeni kayitlar geldiginde burada oneri kartlari gorunur.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-card">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Bot className="size-4 text-cyan-700" />
          <span>Carloi AI</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Ariza yorumu, butceye gore arac arama ve ilan karsilastirma icin Loi AI panelini ac.
        </p>
        <Link
          href="/loi-ai"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300"
        >
          <span>Loi AI&apos;a git</span>
          <ArrowUpRight className="size-4" />
        </Link>
        {trending.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {trending.map((item) => (
              <Link
                key={item.tag}
                href={`/search?q=%23${encodeURIComponent(item.tag)}`}
                className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                #{item.tag}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="mt-4 rounded-2xl bg-white/80 p-3 text-xs leading-5 text-slate-500">
          Son guncelleme: {safeDateLabel(new Date().toISOString(), 'Bugun')}
        </div>
      </section>
    </aside>
  );
}
