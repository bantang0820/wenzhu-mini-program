export const PAYMENT_PRODUCTS = {
  annual: {
    type: 'annual',
    description: '稳住Pro年卡会员',
    totalAmount: 9900,
    durationDays: 365,
    membershipType: 'annual'
  }
} as const;

export type PaymentProductType = keyof typeof PAYMENT_PRODUCTS;

export const DEFAULT_PAYMENT_PRODUCT: PaymentProductType = 'annual';

export function getPaymentProduct(productType?: string) {
  const normalizedType = (productType || DEFAULT_PAYMENT_PRODUCT) as PaymentProductType;
  return PAYMENT_PRODUCTS[normalizedType] || PAYMENT_PRODUCTS[DEFAULT_PAYMENT_PRODUCT];
}
