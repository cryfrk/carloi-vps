export type PremiumPlanKey = 'monthly' | 'yearly';

export interface PremiumPlanDefinition {
  key: PremiumPlanKey;
  productId: string;
  title: string;
  description: string;
  expectedMembershipPlan: string;
}

const monthlyProductId = process.env.EXPO_PUBLIC_PREMIUM_MONTHLY_PRODUCT_ID?.trim() || '';
const yearlyProductId = process.env.EXPO_PUBLIC_PREMIUM_YEARLY_PRODUCT_ID?.trim() || '';

export const premiumPlanDefinitions: PremiumPlanDefinition[] = [
  {
    key: 'monthly' as const,
    productId: monthlyProductId,
    title: 'Carloi Premium Aylık',
    description: 'AI avantajları, ilan görünürlük araçları ve premium hesap özellikleri.',
    expectedMembershipPlan: 'Premium Aylık',
  },
  {
    key: 'yearly' as const,
    productId: yearlyProductId,
    title: 'Carloi Premium Yıllık',
    description: 'Tüm premium sosyal ve AI özellikleri için yıllık üyelik.',
    expectedMembershipPlan: 'Premium Yıllık',
  },
].filter((item) => item.productId);

export function getPremiumPlanDefinition(productId: string) {
  return premiumPlanDefinitions.find((item) => item.productId === productId) ?? null;
}

export function hasPremiumBillingProducts() {
  return premiumPlanDefinitions.length > 0;
}
