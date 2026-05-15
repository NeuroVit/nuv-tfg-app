export type SubscriptionStatus = 'INACTIVE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'

export type BillingStatus = {
  status: SubscriptionStatus
  subscriptionId: string | null
  hasActiveSubscription: boolean
}
