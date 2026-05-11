// import { create } from 'zustand'
// import { persist } from 'zustand/middleware'
// import type { Project } from '../api/client'

// interface ProjectStore {
//   selectedProject: Project | null
//   setSelectedProject: (p: Project | null) => void
// }

// export const useProjectStore = create<ProjectStore>()(
//   persist(
//     (set) => ({
//       selectedProject: null,
//       setSelectedProject: (p) => set({ selectedProject: p }),
//     }),
//     { name: 'orbit-project' }
//   )
// )



// frontend/src/store/projectStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from '../api/client'

const setProjectCookie = (project: Project | null) => {
  if (project?.id) {
    document.cookie = `orbit_project_id=${project.id};path=/;max-age=86400;SameSite=Lax`
    return
  }
  document.cookie = 'orbit_project_id=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
}

interface LastQueries {
  serp?: string
  aiScan?: string
  questions?: string
}

interface ProjectStore {
  selectedProject: Project | null
  setSelectedProject: (p: Project | null) => void
  // ── NEW: remember the last query run per module per project ──────
  lastQueries: Record<string, LastQueries>  // keyed by project id
  setLastQuery: (projectId: string, module: keyof LastQueries, query: string) => void
  getLastQuery: (projectId: string, module: keyof LastQueries) => string
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      selectedProject: null,
      setSelectedProject: (p) => {
        setProjectCookie(p)
        set({ selectedProject: p })
      },

      lastQueries: {},

      setLastQuery: (projectId, module, query) =>
        set(state => ({
          lastQueries: {
            ...state.lastQueries,
            [projectId]: {
              ...state.lastQueries[projectId],
              [module]: query,
            },
          },
        })),

      getLastQuery: (projectId, module) =>
        get().lastQueries[projectId]?.[module] ?? '',
    }),
    {
      name: 'orbit-project',
      onRehydrateStorage: () => (state) => {
        setProjectCookie(state?.selectedProject ?? null)
      },
    }
  )
)
