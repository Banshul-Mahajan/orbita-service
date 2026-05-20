import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { promptsAPI, probesAPI } from '../api/client'
import api from '../api/client'
import toast from 'react-hot-toast'

const ENGINES = [
  { id: 'claude',  label: 'Claude',  color: 'border-purple-600 bg-purple-950/40 text-purple-300' },
  { id: 'gpt4',   label: 'GPT-4o',  color: 'border-emerald-600 bg-emerald-950/40 text-emerald-300' },
  { id: 'gemini', label: 'Gemini',  color: 'border-blue-600 bg-blue-950/40 text-blue-300' },
]

const ENGINE_COLORS = { claude: 'text-purple-400', gpt4: 'text-emerald-400', gemini: 'text-blue-400' }

// ── Default prompts — seeded per brand using the brand name ───────────────────
// These are created in the DB on first load so they get real IDs and work with
// the existing probesAPI.run endpoint (no backend changes needed).
const buildDefaultPrompts = (brandName) => [
  { prompt_text: `What is ${brandName} and what do they do?`,                    category: 'brand awareness' },
  { prompt_text: `Who founded ${brandName} and when was it established?`,         category: 'niche' },
  { prompt_text: `What is the pricing for ${brandName}? How much does it cost?`,  category: 'pricing' },
  { prompt_text: `How does ${brandName} compare to its main competitors?`,         category: 'comparison' },
  { prompt_text: `What are the pros and cons of using ${brandName}?`,             category: 'comparison' },
  { prompt_text: `What industries or use cases is ${brandName} best suited for?`, category: 'niche' },
  { prompt_text: `What are customers saying about ${brandName}?`,                 category: 'general' },
  { prompt_text: `Is ${brandName} a reliable and trustworthy company?`,           category: 'general' },
  { prompt_text: `Would you recommend ${brandName} to a small business owner?`,   category: 'recommendation' },
  { prompt_text: `What are the best alternatives to ${brandName}?`,               category: 'recommendation' },
]

function SentimentPill({ val }) {
  if (!val) return null
  const cls = val === 'positive' ? 'badge-positive' : val === 'negative' ? 'badge-negative' : 'badge-neutral'
  return <span className={cls}>{val}</span>
}

