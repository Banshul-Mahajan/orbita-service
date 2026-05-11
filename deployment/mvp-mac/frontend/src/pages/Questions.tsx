// // import { useState } from 'react'
// // import { useMutation } from '@tanstack/react-query'
// // import { questionsApi, type QuestionMineResult } from '../api/client'
// // import { useProjectStore } from '../store/projectStore'
// // import { HelpCircle, Loader2 } from 'lucide-react'
// // import clsx from 'clsx'

// // const Q_TYPE_META: Record<string, { label: string; color: string }> = {
// //   what:  { label: 'What',  color: 'text-blue-400'   },
// //   how:   { label: 'How',   color: 'text-green-400'  },
// //   why:   { label: 'Why',   color: 'text-purple-400' },
// //   when:  { label: 'When',  color: 'text-yellow-400' },
// //   who:   { label: 'Who',   color: 'text-pink-400'   },
// //   where: { label: 'Where', color: 'text-orange-400' },
// //   other: { label: 'Other', color: 'text-gray-400'   },
// // }

// // const SOURCE_CLASS: Record<string, string> = {
// //   paa:    'badge-paa',
// //   ai:     'badge-ai',
// //   reddit: 'badge bg-orange-900 text-orange-200',
// // }

// // function QuestionCard({ qType, questions, source_map }: {
// //   qType: string
// //   questions: string[]
// //   source_map: Record<string, string>
// // }) {
// //   const meta = Q_TYPE_META[qType] ?? Q_TYPE_META.other
// //   return (
// //     <div className="card">
// //       <div className="flex items-center gap-2 mb-3">
// //         <span className={clsx('text-sm font-bold uppercase tracking-wide', meta.color)}>{meta.label}</span>
// //         <span className="text-xs text-gray-600">({questions.length})</span>
// //       </div>
// //       <div className="space-y-2">
// //         {questions.map((q, i) => (
// //           <div key={i} className="flex items-start gap-2 text-sm">
// //             <span className="badge shrink-0 mt-0.5 badge-info">{source_map[q] ?? 'ai'}</span>
// //             <span className="text-gray-300">{q}</span>
// //           </div>
// //         ))}
// //       </div>
// //     </div>
// //   )
// // }

// // export default function Questions() {
// //   const { selectedProject } = useProjectStore()
// //   const [topic, setTopic] = useState('')
// //   const [result, setResult] = useState<QuestionMineResult | null>(null)

// //   const mineMut = useMutation({
// //     mutationFn: () => questionsApi.mine(selectedProject!.id, topic.trim()),
// //     onSuccess: (data) => setResult(data),
// //   })

// //   // Build source map: question_text → source
// //   const sourceMap = Object.fromEntries(
// //     (result?.all ?? []).map(q => [q.question_text, q.source])
// //   )

// //   const groups = Object.entries(result?.grouped ?? {})
// //     .sort(([a], [b]) => {
// //       const order = ['what', 'how', 'why', 'when', 'who', 'where', 'other']
// //       return order.indexOf(a) - order.indexOf(b)
// //     })

// //   if (!selectedProject) return <p className="text-gray-500">Select a project first.</p>

// //   return (
// //     <div>
// //       <h1 className="text-xl font-bold text-white mb-1">Question Miner</h1>
// //       <p className="text-gray-500 text-sm mb-6">
// //         Aggregate PAA and AI-generated questions — perfect for FAQ sections and voice search.
// //       </p>

// //       <div className="card mb-6">
// //         <div className="flex gap-3">
// //           <input
// //             className="input flex-1"
// //             placeholder="e.g. content marketing"
// //             value={topic}
// //             onChange={e => setTopic(e.target.value)}
// //             onKeyDown={e => { if (e.key === 'Enter' && topic.trim()) mineMut.mutate() }}
// //           />
// //           <button
// //             className="btn-primary flex items-center gap-2"
// //             onClick={() => topic.trim() && mineMut.mutate()}
// //             disabled={mineMut.isPending || !topic.trim()}
// //           >
// //             {mineMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <HelpCircle size={14} />}
// //             {mineMut.isPending ? 'Mining…' : 'Mine Questions'}
// //           </button>
// //         </div>
// //         {mineMut.isError && (
// //           <p className="mt-3 text-red-400 text-sm">Error: {(mineMut.error as Error).message}</p>
// //         )}
// //       </div>

