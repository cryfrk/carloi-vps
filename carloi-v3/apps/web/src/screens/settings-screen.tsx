'use client';

import Link from 'next/link';

import { useSessionStore } from '@/store/session-store';
import { StateBlock } from '@/components/state-block';

export function SettingsScreen() {
  const snapshot = useSessionStore((state) => state.snapshot);
  const logout = useSessionStore((state) => state.logout);

  if (!snapshot) {
    return <StateBlock title="Ayarlar icin oturum gerekli" description="Profil, guvenlik ve Garajim ayarlari icin once giris yap." />;
  }

  const groups = [
    {
      title: 'Profil ayarlari',
      items: [
        `Isim: ${snapshot.profile.name}`,
        `Kullanici adi: @${snapshot.profile.handle}`,
        `Biyografi: ${snapshot.profile.bio || 'Henüz eklenmedi'}`,
      ],
    },
    {
      title: 'Hesap ve guvenlik',
      items: [
        `E-posta: ${snapshot.settings?.email || snapshot.auth.email || 'Eklenmedi'}`,
        `Telefon: ${snapshot.settings?.phone || snapshot.auth.phone || 'Eklenmedi'}`,
        'Iki adimli dogrulama altyapisi V3 icin hazir tasarlandi.',
      ],
    },
    {
      title: 'Bildirimler',
      items: ['Mesaj, ilan ve ticari basvuru bildirimleri bu hesap ayarlarindan yonetilecek.'],
    },
    {
      title: 'Garaj ve gizlilik',
      items: [
        `Garaj gorunurlugu: ${snapshot.settings?.garageVisibility || 'Varsayilan'}`,
        `Plaka gorunurlugu: ${snapshot.settings?.plateVisibility || 'Maskele'}`,
      ],
    },
    {
      title: 'Yasal ve destek',
      items: ['Sozlesmeler ve destek akislarini kayit wizardi ile ticari onboarding ekranlarinda inceleyebilirsin.'],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Ayarlar</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Profil, guvenlik, ticari hesap, gizlilik ve Garajim gorunurluk ayarlari V3 gruplanmis duzende sunulur.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title} className="glass-card p-5">
            <h2 className="text-lg font-black tracking-tight text-slate-950">{group.title}</h2>
            <div className="mt-4 space-y-3">
              {group.items.map((item) => (
                <div key={item} className="rounded-[22px] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="glass-card flex flex-wrap gap-3 p-5">
        <Link href="/commercial" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
          Ticari hesap
        </Link>
        <Link href="/garage" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
          Garajim
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Cikis yap
        </button>
      </div>
    </div>
  );
}
