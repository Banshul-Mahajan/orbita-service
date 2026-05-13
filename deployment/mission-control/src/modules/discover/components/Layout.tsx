import { NavLink, Outlet } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import {
  LayoutDashboard, KeySquare, Search, Bot, Grid3x3,
  HelpCircle, ChevronDown, FolderOpen, Plus, Satellite,
  Globe2, Users, FileText
} from 'lucide-react'
import { useState } from 'react'
import { projectsApi } from '../api/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const NAV = [
  { to: '/dashboard/discover',             icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/dashboard/discover/onboarding',  icon: Globe2,          label: 'Onboarding'     },
  { to: '/dashboard/discover/keywords',    icon: KeySquare,       label: 'Keywords'       },
  { to: '/dashboard/discover/competitors', icon: Users,           label: 'Competitors'    },
  { to: '/dashboard/discover/content',     icon: FileText,        label: 'Create Orbit'   },
  { to: '/dashboard/discover/serp',        icon: Search,          label: 'SERP Analyzer'  },
  { to: '/dashboard/discover/ai-scan',     icon: Bot,             label: 'AI Scanner'     },
  { to: '/dashboard/discover/heatmap',     icon: Grid3x3,         label: 'Intent Heatmap' },
  { to: '/dashboard/discover/questions',   icon: HelpCircle,      label: 'Questions'      },
]

export default function Layout() {
  const { selectedProject, setSelectedProject } = useProjectStore()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newName, setNewName] = useState('')
  const qc = useQueryClient()

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })

  const createMut = useMutation({
    mutationFn: (name: string) => projectsApi.create(name),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setSelectedProject(project)
      setShowNewProject(false)
      setNewName('')
    },
  })

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
          <Satellite className="text-blue-400" size={20} />
          <span className="font-bold text-sm text-white tracking-wide">DISCOVER ORBIT</span>
        </div>

        {/* Project picker */}
        <div className="px-3 py-3 border-b border-gray-800">
          <p className="label mb-2">Project</p>
          <div className="relative">
            <select
              className="input text-xs pr-8 appearance-none cursor-pointer"
              value={selectedProject?.id ?? ''}
              onChange={e => {
                const p = projects.find(p => p.id === e.target.value)
                if (p) setSelectedProject(p)
              }}
            >
              <option value="" disabled>— select project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
          </div>

          {showNewProject ? (
            <div className="mt-2 flex gap-1">
              <input
                className="input text-xs flex-1"
                placeholder="Project name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMut.mutate(newName.trim()) }}
                autoFocus
              />
              <button
                className="btn-primary px-2 py-1 text-xs"
                onClick={() => newName.trim() && createMut.mutate(newName.trim())}
                disabled={createMut.isPending}
              >+</button>
              <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setShowNewProject(false)}>✕</button>
            </div>
          ) : (
            <button
              className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 transition-colors"
              onClick={() => setShowNewProject(true)}
            >
              <Plus size={12} /> New project
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard/discover'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-600">MVP v0.1.0</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        {!selectedProject && (
          <div className="bg-blue-900/30 border-b border-blue-800/50 px-6 py-2 text-xs text-blue-300 flex items-center gap-2">
            <FolderOpen size={13} />
            Create or select a project in the sidebar to get started.
          </div>
        )}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