// //       {result && (
// //         <div>
// //           <div className="flex items-center justify-between mb-4">
// //             <p className="text-sm text-gray-400">
// //               <span className="font-semibold text-white">{result.total}</span> questions for "{result.topic}"
// //             </p>
// //             {/* Export button */}
// //             <button
// //               className="btn-secondary text-xs"
// //               onClick={() => {
// //                 const blob = new Blob([JSON.stringify(result.all, null, 2)], { type: 'application/json' })
// //                 const a = document.createElement('a')
// //                 a.href = URL.createObjectURL(blob)
// //                 a.download = `questions-${result.topic}.json`
// //                 a.click()
// //               }}
// //             >
// //               Export JSON
// //             </button>
// //           </div>

// //           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
// //             {groups.map(([qType, qs]) => (
// //               <QuestionCard key={qType} qType={qType} questions={qs} source_map={sourceMap} />
// //             ))}
// //           </div>
// //         </div>
// //       )}

// //       {!result && !mineMut.isPending && (
// //         <div className="text-center py-16 text-gray-600">
// //           <HelpCircle size={32} className="mx-auto mb-3 opacity-40" />
// //           <p className="text-sm">Enter a topic and click Mine Questions.</p>
// //         </div>
// //       )}
// //     </div>
// //   )
// // }


// import { useState, useEffect } from 'react'
// import { useMutation, useQuery } from '@tanstack/react-query'
// import { questionsApi, type QuestionMineResult } from '../api/client'
// import { useProjectStore } from '../store/projectStore'
// import { HelpCircle, Loader2 } from 'lucide-react'
// import clsx from 'clsx'

// const Q_TYPE_META: Record<string, { label: string; color: string }> = {
//   what:  { label: 'What',  color: 'text-blue-400'   },
//   how:   { label: 'How',   color: 'text-green-400'  },
//   why:   { label: 'Why',   color: 'text-purple-400' },
//   when:  { label: 'When',  color: 'text-yellow-400' },
//   who:   { label: 'Who',   color: 'text-pink-400'   },
//   where: { label: 'Where', color: 'text-orange-400' },
//   other: { label: 'Other', color: 'text-gray-400'   },
// }

// const SOURCE_CLASS: Record<string, string> = {
//   paa:    'badge bg-orange-900 text-orange-200',
//   ai:     'badge bg-indigo-900 text-indigo-200',
//   reddit: 'badge bg-orange-900 text-orange-200',
// }

// function QuestionCard({ qType, questions, source_map }: {
//   qType: string
//   questions: string[]
//   source_map: Record<string, string>
// }) {
//   const meta = Q_TYPE_META[qType] ?? Q_TYPE_META.other
//   return (
//     <div className="card">
//       <div className="flex items-center gap-2 mb-3">
//         <span className={clsx('text-sm font-bold uppercase tracking-wide', meta.color)}>
//           {meta.label}
//         </span>
//         <span className="text-xs text-gray-600">({questions.length})</span>
//       </div>
//       <div className="space-y-2">
//         {questions.map((q, i) => (
//           <div key={i} className="flex items-start gap-2 text-sm">
//             {/* Fixed: use SOURCE_CLASS instead of hardcoded badge-info */}
//             <span className={clsx('shrink-0 mt-0.5', SOURCE_CLASS[source_map[q]] ?? SOURCE_CLASS.ai)}>
//               {source_map[q] ?? 'ai'}
//             </span>
//             <span className="text-gray-300">{q}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }

// export default function Questions() {
//   const { selectedProject, getLastQuery, setLastQuery } = useProjectStore()
//   const [topic, setTopic] = useState('')

//   const lastTopic = selectedProject ? getLastQuery(selectedProject.id, 'questions') : ''

//   // ── Load saved questions on mount ───────────────────────────────────
//   const { data: savedData, isLoading: savedLoading } = useQuery({
//     queryKey: ['questions-saved', selectedProject?.id, lastTopic],
//     queryFn: () => questionsApi.get(selectedProject!.id, lastTopic),
//     enabled: !!selectedProject && !!lastTopic,
//   })

//   useEffect(() => {
//     if (lastTopic) setTopic(lastTopic)
//   }, [lastTopic])

//   const mineMut = useMutation({
//     mutationFn: () => questionsApi.mine(selectedProject!.id, topic.trim()),
//     onSuccess: (data) => {
//       setLastQuery(selectedProject!.id, 'questions', data.topic)
//     },
//   })

//   // Reconstruct result shape for display
//   // Mine returns {topic, total, grouped, all[]}
//   // Get returns  {topic, total, grouped}  — no all[] so source_map will be empty
//   const result = mineMut.data ?? null

