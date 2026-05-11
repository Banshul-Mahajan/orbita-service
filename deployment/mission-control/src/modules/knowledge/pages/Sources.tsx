import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSources, addSource, deleteSource } from '../api/client'
import { PageHeader, LoadingBox, EmptyState, Modal, Select } from '../components'

const SOURCE_TYPES = [
  { value: 'website', label: 'Website' },
  { value: 'paper',   label: 'Research Paper' },
  { value: 'gov',     label: 'Government Doc' },
  { value: 'internal',label: 'Internal Doc' },
  { value: 'news',    label: 'News Article' },
]

const RELIABILITY = [
  { value: '5', label: '⭐⭐⭐⭐⭐ Very High' },
  { value: '4', label: '⭐⭐⭐⭐ High' },
  { value: '3', label: '⭐⭐⭐ Medium' },
  { value: '2', label: '⭐⭐ Low' },
  { value: '1', label: '⭐ Very Low' },
]

function AddSourceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    url: '', title: '', source_type: 'website', reliability_score: '3',
  })
  const [err, setErr] = useState('')

  const mut = useMutation({
    mutationFn: () => addSource({ ...form, reliability_score: parseInt(form.reliability_score) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sources'] }); onClose() },
    onError: () => setErr('Failed to add source. Check the URL.'),
  })

  return (
    <Modal title="Add Citation Source" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">URL *</label>
          <input className="input" type="url" placeholder="https://example.com/article"
            value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
          <p className="text-xs text-gray-400 mt-1">Title will be auto-fetched from the page.</p>
        </div>
        <div>
          <label className="label">Title (optional — auto-detected)</label>
          <input className="input" placeholder="Leave blank to auto-detect"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <Select label="Source Type" value={form.source_type} onChange={v => setForm(f => ({ ...f, source_type: v }))} options={SOURCE_TYPES} />
        <Select label="Reliability" value={form.reliability_score} onChange={v => setForm(f => ({ ...f, reliability_score: v }))} options={RELIABILITY} />
        {err && <p className="text-sm text-red-500">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mut.mutate()} disabled={!form.url || mut.isPending}>
            {mut.isPending ? 'Fetching URL…' : 'Add Source'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

const TYPE_ICONS: Record<string, string> = {
  website: '🌐', paper: '📄', gov: '🏛️', internal: '📁', news: '📰',
}

const STAR_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-500', 'text-green-500', 'text-emerald-600']

export default function SourcesPage() {
  const qc = useQueryClient()
  const [filterType, setFilterType] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const { data: sources, isLoading } = useQuery({
    queryKey: ['sources', filterType],
    queryFn: () => getSources(filterType || undefined),
  })

  const del = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  })

  return (
    <div>
      <PageHeader
        title="Citations"
        subtitle="Approved URLs, research papers, and references that ground your brand facts"
        action={<button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Source</button>}
      />

      <div className="flex gap-3 mb-6">
        <select className="input max-w-[180px]" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All types</option>
          {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingBox />
      ) : sources?.length === 0 ? (
        <EmptyState message="No citations yet. Paste a URL to get started." icon="🔗" />
      ) : (
        <div className="card divide-y divide-gray-100">
          {sources?.map((s: any) => (
            <div key={s.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50">
              <span className="text-xl shrink-0">{TYPE_ICONS[s.source_type] ?? '🌐'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.title || s.url}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline truncate max-w-[300px]">
                    {s.domain} ↗
                  </a>
                  <span className={`text-xs font-bold ${STAR_COLORS[s.reliability_score]}`}>
                    {'★'.repeat(s.reliability_score)}{'☆'.repeat(5 - s.reliability_score)}
                  </span>
                  {s.is_active
                    ? <span className="text-xs text-green-600">● Live</span>
                    : <span className="text-xs text-red-500">● Dead</span>}
                </div>
              </div>
              <div className="shrink-0">
                <span className="text-xs text-gray-400 mr-3">{s.source_type}</span>
                <button className="btn-danger text-xs py-1"
                  onClick={() => { if (confirm('Remove this citation?')) del.mutate(s.id) }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddSourceModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
