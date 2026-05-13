import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { briefsApi, articlesApi, corpusApi } from '../api/client'
import { PenLine, FileText, Database, ChevronRight, Plus, Sparkles } from 'lucide-react'
import useAuth from '../hooks/useAuth'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: briefs } = useQuery({ queryKey: ['briefs'], queryFn: () => briefsApi.list().then(r => r.data) })
  const { data: articles } = useQuery({ queryKey: ['articles'], queryFn: () => articlesApi.list().then(r => r.data) })
  const { data: stats } = useQuery({ queryKey: ['corpus-stats'], queryFn: () => corpusApi.stats().then(r => r.data) })

  const recentBriefs = (briefs || []).slice(0, 5)
  const recentArticles = (articles || []).slice(0, 5)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
        </h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Your AI content studio is ready.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Briefs', value: briefs?.length ?? '—', icon: PenLine, color: '#3b82f6' },
          { label: 'Articles', value: articles?.length ?? '—', icon: FileText, color: '#8b5cf6' },
          { label: 'Corpus Docs', value: stats?.indexed_documents ?? '—', icon: Database, color: '#10b981' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 32 }}>
        <button
          onClick={() => navigate('/dashboard/create/briefs/new')}
          style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 12, padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}
        >
          <Sparkles size={20} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Generate New Brief</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>LLM + RAG powered content outline</div>
          </div>
        </button>
        <button
          onClick={() => navigate('/dashboard/create/corpus')}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, color: '#e2e8f0' }}
        >
          <Database size={20} color="#10b981" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Manage Corpus</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Upload brand content for RAG</div>
          </div>
        </button>
      </div>

      {/* Recent briefs + articles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Briefs */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Recent Briefs</h3>
            <Link to="/dashboard/create/briefs/new" style={{ color: '#60a5fa', fontSize: 12, textDecoration: 'none' }}>+ New</Link>
          </div>
          {recentBriefs.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No briefs yet. Generate your first one!</p>
          ) : (
            recentBriefs.map((b) => (
              <Link key={b.id} to={`/briefs/${b.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1e293b' }}>
                <div>
                  <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>{b.topic}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{b.tone_style} · {b.h2s?.length || 0} sections</div>
                </div>
                <ChevronRight size={14} color="#475569" />
              </Link>
            ))
          )}
        </div>

        {/* Articles */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Recent Articles</h3>
          </div>
          {recentArticles.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No articles yet. Start from a brief!</p>
          ) : (
            recentArticles.map((a) => (
              <Link key={a.id} to={`/editor/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1e293b' }}>
                <div>
                  <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>{a.title || 'Untitled Article'}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                    {a.word_count} words ·{' '}
                    <span style={{ color: a.factguard_status === 'passed' ? '#10b981' : a.factguard_status === 'flagged' ? '#f59e0b' : '#475569' }}>
                      {a.factguard_status}
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} color="#475569" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
