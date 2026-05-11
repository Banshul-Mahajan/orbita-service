import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAuthors, createAuthor, updateAuthor, deleteAuthor } from '../api/client'
import { PageHeader, LoadingBox, EmptyState, Modal } from '../components'

function AuthorModal({
  initial,
  onClose,
}: {
  initial?: any
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!initial

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    bio: initial?.bio ?? '',
    credentials: initial?.credentials ?? '',
    linkedin_url: initial?.linkedin_url ?? '',
    expertise_areas: (initial?.expertise_areas ?? []).join(', '),
  })

  const [err, setErr] = useState('')

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        expertise_areas: form.expertise_areas.split(',').map((s: string) => s.trim()).filter(Boolean),
        eeeat_signals: {
          expertise: form.credentials ? true : false,
          authority: form.linkedin_url ? true : false,
          trust: true,
        },
      }
      return isEdit ? updateAuthor(initial.id, payload) : createAuthor(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['authors'] }); onClose() },
    onError: () => setErr('Failed to save author.'),
  })

  return (
    <Modal title={isEdit ? 'Edit Author' : 'New Author'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" placeholder="Dr. Jane Smith" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input" rows={3} placeholder="Brief professional bio…" value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
        </div>
        <div>
          <label className="label">Credentials / Qualifications</label>
          <input className="input" placeholder="e.g. PhD in Nutrition, RD, 15 years experience" value={form.credentials}
            onChange={e => setForm(f => ({ ...f, credentials: e.target.value }))} />
        </div>
        <div>
          <label className="label">LinkedIn URL</label>
          <input className="input" type="url" placeholder="https://linkedin.com/in/…" value={form.linkedin_url}
            onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
        </div>
        <div>
          <label className="label">Expertise Areas (comma-separated)</label>
          <input className="input" placeholder="Nutrition, Supplements, Clinical Trials" value={form.expertise_areas}
            onChange={e => setForm(f => ({ ...f, expertise_areas: e.target.value }))} />
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mut.mutate()} disabled={!form.name || mut.isPending}>
            {mut.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create Author'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function EEAATSignals({ signals }: { signals: Record<string, boolean> }) {
  return (
    <div className="flex gap-2 mt-1 flex-wrap">
      {Object.entries(signals).map(([k, v]) => (
        <span key={k} className={`text-xs px-2 py-0.5 rounded-full ${v ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
          {v ? '✓' : '✗'} {k}
        </span>
      ))}
    </div>
  )
}

export default function AuthorsPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: authors, isLoading } = useQuery({ queryKey: ['authors'], queryFn: getAuthors })

  const del = useMutation({
    mutationFn: deleteAuthor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['authors'] }),
  })

  return (
    <div>
      <PageHeader
        title="Authors"
        subtitle="E-E-A-T profiles injected into content and schema markup automatically"
        action={<button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Author</button>}
      />

      {isLoading ? (
        <LoadingBox />
      ) : authors?.length === 0 ? (
        <EmptyState message="No author profiles yet." icon="👤" />
      ) : (
        <div className="space-y-4">
          {authors?.map((a: any) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{a.name}</p>
                      {a.credentials && <p className="text-xs text-gray-500">{a.credentials}</p>}
                    </div>
                  </div>

                  {a.bio && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{a.bio}</p>}

                  {a.expertise_areas?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {a.expertise_areas.map((area: string) => (
                        <span key={area} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{area}</span>
                      ))}
                    </div>
                  )}

                  {a.eeeat_signals && Object.keys(a.eeeat_signals).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1">E-E-A-T Signals</p>
                      <EEAATSignals signals={a.eeeat_signals} />
                    </div>
                  )}

                  {a.linkedin_url && (
                    <a href={a.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
                      LinkedIn ↗
                    </a>
                  )}
                </div>

                <div className="flex gap-2 ml-4 shrink-0">
                  <button className="btn-secondary text-xs" onClick={() => setEditing(a)}>Edit</button>
                  <button className="btn-danger text-xs" onClick={() => { if (confirm(`Delete ${a.name}?`)) del.mutate(a.id) }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <AuthorModal onClose={() => setShowCreate(false)} />}
      {editing && <AuthorModal initial={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
