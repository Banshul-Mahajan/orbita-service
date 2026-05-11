import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEntity, addFact, updateFact, deleteFact } from '../api/client'
import { PageHeader, LoadingBox, ConfidenceBadge, EmptyState } from '../components'

function AddFactRow({ entityId, onDone }: { entityId: string; onDone: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    attribute: '', value: '', unit: '', confidence: '0.8', source_url: '',
  })

  const mut = useMutation({
    mutationFn: () => addFact(entityId, { ...form, confidence: parseFloat(form.confidence) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entity', entityId] })
      onDone()
    },
  })

  return (
    <tr className="bg-brand-50">
      <td className="px-4 py-2">
        <input className="input" placeholder="e.g. Founded year" value={form.attribute}
          onChange={e => setForm(f => ({ ...f, attribute: e.target.value }))} />
      </td>
      <td className="px-4 py-2">
        <input className="input" placeholder="e.g. 2019" value={form.value}
          onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
      </td>
      <td className="px-4 py-2">
        <input className="input" placeholder="unit" value={form.unit}
          onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
      </td>
      <td className="px-4 py-2">
        <select className="input" value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: e.target.value }))}>
          <option value="1.0">Verified (100%)</option>
          <option value="0.9">High (90%)</option>
          <option value="0.8">Good (80%)</option>
          <option value="0.7">Low (70%)</option>
          <option value="0.5">Unverified (50%)</option>
        </select>
      </td>
      <td className="px-4 py-2">
        <input className="input" placeholder="https://…" value={form.source_url}
          onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))} />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button className="btn-primary text-xs py-1 px-2" onClick={() => mut.mutate()} disabled={!form.attribute || !form.value}>
            {mut.isPending ? '…' : 'Save'}
          </button>
          <button className="btn-secondary text-xs py-1 px-2" onClick={onDone}>✕</button>
        </div>
      </td>
    </tr>
  )
}

function FactRow({ fact, entityId }: { fact: any; entityId: string }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    attribute: fact.attribute,
    value: fact.value,
    unit: fact.unit || '',
    confidence: String(fact.confidence),
    source_url: fact.source_url || '',
  })

  const upd = useMutation({
    mutationFn: () => updateFact(fact.id, { ...form, confidence: parseFloat(form.confidence) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entity', entityId] }); setEditing(false) },
  })

  const del = useMutation({
    mutationFn: () => deleteFact(fact.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity', entityId] }),
  })

  const promote = useMutation({
    mutationFn: () => updateFact(fact.id, { confidence: Math.min(1.0, fact.confidence + 0.1), is_verified: fact.confidence >= 0.9 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity', entityId] }),
  })

  if (editing) {
    return (
      <tr className="bg-yellow-50">
        <td className="px-4 py-2"><input className="input" value={form.attribute} onChange={e => setForm(f => ({ ...f, attribute: e.target.value }))} /></td>
        <td className="px-4 py-2"><input className="input" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></td>
        <td className="px-4 py-2"><input className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></td>
        <td className="px-4 py-2">
          <select className="input" value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: e.target.value }))}>
            <option value="1.0">100%</option>
            <option value="0.9">90%</option>
            <option value="0.8">80%</option>
            <option value="0.7">70%</option>
            <option value="0.5">50%</option>
          </select>
        </td>
        <td className="px-4 py-2"><input className="input" value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))} /></td>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            <button className="btn-primary text-xs py-1 px-2" onClick={() => upd.mutate()}>Save</button>
            <button className="btn-secondary text-xs py-1 px-2" onClick={() => setEditing(false)}>✕</button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{fact.attribute}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{fact.value}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{fact.unit || '—'}</td>
      <td className="px-4 py-3">
        <button onClick={() => promote.mutate()} title="Click to promote confidence">
          <ConfidenceBadge score={fact.confidence} />
        </button>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">
        {fact.source_url
          ? <a href={fact.source_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Source ↗</a>
          : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button className="btn-secondary text-xs py-1 px-2" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-danger text-xs py-1 px-2" onClick={() => { if (confirm('Delete this fact?')) del.mutate() }}>✕</button>
        </div>
      </td>
    </tr>
  )
}

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>()
  const [addingFact, setAddingFact] = useState(false)

  const { data: entity, isLoading } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => getEntity(id!),
    enabled: !!id,
  })

  if (isLoading) return <LoadingBox />

  const TYPE_COLOR: Record<string, string> = {
    product: 'bg-blue-100 text-blue-700',
    person:  'bg-purple-100 text-purple-700',
    award:   'bg-yellow-100 text-yellow-700',
    stat:    'bg-green-100 text-green-700',
    policy:  'bg-orange-100 text-orange-700',
  }

  return (
    <div>
      <div className="mb-2">
        <Link to="/entities" className="text-sm text-brand-600 hover:underline">← Entities</Link>
      </div>

      <PageHeader
        title={entity.name}
        subtitle={entity.description || 'No description'}
        action={
          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${TYPE_COLOR[entity.type] || 'bg-gray-100 text-gray-600'}`}>
              {entity.type}
            </span>
            {entity.category && (
              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">{entity.category}</span>
            )}
          </div>
        }
      />

      {/* Facts table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Facts <span className="text-gray-400 font-normal text-sm ml-1">({entity.facts?.length ?? 0})</span></h2>
          <button className="btn-primary text-sm" onClick={() => setAddingFact(true)} disabled={addingFact}>
            + Add Fact
          </button>
        </div>

        {entity.facts?.length === 0 && !addingFact ? (
          <EmptyState message="No facts yet. Click '+ Add Fact' to add one." icon="📝" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Attribute</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entity.facts?.map((f: any) => (
                  <FactRow key={f.id} fact={f} entityId={id!} />
                ))}
                {addingFact && (
                  <AddFactRow entityId={id!} onDone={() => setAddingFact(false)} />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
