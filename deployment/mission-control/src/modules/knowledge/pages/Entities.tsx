import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEntities, createEntity, deleteEntity } from '../api/client'
import { PageHeader, LoadingBox, EmptyState, Modal, Select } from '../components'

const ENTITY_TYPES = [
  { value: 'product',  label: 'Product'  },
  { value: 'person',   label: 'Person'   },
  { value: 'award',    label: 'Award'    },
  { value: 'stat',     label: 'Stat'     },
  { value: 'policy',   label: 'Policy'   },
]

const TYPE_COLORS: Record<string, string> = {
  product: 'bg-blue-50 text-blue-700',
  person:  'bg-purple-50 text-purple-700',
  award:   'bg-yellow-50 text-yellow-700',
  stat:    'bg-green-50 text-green-700',
  policy:  'bg-orange-50 text-orange-700',
}

function CreateEntityModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', type: 'product', category: '', description: '' })
  const [err, setErr] = useState('')

  const mut = useMutation({
    mutationFn: createEntity,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entities'] }); onClose() },
    onError: () => setErr('Failed to create entity.'),
  })

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title="New Entity" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Name *</label>
          <input className="input" placeholder="e.g. OmegaBoost Capsules" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <Select label="Type *" value={form.type} onChange={set('type')} options={ENTITY_TYPES} />
        <div>
          <label className="label">Category</label>
          <input className="input" placeholder="e.g. Supplements, Leadership" value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} placeholder="Short description..." value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mut.mutate(form)} disabled={!form.name || mut.isPending}>
            {mut.isPending ? 'Creating…' : 'Create Entity'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function EntitiesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: entities, isLoading } = useQuery({
    queryKey: ['entities', search, filterType],
    queryFn: () => getEntities(search || undefined, filterType || undefined),
  })

  const del = useMutation({
    mutationFn: deleteEntity,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entities'] }),
  })

  return (
    <div>
      <PageHeader
        title="Entities"
        subtitle="Products, founders, awards — the building blocks of your brand knowledge"
        action={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + New Entity
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          className="input max-w-xs"
          placeholder="Search entities…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input max-w-[160px]"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All types</option>
          {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingBox />
      ) : entities?.length === 0 ? (
        <EmptyState message="No entities yet. Click '+ New Entity' to add one." icon="📦" />
      ) : (
        <div className="card divide-y divide-gray-100">
          {entities?.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link to={`/entities/${e.id}`} className="text-sm font-semibold text-gray-900 hover:text-brand-600 truncate">
                    {e.name}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[e.type] || 'bg-gray-100 text-gray-600'}`}>
                    {e.type}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{e.category || 'No category'} · {e.fact_count} facts</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Link to={`/entities/${e.id}`} className="btn-secondary text-xs py-1">
                  View →
                </Link>
                <button
                  className="btn-danger text-xs py-1"
                  onClick={() => { if (confirm(`Delete "${e.name}"?`)) del.mutate(e.id) }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateEntityModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
