import { ApiError } from '@carloi/v2-shared';

export function getReadableErrorMessage(error: unknown, fallback = 'Islem tamamlanamadi. Lutfen tekrar deneyin.') {
  if (error instanceof ApiError) {
    if (error.code === 'timeout') {
      return 'Sunucu zamaninda yanit vermedi. Lutfen tekrar deneyin.';
    }

    if (error.code === 'network_error') {
      return 'Sunucuya ulasilamiyor. Internet baglantinizi kontrol edip tekrar deneyin.';
    }

    if (error.statusCode === 401) {
      return 'Oturumunuzun suresi dolmus olabilir. Lutfen tekrar giris yapin.';
    }

    return error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
