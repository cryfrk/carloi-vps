'use client';

import { createPost as createPostRequest, uploadFiles as uploadFilesRequest } from '@/lib/api';

export async function uploadFiles(files: File[]) {
  return uploadFilesRequest(files);
}

export async function createPost(payload: Record<string, unknown>) {
  return createPostRequest(payload);
}

export async function refreshBootstrapAfterMutation(refreshSnapshot: () => Promise<void>) {
  await refreshSnapshot();
}
