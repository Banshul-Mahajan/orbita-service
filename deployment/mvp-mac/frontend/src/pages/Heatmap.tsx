import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { heatmapApi, serpApi, aiScanApi, type HeatmapData, type HeatmapChannel } from '../api/client'
import { useProjectStore } from '../store/projectStore'
import { Grid3x3, Loader2, Info, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

function scoreToColor(score: number, gap: boolean) {
  if (gap) return 'bg-orange-500/30 border border-orange-500/50 text-orange-300'
  if (score >= 0.7) return 'bg-green-500/20 border border-green-500/30 text-green-300'
  if (score >= 0.4) return 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300'
  return 'bg-red-500/20 border border-red-500/30 text-red-400'
}

function CoverageCell({ channel }: { channel: HeatmapChannel }) {
  const [tip, setTip] = useState(false)
  const pct = Math.round(channel.coverage_score * 100)
  return (
    <div
      className={clsx('rounded-lg p-3 cursor-pointer relative', scoreToColor(channel.coverage_score, channel.gap))}
      onClick={() => setTip(o => !o)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">{channel.label}</span>
        {channel.gap && <AlertTriangle size={12} className="text-orange-400" />}
      </div>
      <div className="text-2xl font-bold">{pct}%</div>
      <div className="text-xs opacity-70 mt-0.5">coverage</div>

      {tip && channel.top_domains.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs min-w-[180px] shadow-xl">
          <p className="font-medium text-gray-300 mb-2">Top domains:</p>
          {channel.top_domains.map((d, i) => (
            <p key={i} className="text-gray-400">• {d}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function OverlapSection({ data }: { data: HeatmapData['overlap_analysis'] }) {
  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      {[
        { title: '✅ In Both', items: data.domains_in_both, color: 'text-green-400' },
        { title: '🔵 Google Only', items: data.only_in_google, color: 'text-blue-400' },
        { title: '🤖 AI Only', items: data.only_in_ai, color: 'text-purple-400' },
      ].map(({ title, items, color }) => (
        <div key={title} className="card">
          <p className={clsx('text-xs font-semibold mb-3', color)}>{title}</p>
          {items.length > 0
            ? items.map((d, i) => <p key={i} className="text-xs text-gray-400 mb-1">• {d}</p>)
            : <p className="text-xs text-gray-600">—</p>}
        </div>
      ))}
    </div>
  )
}

export default function Heatmap() {
  const { selectedProject } = useProjectStore()
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')

  // Auto-run SERP + AI scan then fetch heatmap
  const runAllMut = useMutation({
    mutationFn: async (q: string) => {
      await Promise.all([
        serpApi.analyze(selectedProject!.id, q, 10),
        aiScanApi.scan(selectedProject!.id, q, ['openai', 'gemini', 'perplexity']),
      ])
      return q
    },
    onSuccess: (q) => setActiveQuery(q),
  })

  const { data: heatmap, isLoading } = useQuery({
    queryKey: ['heatmap', selectedProject?.id, activeQuery],
    queryFn: () => heatmapApi.get(selectedProject!.id, activeQuery),
    enabled: !!selectedProject && !!activeQuery,
  })

  if (!selectedProject) return <p className="text-gray-500">Select a project first.</p>

  const loading = runAllMut.isPending || isLoading

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Intent Heatmap</h1>
      <p className="text-gray-500 text-sm mb-6">
        Visual gap map: how well Google and AI engines cover any topic.
        <span className="ml-1 text-orange-400">Orange = gap detected.</span>
      </p>

      <div className="card mb-6">
        <div className="flex items-start gap-2 mb-3 text-xs text-blue-300 bg-blue-900/20 rounded-lg p-2 border border-blue-800/50">
          <Info size={13} className="shrink-0 mt-0.5" />
          This runs a SERP analysis + AI scan automatically, then builds the gap matrix.
        </div>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="e.g. best CRM for startups"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) runAllMut.mutate(query.trim()) }}
          />
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => query.trim() && runAllMut.mutate(query.trim())}
            disabled={loading || !query.trim()}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Grid3x3 size={14} />}
            {loading ? 'Building…' : 'Build Heatmap'}
          </button>
        </div>
      </div>

      {heatmap && !loading && (
        <div>
          {/* Insight banner */}
          <div className="card mb-6 bg-gray-900/50 border-gray-700">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-300">{heatmap.insight}</p>
            </div>
          </div>

          {/* Heatmap grid */}
          <div className="card">
            <p className="label mb-3">Coverage by Channel — "{heatmap.query}"</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {heatmap.channels.map(ch => <CoverageCell key={ch.channel} channel={ch} />)}
            </div>

            <div className="mt-4 flex gap-4 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30 border border-green-500/40" /> 70-100% coverage</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/40" /> 40-69% coverage</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" /> 0-39% coverage</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/50" /> Gap detected</span>
            </div>
          </div>

          {/* Overlap analysis */}
          <h2 className="text-sm font-semibold text-gray-400 mt-6 mb-3">
            Domain Overlap — overlap ratio: {(heatmap.overlap_analysis.overlap_ratio * 100).toFixed(0)}%
          </h2>
          <OverlapSection data={heatmap.overlap_analysis} />
        </div>
      )}

      {!heatmap && !loading && (
        <div className="text-center py-16 text-gray-600">
          <Grid3x3 size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Enter a query and click Build Heatmap.</p>
        </div>
      )}
    </div>
  )
}
