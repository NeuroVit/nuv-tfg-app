import { describe, expect, it } from 'vitest'
import { __clientTestUtils } from './client'

const buildJwt = (payload: Record<string, unknown>) => {
  const header = { alg: 'HS256', typ: 'JWT' }
  const toPart = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `${toPart(header)}.${toPart(payload)}.sig`
}

describe('client auth helpers', () => {
  it('detects auth endpoints', () => {
    expect(__clientTestUtils.isAuthEndpoint('/auth/login')).toBe(true)
    expect(__clientTestUtils.isAuthEndpoint('/auth/refresh')).toBe(true)
    expect(__clientTestUtils.isAuthEndpoint('/ventas')).toBe(false)
  })

  it('decodes a valid JWT payload', () => {
    const token = buildJwt({ sub: 'john', exp: 12345 })
    expect(__clientTestUtils.decodeJwtPayload(token)).toEqual({ sub: 'john', exp: 12345 })
  })

  it('returns null for malformed payload', () => {
    expect(__clientTestUtils.decodeJwtPayload('bad.token')).toBeNull()
    expect(__clientTestUtils.decodeJwtPayload('not-a-jwt')).toBeNull()
  })

  it('extracts exp when present', () => {
    const exp = Math.floor(Date.now() / 1000) + 1800
    const token = buildJwt({ exp })
    expect(__clientTestUtils.extractAccessTokenExp(token)).toBe(exp)
  })

  it('does not report expiry when exp is missing', () => {
    const token = buildJwt({ sub: 'no-exp' })
    expect(__clientTestUtils.isAccessTokenExpiredOrNearExpiry(token)).toBe(false)
  })

  it('reports near-expiry tokens as expired for refresh threshold', () => {
    const now = Math.floor(Date.now() / 1000)
    const nearExpiryToken = buildJwt({ exp: now + 5 })
    const freshToken = buildJwt({ exp: now + 3600 })

    expect(__clientTestUtils.isAccessTokenExpiredOrNearExpiry(nearExpiryToken, 20)).toBe(true)
    expect(__clientTestUtils.isAccessTokenExpiredOrNearExpiry(freshToken, 20)).toBe(false)
  })
})
