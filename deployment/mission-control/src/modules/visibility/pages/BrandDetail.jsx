import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { brandsAPI, probesAPI, alertsAPI } from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import toast from 'react-hot-toast'

const setCookie = (name, value) => {
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Lax`
}

const ENGINE_COLORS = { claude: '#a78bfa', gpt4: '#34d399', gemini: '#60a5fa' }
const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#6b7280', negative: '#ef4444' }

function StatCard({ label, value, sub, color = 'text-gray-100' }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

function SentimentBadge({ score }) {
  if (score === null || score === undefined) return <span className="badge-neutral">N/A</span>
  if (score > 0.2)  return <span className="badge-positive">Positive {score.toFixed(2)}</span>
  if (score < -0.2) return <span className="badge-negative">Negative {score.toFixed(2)}</span>
  return <span className="badge-neutral">Neutral {score.toFixed(2)}</span>
}

export default function BrandDetail() {
  const { brandId } = useParams()
  const [brand, setBrand]   = useState(null)
  const [stats, setStats]   = useState(null)
  const [runs, setRuns]     = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (brandId) setCookie('orbit_brand_id', brandId)
    setLoading(true)
    Promise.all([
      brandsAPI.get(brandId),
      probesAPI.dashboard(brandId),
      probesAPI.list(brandId),
      alertsAPI.list(brandId),
    ])
      .then(([b, s, r, a]) => {
        setBrand(b.data)
        setStats(s.data)
        setRuns(r.data.slice(0, 10))
        setAlerts(a.data.slice(0, 5))
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [brandId])

  // Build chart data: sentiment per engine
  const chartData = runs.reduce((acc, run) => {
    if (!run.parsed_result || run.status !== 'completed') return acc
    const engine = run.llm_engine
    if (!acc[engine]) acc[engine] = { engine, scores: [], count: 0 }
    acc[engine].scores.push(run.parsed_result.sentiment_score ?? 0)
    acc[engine].count++
    return acc
  }, {})

  const chartArr = Object.values(chartData).map(d => ({
    engine: d.engine,
    avg_sentiment: d.scores.reduce((a, b) => a + b, 0) / d.scores.length,
    count: d.count,
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading dashboard…</div>
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{brand?.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{brand?.industry} · {brand?.website}</p>
        </div>
        <div className="flex gap-3">
          <Link to={`/dashboard/visibility/brands/${brandId}/probes`}    className="btn-primary">▶ Run probes</Link>
          <Link to={`/dashboard/visibility/brands/${brandId}/alerts`}    className="btn-secondary">🚨 Alerts {stats?.unresolved_alerts > 0 && `(${stats.unresolved_alerts})`}</Link>
          <Link to={`/dashboard/visibility/brands/${brandId}/knowledge`} className="btn-secondary">🧠 Facts</Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Probes run"            value={stats?.total_probes} />
        <StatCard label="Hallucinations"        value={stats?.hallucinations_detected} color={stats?.hallucinations_detected > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <StatCard label="Unresolved alerts"     value={stats?.unresolved_alerts} color={stats?.unresolved_alerts > 0 ? 'text-yellow-400' : 'text-gray-100'} />
        <StatCard label="Avg sentiment"         value={stats?.avg_sentiment?.toFixed(2)} sub="−1 negative → +1 positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment chart */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Avg Sentiment by Engine</h2>
          {chartArr.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">No data yet — run some probes first</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartArr} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="engine" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[-1, 1]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(v) => [v.toFixed(2), 'Avg sentiment']}
                />
                <Bar dataKey="avg_sentiment" radius={[4, 4, 0, 0]}>
                  {chartArr.map((d) => (
                    <Cell key={d.engine} fill={ENGINE_COLORS[d.engine] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Recent Alerts</h2>
            <Link to={`/dashboard/visibility/brands/${brandId}/alerts`} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">✅ No open alerts</div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-800/60 rounded-lg">
                  <span className="text-base mt-0.5">
                    {alert.alert_type === 'hallucination' ? '🤖' : '📉'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{alert.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{alert.description}</p>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${alert.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent probe runs */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300">Recent Probe Runs</h2>
          <Link to={`/dashboard/visibility/brands/${brandId}/probes`} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
        </div>
        {runs.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">No probes run yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Engine</th>
                  <th className="pb-2 font-medium">Prompt</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Sentiment</th>
                  <th className="pb-2 font-medium">Mentioned</th>
                  <th className="pb-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {runs.map(run => (
                  <tr key={run.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5">
                      <span style={{ color: ENGINE_COLORS[run.llm_engine] }} className="font-medium text-xs">
                        {run.llm_engine}
                      </span>
                    </td>
                    <td className="py-2.5 max-w-xs">
                      <p className="text-gray-300 truncate text-xs">{run.prompt_text}</p>
                    </td>
                    <td className="py-2.5">
                      <span className={`badge-${run.status}`}>{run.status}</span>
                    </td>
                    <td className="py-2.5">
                      {run.parsed_result ? (
                        <SentimentBadge score={run.parsed_result.sentiment_score} />
                      ) : '—'}
                    </td>
                    <td className="py-2.5 text-gray-400 text-xs">
                      {run.parsed_result ? (run.parsed_result.brand_mentioned ? '✅ Yes' : '❌ No') : '—'}
                    </td>
                    <td className="py-2.5 text-gray-600 text-xs">
                      {new Date(run.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
