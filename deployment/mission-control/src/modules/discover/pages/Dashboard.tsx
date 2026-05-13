// import { useProjectStore } from '../store/projectStore'
// import { useQuery } from '@tanstack/react-query'
// import { keywordsApi, serpApi, aiScanApi, questionsApi } from '../api/client'
// import { KeySquare, Search, Bot, HelpCircle, ArrowRight, Satellite } from 'lucide-react'
// import { Link } from 'react-router-dom'

// interface StatCardProps {
//   icon: React.ReactNode
//   label: string
//   value: string | number
//   to: string
//   color: string
// }

// function StatCard({ icon, label, value, to, color }: StatCardProps) {
//   return (
//     <Link to={to} className="card hover:border-gray-700 transition-colors group">
//       <div className="flex items-start justify-between">
//         <div className={`p-2 rounded-lg ${color} mb-3`}>{icon}</div>
//         <ArrowRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
//       </div>
//       <div className="text-2xl font-bold text-white mb-1">{value}</div>
//       <div className="text-xs text-gray-500">{label}</div>
//     </Link>
//   )
// }

// export default function Dashboard() {
//   const { selectedProject } = useProjectStore()

//   const { data: kwData } = useQuery({
//     queryKey: ['keywords', selectedProject?.id],
//     queryFn: () => keywordsApi.get(selectedProject!.id),
//     enabled: !!selectedProject,
//   })

//   if (!selectedProject) {
//     return (
//       <div className="flex flex-col items-center justify-center h-96 text-center">
//         <Satellite size={48} className="text-blue-500 mb-4 opacity-60" />
//         <h2 className="text-xl font-semibold text-gray-300 mb-2">Welcome to DISCOVER ORBIT</h2>
//         <p className="text-gray-500 text-sm max-w-sm">
//           Create a project in the sidebar to start researching keywords, SERP results, AI answers, and content gaps.
//         </p>
//       </div>
//     )
//   }

//   const steps = [
//     { step: '01', title: 'Expand Keywords',   desc: 'Enter a seed keyword to generate a clustered keyword universe.',        to: '/keywords',  icon: <KeySquare size={16} className="text-blue-400" />,   done: (kwData?.total_keywords ?? 0) > 0 },
//     { step: '02', title: 'Analyze SERP',       desc: 'Scrape top Google results to see what ranks and why.',                   to: '/serp',      icon: <Search size={16} className="text-purple-400" />,   done: false },
//     { step: '03', title: 'Scan AI Engines',    desc: 'Query ChatGPT, Gemini, and Perplexity and compare their citations.',    to: '/ai-scan',   icon: <Bot size={16} className="text-green-400" />,        done: false },
//     { step: '04', title: 'View Heatmap',       desc: 'See the gap between Google coverage and AI coverage for your topic.',   to: '/heatmap',   icon: <Search size={16} className="text-orange-400" />,   done: false },
//     { step: '05', title: 'Mine Questions',     desc: 'Aggregate PAA and AI-generated questions for FAQ content.',             to: '/questions', icon: <HelpCircle size={16} className="text-pink-400" />,  done: false },
//   ]

//   return (
//     <div>
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold text-white">{selectedProject.name}</h1>
//         <p className="text-gray-500 text-sm mt-1">
//           {selectedProject.description ?? 'Research & Intelligence Hub'}
//         </p>
//       </div>

//       {/* Stats row */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//         <StatCard
//           icon={<KeySquare size={16} className="text-blue-400" />}
//           label="Keywords discovered"
//           value={kwData?.total_keywords ?? '—'}
//           to="/keywords"
//           color="bg-blue-900/40"
//         />
//         <StatCard
//           icon={<Search size={16} className="text-purple-400" />}
//           label="SERP results scraped"
//           value="—"
//           to="/serp"
//           color="bg-purple-900/40"
//         />
//         <StatCard
//           icon={<Bot size={16} className="text-green-400" />}
//           label="AI scans run"
//           value="—"
//           to="/ai-scan"
//           color="bg-green-900/40"
//         />
//         <StatCard
//           icon={<HelpCircle size={16} className="text-pink-400" />}
//           label="Questions mined"
//           value="—"
//           to="/questions"
//           color="bg-pink-900/40"
//         />
//       </div>

