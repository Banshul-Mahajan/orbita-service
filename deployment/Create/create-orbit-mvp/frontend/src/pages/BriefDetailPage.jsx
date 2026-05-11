import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { briefsApi, articlesApi } from '../api/client'
import toast from 'react-hot-toast'
import { PenLine, Loader, Tag, HelpCircle, Users } from 'lucide-react'

export default function BriefDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: brief, isLoading } = useQuery({
    queryKey: ['brief', id],
    queryFn: () => briefsApi.get(id).then(r => r.data),
  })

  const createArticle = useMutation({
    mutationFn: () => articlesApi.create({ brief_id: id }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['articles'] })
      navigate(`/editor/${res.data.id}`)
    },
    onError: () => toast.error('Failed to create article'),
  })

  if (isLoading) return <div style={{ color: '#64748b', padding: 40 }}>Loading brief…</div>
  if (!brief) return <div style={{ color: '#ef4444', padding: 40 }}>Brief not found</div>

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>CONTENT BRIEF</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{brief.topic}</h1>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <span style={s.badge}>{brief.tone_style}</span>
            {brief.target_audience && <span style={{ ...s.badge, background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>{brief.target_audience}</span>}
          </div>
        </div>
        <button onClick={() => createArticle.mutate()} disabled={createArticle.isPending} style={s.btn}>
          {createArticle.isPending ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <PenLine size={15} />}
          Start Writing with AI
        </button>
      </div>

      {/* H1 */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={s.sectionLabel}>H1 — TITLE</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{brief.h1}</h2>
      </div>

      {/* Outline */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={s.sectionLabel}>OUTLINE</div>
        {(brief.h2s || []).map((h2, i) => (
          <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < brief.h2s.length - 1 ? '1px solid #1e293b' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={s.hBadge('#3b82f6')}>H2</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{h2}</span>
            </div>
            {(brief.h3s?.[h2] || []).map((h3, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 20, marginTop: 5 }}>
                <span style={s.hBadge('#475569')}>H3</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{h3}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Keywords */}
        <div style={s.card}>
          <div style={{ ...s.sectionLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag size={11} /> KEYWORDS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(brief.keywords || []).map(k => (
              <span key={k} style={s.chip('#10b981')}>{k}</span>
            ))}
          </div>
        </div>
        {/* Entities */}
        <div style={s.card}>
          <div style={{ ...s.sectionLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={11} /> KEY ENTITIES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(brief.entities || []).map(e => (
              <span key={e} style={s.chip('#f59e0b')}>{e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div style={s.card}>
        <div style={{ ...s.sectionLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
          <HelpCircle size={11} /> QUESTIONS TO ANSWER
        </div>
        {(brief.questions || []).map((q, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < brief.questions.length - 1 ? '1px solid #1e293b' : 'none' }}>
            <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 12, minWidth: 20 }}>Q{i + 1}</span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{q}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const s = {
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1, marginBottom: 12 },
  badge: { display: 'inline-block', padding: '3px 10px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: 999, fontSize: 11 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  hBadge: (c) => ({ fontSize: 9, fontWeight: 700, color: c, background: `${c}20`, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }),
  chip: (c) => ({ padding: '3px 10px', background: `${c}18`, color: c, border: `1px solid ${c}40`, borderRadius: 999, fontSize: 11 }),
}
