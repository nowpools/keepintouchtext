export const STRIPE_PRICES = {
  pro: {
    monthly: {
      priceId: 'price_1SegG5Bgt0WklYBWucymTTAM',
      productId: 'prod_Tbu42PFPdZKThy',
      amount: 9,
    },
    yearly: {
      priceId: 'price_1SegGSBgt0WklYBW7h63CYJl',
      productId: 'prod_Tbu4m1VgWsIyGP',
      amount: 79,
    },
  },
  business: {
    monthly: {
      priceId: 'price_1SegGdBgt0WklYBWjc3u0JZr',
      productId: 'prod_Tbu4ype5MVG3pi',
      amount: 19,
    },
    yearly: {
      priceId: 'price_1SegGuBgt0WklYBWKWVrkulM',
      productId: 'prod_Tbu5SaiMCx9oUI',
      amount: 149,
    },
  },
} as const;

export type SubscriptionTier = 'free' | 'pro' | 'business';
export type BillingInterval = 'monthly' | 'yearly';
