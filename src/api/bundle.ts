import client from './client'
import type { BundleItem, BundleSummary, BundleUpsertRequest } from '@/types/bundle'

export const getBundles = async (): Promise<BundleSummary[]> => {
  const { data } = await client.get<BundleSummary[]>('/bundles')
  return data
}

export const getBundleItems = async (bundleId: number): Promise<BundleItem[]> => {
  const { data } = await client.get<BundleItem[]>(`/bundles/${bundleId}/items`)
  return data
}

export const crearBundle = async (payload: BundleUpsertRequest): Promise<BundleSummary> => {
  const { data } = await client.post<BundleSummary>('/bundles', payload)
  return data
}

export const actualizarBundle = async (bundleId: number, payload: BundleUpsertRequest): Promise<BundleSummary> => {
  const { data } = await client.put<BundleSummary>(`/bundles/${bundleId}`, payload)
  return data
}

export const eliminarBundle = async (bundleId: number): Promise<void> => {
  await client.delete(`/bundles/${bundleId}`)
}