//       {/* Workflow steps */}
//       <div className="card">
//         <h2 className="section-title">Workflow</h2>
//         <div className="space-y-3">
//           {steps.map((s) => (
//             <Link
//               key={s.step}
//               to={s.to}
//               className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group"
//             >
//               <span className="text-xs font-mono text-gray-600 w-6 shrink-0">{s.step}</span>
//               <div className={`p-1.5 rounded-md ${s.done ? 'bg-green-900/40' : 'bg-gray-700/60'}`}>
//                 {s.icon}
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="text-sm font-medium text-gray-200 flex items-center gap-2">
//                   {s.title}
//                   {s.done && <span className="badge bg-green-900 text-green-300 text-xs">done</span>}
//                 </p>
//                 <p className="text-xs text-gray-500 truncate">{s.desc}</p>
//               </div>
//               <ArrowRight size={14} className="text-gray-600 group-hover:text-gray-300 shrink-0" />
//             </Link>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }



import { useProjectStore } from '../store/projectStore'
import { useQuery } from '@tanstack/react-query'
import { keywordsApi, dashboardApi, onboardingApi, competitorsApi, contentApi } from '../api/client'
import { KeySquare, Search, Bot, HelpCircle, ArrowRight, Satellite, Globe2, Users, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  to: string
  color: string
}

