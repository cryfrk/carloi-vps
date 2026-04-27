import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL = 'https://api.carloi.com';
const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

const baseUrls = {
  web: envBaseUrl || DEFAULT_API_BASE_URL,
  android: envBaseUrl || DEFAULT_API_BASE_URL,
  ios: envBaseUrl || DEFAULT_API_BASE_URL,
  default: envBaseUrl || DEFAULT_API_BASE_URL,
};

const apiBaseUrl =
  Platform.select({
    web: baseUrls.web,
    android: baseUrls.android,
    ios: baseUrls.ios,
    default: baseUrls.default,
  }) ?? baseUrls.default;

const shareBaseUrl = process.env.EXPO_PUBLIC_SHARE_BASE_URL?.trim() || 'https://www.carloi.com';
const androidPackageName = process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME?.trim() || 'com.carloi.mobile';
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || '';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '';
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';

export const runtimeConfig = {
  apiBaseUrl,
  apiUploadUrl: `${apiBaseUrl}/api/media/upload`,
  shareBaseUrl,
  androidPackageName,
  googleAndroidClientId,
  googleIosClientId,
  googleWebClientId,
};
