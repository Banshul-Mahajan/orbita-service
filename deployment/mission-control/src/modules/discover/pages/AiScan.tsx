// import { useState } from 'react'
// import { useMutation } from '@tanstack/react-query'
// import { aiScanApi, type AiEngineResult } from '../api/client'
// import { useProjectStore } from '../store/projectStore'
// import { Bot, Loader2, ExternalLink } from 'lucide-react'
// import clsx from 'clsx'

// const ENGINE_META: Record<string, { label: string; color: string; bg: string }> = {
//   openai:     { label: 'ChatGPT',    color: 'text-green-400',  bg: 'bg-green-900/20 border-green-800' },
//   gemini:     { label: 'Gemini',     color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-800'   },
//   perplexity: { label: 'Perplexity', color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800' },
// }

// const ALL_ENGINES = ['openai', 'gemini', 'perplexity']

// function EngineCard({ result }: { result: AiEngineResult }) {
//   const meta = ENGINE_META[result.engine] ?? { label: result.engine, color: 'text-gray-400', bg: 'bg-gray-800 border-gray-700' }
//   return (
//     <div className={clsx('rounded-xl border p-4 flex flex-col gap-3', meta.bg)}>
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <Bot size={14} className={meta.color} />
//           <span className={clsx('font-semibold text-sm', meta.color)}>{meta.label}</span>
//         </div>
//         <span className="text-xs text-gray-500">{result.answer_length} words</span>
//       </div>

//       <p className="text-xs text-gray-300 leading-relaxed line-clamp-6">{result.answer_text}</p>

//       {(result.cited_domains ?? []).length > 0 && (
//         <div>
//           <p className="label mb-1.5">Cited Sources</p>
//           <div className="flex flex-wrap gap-1">
//             {result.cited_domains.map((d, i) => (
//               <a
//                 key={i}
//                 href={`https://${d}`}
//                 target="_blank"
//                 rel="noreferrer"
//                 className="inline-flex items-center gap-1 badge bg-gray-800 text-gray-300 hover:text-white transition-colors"
//               >
//                 {d} <ExternalLink size={9} />
//               </a>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// export default function AiScan() {
//   const { selectedProject } = useProjectStore()
//   const [query, setQuery] = useState('')
//   const [engines, setEngines] = useState<string[]>(['openai', 'gemini', 'perplexity'])
//   const [results, setResults] = useState<AiEngineResult[]>([])

//   const scanMut = useMutation({
//     mutationFn: () => aiScanApi.scan(selectedProject!.id, query.trim(), engines),
//     onSuccess: (data) => setResults(data.results),
//   })

//   const toggleEngine = (e: string) =>
//     setEngines(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])

//   if (!selectedProject) return <p className="text-gray-500">Select a project first.</p>

//   return (
//     <div>
//       <h1 className="text-xl font-bold text-white mb-1">AI Answer Scanner</h1>
//       <p className="text-gray-500 text-sm mb-6">Query AI engines and compare how they answer — and who they cite.</p>

//       <div className="card mb-6">
//         <div className="flex gap-3 mb-3">
//           <input
//             className="input flex-1"
//             placeholder="e.g. best CRM for startups"
//             value={query}
//             onChange={e => setQuery(e.target.value)}
//             onKeyDown={e => { if (e.key === 'Enter' && query.trim()) scanMut.mutate() }}
//           />
//           <button
//             className="btn-primary flex items-center gap-2"
//             onClick={() => query.trim() && scanMut.mutate()}
//             disabled={scanMut.isPending || !query.trim() || engines.length === 0}
//           >
//             {scanMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
//             {scanMut.isPending ? 'Scanning…' : 'Scan AI'}
//           </button>
//         </div>

//         {/* Engine toggles */}
//         <div className="flex items-center gap-2 flex-wrap">
//           <span className="label">Engines:</span>
//           {ALL_ENGINES.map(e => {
//             const meta = ENGINE_META[e]
//             const on = engines.includes(e)
//             return (
//               <button
//                 key={e}
//                 onClick={() => toggleEngine(e)}
//                 className={clsx(
//                   'badge cursor-pointer transition-colors',
//                   on ? clsx(meta.bg, meta.color) : 'bg-gray-800 text-gray-500 border border-gray-700'
//                 )}
//               >
//                 {meta.label}
//               </button>
//             )
//           })}
//         </div>

//         {scanMut.isError && (
//           <p className="mt-3 text-red-400 text-sm">Error: {(scanMut.error as Error).message}</p>
//         )}
//       </div>

//       {results.length > 0 && (
//         <div>
//           <p className="text-sm text-gray-400 mb-4">
//             Results for <span className="font-semibold text-white">"{query}"</span>
//           </p>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             {results.map(r => <EngineCard key={r.engine} result={r} />)}
//           </div>
//         </div>
//       )}

//       {results.length === 0 && !scanMut.isPending && (
//         <div className="text-center py-16 text-gray-600">
//           <Bot size={32} className="mx-auto mb-3 opacity-40" />
//           <p className="text-sm">Select engines, enter a query, and click Scan AI.</p>
//         </div>
//       )}
//     </div>
//   )
// }



