'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CarFront, MapPin } from 'lucide-react';

import { commentOnPost, likePost, repostPost, savePost } from '@/lib/api';
import { extractListingPosts } from '@/lib/snapshot';
import { toAppError } from '@/lib/errors';
import { useSessionStore } from '@/store/session-store';
import { useUiStore } from '@/store/ui-store';
import { PageHeader } from '@/components/page-header';
import { PostCard } from '@/components/post-card';
import { LoadingBlock, StateBlock } from '@/components/state-block';

export function FeedScreen() {
  const router = useRouter();
  const status = useSessionStore((state) => state.status);
  const snapshot = useSessionStore((state) => state.snapshot);
  const bootstrapReady = useSessionStore((state) => state.bootstrapReady);
  const refreshSnapshot = useSessionStore((state) => state.refreshSnapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const error = useSessionStore((state) => state.error);
  const openCreateModal = useUiStore((state) => state.openCreateModal);

  const posts = useMemo(() => {
    const followed = new Set(snapshot?.profile.followingHandles || []);
    return [...(snapshot?.posts || [])].sort((left, right) => {
      const leftFollowed = followed.has(left.handle);
      const rightFollowed = followed.has(right.handle);
      if (leftFollowed !== rightFollowed) {
        return leftFollowed ? -1 : 1;
      }
      const leftLocation = Boolean(left.listing?.location);
      const rightLocation = Boolean(right.listing?.location);
      if (leftLocation !== rightLocation) {
        return leftLocation ? -1 : 1;
      }
      return String(right.createdAt || right.time || '').localeCompare(String(left.createdAt || left.time || ''));
    });
  }, [snapshot?.posts, snapshot?.profile.followingHandles]);

  const listings = extractListingPosts(snapshot).slice(0, 3);

  async function mutate(action: () => Promise<unknown>) {
    try {
      await action();
      await refreshSnapshot();
    } catch (caughtError) {
      setSnapshot(snapshot);
      console.error('[CarloiV3][Feed] action failed', toAppError(caughtError));
    }
  }

  if (!bootstrapReady) {
    return <LoadingBlock label="V3 akis hazirlaniyor..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ana akis"
        subtitle="Takip ettiklerin, konuma yakin ilanlar ve garaj baglantili paylasimlar tek dock deneyiminde."
      />

      {status !== 'authenticated' ? (
        <StateBlock
          title="Akis hazir, devam etmek icin giris yap"
          description="Canli akisa ulasmak, begenmek ve Garajim ile baglantili paylasim yapmak icin oturum acman gerekiyor."
          action={
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                Giris yap
              </Link>
              <Link href="/register" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
                Uye ol
              </Link>
            </div>
          }
        />
      ) : (
        <section className="glass-card p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">Yeni paylasim</div>
              <p className="max-w-2xl text-sm leading-6 text-slate-500">
                Normal gonderi, arac hikayesi veya profesyonel ilan hazirla. Tum akis turleri canli API ile calisir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              + Yeni icerik
            </button>
          </div>
          {listings.length ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {listings.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => router.push(`/feed#post-${post.id}`)}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50/40"
                >
                  <div className="text-sm font-semibold text-slate-900">{post.listing?.title || 'One cikan ilan'}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="size-3.5" />
                    <span>{post.listing?.location || post.listing?.city || 'Konum eklenmedi'}</span>
                  </div>
                  <div className="mt-3 text-lg font-black tracking-tight text-slate-950">
                    {post.listing?.price || 'Fiyat sor'}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {error && status === 'authenticated' ? <StateBlock title={error.title} description={error.description} tone="danger" /> : null}

      {posts.length ? (
        <div className="space-y-5">
          {posts.map((post) => (
            <div id={`post-${post.id}`} key={post.id}>
              <PostCard
                post={post}
                onLike={() => void mutate(() => likePost(post.id))}
                onSave={() => void mutate(() => savePost(post.id))}
                onRepost={() => void mutate(() => repostPost(post.id))}
                onComment={() => {
                  const value = window.prompt('Yorumunuzu yazin');
                  if (value?.trim()) {
                    void mutate(() => commentOnPost(post.id, value.trim()));
                  }
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <StateBlock
          title="Akis hazir ama henuz paylasim yok"
          description="Ilk gonderini veya garajdan ilk arac hikayeni paylasarak Carloi V3 akisini baslat."
          action={
            status === 'authenticated' ? (
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Ilk paylasimi olustur
              </button>
            ) : undefined
          }
        />
      )}

      <section className="glass-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CarFront className="size-4 text-cyan-700" />
          <span>Konuma yakin akislari onceliklendir</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          V3 feed mantigi; takip edilen hesaplari ve konum bilgisi eklenmis gonderileri yukari tasir. Konum destekli arama icin ada uzerindeki arama dugmesini kullanabilirsin.
        </p>
      </section>
    </div>
  );
}
