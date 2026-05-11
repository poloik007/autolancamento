'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SubmissionStatusBadge } from './SubmissionStatusBadge'
import { DeleteDraftButton } from './DeleteDraftButton'
import { formatDateTime } from '@/lib/utils/format'
import { useDebounce } from '@/hooks/useDebounce'

interface Submission {
  id: string
  pdf_filename: string
  status: string
  created_at: string
  companies: { name: string } | null
}

interface Props {
  showFilters?: boolean
}

export function SubmissionsList({ showFilters = false }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const debouncedSearch = useDebounce(search, 300)
  const debouncedDate = useDebounce(date, 300)

  const fetchSubmissions = useCallback(async (reset: boolean) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (debouncedDate) params.set('date', debouncedDate)
      if (!reset && cursor) params.set('cursor', cursor)

      const res = await fetch(`/api/submissions?${params}`)
      const data = await res.json()

      setSubmissions(prev => reset ? data.submissions : [...prev, ...data.submissions])
      setHasMore(data.hasMore)
      setCursor(data.nextCursor)
    } finally {
      setLoading(false)
      setInitialLoaded(true)
    }
  }, [debouncedSearch, debouncedDate, cursor])

  // Reset on filter change
  useEffect(() => {
    setCursor(null)
    setSubmissions([])
    setHasMore(true)
    setInitialLoaded(false)
  }, [debouncedSearch, debouncedDate])

  // Fetch after reset
  useEffect(() => {
    if (!initialLoaded && !loading) {
      fetchSubmissions(true)
    }
  }, [initialLoaded, loading, fetchSubmissions])

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && initialLoaded) {
          fetchSubmissions(false)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, initialLoaded, fetchSubmissions])

  function handleDelete(id: string) {
    setSubmissions(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome do arquivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
          {date && (
            <button onClick={() => setDate('')} className="px-2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {submissions.length > 0 ? (
        <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/40">
          {submissions.map((s) => (
            <Link
              key={s.id}
              href={`/history/${s.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{s.pdf_filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.companies?.name} &middot; {formatDateTime(s.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SubmissionStatusBadge status={s.status} />
                {s.status === 'draft' && (
                  <DeleteDraftButton submissionId={s.id} onDelete={() => handleDelete(s.id)} />
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : initialLoaded && !loading ? (
        <div className="rounded-xl border border-border/60 bg-card p-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma submissão encontrada.</p>
        </div>
      ) : null}

      <div ref={sentinelRef} className="py-2 text-center text-sm text-muted-foreground">
        {loading && 'Carregando...'}
        {!loading && !hasMore && submissions.length > 0 && 'Todos os itens carregados.'}
      </div>
    </div>
  )
}
