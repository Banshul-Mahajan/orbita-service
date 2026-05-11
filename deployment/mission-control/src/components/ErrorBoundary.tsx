import React from 'react'

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; moduleName?: string },
  State
> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          background: '#0f172a',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          color: '#f1f5f9',
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#f87171' }}>
            {this.props.moduleName ?? 'Module'} failed to load
          </h2>
          <pre style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '1rem',
            fontSize: 12,
            color: '#94a3b8',
            maxWidth: '600px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
