import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Loader2, Search } from 'lucide-react'
import { competitorsApi, keywordsApi, type CompetitorDomain } from '../api/client'
import { useProjectStore } from '../store/projectStore'

function CompetitorCard({ domain }: { domain: CompetitorDomain }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-white font-semibold">{domain.domain}</p>
          <p className="text-xs text-gray-500">
            Ranks for {domain.ranking_keyword_count} selected keywords
          </p>
        </div>
        <span className="badge bg-green-900 text-green-200">
          {domain.visibility_score.toFixed(0)} visibility
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
        <span>Avg position: {domain.avg_position ?? '-'}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {(domain.top_keywords ?? []).slice(0, 5).map(keyword => (
          <span key={keyword} className="badge bg-gray-800 text-gray-300">{keyword}</span>
        ))}
      </div>
    </div>
  )
}

export default function Competitors() {
  const { selectedProject } = useProjectStore()
  const qc = useQueryClient()

  const { data: opportunities } = useQuery({
    queryKey: ['keyword-opportunities', selectedProject?.id],
    queryFn: () => keywordsApi.opportunities(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const { data: competitors } = useQuery({
    queryKey: ['competitors', selectedProject?.id],
    queryFn: () => competitorsApi.get(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const discoverMut = useMutation({
    mutationFn: () => competitorsApi.discover(selectedProject!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competitors', selectedProject?.id] }),
  })

  if (!selectedProject) return <p className="text-gray-500">Select or create a project first.</p>

  const selectedCount = opportunities?.selected_keywords ?? 0
  const domains = discoverMut.data?.domains ?? competitors?.domains ?? []
  const pages = discoverMut.data?.pages ?? competitors?.pages ?? []

  return (
    <div>
      <div className="mb-6">
        <p className="label mb-2">Step 3</p>
        <h1 className="text-xl font-bold text-white mb-1">Competitor Discovery</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Discover Orbit checks who already ranks for the keywords the user selected,
          then rolls those pages up into competitor domains.
        </p>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-stretch gap-4">
          <div className="flex flex-col justify-center" style={{ flex: 3 }}>
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-white">{selectedCount}</span> selected keywords ready for competitor discovery.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              If this is zero, go back to Keywords and choose relevant terms first.
            </p>
          </div>
          <button
            className="btn-primary flex justify-center items-center gap-2"
            style={{ flex: 1, padding: '8px 16px', whiteSpace: 'nowrap' }}
            disabled={discoverMut.isPending || selectedCount === 0}
            onClick={() => discoverMut.mutate()}
          >
            {discoverMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {discoverMut.isPending ? 'Finding competitors...' : 'Find Competitors'}
          </button>
        </div>
        {discoverMut.isError && (
          <p className="mt-3 text-sm text-red-400">{(discoverMut.error as Error).message}</p>
        )}
      </div>

      {domains.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {domains.map(domain => <CompetitorCard key={domain.id} domain={domain} />)}
        </div>
      )}

      {pages.length > 0 && (
        <div className="card">
          <h2 className="section-title">Ranking Pages to Learn From</h2>
          <div className="space-y-2">
            {pages.slice(0, 12).map(page => (
              <div key={page.id} className="rounded-lg bg-gray-800/50 border border-gray-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 truncate">{page.title || page.url}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      #{page.position} for "{page.keyword}" on {page.domain}
                    </p>
                  </div>
                  {page.url && (
                    <a className="text-blue-400 hover:text-blue-300 shrink-0" href={page.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {domains.length === 0 && !discoverMut.isPending && (
        <div className="text-center py-16 text-gray-600">
          <Search size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Run competitor discovery after selecting keywords.</p>
        </div>
      )}
    </div>
  )
}
