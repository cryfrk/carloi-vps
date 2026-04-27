import type { AppSnapshot, GarageVehicleRecord, SnapshotPost } from '@/types/app';

export function extractPostsByHandle(snapshot: AppSnapshot | null, handle: string) {
  if (!snapshot) {
    return [];
  }

  const normalized = handle.trim().replace(/^@/, '').toLowerCase();
  return snapshot.posts.filter((post) => post.handle?.replace(/^@/, '').toLowerCase() === normalized);
}

export function extractListingPosts(snapshot: AppSnapshot | null) {
  if (!snapshot) {
    return [];
  }

  return snapshot.posts.filter((post) => post.type === 'listing' || post.listing);
}

export function extractGarageVehicles(snapshot: AppSnapshot | null): GarageVehicleRecord[] {
  return snapshot?.garage?.vehicles || [];
}

export function getPrimaryGarageVehicle(snapshot: AppSnapshot | null) {
  const vehicles = extractGarageVehicles(snapshot);
  const primaryId = snapshot?.garage?.primaryVehicleId;
  return vehicles.find((vehicle) => vehicle.id === primaryId) || vehicles[0] || null;
}

export function buildTrendingTopics(posts: SnapshotPost[]) {
  const scores = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.hashtags || []) {
      const normalized = String(tag || '').trim().replace(/^#/, '');
      if (!normalized) {
        continue;
      }
      scores.set(normalized, (scores.get(normalized) || 0) + 1);
    }
  }

  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([tag, score]) => ({ tag, score }));
}
