import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { factsAPI } from '../api/client'
import toast from 'react-hot-toast'

const CATEGORIES = ['general', 'pricing', 'product', 'leadership', 'founding', 'technology', 'other']

const CATEGORY_COLORS = {
  general:    'bg-gray-800 text-gray-300',
  pricing:    'bg-emerald-900/40 text-emerald-300',
  product:    'bg-blue-900/40 text-blue-300',
  leadership: 'bg-purple-900/40 text-purple-300',
  founding:   'bg-amber-900/40 text-amber-300',
  technology: 'bg-cyan-900/40 text-cyan-300',
  other:      'bg-gray-800 text-gray-400',
}

export default function KnowledgeCore() {
  const { brandId } = useParams()
  const [facts, setFacts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState({ category: 'general', claim: '', source_url: '' })
  const [saving, setSaving]   = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const load = async () => {
    try {
      const { data } = await factsAPI.list(brandId)
      setFacts(data)
    } catch {
      toast.error('Failed to load facts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [brandId])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await factsAPI.create(brandId, form)
      setFacts(f => [data, ...f])
      setForm({ category: 'general', claim: '', source_url: '' })
      toast.success('Fact added to Knowledge Core')
    } catch {
      toast.error('Failed to add fact')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (factId) => {
    try {
      await factsAPI.delete(brandId, factId)
      setFacts(f => f.filter(x => x.id !== factId))
      toast.success('Fact removed')
    } catch {
      toast.error('Failed to remove fact')
    }
  }

  const grouped = facts.reduce((acc, f) => {
    acc[f.category] = acc[f.category] || []
    acc[f.category].push(f)
    return acc
  }, {})

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Knowledge Core</h1>
        <p className="text-gray-500 text-sm mt-1">
          Verified facts about your brand — used to detect hallucinations in LLM responses
        </p>
      </div>

      {/* Add fact form */}
      <form onSubmit={handleAdd} className="card mb-8 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Add verified fact</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Source URL (optional)</label>
            <input className="input" placeholder="https://…" value={form.source_url} onChange={set('source_url')} />
          </div>
        </div>
        <div>
          <label className="label">Verified fact / claim</label>
          <textarea
            className="input"
            rows={2}
            placeholder='e.g. "Our pricing starts at $49/month" or "Founded in 2019 by Jane Smith"'
            value={form.claim}
            onChange={set('claim')}
            required
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : '+ Add to Knowledge Core'}
        </button>
      </form>

      {/* Facts by category */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : facts.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">🧠</div>
          <p className="text-gray-400 font-medium">Knowledge Core is empty</p>
          <p className="text-gray-600 text-sm mt-1">
            Add verified facts so the Hallucination Watchdog has something to compare against
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catFacts]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}>
                  {category}
                </span>
                <span className="text-xs text-gray-600">{catFacts.length} fact{catFacts.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {catFacts.map(fact => (
                  <div key={fact.id} className="flex items-start gap-3 p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200">{fact.claim}</p>
                      {fact.source_url && (
                        <a
                          href={fact.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 block truncate"
                        >
                          {fact.source_url}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(fact.id)}
                      className="text-gray-700 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                      title="Remove fact"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
