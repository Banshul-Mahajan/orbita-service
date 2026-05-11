import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { alertsAPI } from '../api/client'
import toast from 'react-hot-toast'

const ICONS = { hallucination: '🤖', negative_sentiment: '📉', brand_not_mentioned: '👻' }
const SEVERITY_CLASS = { high: 'text-red-400 bg-red-950/30', medium: 'text-yellow-400 bg-yellow-950/30', low: 'text-gray-400 bg-gray-800' }

export default function Alerts() {
  const { brandId } = useParams()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await alertsAPI.list(brandId, showResolved)
      setAlerts(data)
    } catch {
      toast.error('Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [brandId, showResolved])

  const resolve = async (alertId) => {
    try {
      await alertsAPI.resolve(brandId, alertId)
      setAlerts(a => a.filter(x => x.id !== alertId))
      toast.success('Alert resolved')
    } catch {
      toast.error('Failed to resolve')
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Alerts</h1>
          <p className="text-gray-500 text-sm mt-1">Hallucinations, sentiment drops, and issues detected</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={e => setShowResolved(e.target.checked)}
            className="rounded"
          />
          Show resolved
        </label>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-400 font-medium">No open alerts</p>
          <p className="text-gray-600 text-sm mt-1">Run probes to check for issues</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className="card border-l-2 border-l-transparent" style={{
              borderLeftColor: alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#eab308' : '#6b7280'
            }}>
              <div className="flex items-start gap-4">
                <span className="text-2xl flex-shrink-0">{ICONS[alert.alert_type] || '⚠️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-100 text-sm">{alert.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEVERITY_CLASS[alert.severity]}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{alert.description}</p>

                  {/* Hallucination details */}
                  {alert.details?.stated_claim && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-3">
                        <p className="text-xs text-red-400 font-medium mb-1">❌ AI stated</p>
                        <p className="text-xs text-gray-300">"{alert.details.stated_claim}"</p>
                      </div>
                      <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3">
                        <p className="text-xs text-emerald-400 font-medium mb-1">✅ Known fact</p>
                        <p className="text-xs text-gray-300">"{alert.details.known_fact}"</p>
                      </div>
                    </div>
                  )}

                  {alert.details?.explanation && (
                    <p className="mt-2 text-xs text-gray-500 italic">{alert.details.explanation}</p>
                  )}

                  <p className="text-xs text-gray-700 mt-2">
                    {new Date(alert.created_at).toLocaleString()}
                    {alert.details?.llm_engine && ` · ${alert.details.llm_engine}`}
                  </p>
                </div>

                {!alert.resolved && (
                  <button
                    onClick={() => resolve(alert.id)}
                    className="btn-secondary text-xs flex-shrink-0"
                  >
                    Resolve
                  </button>
                )}
                {alert.resolved && (
                  <span className="text-xs text-gray-600 flex-shrink-0">Resolved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
