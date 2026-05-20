/**
 * brandStore.ts
 * Global brand state — mirrors the pattern in projectStore.ts.
 * Persisted via zustand/persist (localStorage key: "orbit-brand").
 * Also syncs the `orbit_brand_id` cookie so existing API interceptors
 * (discover client, visibility client, etc.) pick up the active brand
 * without any backend changes.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Brand {
  id: string
  name: string
  website?: string
  industry?: string
  description?: string
  target_audience?: string
  created_at?: string
}

interface BrandStore {
  /** Currently active brand (persisted across page reloads) */
  currentBrand: Brand | null
  /** Full list of brands owned by the user (populated by the top-level picker) */
  brands: Brand[]
  setCurrentBrand: (brand: Brand | null) => void
  setBrands: (brands: Brand[]) => void
}

// ── Cookie helper ─────────────────────────────────────────────────────────────

const setBrandCookie = (brand: Brand | null) => {
  if (brand?.id) {
    document.cookie = `orbit_brand_id=${brand.id};path=/;max-age=86400;SameSite=Lax`
    return
  }
  document.cookie = 'orbit_brand_id=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBrandStore = create<BrandStore>()(
  persist(
    (set) => ({
      currentBrand: null,
      brands: [],

      setCurrentBrand: (brand) => {
        setBrandCookie(brand)
        set({ currentBrand: brand })
      },

      setBrands: (brands) => set({ brands }),
    }),
    {
      name: 'orbit-brand',
      // Re-sync cookie after rehydration
      onRehydrateStorage: () => (state) => {
        setBrandCookie(state?.currentBrand ?? null)
      },
    }
  )
)
