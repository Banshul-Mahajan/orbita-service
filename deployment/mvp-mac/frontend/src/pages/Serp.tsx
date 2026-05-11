// import { useState } from 'react'
// import { useMutation } from '@tanstack/react-query'
// import { serpApi, type SerpResultItem } from '../api/client'
// import { useProjectStore } from '../store/projectStore'
// import { Search, ChevronDown, ChevronRight, ExternalLink, Loader2 } from 'lucide-react'

// function ReadabilityBar({ score }: { score: number }) {
//   const pct = Math.min(100, Math.max(0, score))
//   const color = pct > 60 ? 'bg-green-500' : pct > 40 ? 'bg-yellow-500' : 'bg-red-500'
//   return (
//     <div className="flex items-center gap-2">
//       <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
//         <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
//       </div>
//       <span className="text-xs text-gray-400 w-8 text-right">{score?.toFixed(0)}</span>
//     </div>
//   )
// }

// function ResultRow({ r, rank }: { r: SerpResultItem; rank: number }) {
//   const [open, setOpen] = useState(false)
//   return (
//     <div className="border border-gray-800 rounded-lg overflow-hidden">
//       <button
//         className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-800/40 transition-colors"
//         onClick={() => setOpen(o => !o)}
//       >
//         <span className="text-xs font-mono text-gray-600 w-5 shrink-0 pt-0.5">#{rank}</span>
//         <div className="flex-1 min-w-0">
//           <p className="text-sm font-medium text-blue-400 truncate">{r.title}</p>
//           <p className="text-xs text-gray-500 truncate">{r.domain}</p>
//           <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.snippet}</p>
//         </div>
//         <div className="shrink-0 text-right space-y-1 min-w-[80px]">
//           <p className="text-xs text-gray-500">{r.word_count?.toLocaleString()} words</p>
//           <ReadabilityBar score={r.readability} />
//         </div>
//         {open ? <ChevronDown size={13} className="text-gray-500 shrink-0 mt-0.5" /> : <ChevronRight size={13} className="text-gray-500 shrink-0 mt-0.5" />}
//       </button>

//       {open && (
//         <div className="border-t border-gray-800 p-3 bg-gray-900/50 grid grid-cols-2 gap-4 text-xs">
//           <div>
//             <p className="label mb-2">Headings</p>
//             {(r.headings ?? []).length > 0
//               ? r.headings.map((h, i) => (
//                   <div key={i} className="flex gap-2 mb-1">
//                     <span className="text-gray-600 w-6 shrink-0 uppercase">{h.level}</span>
//                     <span className="text-gray-300">{h.text}</span>
//                   </div>
//                 ))
//               : <span className="text-gray-600">—</span>}
//           </div>
//           <div>
//             <p className="label mb-2">Entities</p>
//             <div className="flex flex-wrap gap-1">
//               {(r.entities ?? []).slice(0, 10).map((e, i) => (
//                 <span key={i} className="badge bg-gray-800 text-gray-300">{e}</span>
//               ))}
//               {(r.entities ?? []).length === 0 && <span className="text-gray-600">—</span>}
//             </div>
//             <a href={r.url} target="_blank" rel="noreferrer"
//               className="mt-3 flex items-center gap-1 text-blue-500 hover:text-blue-400">
//               <ExternalLink size={11} /> Open URL
//             </a>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// export default function Serp() {
//   const { selectedProject } = useProjectStore()
//   const [query, setQuery] = useState('')
//   const [results, setResults] = useState<SerpResultItem[]>([])

//   const analyzeMut = useMutation({
//     mutationFn: () => serpApi.analyze(selectedProject!.id, query.trim()),
//     onSuccess: (data) => setResults(data.results),
//   })

//   if (!selectedProject) return <p className="text-gray-500">Select a project first.</p>

//   return (
//     <div>
//       <h1 className="text-xl font-bold text-white mb-1">SERP Analyzer</h1>
//       <p className="text-gray-500 text-sm mb-6">Scrape the top Google results — headings, entities, and readability signals.</p>

//       <div className="card mb-6">
//         <div className="flex gap-3">
//           <input
//             className="input flex-1"
//             placeholder="e.g. best CRM for startups"
//             value={query}
//             onChange={e => setQuery(e.target.value)}
//             onKeyDown={e => { if (e.key === 'Enter' && query.trim()) analyzeMut.mutate() }}
//           />
//           <button
//             className="btn-primary flex items-center gap-2"
//             onClick={() => query.trim() && analyzeMut.mutate()}
//             disabled={analyzeMut.isPending || !query.trim()}
//           >
//             {analyzeMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
//             {analyzeMut.isPending ? 'Analyzing…' : 'Analyze'}
//           </button>
//         </div>
//         {analyzeMut.isError && (
//           <p className="mt-3 text-red-400 text-sm">Error: {(analyzeMut.error as Error).message}</p>
//         )}
//       </div>

//       {results.length > 0 && (
//         <div>
//           <p className="text-sm text-gray-400 mb-4">
//             <span className="font-semibold text-white">{results.length}</span> results for "{query}"
//           </p>
//           <div className="space-y-2">
//             {results.map((r) => <ResultRow key={r.position} r={r} rank={r.position} />)}
//           </div>
//         </div>
//       )}

