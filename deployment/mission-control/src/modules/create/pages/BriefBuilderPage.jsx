import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { briefsApi } from '../api/client'
import toast from 'react-hot-toast'
import { Loader, Sparkles, ChevronRight, Check } from 'lucide-react'

const TONES = [
  { value: 'conversational', label: 'Conversational', desc: 'Friendly, approachable, relatable' },
  { value: 'authoritative', label: 'Authoritative', desc: 'Confident, expert, definitive' },
  { value: 'scientific', label: 'Scientific', desc: 'Data-driven, methodical, precise' },
  { value: 'minimalist', label: 'Minimalist', desc: 'Crisp, direct, no fluff' },
]

export default function BriefBuilderPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1 = input, 2 = generating, 3 = review
  const [form, setForm] = useState({ topic: '', target_audience: '', tone_style: 'conversational', additional_context: '' })
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!form.topic.trim()) return toast.error('Topic is required')
    setStep(2)
    setLoading(true)
    try {
      const { data } = await briefsApi.generate(form)
      setBrief(data)
      setStep(3)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Brief generation failed')
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0' }}>Brief Builder</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Generate an AI-powered content brief with H1–H4 structure, keywords, and entities.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {['Configure', 'Generating', 'Review'].map((label, i) => {
          const num = i + 1
          const done = step > num
          const active = step === num
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                  background: done ? '#10b981' : active ? '#3b82f6' : '#334155',
                  color: done || active ? '#fff' : '#475569',
                }}>
                  {done ? <Check size={13} /> : num}
                </div>
                <span style={{ fontSize: 13, color: active ? '#e2e8f0' : done ? '#10b981' : '#475569' }}>{label}</span>
              </div>
              {i < 2 && <div style={{ width: 40, height: 1, background: '#334155', margin: '0 12px' }} />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Input */}
      {step === 1 && (
        <div style={s.card}>
          <div style={s.formGroup}>
            <label style={s.label}>Topic <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={s.input} value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
              placeholder="e.g. 'The Complete Guide to Remote Work Productivity'" />
            <p style={s.hint}>Be specific. Include the target angle or audience for better results.</p>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Target Audience</label>
            <input style={s.input} value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
              placeholder="e.g. 'SaaS startup founders', 'beginner Python developers'" />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Tone Style</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 8 }}>
              {TONES.map(({ value, label, desc }) => (
                <button key={value} onClick={() => setForm(f => ({ ...f, tone_style: value }))}
                  style={{ ...s.toneBtn, ...(form.tone_style === value ? s.toneBtnActive : {}) }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Additional Context <span style={{ color: '#475569' }}>(optional)</span></label>
            <textarea style={{ ...s.input, height: 80, resize: 'vertical' }} value={form.additional_context}
              onChange={e => setForm(f => ({ ...f, additional_context: e.target.value }))}
              placeholder="Any specific angles, competitors to reference, or key points to cover..." />
          </div>

          <button onClick={handleGenerate} style={s.btn}>
            <Sparkles size={16} /> Generate Brief with AI
          </button>
        </div>
      )}

      {/* Step 2: Generating */}
      {step === 2 && (
        <div style={{ ...s.card, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Loader size={28} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Generating your brief…</h3>
          <p style={{ color: '#64748b', fontSize: 13 }}>Querying your corpus, analyzing the topic, and structuring your outline.</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && brief && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* H1 */}
          <div style={s.card}>
            <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>H1 — TITLE</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{brief.h1}</h2>
          </div>

          {/* Outline */}
          <div style={s.card}>
            <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>H2–H3 OUTLINE</div>
            {(brief.h2s || []).map((h2, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#8b5cf6', background: 'rgba(139,92,246,0.15)', padding: '1px 6px', borderRadius: 4 }}>H2</span>
                  {h2}
                </div>
                {(brief.h3s?.[h2] || []).map((h3, j) => (
                  <div key={j} style={{ marginLeft: 24, marginTop: 4, fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: '#475569', background: '#1e293b', padding: '1px 6px', borderRadius: 4 }}>H3</span>
                    {h3}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Keywords + Questions + Entities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={s.card}>
              <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>KEYWORDS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(brief.keywords || []).map(k => <span key={k} style={s.tag}>{k}</span>)}
              </div>
            </div>
            <div style={s.card}>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>KEY ENTITIES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(brief.entities || []).map(e => <span key={e} style={{ ...s.tag, background: 'rgba(245,158,11,0.1)', color: '#fbbf24', borderColor: '#f59e0b' }}>{e}</span>)}
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={{ fontSize: 11, color: '#06b6d4', fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>QUESTIONS TO ANSWER</div>
            {(brief.questions || []).map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#3b82f6', fontSize: 12, marginTop: 2 }}>Q{i + 1}</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{q}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate(`/dashboard/create/briefs/${brief.id}`)} style={s.btn}>
              <ChevronRight size={16} /> View Brief & Start Writing
            </button>
            <button onClick={() => { setStep(1); setBrief(null) }} style={s.btnOutline}>
              Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 },
  hint: { fontSize: 11, color: '#475569', marginTop: 4 },
  input: { width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'transparent', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', fontSize: 14, cursor: 'pointer' },
  toneBtn: { textAlign: 'left', padding: '12px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s' },
  toneBtnActive: { background: 'rgba(59,130,246,0.12)', border: '1px solid #3b82f6', color: '#e2e8f0' },
  tag: { padding: '3px 10px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 999, fontSize: 11 },
}
