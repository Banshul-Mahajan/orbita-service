import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '../api/client'
import { useProjectStore } from '../store/projectStore'
import { FolderOpen, Plus, ChevronDown, Check, X, Loader2 } from 'lucide-react'

export default function ProjectPicker() {
  const { selectedProject, setSelectedProject } = useProjectStore()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const qc = useQueryClient()

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: () => projectsApi.create(form.name, form.description),
    onSuccess: (res) => {
      setSelectedProject(res.data)
      qc.invalidateQueries({ queryKey: ['projects'] })
      setCreating(false)
      setOpen(false)
      setForm({ name: '', description: '' })
    },
  })

  return (
    <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#111827', border: '1px solid #1f2937',
          borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
          color: '#e2e8f0', fontSize: 14, width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderOpen size={16} color="#6366f1" />
          <span style={{ fontWeight: 500 }}>
            {selectedProject ? selectedProject.name : 'Select a project'}
          </span>
        </div>
        <ChevronDown size={14} color="#6b7280" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50,
          background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}>
          {/* Existing projects */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {projects.length === 0 && !creating && (
              <div style={{ padding: '1rem', color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                No projects yet. Create one below.
              </div>
            )}
            {projects.map((p: any) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProject(p); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', color: '#e2e8f0', fontSize: 13, textAlign: 'left',
                  borderBottom: '1px solid #1e293b',
                }}
              >
                <span>{p.name}</span>
                {selectedProject?.id === p.id && <Check size={14} color="#10b981" />}
              </button>
            ))}
          </div>

          {/* Create new */}
          {creating ? (
            <div style={{ padding: '12px 14px', borderTop: '1px solid #1e293b' }}>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Project name"
                style={{
                  width: '100%', background: '#1e293b', border: '1px solid #334155',
                  borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontSize: 13,
                  outline: 'none', marginBottom: 8,
                }}
              />
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                style={{
                  width: '100%', background: '#1e293b', border: '1px solid #334155',
                  borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontSize: 13,
                  outline: 'none', marginBottom: 8,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => createMut.mutate()}
                  disabled={!form.name.trim() || createMut.isPending}
                  style={{
                    flex: 1, padding: '7px', background: '#6366f1', border: 'none',
                    borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: !form.name.trim() ? 0.5 : 1,
                  }}
                >
                  {createMut.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  Create
                </button>
                <button
                  onClick={() => setCreating(false)}
                  style={{ padding: '7px 12px', background: '#1e293b', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '10px 14px', background: 'none',
                border: 'none', borderTop: '1px solid #1e293b',
                cursor: 'pointer', color: '#6366f1', fontSize: 13,
              }}
            >
              <Plus size={14} /> New project
            </button>
          )}
        </div>
      )}
    </div>
  )
}
