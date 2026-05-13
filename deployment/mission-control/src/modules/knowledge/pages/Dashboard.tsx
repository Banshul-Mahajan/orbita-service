import { useQuery } from '@tanstack/react-query'
import { getEntities, getSources, getAuthors, searchFacts } from '../api/client'
import { PageHeader, LoadingBox } from '../components'

function StatCard({ label, value, icon, sub }: { label: string; value: number | string; icon: string; sub?: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { data: entities, isLoading: le } = useQuery({ queryKey: ['entities'], queryFn: () => getEntities() })
  const { data: sources, isLoading: ls } = useQuery({ queryKey: ['sources'], queryFn: () => getSources() })
  const { data: authors, isLoading: la } = useQuery({ queryKey: ['authors'], queryFn: getAuthors })
  const { data: facts, isLoading: lf } = useQuery({ queryKey: ['facts-all'], queryFn: () => searchFacts({ min_confidence: 0 }) })

  const loading = le || ls || la || lf

  const verifiedFacts = facts?.filter((f: any) => f.confidence >= 0.85).length ?? 0
  const activeSources = sources?.filter((s: any) => s.is_active).length ?? 0

  return (
    <div>
      <PageHeader
        title="Knowledge Core"
        subtitle="Brand Brain — single source of verified truth for ORBITA"
      />

      {loading ? (
        <LoadingBox />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
            <StatCard label="Entities" value={entities?.length ?? 0} icon="📦" sub="Products, people, awards" />
            <StatCard label="Total Facts" value={facts?.length ?? 0} icon="✅" sub={`${verifiedFacts} verified`} />
            <StatCard label="Citations" value={sources?.length ?? 0} icon="🔗" sub={`${activeSources} active URLs`} />
            <StatCard label="Authors" value={authors?.length ?? 0} icon="👤" sub="E-E-A-T profiles" />
          </div>

          <div className="card p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Entities</h2>
            {entities?.length === 0 ? (
              <p className="text-sm text-gray-400">No entities yet — add one in the Entities tab.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {entities?.slice(0, 5).map((e: any) => (
                  <div key={e.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{e.name}</p>
                      <p className="text-xs text-gray-400">{e.type} · {e.category || 'no category'}</p>
                    </div>
                    <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      {e.fact_count} facts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Start</h2>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="text-brand-600 font-bold">1.</span> Go to <strong>Entities</strong> → add your brand's products, founders, and key facts.</li>
              <li className="flex gap-2"><span className="text-brand-600 font-bold">2.</span> Go to <strong>Citations</strong> → paste approved URLs that back your facts.</li>
              <li className="flex gap-2"><span className="text-brand-600 font-bold">3.</span> Go to <strong>Authors</strong> → add author profiles with credentials for E-E-A-T.</li>
              <li className="flex gap-2"><span className="text-brand-600 font-bold">4.</span> Go to <strong>FactGuard</strong> → paste any AI-generated claim to verify it against your facts.</li>
            </ol>
          </div>
        </>
      )}
    </div>
  )
}
