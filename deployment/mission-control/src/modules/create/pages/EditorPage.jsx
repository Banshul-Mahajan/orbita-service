import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { articlesApi, factguardApi, briefsApi } from '../api/client'
import toast from 'react-hot-toast'
import {
  Sparkles, Shield, Save, ArrowLeft, CheckCircle,
  AlertTriangle, HelpCircle, Loader, ChevronDown, ChevronUp,
  Copy, Eye, Code, BarChart2
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length

const STATUS_COLOR = { verified: '#10b981', flagged: '#f59e0b', unverified: '#64748b', accepted: '#3b82f6' }
const STATUS_ICON = {
  verified: <CheckCircle size={13} color="#10b981" />,
  flagged: <AlertTriangle size={13} color="#f59e0b" />,
  unverified: <HelpCircle size={13} color="#64748b" />,
  accepted: <CheckCircle size={13} color="#3b82f6" />,
}

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

// Read auth token from cookie OR localStorage (Mission Control uses localStorage)
const getToken = () => getCookie('orbit_token') || localStorage.getItem('access_token')

// ── Main Component ────────────────────────────────────────────────────────────
export default function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [body, setBody] = useState('')
  const [viewMode, setViewMode] = useState('edit')   // 'edit' | 'preview'
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamStatus, setStreamStatus] = useState('')
  const [factguardOpen, setFactguardOpen] = useState(false)
  const [factguardData, setFactguardData] = useState(null)
  const [factguardLoading, setFactguardLoading] = useState(false)
  const [entityScore, setEntityScore] = useState(null)
  const [saved, setSaved] = useState(true)
  const streamRef = useRef(null)
  const bodyRef = useRef(body)
  bodyRef.current = body

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: article, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: () => articlesApi.get(id).then(r => r.data),
    onSuccess: (data) => {
      if (data.body && !body) setBody(data.body)
      if (data.entity_score) setEntityScore(data.entity_score)
      if (data.claims?.length) setFactguardData({ claims: data.claims, overall_status: data.factguard_status })
    },
  })

  const { data: brief } = useQuery({
    queryKey: ['brief', article?.brief_id],
    queryFn: () => briefsApi.get(article.brief_id).then(r => r.data),
    enabled: !!article?.brief_id,
  })

  useEffect(() => {
    if (article?.body && !body) {
      setBody(article.body)
      setEntityScore(article.entity_score)
    }
  }, [article])

  // ── Auto-save (debounced 2s) ───────────────────────────────────────────────
  const saveTimer = useRef(null)
  const handleBodyChange = (e) => {
    const val = e.target.value
    setBody(val)
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(val), 2000)
  }

  const autoSave = async (content) => {
    try {
      await articlesApi.update(id, { body: content })
      setSaved(true)
    } catch (e) {
      // silent — user can manually save
    }
  }

  // ── Manual save ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      await articlesApi.update(id, { body })
      setSaved(true)
      toast.success('Saved')
    } catch (e) {
      toast.error('Save failed')
    }
  }

  // ── AI Generate (SSE streaming) ───────────────────────────────────────────
  const handleGenerate = () => {
    if (isStreaming) {
      // Cancel
      streamRef.current?.close()
      setIsStreaming(false)
      setStreamStatus('')
      return
    }

    const token = getToken()
    if (!token) return toast.error('Not authenticated')

    setBody('')
    setIsStreaming(true)
    setStreamStatus('Connecting…')
    setSaved(false)

    let accumulated = ''

    // Use /api/create/articles/... so the MC Vite proxy routes to port 8003
    const url = `/api/create/articles/stream-token/${id}?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    streamRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'title') {
          accumulated = `# ${data.content}\n\n`
          setBody(accumulated)
          setStreamStatus('Writing title…')
        }
        else if (data.type === 'section_start') {
          currentSection = data.heading
          accumulated += `\n## ${data.heading}\n\n`
          setBody(accumulated)
          setStreamStatus(`Writing: ${data.heading}`)
        }
        else if (data.type === 'token') {
          accumulated += data.content
          setBody(accumulated)
        }
        else if (data.type === 'section_end') {
          accumulated += '\n\n'
          setBody(accumulated)
        }
        else if (data.type === 'done') {
          es.close()
          setIsStreaming(false)
          setStreamStatus('')
          // Auto-save the full article
          articlesApi.saveGenerated(id, accumulated).then((res) => {
            setSaved(true)
            setEntityScore(res.data.entity_score)
            qc.invalidateQueries({ queryKey: ['article', id] })
            toast.success(`Article generated! ${data.total_word_count} words`)
          })
        }
        else if (data.type === 'error') {
          toast.error(`Generation error: ${data.message}`)
          es.close()
          setIsStreaming(false)
          setStreamStatus('')
        }
      } catch (err) {
        // ignore parse errors mid-stream
      }
    }

    es.onerror = (e) => {
      if (es.readyState === EventSource.CLOSED) return
      toast.error('Stream connection lost')
      es.close()
      setIsStreaming(false)
      setStreamStatus('')
    }
  }

  // ── FactGuard ─────────────────────────────────────────────────────────────
  const handleFactGuard = async () => {
    if (!body || body.trim().length < 100) {
      return toast.error('Generate or write at least 100 characters first')
    }
    setFactguardLoading(true)
    setFactguardOpen(true)
    try {
      // Make sure latest body is saved first
      await articlesApi.update(id, { body })
      const { data } = await factguardApi.check(id)
      setFactguardData(data)
      qc.invalidateQueries({ queryKey: ['article', id] })
      if (data.overall_status === 'passed') {
        toast.success('FactGuard passed — all claims verified!')
      } else {
        toast(`${data.flagged} claim(s) flagged for review`, { icon: '⚠️' })
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'FactGuard check failed')
    } finally {
      setFactguardLoading(false)
    }
  }

  const handleOverride = async (claimId) => {
    try {
      await factguardApi.overrideClaim(claimId, 'accepted')
      setFactguardData(prev => ({
        ...prev,
        claims: prev.claims.map(c => c.id === claimId ? { ...c, status: 'accepted' } : c),
      }))
      toast.success('Claim accepted')
    } catch (e) {
      toast.error('Override failed')
    }
  }

  // const copyToClipboard = () => {
  //   navigator.clipboard.writeText(body)
  //   toast.success('Copied to clipboard')
  // }

  const copyToClipboard = async () => {
    if (!body.trim()) {
      toast.error('Nothing to copy yet')
      return
    }

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(body)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = body
        textArea.setAttribute('readonly', '')
        textArea.style.position = 'fixed'
        textArea.style.top = '-9999px'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (!copied) throw new Error('copy command failed')
      }
      toast.success('Copied to clipboard')
    } catch (e) {
      toast.error('Copy failed. Select the article text and copy manually.')
    }
  }

  // ── Entity coverage ───────────────────────────────────────────────────────
  const missingEntities = brief?.entities?.filter(
    e => !body.toLowerCase().includes(e.toLowerCase())
  ) || []
  const coveredEntities = brief?.entities?.filter(
    e => body.toLowerCase().includes(e.toLowerCase())
  ) || []

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader size={24} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const wc = wordCount(body)
  const factguardStatus = factguardData?.overall_status || article?.factguard_status || 'pending'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .editor-textarea { font-family: 'SF Mono', Consolas, monospace; font-size: 14px; line-height: 1.7; color: #e2e8f0; background: transparent; border: none; outline: none; width: 100%; resize: none; min-height: 500px; }
        .editor-textarea::placeholder { color: #334155; }
        .prose-preview h1 { font-size: 24px; font-weight: 700; color: #e2e8f0; margin: 0 0 16px; }
        .prose-preview h2 { font-size: 20px; font-weight: 600; color: #e2e8f0; margin: 24px 0 10px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
        .prose-preview h3 { font-size: 16px; font-weight: 600; color: #94a3b8; margin: 16px 0 8px; }
        .prose-preview p { color: #94a3b8; line-height: 1.8; margin: 0 0 12px; }
        .prose-preview strong { color: #e2e8f0; }
        .prose-preview ul, .prose-preview ol { color: #94a3b8; padding-left: 20px; margin: 0 0 12px; }
        .prose-preview li { margin: 4px 0; line-height: 1.7; }
        .prose-preview code { background: #1e293b; color: '#60a5fa'; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
      `}</style>

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={s.iconBtn}><ArrowLeft size={16} /></button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {article?.title || 'Untitled Article'}
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
              {wc} words ·{' '}
              <span style={{ color: saved ? '#10b981' : '#f59e0b' }}>{saved ? 'Saved' : 'Unsaved changes'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 3, border: '1px solid #334155' }}>
            {[['edit', Code], ['preview', Eye]].map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: 'none', background: viewMode === mode ? '#1e293b' : 'transparent', color: viewMode === mode ? '#e2e8f0' : '#64748b', fontSize: 12, cursor: 'pointer' }}>
                <Icon size={13} /> {mode}
              </button>
            ))}
          </div>

          <button onClick={copyToClipboard} style={s.iconBtn} title="Copy markdown"><Copy size={15} /></button>
          <button onClick={handleSave} style={s.saveBtn}><Save size={14} /> Save</button>

          <button onClick={handleGenerate} style={{
            ...s.generateBtn,
            background: isStreaming ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            borderColor: isStreaming ? '#ef4444' : 'transparent',
            color: isStreaming ? '#ef4444' : '#fff',
          }}>
            {isStreaming
              ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Stop</>
              : <><Sparkles size={14} /> {body ? 'Regenerate' : 'Generate with AI'}</>
            }
          </button>

          <button onClick={handleFactGuard} disabled={factguardLoading} style={s.factBtn(factguardStatus)}>
            {factguardLoading
              ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : factguardStatus === 'passed' ? <CheckCircle size={14} /> : <Shield size={14} />}
            FactGuard
          </button>
        </div>
      </div>

      {/* Streaming status banner */}
      {isStreaming && streamStatus && (
        <div style={{ background: 'rgba(59,130,246,0.08)', borderBottom: '1px solid rgba(59,130,246,0.2)', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: 12, color: '#60a5fa' }}>{streamStatus}</span>
        </div>
      )}

      {/* Main 3-panel layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>

        {/* Left: outline panel */}
        <div style={s.leftPanel}>
          <div style={s.panelTitle}>OUTLINE</div>
          {(brief?.h2s || []).map((h2, i) => {
            const inBody = body.includes(h2)
            return (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #1e293b', cursor: 'pointer' }}
                onClick={() => {
                  const el = document.querySelector('.editor-textarea')
                  if (!el) return
                  const idx = body.indexOf(h2)
                  if (idx >= 0) el.setSelectionRange(idx, idx + h2.length)
                  el?.focus()
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: inBody ? '#10b981' : '#334155', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: inBody ? '#94a3b8' : '#475569', lineHeight: 1.4 }}>{h2}</span>
                </div>
              </div>
            )
          })}

          {/* Entity coverage */}
          {brief?.entities?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={s.panelTitle}>ENTITY COVERAGE</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Coverage</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: entityScore >= 70 ? '#10b981' : '#f59e0b' }}>
                    {entityScore ?? Math.round((coveredEntities.length / brief.entities.length) * 100)}%
                  </span>
                </div>
                <div style={{ height: 4, background: '#1e293b', borderRadius: 999 }}>
                  <div style={{ height: 4, borderRadius: 999, background: entityScore >= 70 ? '#10b981' : '#f59e0b', width: `${entityScore ?? (coveredEntities.length / brief.entities.length) * 100}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
              {missingEntities.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>Missing:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {missingEntities.map(e => (
                      <span key={e} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4 }}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: editor */}
        <div style={s.centerPanel}>
          {viewMode === 'edit' ? (
            <textarea
              className="editor-textarea"
              value={body}
              onChange={handleBodyChange}
              placeholder={isStreaming ? '' : `Click "Generate with AI" to write this article automatically,\nor start typing here in Markdown format.\n\n# Article Title\n\n## First Section\n\nYour content...`}
              spellCheck
            />
          ) : (
            <div className="prose-preview">
              {body ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown> : <p style={{ color: '#334155', fontStyle: 'italic' }}>Nothing to preview yet.</p>}
            </div>
          )}
        </div>

        {/* Right: FactGuard panel */}
        <div style={s.rightPanel}>
          {/* Stats */}
          <div style={{ marginBottom: 16 }}>
            <div style={s.panelTitle}>ARTICLE STATS</div>
            {[
              ['Words', wc],
              ['Sections', (brief?.h2s?.length ?? 0)],
              ['Entity Score', `${entityScore ?? 0}%`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* FactGuard toggle */}
          <button
            onClick={() => setFactguardOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={13} color={factguardStatus === 'passed' ? '#10b981' : factguardStatus === 'flagged' ? '#f59e0b' : '#64748b'} />
              <span style={s.panelTitle}>FACTGUARD RESULTS</span>
            </div>
            {factguardOpen ? <ChevronUp size={13} color="#475569" /> : <ChevronDown size={13} color="#475569" />}
          </button>

          {factguardOpen && (
            <div>
              {!factguardData && !factguardLoading && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Shield size={24} color="#334155" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12, color: '#475569' }}>Click FactGuard in the toolbar to verify all claims against your corpus.</p>
                </div>
              )}

              {factguardLoading && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Loader size={20} color="#3b82f6" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12, color: '#64748b' }}>Extracting and verifying claims…</p>
                </div>
              )}

              {factguardData && !factguardLoading && (
                <div>
                  {/* Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 12 }}>
                    {[
                      ['Verified', factguardData.verified ?? factguardData.claims?.filter(c => c.status === 'verified').length, '#10b981'],
                      ['Flagged', factguardData.flagged ?? factguardData.claims?.filter(c => c.status === 'flagged').length, '#f59e0b'],
                      ['Unknown', factguardData.unverified ?? factguardData.claims?.filter(c => c.status === 'unverified').length, '#64748b'],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: `1px solid ${color}30` }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color }}>{val ?? 0}</div>
                        <div style={{ fontSize: 10, color: '#475569' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Claims list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(factguardData.claims || []).map((claim) => (
                      <div key={claim.id} style={{
                        background: '#0f172a', borderRadius: 8, padding: 10,
                        border: `1px solid ${STATUS_COLOR[claim.status]}30`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                          {STATUS_ICON[claim.status]}
                          <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>{claim.text}</p>
                        </div>
                        {claim.reasoning && (
                          <p style={{ fontSize: 10, color: '#475569', margin: '4px 0 0 19px', fontStyle: 'italic', lineHeight: 1.4 }}>{claim.reasoning}</p>
                        )}
                        {(claim.status === 'flagged' || claim.status === 'unverified') && (
                          <button
                            onClick={() => handleOverride(claim.id)}
                            style={{ marginTop: 6, marginLeft: 19, fontSize: 10, color: '#3b82f6', background: 'none', border: '1px solid #1d4ed8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                          >
                            Accept anyway
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keywords reminder */}
          {brief?.keywords?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={s.panelTitle}>TARGET KEYWORDS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {brief.keywords.map(k => {
                  const present = body.toLowerCase().includes(k.toLowerCase())
                  return (
                    <span key={k} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: present ? 'rgba(16,185,129,0.1)' : '#1e293b', color: present ? '#34d399' : '#475569', border: `1px solid ${present ? 'rgba(16,185,129,0.2)' : '#334155'}` }}>
                      {k}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 20px', background: '#1e293b', borderBottom: '1px solid #334155',
    position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
  },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, background: 'transparent', border: '1px solid #334155',
    borderRadius: 8, color: '#64748b', cursor: 'pointer',
  },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    background: 'transparent', border: '1px solid #334155', borderRadius: 8,
    color: '#94a3b8', fontSize: 13, cursor: 'pointer',
  },
  generateBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
    border: '1px solid transparent', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  factBtn: (status) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    background: status === 'passed' ? 'rgba(16,185,129,0.1)' : status === 'flagged' ? 'rgba(245,158,11,0.1)' : 'transparent',
    border: `1px solid ${status === 'passed' ? '#10b981' : status === 'flagged' ? '#f59e0b' : '#334155'}`,
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    color: status === 'passed' ? '#10b981' : status === 'flagged' ? '#f59e0b' : '#64748b',
  }),
  leftPanel: {
    width: 200, flexShrink: 0, background: '#0f172a',
    borderRight: '1px solid #1e293b', padding: '16px 12px', overflowY: 'auto',
  },
  centerPanel: {
    flex: 1, padding: '24px 32px', overflowY: 'auto',
    background: '#0f172a',
  },
  rightPanel: {
    width: 240, flexShrink: 0, background: '#0f172a',
    borderLeft: '1px solid #1e293b', padding: '16px 12px', overflowY: 'auto',
  },
  panelTitle: {
    fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: 1.5,
    marginBottom: 10, textTransform: 'uppercase',
  },
}
