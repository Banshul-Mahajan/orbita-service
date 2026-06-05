import React from 'react'
import { X, ChevronDown } from 'lucide-react'

// ── Layout primitives ───────────────────────────────────────────────────────────

/** Responsive field grid. 1 / 2 / 3 columns; collapses to a single column on mobile. */
export function FieldGrid({ cols = 2, children }: { cols?: 1 | 2 | 3; children: React.ReactNode }) {
  const c = cols === 3 ? 'sm:grid-cols-3' : cols === 2 ? 'sm:grid-cols-2' : ''
  return <div className={`grid grid-cols-1 ${c} gap-4`}>{children}</div>
}

/** A titled sub-panel that groups related fields inside a step. */
export function GroupCard({ title, hint, icon, accent, children }: {
  title: string; hint?: string; icon?: React.ReactNode; accent?: boolean; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-indigo-700/40 bg-indigo-950/20' : 'border-gray-800 bg-gray-900/40'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-indigo-300">{icon}</span>}
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
      </div>
      {hint && <p className="text-xs text-gray-500 mb-3">{hint}</p>}
      <div className={hint ? 'space-y-4' : 'mt-3 space-y-4'}>{children}</div>
    </div>
  )
}

/** Collapsible section for optional / advanced fields to keep steps tidy. */
export function Collapsible({ label, count, defaultOpen = false, children }: {
  label: string; count?: number; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="rounded-xl border border-dashed border-gray-700/70 bg-gray-900/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:text-white transition-colors"
      >
        <span className="font-medium">
          {label}
          {typeof count === 'number' && count > 0 && (
            <span className="ml-2 text-xs text-indigo-300">{count} set</span>
          )}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-4 border-t border-gray-800/80 pt-4">{children}</div>}
    </div>
  )
}

// ── Reusable form primitives for the onboarding wizard ──────────────────────────

export function Field({ label, hint, children, optional }: {
  label: string; hint?: string; optional?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="label mb-1 block">
        {label}{optional && <span className="text-gray-500 font-normal"> (optional)</span>}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

export function TextField(props: {
  label: string; value?: string; onChange: (v: string) => void
  placeholder?: string; hint?: string; optional?: boolean; type?: string
}) {
  return (
    <Field label={props.label} hint={props.hint} optional={props.optional}>
      <input
        className="input"
        type={props.type ?? 'text'}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  )
}

export function TextArea(props: {
  label: string; value?: string; onChange: (v: string) => void
  placeholder?: string; hint?: string; optional?: boolean
}) {
  return (
    <Field label={props.label} hint={props.hint} optional={props.optional}>
      <textarea
        className="input min-h-[84px]"
        value={props.value ?? ''}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  )
}

export function SelectField(props: {
  label: string; value?: string; onChange: (v: string) => void
  options: string[]; placeholder?: string; optional?: boolean; hint?: string
}) {
  return (
    <Field label={props.label} hint={props.hint} optional={props.optional}>
      <select
        className="input"
        value={props.value ?? ''}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="">{props.placeholder ?? 'Select…'}</option>
        {props.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  )
}

export function ChipMultiSelect(props: {
  label: string; options: string[]; value?: string[]
  onChange: (v: string[]) => void; hint?: string; optional?: boolean
}) {
  const selected = props.value ?? []
  const toggle = (opt: string) => {
    if (selected.includes(opt)) props.onChange(selected.filter((s) => s !== opt))
    else props.onChange([...selected, opt])
  }
  return (
    <Field label={props.label} hint={props.hint} optional={props.optional}>
      <div className="flex flex-wrap gap-2">
        {props.options.map((opt) => {
          const on = selected.includes(opt)
          return (
            <button
              type="button"
              key={opt}
              onClick={() => toggle(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                on
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-100'
                  : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

export function TagInput(props: {
  label: string; value?: string[]; onChange: (v: string[]) => void
  placeholder?: string; hint?: string; max?: number; optional?: boolean
}) {
  const [draft, setDraft] = React.useState('')
  const tags = props.value ?? []
  const max = props.max ?? 50

  const add = (raw: string) => {
    const v = raw.trim()
    if (!v) return
    if (tags.length >= max) return
    if (tags.some((t) => t.toLowerCase() === v.toLowerCase())) return
    props.onChange([...tags, v])
    setDraft('')
  }
  const remove = (i: number) => props.onChange(tags.filter((_, idx) => idx !== i))

  return (
    <Field label={props.label} hint={props.hint} optional={props.optional}>
      <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-2 flex flex-wrap gap-1.5 min-h-[42px] focus-within:border-indigo-500 transition-colors">
        {tags.map((t, i) => (
          <span key={`${t}-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-900/60 text-emerald-200 text-xs font-medium border border-emerald-700/40">
            {t}
            <button type="button" onClick={() => remove(i)} className="hover:text-red-300 transition-colors leading-none">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 flex-1 min-w-[140px] p-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft) }
            if (e.key === 'Backspace' && !draft && tags.length) remove(tags.length - 1)
          }}
          onBlur={() => { if (draft.trim()) add(draft) }}
          placeholder={tags.length >= max ? `Max ${max} reached` : (props.placeholder ?? 'Type and press Enter…')}
          disabled={tags.length >= max}
        />
      </div>
      {tags.length > 0 && <p className="text-xs text-gray-500 mt-1">{tags.length}{props.max ? `/${props.max}` : ''} added</p>}
    </Field>
  )
}
