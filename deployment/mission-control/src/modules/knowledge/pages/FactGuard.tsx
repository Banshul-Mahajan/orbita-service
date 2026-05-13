import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { verifyClaim } from '../api/client'
import { PageHeader, ConfidenceBadge } from '../components'

const STATUS_CONFIG = {
  verified:       { color: 'border-green-400 bg-green-50',  label: '✅ Verified',        desc: 'This claim matches verified facts in your Knowledge Core.' },
  low_confidence: { color: 'border-yellow-400 bg-yellow-50', label: '⚠️ Low Confidence', desc: 'Partial match found. Review the matched facts and update confidence scores.' },
  unverified:     { color: 'border-red-400 bg-red-50',      label: '❌ Not Verified',    desc: 'No matching facts found. Add the correct data to your Knowledge Core.' },
  error:          { color: 'border-gray-300 bg-gray-50',    label: '— Error',            desc: 'Could not process the claim.' },
}

const EXAMPLE_CLAIMS = [
  'OmegaBoost was founded in 2019 and is headquartered in San Francisco.',
  'The product contains 1000mg of Omega-3 fatty acids per serving.',
  'Dr. Sarah Johnson has over 15 years of experience in clinical nutrition.',
]

export default function FactGuardPage() {
  const [claim, setClaim] = useState('')
  const [result, setResult] = useState<any>(null)

  const mut = useMutation({
    mutationFn: () => verifyClaim(claim),
    onSuccess: (data) => setResult(data),
  })

  const config = result ? (STATUS_CONFIG[result.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.error) : null

  return (
    <div>
      <PageHeader
        title="FactGuard"
        subtitle="Paste any AI-generated claim to verify it against your Knowledge Core"
      />

      {/* Input panel */}
      <div className="card p-6 mb-6">
        <label className="label">Claim Text</label>
        <textarea
          className="input mb-3 font-mono text-sm leading-relaxed"
          rows={4}
          placeholder="Paste an AI-generated sentence or paragraph to fact-check…"
          value={claim}
          onChange={e => { setClaim(e.target.value); setResult(null) }}
        />

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_CLAIMS.map((ex, i) => (
              <button key={i} className="text-xs text-brand-600 hover:underline" onClick={() => { setClaim(ex); setResult(null) }}>
                Example {i + 1}
              </button>
            ))}
          </div>
          <button
            className="btn-primary"
            onClick={() => mut.mutate()}
            disabled={!claim.trim() || mut.isPending}
          >
            {mut.isPending ? 'Verifying…' : '🔍 Verify Claim'}
          </button>
        </div>
      </div>

      {/* Result panel */}
      {result && config && (
        <div className={`card border-2 ${config.color} p-6 mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{config.label}</h2>
            <span className="text-sm text-gray-500">
              Confidence: <strong>{(result.confidence * 100).toFixed(0)}%</strong>
              &nbsp;·&nbsp;
              {result.match_count} match{result.match_count !== 1 ? 'es' : ''} found
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-4">{config.desc}</p>

          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Claim submitted</p>
            <p className="text-sm text-gray-800 italic">"{result.claim}"</p>
          </div>

          {result.matches?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Matched Facts:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                      <th className="text-left pb-2 pr-4">Entity</th>
                      <th className="text-left pb-2 pr-4">Attribute</th>
                      <th className="text-left pb-2 pr-4">Value</th>
                      <th className="text-left pb-2 pr-4">Confidence</th>
                      <th className="text-left pb-2">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.matches.map((m: any, i: number) => (
                      <tr key={i} className="py-2">
                        <td className="py-2 pr-4 font-medium text-gray-800">{m.entity_name}</td>
                        <td className="py-2 pr-4 text-gray-600">{m.attribute}</td>
                        <td className="py-2 pr-4 text-gray-600">{m.value}{m.unit ? ` ${m.unit}` : ''}</td>
                        <td className="py-2 pr-4"><ConfidenceBadge score={m.confidence} /></td>
                        <td className="py-2">
                          {m.source_url
                            ? <a href={m.source_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Source ↗</a>
                            : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.status === 'unverified' && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-red-200 text-sm text-red-700">
              <strong>Action:</strong> Add the correct fact to your{' '}
              <Link to="/dashboard/knowledge/entities" className="underline font-medium">Entities</Link> page, then re-test this claim.
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-3">How FactGuard Works (MVP)</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2"><span className="text-brand-600 font-bold shrink-0">1.</span> You paste any text — an AI-generated sentence, a paragraph, a product claim.</li>
          <li className="flex gap-2"><span className="text-brand-600 font-bold shrink-0">2.</span> FactGuard extracts key words and searches your verified facts in PostgreSQL.</li>
          <li className="flex gap-2"><span className="text-brand-600 font-bold shrink-0">3.</span> Matched facts are returned with confidence scores and source URLs.</li>
          <li className="flex gap-2"><span className="text-brand-600 font-bold shrink-0">4.</span> A status is assigned: Verified ≥ 85%, Low Confidence ≥ 50%, Unverified below.</li>
        </ol>
        {/* <p className="mt-3 text-xs text-gray-400">
          Day 7 upgrade: keyword matching is replaced with Weaviate semantic similarity search — no code changes needed in the UI.
        </p> */}
      </div>
    </div>
  )
}
