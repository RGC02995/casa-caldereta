import Stripe from 'stripe';
import { env } from './environment';

export type StripeClient = InstanceType<typeof Stripe>;

export const stripe: StripeClient = new Stripe(env.stripeSecretKey, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
});
