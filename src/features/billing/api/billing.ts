import client from '@/api/client'
import type { BillingStatus } from '@/features/billing/types/billing'

export const getBillingStatus = (): Promise<BillingStatus> =>
  client.get('/billing/status').then((r) => r.data)

export const createCheckoutSession = (successUrl: string, cancelUrl: string): Promise<{ url: string }> =>
  client.post('/billing/checkout', { successUrl, cancelUrl }).then((r) => r.data)

export const createPortalSession = (returnUrl: string): Promise<{ url: string }> =>
  client.post('/billing/portal', { returnUrl }).then((r) => r.data)
