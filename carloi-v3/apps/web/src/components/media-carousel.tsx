'use client';

import type { SnapshotMedia } from '@/types/app';

interface MediaCarouselProps {
  media: SnapshotMedia[];
}

export function MediaCarousel({ media }: MediaCarouselProps) {
  if (!media.length) {
    return null;
  }

  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2">
      {media.map((item, index) => {
        const source = item.url || item.uri || '';
        const type = item.type || 'image';
        if (!source) {
          return null;
        }

        return (
          <div
            key={item.id || `${source}-${index}`}
            className="relative min-w-[280px] snap-start overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-card md:min-w-[420px]"
          >
            {type === 'video' ? (
              <video
                src={source}
                controls
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={source}
                alt={item.label || 'Carloi medya'}
                className="aspect-[4/3] w-full object-cover"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
