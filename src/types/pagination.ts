export interface PagedResponse<T> {
  content: T[]
  total: number
  limit: number
  offset: number
}
