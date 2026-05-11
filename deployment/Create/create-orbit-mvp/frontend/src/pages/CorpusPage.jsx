import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { corpusApi } from '../api/client'
import toast from 'react-hot-toast'
import { Trash2, Plus, Search, Globe, FileText, Loader, CheckCircle, XCircle, Clock } from 'lucide-react'

const STATUS_ICON = {
  indexed: <CheckCircle size={14} color="#10b981" />,
  failed: <XCircle size={14} color="#ef4444" />,
  indexing: <Loader size={14} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />,
  pending: <Clock size={14} color="#64748b" />,
}

export default function CorpusPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('text') // text | url
  const [textForm, setTextForm] = useState({ title: '', content: '' })
  const [urlForm, setUrlForm] = useState({ title: '', source_url: '' })
  const [testQuery, setTestQuery] = useState('')
  const [testResults, setTestResults] = useState(null)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['corpus-docs'],
    queryFn: () => corpusApi.list().then(r => r.data),
  })
  const { data: stats } = useQuery({
    queryKey: ['corpus-stats'],
    queryFn: () => corpusApi.stats().then(r => r.data),
  })

  const ingestText = useMutation({
    mutationFn: () => corpusApi.ingestText(textForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corpus-docs'] })
      qc.invalidateQueries({ queryKey: ['corpus-stats'] })
      setTextForm({ title: '', content: '' })
      toast.success('Document indexed successfully!')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Ingestion failed'),
  })

  const ingestUrl = useMutation({
    mutationFn: () => corpusApi.ingestUrl({ ...urlForm, source_type: 'url' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corpus-docs'] })
      qc.invalidateQueries({ queryKey: ['corpus-stats'] })
      setUrlForm({ title: '', source_url: '' })
      toast.success('URL indexed successfully!')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'URL ingestion failed'),
  })

  const deleteDoc = useMutation({
    mutationFn: (id) => corpusApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corpus-docs'] })
      qc.invalidateQueries({ queryKey: ['corpus-stats'] })
      toast.success('Document removed')
    },
  })

  const handleTest = async () => {
    if (!testQuery.trim()) return
    try {
      const { data } = await corpusApi.query({ query: testQuery, top_k: 3 })
      setTestResults(data)
    } catch (e) {
      toast.error('Query failed')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={s.h1}>Brand Corpus</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Upload brand content to ground AI writing with RAG retrieval.</p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Documents', value: stats?.total_documents ?? 0 },
          { label: 'Indexed', value: stats?.indexed_documents ?? 0 },
          { label: 'Total Chunks', value: stats?.total_chunks ?? 0 },
          { label: 'Failed', value: stats?.failed_documents ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} style={s.statPill}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{value}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Add document */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Add Document</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['text', 'url'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }}>
                {t === 'text' ? <FileText size={13} /> : <Globe size={13} />}
                {t === 'text' ? 'Paste Text' : 'From URL'}
              </button>
            ))}
          </div>

          {tab === 'text' ? (
            <div style={s.formCol}>
              <input style={s.input} placeholder="Document title" value={textForm.title} onChange={e => setTextForm(f => ({ ...f, title: e.target.value }))} />
              <textarea style={{ ...s.input, height: 140, resize: 'vertical' }} placeholder="Paste article, blog post, or any brand content here..." value={textForm.content} onChange={e => setTextForm(f => ({ ...f, content: e.target.value }))} />
              <button onClick={() => ingestText.mutate()} disabled={ingestText.isPending || !textForm.title || !textForm.content} style={s.btn}>
                {ingestText.isPending ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Indexing...</> : <><Plus size={14} /> Index Document</>}
              </button>
            </div>
          ) : (
            <div style={s.formCol}>
              <input style={s.input} placeholder="Document title" value={urlForm.title} onChange={e => setUrlForm(f => ({ ...f, title: e.target.value }))} />
              <input style={s.input} placeholder="https://example.com/article" value={urlForm.source_url} onChange={e => setUrlForm(f => ({ ...f, source_url: e.target.value }))} />
              <button onClick={() => ingestUrl.mutate()} disabled={ingestUrl.isPending || !urlForm.title || !urlForm.source_url} style={s.btn}>
                {ingestUrl.isPending ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Fetching & Indexing...</> : <><Globe size={14} /> Fetch & Index</>}
              </button>
            </div>
          )}
        </div>

        {/* Test retrieval */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Test Retrieval</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Query your corpus to verify RAG is working correctly.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input style={{ ...s.input, flex: 1 }} placeholder="e.g. 'What is our brand voice?'" value={testQuery} onChange={e => setTestQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTest()} />
            <button onClick={handleTest} style={{ ...s.btn, width: 44, padding: 0 }}><Search size={14} /></button>
          </div>
          {testResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {testResults.length === 0 ? (
                <p style={{ color: '#475569', fontSize: 12 }}>No results found. Try a different query.</p>
              ) : testResults.map((r, i) => (
                <div key={i} style={{ background: '#0f172a', borderRadius: 8, padding: 12, border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#60a5fa' }}>{r.source_title}</span>
                    <span style={{ fontSize: 11, color: '#10b981' }}>Score: {r.relevance_score}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{r.chunk.slice(0, 200)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document list */}
      <div style={{ ...s.card, marginTop: 24 }}>
        <h3 style={s.cardTitle}>Indexed Documents ({docs.length})</h3>
        {isLoading ? (
          <p style={{ color: '#475569', fontSize: 13 }}>Loading...</p>
        ) : docs.length === 0 ? (
          <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No documents indexed yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Title', 'Type', 'Chunks', 'Status', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{doc.title}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{doc.source_type}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{doc.chunk_count}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {STATUS_ICON[doc.status]} <span style={{ color: '#94a3b8' }}>{doc.status}</span>
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => deleteDoc.mutate(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#e2e8f0' },
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 },
  statPill: { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 },
  formCol: { display: 'flex', flexDirection: 'column', gap: 10 },
  input: { padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', width: '100%' },
  btn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer' },
  tabActive: { background: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', color: '#60a5fa' },
}
