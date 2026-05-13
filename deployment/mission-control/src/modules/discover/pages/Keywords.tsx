import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keywordsApi, type KeywordCluster, type KeywordOpportunity } from '../api/client'
import { useProjectStore } from '../store/projectStore'
import { ArrowRight, KeySquare, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const INTENT_CLASS: Record<string, string> = {
  informational: 'badge-info',
  commercial:    'badge-comm',
  transactional: 'badge-trans',
  navigational:  'badge-nav',
}

function IntentBadge({ intent }: { intent: string }) {
  return (
    <span className={clsx('badge', INTENT_CLASS[intent] ?? 'badge bg-gray-800 text-gray-300')}>
      {intent}
    </span>
  )
}

function ClusterCard({ cluster }: { cluster: KeywordCluster }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-900/40 rounded-md">
            <KeySquare size={14} className="text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-100 text-sm">{cluster.cluster_name}</p>
            <p className="text-xs text-gray-500">{cluster.keywords.length} keywords</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IntentBadge intent={cluster.intent} />
          {open ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-2 font-medium">Keyword</th>
                <th className="text-left pb-2 font-medium">Intent</th>
                <th className="text-right pb-2 font-medium">Volume</th>
                <th className="text-right pb-2 font-medium">KD</th>
              </tr>
            </thead>
            <tbody>
              {cluster.keywords.map((kw, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-1.5 pr-4 text-gray-200">{kw.keyword}</td>
                  <td className="py-1.5 pr-4"><IntentBadge intent={kw.intent} /></td>
                  <td className="py-1.5 text-right text-gray-400">{kw.volume?.toLocaleString() ?? '—'}</td>
                  <td className="py-1.5 text-right text-gray-400">{kw.difficulty ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const INTENT_LABELS: Record<string, string> = {
  informational: 'Informational: education and awareness',
  commercial: 'Commercial: comparison and evaluation',
  transactional: 'Transactional: high-intent and ready to act',
  navigational: 'Navigational: brand or destination searches',
}

function OpportunityRow({
  item,
  onToggle,
  disabled,
}: {
  item: KeywordOpportunity
  onToggle: (item: KeywordOpportunity) => void
  disabled: boolean
}) {
  return (
    <button
      className={clsx(
        'w-full text-left rounded-lg border p-3 transition-colors',
        item.selected
          ? 'bg-blue-900/25 border-blue-700'
          : 'bg-gray-800/40 border-gray-800 hover:border-gray-700'
      )}
      disabled={disabled}
      onClick={() => onToggle(item)}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.selected}
          readOnly
          className="mt-1 accent-blue-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-100">{item.keyword}</span>
            <IntentBadge intent={item.intent} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Relevance {(Math.round((item.relevance_score ?? 0) * 100))}% · Seed: {item.seed_topic ?? 'website scan'}
          </p>
        </div>
      </div>
    </button>
  )
}

export default function Keywords() {
  const { selectedProject } = useProjectStore()
  const qc = useQueryClient()
  const [seed, setSeed] = useState('')
  const [limit, setLimit] = useState(50)

  const { data: existing } = useQuery({
    queryKey: ['keywords', selectedProject?.id],
    queryFn: () => keywordsApi.get(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const { data: opportunities } = useQuery({
    queryKey: ['keyword-opportunities', selectedProject?.id],
    queryFn: () => keywordsApi.opportunities(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const expandMut = useMutation({
    mutationFn: () => keywordsApi.expand(selectedProject!.id, seed.trim(), limit),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keywords', selectedProject?.id] }),
  })

  const selectMut = useMutation({
    mutationFn: ({ id, selected }: { id: string; selected: boolean }) =>
      keywordsApi.select(selectedProject!.id, [id], selected),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keyword-opportunities', selectedProject?.id] })
    },
  })

  const clusters: KeywordCluster[] = expandMut.data?.clusters ?? existing?.clusters ?? []
  const hasOpportunities = (opportunities?.total_keywords ?? 0) > 0

  if (!selectedProject) return <p className="text-gray-500">Select a project first.</p>

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Keyword Universe</h1>
      <p className="text-slate-400 text-sm mb-6">
        Review website-generated keywords by intent, or use manual expansion as an advanced fallback.
      </p>

      {hasOpportunities && (
        <div className="mb-8">
          <div className="card mb-4">
            <div className="flex flex-col md:flex-row md:items-stretch gap-3">
              <div className="flex flex-col justify-center" style={{ flex: 3 }}>
                <h2 className="section-title mb-1">Recommended Keywords From Website Scan</h2>
                <p className="text-sm text-gray-500">
                  {opportunities?.total_keywords ?? 0} generated · {opportunities?.selected_keywords ?? 0} selected
                </p>
              </div>
              <Link to="/competitors" className="btn-primary flex justify-center items-center gap-2" style={{ flex: 1, padding: '8px 16px', whiteSpace: 'nowrap' }}>
                Find Competitors <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {['informational', 'commercial', 'transactional', 'navigational'].map(intent => {
              const items = opportunities?.grouped?.[intent] ?? []
              return (
                <div key={intent} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-100">{INTENT_LABELS[intent]}</p>
                      <p className="text-xs text-gray-500">{items.length} suggestions</p>
                    </div>
                    <IntentBadge intent={intent} />
                  </div>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {items.map(item => (
                      <OpportunityRow
                        key={item.id}
                        item={item}
                        disabled={selectMut.isPending}
                        onToggle={(kw) => selectMut.mutate({ id: kw.id, selected: !kw.selected })}
                      />
                    ))}
                    {items.length === 0 && <p className="text-sm text-gray-600">No suggestions yet.</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="card mb-6">
        <p className="label mb-3">Advanced manual expansion</p>
        <div className="flex gap-3 items-center">
          <input
            className="input !h-[42px] !m-0"
            style={{ flex: 3, minWidth: 0 }}
            placeholder="e.g. content marketing"
            value={seed}
            onChange={e => setSeed(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && seed.trim()) expandMut.mutate() }}
          />
          <select
            className="input !h-[42px] !m-0"
            style={{ width: '128px', flexShrink: 0 }}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
          >
            {[25, 50, 100, 150].map(v => <option key={v} value={v}>{v} keywords</option>)}
          </select>
          <button
            className="btn-primary flex justify-center items-center gap-2 !h-[42px] !m-0"
            style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap' }}
            onClick={() => seed.trim() && expandMut.mutate()}
            disabled={expandMut.isPending || !seed.trim()}
          >
            {expandMut.isPending && <Loader2 size={13} className="animate-spin" />}
            {expandMut.isPending ? 'Expanding…' : 'Expand Keywords'}
          </button>
        </div>

        {expandMut.isError && (
          <p className="mt-3 text-red-400 text-sm">
            Error: {(expandMut.error as Error).message}
          </p>
        )}
      </div>

      {/* Results */}
      {clusters.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-white">{clusters.reduce((s, c) => s + c.keywords.length, 0)}</span> keywords in{' '}
              <span className="font-semibold text-white">{clusters.length}</span> clusters
            </p>
          </div>
          <div className="space-y-3">
            {clusters.map((c, i) => <ClusterCard key={i} cluster={c} />)}
          </div>
        </div>
      )}

      {clusters.length === 0 && !expandMut.isPending && (
        <div className="text-center py-16 text-gray-600">
          <KeySquare size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Enter a seed keyword and click Expand to start.</p>
        </div>
      )}
    </div>
  )
}
