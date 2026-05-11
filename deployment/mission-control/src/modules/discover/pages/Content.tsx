import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Loader2, Sparkles } from 'lucide-react'
import { contentApi, keywordsApi, type ContentDraft } from '../api/client'
import { useProjectStore } from '../store/projectStore'

const CONTENT_TYPES = [
  { value: 'informational', label: 'Informational Article' },
  { value: 'faq', label: 'FAQ / Q&A' },
  { value: 'transactional', label: 'Transactional Landing Page' },
  { value: 'commercial', label: 'Commercial Comparison' },
]

function DraftPreview({ draft }: { draft: ContentDraft }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="label mb-1">{draft.content_type} / {draft.intent}</p>
          <h2 className="text-lg font-semibold text-white">{draft.title}</h2>
          <p className="text-xs text-gray-500 mt-1">/{draft.slug}</p>
        </div>
        <span className="badge bg-green-900 text-green-200">{draft.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg bg-gray-800/50 border border-gray-800 p-3">
          <p className="label mb-2">Outline</p>
          <ul className="space-y-1 text-sm text-gray-300">
            {draft.outline.map(item => <li key={item}>- {item}</li>)}
          </ul>
        </div>
        <div className="rounded-lg bg-gray-800/50 border border-gray-800 p-3">
          <p className="label mb-2">FAQ</p>
          <div className="space-y-2">
            {draft.faq.map(item => (
              <div key={item.question}>
                <p className="text-sm text-gray-200">{item.question}</p>
                <p className="text-xs text-gray-500">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <pre className="whitespace-pre-wrap rounded-lg bg-gray-950 border border-gray-800 p-4 text-sm text-gray-300 font-sans leading-relaxed">
        {draft.body_markdown}
      </pre>
    </div>
  )
}

export default function Content() {
  const { selectedProject } = useProjectStore()
  const [keywordId, setKeywordId] = useState('')
  const [contentType, setContentType] = useState('informational')
  const [tone, setTone] = useState('helpful')
  const qc = useQueryClient()

  const { data: opportunities } = useQuery({
    queryKey: ['keyword-opportunities', selectedProject?.id],
    queryFn: () => keywordsApi.opportunities(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const { data: draftList } = useQuery({
    queryKey: ['content', selectedProject?.id],
    queryFn: () => contentApi.list(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const selectedKeywords = (opportunities?.all ?? []).filter(item => item.selected)

  useEffect(() => {
    if (!keywordId && selectedKeywords.length > 0) {
      setKeywordId(selectedKeywords[0].id)
      setContentType(selectedKeywords[0].intent === 'navigational' ? 'informational' : selectedKeywords[0].intent)
    }
  }, [keywordId, selectedKeywords])

  const generateMut = useMutation({
    mutationFn: () => contentApi.generate(selectedProject!.id, keywordId, contentType, tone),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', selectedProject?.id] }),
  })

  if (!selectedProject) return <p className="text-gray-500">Select or create a project first.</p>

  const latestDraft = generateMut.data ?? draftList?.drafts?.[0]

  return (
    <div>
      <div className="mb-6">
        <p className="label mb-2">Create Orbit handoff</p>
        <h1 className="text-xl font-bold text-white mb-1">Generate Content From Selected Keywords</h1>
        <p className="text-gray-500 text-sm max-w-2xl">
          This MVP turns Discover Orbit research into a structured draft. Later this should move into the full Create Orbit writer with Knowledge Core grounding.
        </p>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_180px_auto] gap-3">
          <select
            className="input"
            value={keywordId}
            onChange={e => {
              const next = selectedKeywords.find(item => item.id === e.target.value)
              setKeywordId(e.target.value)
              if (next) setContentType(next.intent === 'navigational' ? 'informational' : next.intent)
            }}
          >
            <option value="">Select keyword</option>
            {selectedKeywords.map(item => (
              <option key={item.id} value={item.id}>{item.keyword} ({item.intent})</option>
            ))}
          </select>
          <select className="input" value={contentType} onChange={e => setContentType(e.target.value)}>
            {CONTENT_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input
            className="input"
            value={tone}
            onChange={e => setTone(e.target.value)}
            placeholder="Tone"
          />
          <button
            className="btn-primary flex items-center justify-center gap-2"
            disabled={generateMut.isPending || !keywordId}
            onClick={() => generateMut.mutate()}
          >
            {generateMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generateMut.isPending ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {selectedKeywords.length === 0 && (
          <p className="mt-3 text-xs text-yellow-300">
            Select keywords first. Discover Orbit uses those choices to generate more relevant content.
          </p>
        )}
        {generateMut.isError && (
          <p className="mt-3 text-sm text-red-400">{(generateMut.error as Error).message}</p>
        )}
      </div>

      {latestDraft ? (
        <DraftPreview draft={latestDraft} />
      ) : (
        <div className="text-center py-16 text-gray-600">
          <FileText size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Choose a selected keyword and generate a draft.</p>
        </div>
      )}
    </div>
  )
}