export default function Probes() {
  const { brandId } = useParams()
  const [prompts, setPrompts]                 = useState([])
  const [brandName, setBrandName]             = useState('')
  const [runs, setRuns]                       = useState([])
  const [selectedPrompts, setSelectedPrompts] = useState([])
  const [selectedEngines, setSelectedEngines] = useState(['gpt4'])
  const [running, setRunning]                 = useState(false)
  const [seeding, setSeeding]                 = useState(false)
  const [expandedRun, setExpandedRun]         = useState(null)
  const [newPrompt, setNewPrompt]             = useState({ text: '', category: 'general' })
  const [showAddPrompt, setShowAddPrompt]     = useState(false)
  const pollingRef = useRef(null)

  // ── Load brand name + prompts + runs ────────────────────────────────────────
  const loadData = async () => {
    try {
      const [p, r] = await Promise.all([
        promptsAPI.list(brandId),
        probesAPI.list(brandId),
      ])
      setPrompts(p.data)
      setRuns(r.data)
      return p.data   // return so seedDefaults can use it
    } catch (err) {
      console.error('Probes loadData error:', err)
      return []
    }
  }

  // ── Fetch brand name from the visibility API ─────────────────────────────────
  const fetchBrandName = async () => {
    try {
      const { data } = await api.get(`/brands/${brandId}`)
      return data?.name || ''
    } catch {
      return ''
    }
  }

  // ── Seed default prompts to DB (only when brand has none) ────────────────────
  const seedDefaults = async (name) => {
    if (!name) return
    setSeeding(true)
    try {
      const defaults = buildDefaultPrompts(name)
      await Promise.all(
        defaults.map(d =>
          promptsAPI.create(brandId, {
            prompt_text: d.prompt_text,
            category: d.category,
          })
        )
      )
      // Reload now that they're saved
      await loadData()
    } catch (err) {
      console.error('Seed defaults error:', err)
    } finally {
      setSeeding(false)
    }
  }

  // ── Initial load: brand name → prompts → seed if empty ──────────────────────
  useEffect(() => {
    const init = async () => {
      const name = await fetchBrandName()
      setBrandName(name)
      const saved = await loadData()
      // If no prompts exist yet, seed the defaults
      if (saved.length === 0 && name) {
        await seedDefaults(name)
      }
    }
    init()
    return () => clearInterval(pollingRef.current)
  }, [brandId])

  // ── Poll while runs are pending/running ──────────────────────────────────────
  useEffect(() => {
    clearInterval(pollingRef.current)
    const hasPending = runs.some(r => r.status === 'pending' || r.status === 'running')
    if (hasPending) {
      pollingRef.current = setInterval(() => {
        probesAPI.list(brandId).then(r => setRuns(r.data)).catch(() => {})
      }, 3000)
    }
    return () => clearInterval(pollingRef.current)
  }, [runs, brandId])

  const togglePrompt = (id) =>
    setSelectedPrompts(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const toggleEngine = (id) =>
    setSelectedEngines(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  // ── Run — all selected prompts have real DB IDs now ──────────────────────────
  const handleRun = async () => {
    if (!selectedPrompts.length) return toast.error('Select at least one prompt')
    if (!selectedEngines.length) return toast.error('Select at least one engine')
    setRunning(true)
    try {
      const { data } = await probesAPI.run(brandId, {
        prompt_ids: selectedPrompts,
        engines: selectedEngines,
      })
      toast.success(`${data.total} probe runs started!`)
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start probes')
    } finally {
      setRunning(false)
    }
  }

  const handleAddPrompt = async (e) => {
    e.preventDefault()
    try {
      await promptsAPI.create(brandId, {
        prompt_text: newPrompt.text,
        category: newPrompt.category,
      })
      setNewPrompt({ text: '', category: 'general' })
      setShowAddPrompt(false)
      toast.success('Prompt added')
      await loadData()
    } catch {
      toast.error('Failed to add prompt')
    }
  }

  const totalRuns = selectedPrompts.length * selectedEngines.length

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Probe Runner</h1>
        <p className="text-gray-500 text-sm mt-1">
          Fire prompts at LLMs and analyse the responses
          {brandName && <span className="text-indigo-400 ml-1">— {brandName}</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-1 space-y-5">
          {/* Engine selector */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Select engines</h2>
            <div className="space-y-2">
              {ENGINES.map(eng => (
                <button
                  key={eng.id}
                  onClick={() => toggleEngine(eng.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    selectedEngines.includes(eng.id)
                      ? eng.color + ' border-opacity-100'
                      : 'border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${selectedEngines.includes(eng.id) ? 'bg-current' : 'bg-gray-700'}`} />
                  {eng.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt selector */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300">Select prompts</h2>
              <button className="text-xs text-indigo-400" onClick={() => setShowAddPrompt(s => !s)}>
                + Add
              </button>
            </div>

            {showAddPrompt && (
              <form onSubmit={handleAddPrompt} className="mb-3 space-y-2 p-3 bg-gray-800 rounded-lg">
                <textarea
                  className="input text-xs"
                  rows={3}
                  placeholder="Custom probe prompt…"
                  value={newPrompt.text}
                  onChange={e => setNewPrompt(n => ({ ...n, text: e.target.value }))}
                  required
                />
                <select
                  className="input text-xs"
                  value={newPrompt.category}
                  onChange={e => setNewPrompt(n => ({ ...n, category: e.target.value }))}
                >
                  {['general', 'pricing', 'comparison', 'niche', 'brand awareness', 'recommendation'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-xs py-1">Save</button>
                  <button type="button" className="btn-secondary text-xs py-1" onClick={() => setShowAddPrompt(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {seeding && (
                <p className="text-xs text-indigo-400 text-center py-4 animate-pulse">
                  Setting up default prompts for {brandName}…
                </p>
              )}
              {!seeding && prompts.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">No prompts yet — click + Add above</p>
              )}
              {prompts.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePrompt(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    selectedPrompts.includes(p.id)
                      ? 'bg-indigo-600/20 border border-indigo-600/50 text-indigo-200'
                      : 'hover:bg-gray-800 text-gray-400 border border-transparent'
                  }`}
                >
                  <span className="text-gray-600 text-[10px] block mb-0.5">{p.category}</span>
                  {p.prompt_text}
                </button>
              ))}
            </div>

            {selectedPrompts.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                {selectedPrompts.length} prompt{selectedPrompts.length > 1 ? 's' : ''}
                · {selectedEngines.length} engine{selectedEngines.length > 1 ? 's' : ''}
                = {totalRuns} runs
              </p>
            )}
          </div>

          <button
            className="btn-primary w-full py-3 text-base"
            onClick={handleRun}
            disabled={running || seeding || !selectedPrompts.length || !selectedEngines.length}
          >
            {running ? 'Starting…' : `▶ Run ${totalRuns || ''} probes`}
          </button>
        </div>

        {/* Right panel: results */}
        <div className="lg:col-span-2 card">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Results</h2>

          {runs.length === 0 ? (
            <div className="text-center py-16 text-gray-600 text-sm">
              Select prompts and engines, then click Run
            </div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {runs.map(run => (
                <div key={run.id} className="border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/40 transition-colors"
                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                  >
                    <span className={`text-xs font-semibold ${ENGINE_COLORS[run.llm_engine]}`}>
                      {run.llm_engine}
                    </span>
                    <span className="text-xs text-gray-400 flex-1 truncate">{run.prompt_text}</span>
                    <span className={`badge-${run.status} flex-shrink-0`}>{run.status}</span>
                    {run.parsed_result && (
                      <SentimentPill val={run.parsed_result.sentiment} />
                    )}
                    <span className="text-gray-600 text-xs flex-shrink-0">
                      {expandedRun === run.id ? '▲' : '▼'}
                    </span>
                  </button>

                  {expandedRun === run.id && (
                    <div className="border-t border-gray-800 px-4 py-4 space-y-4">
                      {run.status === 'failed' && (
                        <div className="text-red-400 text-xs bg-red-950/30 rounded p-3">
                          ❌ {run.error_message}
                        </div>
                      )}

                      {run.parsed_result && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-gray-500">Mentioned</p>
                            <p className="font-semibold mt-1 text-gray-100">
                              {run.parsed_result.brand_mentioned ? `✅ ${run.parsed_result.mention_count}×` : '❌ No'}
                            </p>
                          </div>
                          <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-gray-500">Sentiment</p>
                            <p className="font-semibold mt-1">
                              <SentimentPill val={run.parsed_result.sentiment} />
                            </p>
                          </div>
                          <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-gray-500">Citations</p>
                            <p className="font-semibold mt-1 text-gray-100">{run.parsed_result.cited_domains?.length ?? 0}</p>
                          </div>
                          <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-gray-500">Facts found</p>
                            <p className="font-semibold mt-1 text-gray-100">{run.parsed_result.extracted_facts?.length ?? 0}</p>
                          </div>
                        </div>
                      )}

                      {run.parsed_result?.cited_domains?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2 font-medium">Cited domains</p>
                          <div className="flex flex-wrap gap-2">
                            {run.parsed_result.cited_domains.map(d => (
                              <span key={d} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {run.parsed_result?.extracted_facts?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2 font-medium">Extracted facts</p>
                          <ul className="space-y-1">
                            {run.parsed_result.extracted_facts.map((f, i) => (
                              <li key={i} className="text-xs text-gray-400 bg-gray-800/50 rounded p-2">• {f}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {run.raw_response && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2 font-medium">Raw LLM response</p>
                          <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                            {run.raw_response}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