import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { aiScanApi, type AiEngineResult } from '../api/client'
import { useProjectStore } from '../store/projectStore'
import { Bot, Loader2, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

const ENGINE_META: Record<string, { label: string; color: string; bg: string }> = {
  openai:     { label: 'ChatGPT',    color: 'text-green-400',  bg: 'bg-green-900/20 border-green-800'   },
  gemini:     { label: 'Gemini',     color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-800'     },
  perplexity: { label: 'Perplexity', color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800' },
}

const ALL_ENGINES = ['openai', 'gemini', 'perplexity']

function EngineCard({ result }: { result: AiEngineResult }) {
  const meta = ENGINE_META[result.engine] ?? { label: result.engine, color: 'text-gray-400', bg: 'bg-gray-800 border-gray-700' }
  return (
    <div className={clsx('rounded-xl border p-4 flex flex-col gap-3', meta.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={14} className={meta.color} />
          <span className={clsx('font-semibold text-sm', meta.color)}>{meta.label}</span>
        </div>
        <span className="text-xs text-gray-500">{result.answer_length} words</span>
      </div>
      <p className="text-xs text-gray-300 leading-relaxed line-clamp-6">{result.answer_text}</p>
      {(result.cited_domains ?? []).length > 0 && (
        <div>
          <p className="label mb-1.5">Cited Sources</p>
          <div className="flex flex-wrap gap-1">
            {result.cited_domains.map((d, i) => (
              <a key={i} href={`https://${d}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 badge bg-gray-800 text-gray-300 hover:text-white transition-colors">
                {d} <ExternalLink size={9} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AiScan() {
  const { selectedProject, getLastQuery, setLastQuery } = useProjectStore()
  const [query, setQuery] = useState('')
  const [engines, setEngines] = useState<string[]>(['openai', 'gemini', 'perplexity'])

  const lastQuery = selectedProject ? getLastQuery(selectedProject.id, 'aiScan') : ''

  // ── Load last saved results on mount ────────────────────────────────
  const { data: savedData, isLoading: savedLoading } = useQuery({
    queryKey: ['ai-saved', selectedProject?.id, lastQuery],
    queryFn: () => aiScanApi.get(selectedProject!.id, lastQuery),
    enabled: !!selectedProject && !!lastQuery,
  })

  useEffect(() => {
    if (lastQuery) setQuery(lastQuery)
  }, [lastQuery])

  const scanMut = useMutation({
    mutationFn: () => aiScanApi.scan(selectedProject!.id, query.trim(), engines),
    onSuccess: (data) => {
      setLastQuery(selectedProject!.id, 'aiScan', data.query)
    },
  })

  const results = scanMut.data?.results ?? savedData?.results ?? []
  const displayQuery = scanMut.data?.query ?? savedData?.query ?? ''

  const toggleEngine = (e: string) =>
    setEngines(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])

  if (!selectedProject) return <p className="text-gray-500">Select a project first.</p>

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">AI Answer Scanner</h1>
      <p className="text-slate-400 text-sm mb-6">
        Query AI engines and compare how they answer — and who they cite.
      </p>

      <div className="card mb-6">
        <div className="flex gap-3 items-center mb-3">
          <input
            className="input !h-[42px] !m-0"
            style={{ flex: 3, minWidth: 0 }}
            placeholder="e.g. best CRM for startups"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) scanMut.mutate() }}
          />
          <button
            className="btn-primary flex justify-center items-center gap-2 !h-[42px] !m-0"
            style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap' }}
            onClick={() => query.trim() && scanMut.mutate()}
            disabled={scanMut.isPending || !query.trim() || engines.length === 0}
          >
            {scanMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
            {scanMut.isPending ? 'Scanning…' : 'Scan AI'}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="label">Engines:</span>
          {ALL_ENGINES.map(e => {
            const meta = ENGINE_META[e]
            const on = engines.includes(e)
            return (
              <button key={e} onClick={() => toggleEngine(e)}
                className={clsx('badge cursor-pointer transition-colors',
                  on ? clsx(meta.bg, meta.color) : 'bg-gray-800 text-gray-500 border border-gray-700'
                )}>
                {meta.label}
              </button>
            )
          })}
        </div>

        {displayQuery && !scanMut.isPending && (
          <p className="mt-2 text-xs text-gray-500">
            Showing results for: <span className="text-gray-300">"{displayQuery}"</span>
          </p>
        )}
      </div>

      {savedLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
          <Loader2 size={14} className="animate-spin" /> Loading previous scan…
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-4">
            Results for <span className="font-semibold text-white">"{displayQuery}"</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map(r => <EngineCard key={r.engine} result={r} />)}
          </div>
        </div>
      )}

      {results.length === 0 && !scanMut.isPending && !savedLoading && (
        <div className="text-center py-16 text-gray-600">
          <Bot size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Select engines, enter a query, and click Scan AI.</p>
        </div>
      )}
    </div>
  )
}