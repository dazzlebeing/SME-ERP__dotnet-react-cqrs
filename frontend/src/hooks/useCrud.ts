import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { toast } from 'sonner'

/** Debounce a value — avoids firing a request on every keystroke.
 *  200ms ≈ "instant" feel while preventing a request on every character. */
function useDebounce<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setDebounced(value), delay)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [value, delay])
  return debounced
}

export type SortDir = 'asc' | 'desc'

export interface UsePaginatedListResult<T> {
  data: { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number } | undefined
  isLoading: boolean
  isError: boolean
  page: number
  setPage: (p: number) => void
  search: string
  setSearch: (s: string) => void
  sortBy: string
  sortDir: SortDir
  toggleSort: (field: string) => void
}

export function usePaginatedList<T>(
  key: string,
  url: string,
  params?: Record<string, any>,
  defaultSort = 'createdAt',
  defaultDir: SortDir = 'desc',
): UsePaginatedListResult<T> {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState(defaultSort)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)
  const debouncedSearch = useDebounce(search, 200)

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
    setPage(1)
  }

  const query = useQuery<{ items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number }>({
    queryKey: [key, page, debouncedSearch, params, sortBy, sortDir],
    queryFn: () => api.get(url, {
      params: {
        page, pageSize: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        sortBy, sortDir,
        ...params
      }
    }).then(r => r.data),
  })

  return { ...query, page, setPage, search, setSearch, sortBy, sortDir, toggleSort }
}

export function useDelete(key: string, urlFn: (id: number) => string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(urlFn(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [key] }); toast.success('Deleted') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Delete failed'),
  })
}

export function useSave(key: string, url: string, editId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => editId ? api.put(`${url}/${editId}`, data) : api.post(url, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [key] }); toast.success(editId ? 'Updated' : 'Created') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Save failed'),
  })
}

export function useSimpleList<T>(key: string, url: string) {
  return useQuery<T[]>({ queryKey: [key], queryFn: () => api.get(url).then(r => r.data), staleTime: 300000 })
}