//   // For saved data, source_map won't have source info (GET doesn't return it)
//   // We show saved grouped data but without source badges
//   const displayGrouped = result?.grouped ?? savedData?.grouped ?? {}
//   const displayTopic   = result?.topic   ?? savedData?.topic   ?? ''
//   const displayTotal   = result?.total   ?? savedData?.total   ?? 0

//   const sourceMap = Object.fromEntries(
//     (result?.all ?? []).map(q => [q.question_text, q.source])
//   )

//   const groups = Object.entries(displayGrouped)
//     .sort(([a], [b]) => {
//       const order = ['what', 'how', 'why', 'when', 'who', 'where', 'other']
//       return order.indexOf(a) - order.indexOf(b)
//     })

//   if (!selectedProject) return <p className="text-gray-500">Select a project first.</p>

//   return (
//     <div>
//       <h1 className="text-xl font-bold text-white mb-1">Question Miner</h1>
//       <p className="text-gray-500 text-sm mb-6">
//         Aggregate PAA and AI-generated questions — perfect for FAQ sections and voice search.
//       </p>

//       <div className="card mb-6">
//         <div className="flex gap-3">
//           <input
//             className="input flex-1"
//             placeholder="e.g. content marketing"
//             value={topic}
//             onChange={e => setTopic(e.target.value)}
//             onKeyDown={e => { if (e.key === 'Enter' && topic.trim()) mineMut.mutate() }}
//           />
//           <button
//             className="btn-primary flex items-center gap-2"
//             onClick={() => topic.trim() && mineMut.mutate()}
//             disabled={mineMut.isPending || !topic.trim()}
//           >
//             {mineMut.isPending
//               ? <Loader2 size={14} className="animate-spin" />
//               : <HelpCircle size={14} />}
//             {mineMut.isPending ? 'Mining…' : 'Mine Questions'}
//           </button>
//         </div>
//         {mineMut.isError && (
//           <p className="mt-3 text-red-400 text-sm">
//             Error: {(mineMut.error as Error).message}
//           </p>
//         )}
//         {displayTopic && !mineMut.isPending && (
//           <p className="mt-2 text-xs text-gray-500">
//             Showing questions for: <span className="text-gray-300">"{displayTopic}"</span>
//           </p>
//         )}
//       </div>

//       {savedLoading && (
//         <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
//           <Loader2 size={14} className="animate-spin" /> Loading previous questions…
//         </div>
//       )}

//       {groups.length > 0 && (
//         <div>
//           <div className="flex items-center justify-between mb-4">
//             <p className="text-sm text-gray-400">
//               <span className="font-semibold text-white">{displayTotal}</span> questions
//               for "{displayTopic}"
//             </p>
//             {result && (
//               <button className="btn-secondary text-xs" onClick={() => {
//                 const blob = new Blob([JSON.stringify(result.all, null, 2)], { type: 'application/json' })
//                 const a = document.createElement('a')
//                 a.href = URL.createObjectURL(blob)
//                 a.download = `questions-${result.topic}.json`
//                 a.click()
//               }}>
//                 Export JSON
//               </button>
//             )}
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
//             {groups.map(([qType, qs]) => (
//               <QuestionCard
//                 key={qType}
//                 qType={qType}
//                 questions={qs}
//                 source_map={sourceMap}
//               />
//             ))}
//           </div>
//         </div>
//       )}

//       {groups.length === 0 && !mineMut.isPending && !savedLoading && (
//         <div className="text-center py-16 text-gray-600">
//           <HelpCircle size={32} className="mx-auto mb-3 opacity-40" />
//           <p className="text-sm">Enter a topic and click Mine Questions.</p>
//         </div>
//       )}
//     </div>
//   )
// }


