import { Platform } from 'react-native';

import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type ProductSubscription,
  type ProductSubscriptionAndroid,
  type Purchase,
} from 'expo-iap';

import {
  getPremiumPlanDefinition,
  premiumPlanDefinitions,
  type PremiumPlanKey,
} from '../config/premiumProducts';
import { runtimeConfig } from '../config/runtimeConfig';

export interface PremiumStoreProduct {
  id: string;
  key: PremiumPlanKey;
  title: string;
  description: string;
  displayPrice: string;
  offerToken?: string;
}

export interface PremiumActivationPayload {
  platform: 'android' | 'ios';
  productId: string;
  purchaseToken: string;
  transactionId: string;
  packageName?: string;
}

let isConnected = false;

function isStorePlatform() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function toPremiumStoreProduct(product: ProductSubscription): PremiumStoreProduct | null {
  const definition = getPremiumPlanDefinition(product.id);
  if (!definition) {
    return null;
  }

  const offerToken =
    Platform.OS === 'android'
      ? (product as ProductSubscriptionAndroid).subscriptionOfferDetailsAndroid?.[0]?.offerToken ??
        undefined
      : undefined;

  return {
    id: product.id,
    key: definition.key,
    title: product.title || definition.title,
    description: product.description || definition.description,
    displayPrice: product.displayPrice,
    offerToken,
  };
}

export async function connectDigitalBilling() {
  if (!isStorePlatform()) {
    return false;
  }

  if (isConnected) {
    return true;
  }

  const connected = await initConnection();
  isConnected = Boolean(connected);
  return isConnected;
}

export async function disconnectDigitalBilling() {
  if (!isStorePlatform() || !isConnected) {
    return;
  }

  await endConnection().catch(() => undefined);
  isConnected = false;
}

export async function loadPremiumStoreProducts() {
  if (!isStorePlatform()) {
    return [] as PremiumStoreProduct[];
  }

  if (!premiumPlanDefinitions.length) {
    return [] as PremiumStoreProduct[];
  }

  await connectDigitalBilling();
  const subscriptions = await fetchProducts({
    skus: premiumPlanDefinitions.map((item) => item.productId),
    type: 'subs',
  });

  return (Array.isArray(subscriptions) ? subscriptions : [])
    .map((item) => toPremiumStoreProduct(item as ProductSubscription))
    .filter((item): item is PremiumStoreProduct => Boolean(item));
}

export async function purchasePremiumPlan(product: PremiumStoreProduct, obfuscatedAccountId?: string) {
  if (!isStorePlatform()) {
    throw new Error('Mağaza içi premium satın alma yalnızca Android veya iPhone build içinde çalışır.');
  }

  await connectDigitalBilling();

  await requestPurchase({
    type: 'subs',
    request: {
      apple: {
        sku: product.id,
      },
      google: {
        skus: [product.id],
        subscriptionOffers: product.offerToken
          ? [{ sku: product.id, offerToken: product.offerToken }]
          : undefined,
        obfuscatedAccountId,
      },
    },
  });
}

export async function restorePremiumPurchasesFromStore() {
  if (!isStorePlatform()) {
    return [] as Purchase[];
  }

  await connectDigitalBilling();
  const purchases = await getAvailablePurchases();
  const allowedIds = new Set(premiumPlanDefinitions.map((item) => item.productId));
  return (Array.isArray(purchases) ? purchases : []).filter((item) => allowedIds.has(item.productId));
}

export async function finalizePremiumPurchase(purchase: Purchase) {
  await finishTransaction({
    purchase,
    isConsumable: false,
  });
}

export function toPremiumActivationPayload(purchase: Purchase): PremiumActivationPayload {
  const productId = purchase.productId;
  const definition = getPremiumPlanDefinition(productId);
  if (!definition) {
    throw new Error('Bu mağaza ürünü premium plan listesinde tanımlı değil.');
  }

  const purchaseToken = purchase.purchaseToken || '';
  if (!purchaseToken) {
    throw new Error('Satın alma kaydında mağaza purchase token bilgisi yok.');
  }

  return {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    productId,
    purchaseToken,
    transactionId: purchase.id,
    packageName: Platform.OS === 'android' ? runtimeConfig.androidPackageName : undefined,
  };
}

export function registerPremiumPurchaseListeners(options: {
  onPurchase: (purchase: Purchase) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const purchaseSubscription = purchaseUpdatedListener((purchase) => {
    void Promise.resolve(options.onPurchase(purchase)).catch((error) => {
      options.onError(error instanceof Error ? error.message : 'Premium satın alma işlenemedi.');
    });
  });

  const errorSubscription = purchaseErrorListener((error) => {
    options.onError(error.message || 'Mağaza satın alma akışı hata verdi.');
  });

  return () => {
    purchaseSubscription.remove();
    errorSubscription.remove();
  };
}