function StatCard({ icon, label, value, to, color }: StatCardProps) {
  return (
    <Link to={to} className="card hover:border-gray-700 transition-colors group">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${color} mb-3`}>{icon}</div>
        <ArrowRight size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </Link>
  )
}

export default function Dashboard() {
  const { selectedProject } = useProjectStore()

  const { data: kwData } = useQuery({
    queryKey: ['keywords', selectedProject?.id],
    queryFn: () => keywordsApi.get(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const { data: serpCount } = useQuery({
    queryKey: ['serp-count', selectedProject?.id],
    queryFn: () => dashboardApi.serpCount(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const { data: aiCount } = useQuery({
    queryKey: ['ai-count', selectedProject?.id],
    queryFn: () => dashboardApi.aiCount(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const { data: qCount } = useQuery({
    queryKey: ['questions-count', selectedProject?.id],
    queryFn: () => dashboardApi.questionCount(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', selectedProject?.id],
    queryFn: () => onboardingApi.get(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const { data: competitors } = useQuery({
    queryKey: ['competitors', selectedProject?.id],
    queryFn: () => competitorsApi.get(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const { data: content } = useQuery({
    queryKey: ['content', selectedProject?.id],
    queryFn: () => contentApi.list(selectedProject!.id),
    enabled: !!selectedProject,
  })

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Satellite size={48} className="text-blue-500 mb-4 opacity-60" />
        <h2 className="text-xl font-semibold text-gray-300 mb-2">Welcome to DISCOVER ORBIT</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          Create a project in the sidebar to start researching keywords, SERP results,
          AI answers, and content gaps.
        </p>
      </div>
    )
  }

  const onboardingDone = (onboarding?.scan?.pages_scanned ?? 0) > 0
  const selectedKeywordCount = onboarding?.keyword_summary?.selected ?? 0
  const kwDone   = selectedKeywordCount > 0 || (kwData?.total_keywords ?? 0) > 0
  const serpDone = (serpCount?.total_queries  ?? 0) > 0
  const aiDone   = (aiCount?.total_queries    ?? 0) > 0
  const qDone    = (qCount?.total_questions   ?? 0) > 0
  const competitorsDone = (competitors?.domains?.length ?? 0) > 0
  const contentDone = (content?.drafts?.length ?? 0) > 0

  const steps = [
    {
      step: '01', title: 'Website Onboarding',
      desc: 'Add company details and scan the website to discover seed topics.',
      to: '/onboarding',
      icon: <Globe2 size={16} className="text-blue-400" />,
      done: onboardingDone,
    },
    {
      step: '02', title: 'Select Keywords',
      desc: 'Review keyword opportunities across informational, commercial, transactional, and navigational intent.',
      to: '/keywords',
      icon: <KeySquare size={16} className="text-blue-400" />,
      done: kwDone,
    },
    {
      step: '03', title: 'Find Competitors',
      desc: 'See who ranks for selected keywords and what pages are winning.',
      to: '/competitors',
      icon: <Users size={16} className="text-purple-400" />,
      done: competitorsDone,
    },
    {
      step: '04', title: 'Create Content',
      desc: 'Generate a draft from selected keywords and competitor insights.',
      to: '/content',
      icon: <FileText size={16} className="text-green-400" />,
      done: contentDone,
    },
    {
      step: '05', title: 'Analyze SERP',
      desc: 'Scrape top Google results to see what ranks and why.',
      to: '/serp',
      icon: <Search size={16} className="text-purple-400" />,
      done: serpDone,
    },
    {
      step: '06', title: 'Scan AI Engines',
      desc: 'Query ChatGPT, Gemini, and Perplexity and compare their citations.',
      to: '/ai-scan',
      icon: <Bot size={16} className="text-green-400" />,
      done: aiDone,
    },
    {
      step: '07', title: 'View Heatmap',
      desc: 'See the gap between Google coverage and AI coverage for your topic.',
      to: '/heatmap',
      icon: <Search size={16} className="text-orange-400" />,
      done: serpDone && aiDone,
    },
    {
      step: '08', title: 'Mine Questions',
      desc: 'Aggregate PAA and AI-generated questions for FAQ content.',
      to: '/questions',
      icon: <HelpCircle size={16} className="text-pink-400" />,
      done: qDone,
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{selectedProject.name}</h1>
        <p className="text-slate-400 text-sm mt-1">
          {selectedProject.description ?? 'Research & Intelligence Hub'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<KeySquare size={16} className="text-blue-400" />}
          label="Keywords discovered"
          value={kwData?.total_keywords ?? '—'}
          to="/keywords"
          color="bg-blue-900/40"
        />
        <StatCard
          icon={<Search size={16} className="text-purple-400" />}
          label="SERP results scraped"
          value={serpCount?.total_results ?? '—'}
          to="/serp"
          color="bg-purple-900/40"
        />
        <StatCard
          icon={<Bot size={16} className="text-green-400" />}
          label="AI scans run"
          value={aiCount?.total_queries ?? '—'}
          to="/ai-scan"
          color="bg-green-900/40"
        />
        <StatCard
          icon={<HelpCircle size={16} className="text-pink-400" />}
          label="Questions mined"
          value={qCount?.total_questions ?? '—'}
          to="/questions"
          color="bg-pink-900/40"
        />
      </div>

      <div className="card">
        <h2 className="section-title">Workflow</h2>
        <div className="space-y-3">
          {steps.map((s) => (
            <Link
              key={s.step}
              to={s.to}
              className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/60 border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600 transition-all group"
            >
              <span className="text-xs font-mono text-slate-400 w-6 shrink-0 font-semibold">{s.step}</span>
              <div className={`p-1.5 rounded-md ${s.done ? 'bg-green-900/40' : 'bg-gray-700/60'}`}>
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                  {s.title}
                  {s.done && (
                    <span className="badge bg-green-900 text-green-300 text-xs">done</span>
                  )}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{s.desc}</p>
              </div>
              <ArrowRight size={14} className="text-gray-500 group-hover:text-gray-300 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
