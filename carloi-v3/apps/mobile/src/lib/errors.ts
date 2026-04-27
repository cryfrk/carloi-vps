import { ApiClientError } from '@carloi-v3/api-client';

import type { AppErrorState } from '../types/app';

export function toAppError(error: unknown, fallbackTitle = 'Islem tamamlanamadi'): AppErrorState {
  if (error instanceof ApiClientError) {
    switch (error.kind) {
      case 'offline':
        return {
          title: 'Baglanti kurulamadi',
          description: 'Internet baglantinizi kontrol edip tekrar deneyin.',
          kind: error.kind,
        };
      case 'timeout':
        return {
          title: 'Sunucu yavas yanit verdi',
          description: 'Istek zaman asimina ugradi. Lutfen tekrar deneyin.',
          kind: error.kind,
        };
      case 'unauthorized':
        return {
          title: 'Oturum gerekli',
          description: 'Lutfen tekrar giris yapin.',
          kind: error.kind,
        };
      case 'api_unavailable':
        return {
          title: 'Sunucu gecici olarak ulasilamiyor',
          description: 'Carloi API su anda yanit vermiyor. Kisa sure sonra tekrar deneyin.',
          kind: error.kind,
        };
      case 'upload_invalid':
        return {
          title: 'Dosya yuklenemedi',
          description: 'Dosya boyutu veya formati desteklenmiyor.',
          kind: error.kind,
        };
      default:
        return {
          title: fallbackTitle,
          description: error.message || 'Beklenmeyen bir hata olustu.',
          kind: error.kind,
        };
    }
  }

  if (error instanceof Error) {
    return {
      title: fallbackTitle,
      description: error.message || 'Beklenmeyen bir hata olustu.',
    };
  }

  return {
    title: fallbackTitle,
    description: 'Beklenmeyen bir hata olustu.',
  };
}