//       {results.length === 0 && !analyzeMut.isPending && (
//         <div className="text-center py-16 text-gray-600">
//           <Search size={32} className="mx-auto mb-3 opacity-40" />
//           <p className="text-sm">Enter a query and click Analyze to see SERP results.</p>
//         </div>
//       )}
//     </div>
//   )
// }


import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { serpApi, type SerpResultItem } from '../api/client'
import { useProjectStore } from '../store/projectStore'
import { Search, ChevronDown, ChevronRight, ExternalLink, Loader2 } from 'lucide-react'

function ReadabilityBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct > 60 ? 'bg-green-500' : pct > 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{score?.toFixed(0)}</span>
    </div>
  )
}

function ResultRow({ r, rank }: { r: SerpResultItem; rank: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-800/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs font-mono text-gray-600 w-5 shrink-0 pt-0.5">#{rank}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-400 truncate">{r.title}</p>
          <p className="text-xs text-gray-500 truncate">{r.domain}</p>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.snippet}</p>
        </div>
        <div className="shrink-0 text-right space-y-1 min-w-[80px]">
          <p className="text-xs text-gray-500">{r.word_count?.toLocaleString()} words</p>
          <ReadabilityBar score={r.readability} />
        </div>
        {open
          ? <ChevronDown size={13} className="text-gray-500 shrink-0 mt-0.5" />
          : <ChevronRight size={13} className="text-gray-500 shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="border-t border-gray-800 p-3 bg-gray-900/50 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="label mb-2">Headings</p>
            {(r.headings ?? []).length > 0
              ? r.headings.map((h, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <span className="text-gray-600 w-6 shrink-0 uppercase">{h.level}</span>
                    <span className="text-gray-300">{h.text}</span>
                  </div>
                ))
              : <span className="text-gray-600">—</span>}
          </div>
          <div>
            <p className="label mb-2">Entities</p>
            <div className="flex flex-wrap gap-1">
              {(r.entities ?? []).slice(0, 10).map((e, i) => (
                <span key={i} className="badge bg-gray-800 text-gray-300">{e}</span>
              ))}
            </div>
            <a href={r.url} target="_blank" rel="noreferrer"
              className="mt-3 flex items-center gap-1 text-blue-500 hover:text-blue-400">
              <ExternalLink size={11} /> Open URL
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Serp() {
  const { selectedProject, getLastQuery, setLastQuery } = useProjectStore()
  const [query, setQuery] = useState('')

  // ── On mount: restore the last query this project ran ──────────────
  const lastQuery = selectedProject ? getLastQuery(selectedProject.id, 'serp') : ''

  const { data: savedData, isLoading: savedLoading } = useQuery({
    queryKey: ['serp-saved', selectedProject?.id, lastQuery],
    queryFn: () => serpApi.get(selectedProject!.id, lastQuery),
    enabled: !!selectedProject && !!lastQuery,
  })

  // Pre-fill the input with the last query
  useEffect(() => {
    if (lastQuery) setQuery(lastQuery)
  }, [lastQuery])

  const analyzeMut = useMutation({
    mutationFn: () => serpApi.analyze(selectedProject!.id, query.trim()),
    onSuccess: (data) => {
      // Save this query as the last one for this project+module
      setLastQuery(selectedProject!.id, 'serp', data.query)
    },
  })

  const results = analyzeMut.data?.results ?? savedData?.results ?? []
  const displayQuery = analyzeMut.data?.query ?? savedData?.query ?? ''

  if (!selectedProject) return <p className="text-gray-500">Select a project first.</p>

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">SERP Analyzer</h1>
      <p className="text-gray-500 text-sm mb-6">
        Scrape the top Google results — headings, entities, and readability signals.
      </p>

      <div className="card mb-6">
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="e.g. best CRM for startups"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) analyzeMut.mutate() }}
          />
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => query.trim() && analyzeMut.mutate()}
            disabled={analyzeMut.isPending || !query.trim()}
          >
            {analyzeMut.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Search size={14} />}
            {analyzeMut.isPending ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        {analyzeMut.isError && (
          <p className="mt-3 text-red-400 text-sm">
            Error: {(analyzeMut.error as Error).message}
          </p>
        )}
        {/* Show which query is loaded */}
        {displayQuery && !analyzeMut.isPending && (
          <p className="mt-2 text-xs text-gray-500">
            Showing results for: <span className="text-gray-300">"{displayQuery}"</span>
          </p>
        )}
      </div>

      {savedLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
          <Loader2 size={14} className="animate-spin" /> Loading previous results…
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-4">
            <span className="font-semibold text-white">{results.length}</span> results
          </p>
          <div className="space-y-2">
            {results.map((r) => <ResultRow key={r.position} r={r} rank={r.position} />)}
          </div>
        </div>
      )}

      {results.length === 0 && !analyzeMut.isPending && !savedLoading && (
        <div className="text-center py-16 text-gray-600">
          <Search size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Enter a query and click Analyze to see SERP results.</p>
        </div>
      )}
    </div>
  )
}