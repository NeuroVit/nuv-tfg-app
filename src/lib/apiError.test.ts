import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { parseApiError } from './apiError'

const fallback = 'Algo falló'

const makeAxiosError = (status?: number, data?: unknown, message = 'boom') => {
  return new AxiosError(message, undefined, undefined, undefined, {
    data,
    status: status ?? 0,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

describe('parseApiError', () => {
  it('returns fallback for non-axios errors', () => {
    expect(parseApiError(new Error('x'), fallback)).toBe(fallback)
  })

  it('uses explicit payload message when useful', () => {
    const err = makeAxiosError(400, { message: 'Mensaje útil' })
    expect(parseApiError(err, fallback)).toBe('Mensaje útil')
  })

  it('ignores generic backend messages and maps status', () => {
    const err = makeAxiosError(403, { message: 'Internal Server Error' })
    expect(parseApiError(err, fallback)).toBe(`${fallback}. No tienes permisos para esta acción.`)
  })

  it('reads first nested validation error message', () => {
    const err = makeAxiosError(422, { errors: [{ message: 'Campo inválido' }] })
    expect(parseApiError(err, fallback)).toBe('Campo inválido')
  })

  it('maps 500 family to internal error suffix', () => {
    const err = makeAxiosError(503, null)
    expect(parseApiError(err, fallback)).toBe(`${fallback}. Ocurrió un error interno del servidor.`)
  })

  it('supports raw string payloads', () => {
    const err = makeAxiosError(400, 'Texto plano')
    expect(parseApiError(err, fallback)).toBe('Texto plano')
  })
})