import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { questionsApi, type QuestionMineResult } from '../api/client'
import { useProjectStore } from '../store/projectStore'
import { HelpCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const Q_TYPE_META: Record<string, { label: string; color: string }> = {
  what:  { label: 'What',  color: 'text-blue-400'   },
  how:   { label: 'How',   color: 'text-green-400'  },
  why:   { label: 'Why',   color: 'text-purple-400' },
  when:  { label: 'When',  color: 'text-yellow-400' },
  who:   { label: 'Who',   color: 'text-pink-400'   },
  where: { label: 'Where', color: 'text-orange-400' },
  other: { label: 'Other', color: 'text-gray-400'   },
}

const SOURCE_CLASS: Record<string, string> = {
  paa:    'badge bg-orange-900 text-orange-200',
  ai:     'badge bg-indigo-900 text-indigo-200',
  reddit: 'badge bg-orange-900 text-orange-200',
}

function QuestionCard({ qType, questions, source_map }: {
  qType: string
  questions: string[]
  source_map: Record<string, string>
}) {
  const meta = Q_TYPE_META[qType] ?? Q_TYPE_META.other
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className={clsx('text-sm font-bold uppercase tracking-wide', meta.color)}>
          {meta.label}
        </span>
        <span className="text-xs text-gray-600">({questions.length})</span>
      </div>
      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            {/* Fixed: use SOURCE_CLASS instead of hardcoded badge-info */}
            <span className={clsx('shrink-0 mt-0.5', SOURCE_CLASS[source_map[q]] ?? SOURCE_CLASS.ai)}>
              {source_map[q] ?? 'ai'}
            </span>
            <span className="text-gray-300">{q}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Questions() {
  const { selectedProject, getLastQuery, setLastQuery } = useProjectStore()
  const [topic, setTopic] = useState('')

  const lastTopic = selectedProject ? getLastQuery(selectedProject.id, 'questions') : ''

  // ── Load saved questions on mount ───────────────────────────────────
  const { data: savedData, isLoading: savedLoading } = useQuery({
    queryKey: ['questions-saved', selectedProject?.id, lastTopic],
    queryFn: () => questionsApi.get(selectedProject!.id, lastTopic),
    enabled: !!selectedProject && !!lastTopic,
  })

  useEffect(() => {
    if (lastTopic) setTopic(lastTopic)
  }, [lastTopic])

  const mineMut = useMutation({
    mutationFn: () => questionsApi.mine(selectedProject!.id, topic.trim()),
    onSuccess: (data) => {
      setLastQuery(selectedProject!.id, 'questions', data.topic)
    },
  })

  // Reconstruct result shape for display
  // Mine returns {topic, total, grouped, all[]}
  // Get returns  {topic, total, grouped}  — no all[] so source_map will be empty
  const result = mineMut.data ?? null

  // For saved data, source_map won't have source info (GET doesn't return it)
  // We show saved grouped data but without source badges
  const displayGrouped = result?.grouped ?? savedData?.grouped ?? {}
  const displayTopic   = result?.topic   ?? savedData?.topic   ?? ''
  const displayTotal   = result?.total   ?? savedData?.total   ?? 0

  const sourceMap = Object.fromEntries(
    (result?.all ?? []).map(q => [q.question_text, q.source])
  )

  const groups = Object.entries(displayGrouped)
    .sort(([a], [b]) => {
      const order = ['what', 'how', 'why', 'when', 'who', 'where', 'other']
      return order.indexOf(a) - order.indexOf(b)
    })

  if (!selectedProject) return <p className="text-gray-500">Select a project first.</p>

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Question Miner</h1>
      <p className="text-gray-500 text-sm mb-6">
        Aggregate PAA and AI-generated questions — perfect for FAQ sections and voice search.
      </p>

      <div className="card mb-6">
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="e.g. content marketing"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && topic.trim()) mineMut.mutate() }}
          />
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => topic.trim() && mineMut.mutate()}
            disabled={mineMut.isPending || !topic.trim()}
          >
            {mineMut.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <HelpCircle size={14} />}
            {mineMut.isPending ? 'Mining…' : 'Mine Questions'}
          </button>
        </div>
        {mineMut.isError && (
          <p className="mt-3 text-red-400 text-sm">
            Error: {(mineMut.error as Error).message}
          </p>
        )}
        {displayTopic && !mineMut.isPending && (
          <p className="mt-2 text-xs text-gray-500">
            Showing questions for: <span className="text-gray-300">"{displayTopic}"</span>
          </p>
        )}
      </div>

      {savedLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
          <Loader2 size={14} className="animate-spin" /> Loading previous questions…
        </div>
      )}

      {groups.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-white">{displayTotal}</span> questions
              for "{displayTopic}"
            </p>
            {result && (
              <button className="btn-secondary text-xs" onClick={() => {
                const blob = new Blob([JSON.stringify(result.all, null, 2)], { type: 'application/json' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `questions-${result.topic}.json`
                a.click()
              }}>
                Export JSON
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map(([qType, qs]) => (
              <QuestionCard
                key={qType}
                qType={qType}
                questions={qs}
                source_map={sourceMap}
              />
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 && !mineMut.isPending && !savedLoading && (
        <div className="text-center py-16 text-gray-600">
          <HelpCircle size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Enter a topic and click Mine Questions.</p>
        </div>
      )}
    </div>
  )
}