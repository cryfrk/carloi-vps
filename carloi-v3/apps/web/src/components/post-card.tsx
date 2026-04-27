'use client';

import type { ReactNode } from 'react';
import { Heart, MessageCircle, Repeat2, Send, Star } from 'lucide-react';

import { safeRelativeTime, safeTimeLabel } from '@/lib/date';
import { MediaCarousel } from '@/components/media-carousel';
import type { SnapshotPost } from '@/types/app';

interface PostCardProps {
  post: SnapshotPost;
  onLike?: (postId: string) => void;
  onSave?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onRepost?: (postId: string) => void;
}

export function PostCard({
  post,
  onLike,
  onSave,
  onComment,
  onRepost,
}: PostCardProps) {
  const isListing = Boolean(post.listing) || post.type === 'listing';
  return (
    <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-slate-200 text-sm font-semibold text-slate-700">
          {(post.authorName || 'C').slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="font-semibold text-slate-950">{post.authorName}</div>
            <div className="text-sm text-slate-500">@{post.handle}</div>
            {post.role ? (
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
                {post.role}
              </span>
            ) : null}
            <span className="text-sm text-slate-400">{safeRelativeTime(post.createdAt || post.time)}</span>
            <span className="text-xs text-slate-400">{safeTimeLabel(post.createdAt || post.time)}</span>
          </div>
          <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{post.content}</div>
          {post.hashtags?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700"
                >
                  #{String(tag).replace(/^#/, '')}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {post.media?.length ? <div className="mt-5"><MediaCarousel media={post.media} /></div> : null}

      {isListing && post.listing ? (
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-950">
                {post.listing.title || post.listing.vehicleSummary || 'Carloi ilani'}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {[post.listing.location || post.listing.city, post.listing.vehicleSummary]
                  .filter(Boolean)
                  .join(' • ') || 'Detaylar ilanda hazir'}
              </div>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm">
              {post.listing.price ? `${post.listing.price}` : 'Fiyat sor'}
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-3">{post.listing.fuelType || 'Yakit bilgisi yok'}</div>
            <div className="rounded-2xl bg-white p-3">{post.listing.transmission || 'Vites bilgisi yok'}</div>
            <div className="rounded-2xl bg-white p-3">{post.listing.color || 'Renk bilgisi yok'}</div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <ActionButton
          active={Boolean(post.likedByUser)}
          icon={<Heart className="size-4" />}
          label={`${post.likes || 0} begeni`}
          onClick={() => onLike?.(post.id)}
        />
        <ActionButton
          icon={<MessageCircle className="size-4" />}
          label={`${post.comments || 0} yorum`}
          onClick={() => onComment?.(post.id)}
        />
        <ActionButton
          active={Boolean(post.repostedByUser)}
          icon={<Repeat2 className="size-4" />}
          label={`${post.reposts || 0} paylasim`}
          onClick={() => onRepost?.(post.id)}
        />
        <ActionButton
          active={Boolean(post.savedByUser)}
          icon={<Star className="size-4" />}
          label="Kaydet"
          onClick={() => onSave?.(post.id)}
        />
        <ActionButton
          icon={<Send className="size-4" />}
          label="Baglanti kopyala"
          onClick={async () => {
            const link = post.shareLink || `${window.location.origin}/feed#post-${post.id}`;
            try {
              await navigator.clipboard.writeText(link);
            } catch {
              // ignore clipboard failures
            }
          }}
        />
      </div>
    </article>
  );
}

function ActionButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
