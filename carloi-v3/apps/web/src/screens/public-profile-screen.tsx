'use client';

import { useEffect, useState } from 'react';

import { useSessionStore } from '@/store/session-store';
import { StateBlock } from '@/components/state-block';
import { PostCard } from '@/components/post-card';
import { SectionTabs } from '@/components/section-tabs';

type PublicTab = 'posts' | 'listings' | 'followers' | 'following';

export function PublicProfileScreen({ username }: { username: string }) {
  const fetchPublicProfile = useSessionStore((state) => state.fetchPublicProfile);
  const followHandle = useSessionStore((state) => state.followHandle);
  const publicProfile = useSessionStore((state) => state.publicProfiles[username.replace(/^@/, '')]);
  const [tab, setTab] = useState<PublicTab>('posts');

  useEffect(() => {
    void fetchPublicProfile(username);
  }, [fetchPublicProfile, username]);

  if (!publicProfile) {
    return <StateBlock title="Profil yukleniyor" description="Genel profil verileri getiriliyor." />;
  }

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex size-20 items-center justify-center rounded-full bg-slate-100 text-3xl font-black text-slate-900">
              {(publicProfile.profile.name || 'C').slice(0, 1)}
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight text-slate-950">{publicProfile.profile.name}</div>
              <div className="text-sm font-semibold text-slate-500">@{publicProfile.profile.handle}</div>
              <div className="max-w-2xl text-sm leading-6 text-slate-500">{publicProfile.profile.bio || 'Carloi kullanicisi'}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void followHandle(publicProfile.profile.handle)}
            className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Takip et / birak
          </button>
        </div>
      </section>

      <SectionTabs
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Gonderiler', value: 'posts' },
          { label: 'Ilanlar', value: 'listings' },
          { label: 'Takipciler', value: 'followers' },
          { label: 'Takip edilen', value: 'following' },
        ]}
      />

      {tab === 'posts' ? (
        publicProfile.posts.length ? (
          <div className="space-y-5">{publicProfile.posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
        ) : (
          <StateBlock title="Genel gonderi yok" description="Bu kullanici henuz genel profile acik bir paylasim yayinlamamis." />
        )
      ) : null}

      {tab === 'listings' ? (
        publicProfile.listings.length ? (
          <div className="space-y-5">{publicProfile.listings.map((post) => <PostCard key={post.id} post={post} />)}</div>
        ) : (
          <StateBlock title="Acik ilan yok" description="Bu kullanicinin yayindaki ilanlari burada gorunur." />
        )
      ) : null}

      {(tab === 'followers' || tab === 'following') ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(tab === 'followers' ? publicProfile.followers : publicProfile.following).map((user) => (
            <div key={user.id} className="glass-card p-5">
              <div className="font-semibold text-slate-950">{user.name}</div>
              <div className="mt-1 text-sm text-slate-500">@{user.handle}</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">{user.note || 'Carloi baglanti karti'}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
