import { ApiClientError } from '@carloi-v3/api-client';

import type { AppErrorState } from '@/types/app';

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
          description: 'Devam etmek icin tekrar giris yapin.',
          kind: error.kind,
        };
      case 'api_unavailable':
        return {
          title: 'Carloi API su anda ulasilamiyor',
          description: 'Sunucu kisa sureligine yanit vermiyor. Birazdan tekrar deneyin.',
          kind: error.kind,
        };
      case 'upload_invalid':
        return {
          title: 'Dosya yuklenemedi',
          description: 'Dosya formati veya boyutu desteklenmiyor.',
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
