import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../modules/discover/api/client';
import { useProjectStore } from '../modules/discover/store/projectStore';
import { useBrandStore, type Brand } from '../store/brandStore';
import { FolderOpen, ChevronDown, Plus, Check, X, Loader2, Globe, RefreshCw, Activity, TrendingUp, Target, Building2, Trash2 } from 'lucide-react';
import axios from 'axios';

// ── cookie helpers ────────────────────────────────────────────────────────────
const getCookie = (name: string) => {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? m[2] : '';
};
const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Lax`;
};

// ── Sub-nav registry ──────────────────────────────────────────────────────────
const MODULE_SUBNAV: Record<string, { label: string; path: string }[]> = {
  discover: [
    { label: 'Dashboard', path: '' },
    { label: 'Onboarding', path: 'onboarding' },
    { label: 'Keywords', path: 'keywords' },
    { label: 'Competitors', path: 'competitors' },
    { label: 'SERP Analyzer', path: 'serp' },
    { label: 'AI Scanner', path: 'ai-scan' },
    { label: 'Intent Heatmap', path: 'heatmap' },
    { label: 'Questions', path: 'questions' },
  ],
  visibility: [{ label: 'Brands', path: 'brands' }],
  create: [
    { label: 'Dashboard', path: 'dashboard' },
    { label: 'New Brief', path: 'briefs/new' },
    { label: 'Corpus', path: 'corpus' },
  ],
  optimize: [],
  knowledge: [
    { label: 'Dashboard', path: '' },
    { label: 'Entities', path: 'entities' },
    { label: 'Citations', path: 'sources' },
    { label: 'Authors', path: 'authors' },
    { label: 'FactGuard', path: 'factguard' },
  ],
  brands: [],
};

const MODULE_CLASSES: Record<string, string> = {
  discover: 'orbit-module',
  visibility: 'orbit-module',
  create: 'orbit-module',
  optimize: 'optimize-module',
  knowledge: 'orbit-module knowledge-module',
  brands: 'orbit-module',
};

const MODULE_TITLES: Record<string, string> = {
  discover: 'Discover Orbit',
  visibility: 'Visibility Orbit',
  create: 'Create Orbit',
  optimize: 'Optimize Orbit',
  knowledge: 'Knowledge Core',
  brands: 'Brand Management',
  settings: 'Settings',
};

// ── Shared Picker UI ──────────────────────────────────────────────────────────
const pickerBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
  color: '#cbd5e1', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
};

// ── Discover: Project Picker ──────────────────────────────────────────────────
function DiscoverProjectPicker() {
  const { selectedProject, setSelectedProject } = useProjectStore();
  const { currentBrand } = useBrandStore();          // ← shared global brand
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState('');
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Resolve active brand id — prefer store, fall back to cookie
  const activeBrandId = currentBrand?.id || getCookie('orbit_brand_id') || '';

  // Ensure cookie stays in sync whenever store changes
  useEffect(() => {
    if (currentBrand?.id) setCookie('orbit_brand_id', currentBrand.id);
  }, [currentBrand?.id]);

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['projects', activeBrandId],
    queryFn: () => projectsApi.list(),
    enabled: !!activeBrandId,
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (!activeBrandId) throw new Error('No brand selected. Please choose a brand first.');
      setCookie('orbit_brand_id', activeBrandId);
      return projectsApi.create(form.name, form.description);
    },
    onSuccess: (project: any) => {
      setSelectedProject(project);
      qc.invalidateQueries({ queryKey: ['projects'] });
      setCreating(false);
      setOpen(false);
      setForm({ name: '', description: '' });
      setCreateError('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create project';
      setCreateError(msg);
    },
  });

  return (
    <div style={{ position: 'relative', zIndex: 500 }}>
      <button onClick={() => setOpen(o => !o)} style={pickerBtnStyle}>
        <FolderOpen size={14} color="#6366f1" />
        <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedProject ? selectedProject.name : 'Select project'}
        </span>
        <ChevronDown size={12} color="#9ca3af" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>

      {/* Click-outside overlay */}
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 498 }} />}

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 499, minWidth: 240,
          background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>
          {/* Active brand context indicator */}
          {currentBrand ? (
            <div style={{ padding: '7px 14px', fontSize: 11, color: '#6366f1', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Building2 size={11} />
              <span style={{ fontWeight: 600 }}>{currentBrand.name}</span>
            </div>
          ) : (
            <div style={{ padding: '10px 14px', color: '#f59e0b', fontSize: 12, borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚠ No brand selected —{' '}
              <button
                onClick={() => { setOpen(false); navigate('/dashboard/brands'); }}
                style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}
              >
                create one here
              </button>
            </div>
          )}

          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {(projects as any[]).length === 0 && !creating && (
              <div style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: 12, textAlign: 'center' }}>
                No projects yet
              </div>
            )}
            {(projects as any[]).map((p: any) => (
              <button key={p.id} onClick={() => { setSelectedProject(p); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', fontSize: 13, textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
                <span>{p.name}</span>
                {selectedProject?.id === p.id && <Check size={13} color="#10b981" />}
              </button>
            ))}
          </div>

          {creating ? (
            <div style={{ padding: '10px 14px', borderTop: '1px solid #1e293b' }}>
              <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter' && form.name.trim()) createMut.mutate(); }}
                placeholder="Project name"
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' as const }} />
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' as const }} />
              {createError && (
                <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8, padding: '4px 6px', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>
                  {createError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => createMut.mutate()} disabled={!form.name.trim() || createMut.isPending || !activeBrandId}
                  style={{ flex: 1, padding: '7px', background: '#6366f1', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (!form.name.trim() || !activeBrandId) ? 0.5 : 1 }}>
                  {createMut.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Create
                </button>
                <button onClick={() => { setCreating(false); setCreateError(''); }}
                  style={{ padding: '7px 10px', background: '#1e293b', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setCreating(true); setCreateError(''); }}
              disabled={!activeBrandId}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', borderTop: '1px solid #1e293b', cursor: activeBrandId ? 'pointer' : 'not-allowed', color: activeBrandId ? '#6366f1' : '#475569', fontSize: 13 }}>
              <Plus size={13} /> New project
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ── Unified Brand + Project Switcher (top-right dropdown) ────────────────────
function BrandSwitcher() {
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { currentBrand, setCurrentBrand, setBrands } = useBrandStore();
  const { selectedProject, setSelectedProject } = useProjectStore();
  const qc = useQueryClient();
  const token = localStorage.getItem('access_token') || '';
  const auth = { Authorization: `Bearer ${token}` };

  // Load all brands
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => axios.get('/api/brands', { headers: auth }).then(r => r.data),
    onSuccess: (data: Brand[]) => {
      setBrands(data);
      if (!currentBrand && data.length > 0) setCurrentBrand(data[0]);
    },
  } as any);

  // Load projects for current brand
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['projects', currentBrand?.id],
    queryFn: () => projectsApi.list(),
    enabled: !!currentBrand?.id,
  });

  // Delete a project
  const deleteProjectMut = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['projects', currentBrand?.id] });
      if (selectedProject?.id === id) setSelectedProject(null);
    },
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goToBrands = (qs = '') => { setOpen(false); navigate(`/dashboard/brands${qs}`); };

  const label = currentBrand
    ? `${currentBrand.name}${selectedProject ? ` / ${selectedProject.name}` : ''}`
    : 'Switch Brand';

  return (
    <div ref={dropRef} style={{ position: 'relative', zIndex: 500 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: currentBrand ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${currentBrand ? 'rgba(99,102,241,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
          color: '#cbd5e1', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
        }}
      >
        <Building2 size={14} color={currentBrand ? '#818cf8' : '#f87171'} />
        <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <ChevronDown size={12} color="#9ca3af" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 499,
          minWidth: 270, background: '#0f172a', border: '1px solid #1f2937',
          borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.7)', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '8px 14px 4px', fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Brands &amp; Projects
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {(brands as Brand[]).length === 0 && (
              <div style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                No brands yet — click <strong style={{ color: '#818cf8' }}>+ New Brand</strong> below
              </div>
            )}

            {(brands as Brand[]).map((b) => (
              <div key={b.id}>
                {/* Brand row */}
                <button
                  onClick={() => { setCurrentBrand(b); setSelectedProject(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '9px 14px',
                    background: currentBrand?.id === b.id ? 'rgba(99,102,241,0.12)' : 'none',
                    border: 'none', borderBottom: '1px solid #1e293b',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff',
                    }}>
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: currentBrand?.id === b.id ? '#a5b4fc' : '#e2e8f0' }}>
                      {b.name}
                    </span>
                  </div>
                  {currentBrand?.id === b.id && !selectedProject && <Check size={12} color="#818cf8" />}
                </button>

                {/* Projects nested under active brand */}
                {currentBrand?.id === b.id && (projects as any[]).map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center',
                      background: selectedProject?.id === p.id ? 'rgba(16,185,129,0.08)' : 'none',
                      borderBottom: '1px solid #161f2e',
                    }}
                  >
                    {/* Select */}
                    <button
                      onClick={() => { setCurrentBrand(b); setSelectedProject(p); setOpen(false); }}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 8px 7px 44px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FolderOpen size={11} color="#10b981" />
                        <span style={{ fontSize: 12, color: selectedProject?.id === p.id ? '#34d399' : '#94a3b8' }}>{p.name}</span>
                      </div>
                      {selectedProject?.id === p.id && <Check size={11} color="#10b981" />}
                    </button>

                    {/* Delete project */}
                    <button
                      title={`Delete "${p.name}"`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete project "${p.name}"? This cannot be undone.`)) {
                          deleteProjectMut.mutate(p.id);
                        }
                      }}
                      style={{
                        flexShrink: 0, padding: '7px 10px', background: 'none', border: 'none',
                        cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                    >
                      {deleteProjectMut.isPending
                        ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Trash2 size={11} />}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer — New Brand navigates to full form, no inline create */}
          <div style={{ borderTop: '1px solid #1e293b' }}>
            <button
              onClick={() => goToBrands('?new=1')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none',
                cursor: 'pointer', color: '#818cf8', fontSize: 13, fontWeight: 600,
              }}
            >
              <Plus size={13} /> New Brand
            </button>
            <button
              onClick={() => goToBrands()}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                padding: '9px 14px', background: 'none', border: 'none',
                borderTop: '1px solid #1e293b', cursor: 'pointer', color: '#64748b', fontSize: 12,
              }}
            >
              <Building2 size={12} /> Manage Brands…
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Visibility: dynamic brand-aware subnav ────────────────────────────────────
function VisibilitySubNav({ basePath }: { basePath: string }) {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const brandId = segments[3];
  const inBrand = segments[2] === 'brands' && !!brandId;

  const tabs = inBrand ? [
    { label: 'Overview', path: `brands/${brandId}` },
    { label: 'Probes', path: `brands/${brandId}/probes` },
    { label: 'Alerts', path: `brands/${brandId}/alerts` },
    { label: 'Facts', path: `brands/${brandId}/knowledge` },
    { label: '← All Brands', path: 'brands' },
  ] : [
    { label: 'Brands', path: 'brands' },
  ];

  return (
    <>
      {tabs.map(({ label, path }) => (
        <NavLink key={path} to={`${basePath}/${path}`} end={!path.includes('/') || path === `brands/${brandId}`}
          style={({ isActive }) => navTabStyle(isActive)}>
          {label}
        </NavLink>
      ))}
    </>
  );
}

// ── shared tab style ──────────────────────────────────────────────────────────
function navTabStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: '10px 16px', fontSize: 13,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#a5b4fc' : '#94a3b8',
    textDecoration: 'none',
    borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
    whiteSpace: 'nowrap', transition: 'all 0.15s',
  };
}

// ── Mission Control Home ───────────────────────────────────────────────────────
function MissionControlHome() {
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [stats, setStats] = useState({ brands: 0, projects: 0, probes: 0, keywords: 0 });
  const [scanLog, setScanLog] = useState<string[]>([]);
  const qc = useQueryClient();

  const token = localStorage.getItem('access_token') || '';
  const authHeader = { Authorization: `Bearer ${token}` };

  const runScan = useCallback(async () => {
    setScanning(true);
    setScanLog([]);
    const log = (msg: string) => setScanLog(prev => [...prev, msg]);

    try {
      log('Fetching brands…');
      const brandsRes = await axios.get('/api/brands', { headers: authHeader }).catch(() => ({ data: [] }));
      const brands: any[] = brandsRes.data || [];
      log(`Found ${brands.length} brand(s)`);

      log('Fetching projects…');
      let allProjects: any[] = [];
      for (const b of brands.slice(0, 5)) {
        const pRes = await axios.get(`/api/brands/${b.id}/projects`, { 
          headers: { ...authHeader, 'X-Orbita-Brand-Id': b.id } 
        }).catch(() => ({ data: [] }));
        const projs = pRes.data || [];
        // Attach brand id so we can use it below
        allProjects = allProjects.concat(projs.map((p: any) => ({ ...p, brand_id: b.id })));
      }
      log(`Found ${allProjects.length} project(s)`);

      log('Fetching visibility probes…');
      let totalProbes = 0;
      for (const b of brands.slice(0, 3)) {
        const prRes = await axios.get(`/api/visibility/brands/${b.id}/probes`, { 
          headers: { ...authHeader, 'X-Orbita-Brand-Id': b.id } 
        }).catch(() => ({ data: [] }));
        totalProbes += (prRes.data || []).length;
      }
      log(`Found ${totalProbes} probe(s)`);

      log('Fetching keyword count…');
      let kwCount = 0;
      // Loop through up to 5 projects to avoid spamming the backend during a quick scan
      for (const p of allProjects.slice(0, 5)) {
        const kwRes = await axios.get(`/api/discover/keywords/${p.id}`, { 
          headers: { 
            ...authHeader, 
            'X-Orbita-Brand-Id': p.brand_id,
            'X-Orbita-Project-Id': p.id
          } 
        }).catch((err) => {
          console.error(`Keyword fetch failed for project ${p.id}:`, err);
          return { data: { total_keywords: 0 } };
        });
        kwCount += (kwRes.data?.total_keywords ?? 0);
      }
      log(`Found ${kwCount} keyword(s)`);

      setStats({ brands: brands.length, projects: allProjects.length, probes: totalProbes, keywords: kwCount });
      setLastScanned(new Date().toLocaleTimeString());
      log('✓ Scan complete');
      qc.invalidateQueries();
    } catch (e) {
      log('Scan failed — check service health');
    } finally {
      setScanning(false);
    }
  }, []);

  const statCards = [
    { label: 'Brands', value: stats.brands, icon: <Globe size={20} color="#818cf8" />, color: '#a5b4fc', bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.35)', glow: 'rgba(99,102,241,0.2)', sub: 'Across all orgs' },
    { label: 'Projects', value: stats.projects, icon: <Target size={20} color="#34d399" />, color: '#6ee7b7', bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.35)', glow: 'rgba(16,185,129,0.15)', sub: 'Active research spaces' },
    { label: 'Probes', value: stats.probes, icon: <Activity size={20} color="#60a5fa" />, color: '#93c5fd', bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.35)', glow: 'rgba(59,130,246,0.15)', sub: 'AI visibility probes' },
    { label: 'Keywords', value: stats.keywords, icon: <TrendingUp size={20} color="#c084fc" />, color: '#d8b4fe', bg: 'rgba(139,92,246,0.18)', border: 'rgba(139,92,246,0.35)', glow: 'rgba(139,92,246,0.15)', sub: 'Tracked keywords' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Platform Overview</h1>
          <p style={{ color: '#94a3b8', marginTop: 4, fontSize: 14 }}>
            Real-time snapshot of your ORBITA platform health.
            {lastScanned && <span style={{ marginLeft: 8, color: '#64748b', fontSize: 12 }}>Last scanned: {lastScanned}</span>}
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10,
            background: scanning ? '#f3f4f6' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: scanning ? '1px solid #e5e7eb' : 'none',
            color: scanning ? '#6b7280' : '#fff',
            fontSize: 14, fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer',
            boxShadow: scanning ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
            transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={16} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
          {scanning ? 'Scanning…' : 'Run Platform Scan'}
        </button>
      </div>

      {/* Scan log (shown while scanning) */}
      {scanLog.length > 0 && (
        <div style={{
          background: '#050810', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
          padding: '12px 16px', marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: 12,
          color: '#94a3b8', maxHeight: 120, overflow: 'hidden',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {scanLog.map((line, i) => (
            <div key={i} style={{ color: line.startsWith('✓') ? '#34d399' : line.includes('failed') ? '#f87171' : '#94a3b8' }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {statCards.map(({ label, value, icon, color, bg, border, glow, sub }) => (
          <div key={label} style={{
            background: 'linear-gradient(135deg, #111827 0%, #161f2e 100%)',
            border: `1px solid ${border}`,
            borderRadius: 14,
            padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 8,
            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '6px', boxShadow: `0 0 10px ${glow}` }}>{icon}</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color, lineHeight: 1.1 }}>
              {scanning && value === 0 ? (
                <span style={{ fontSize: 20, color: '#334155', animation: 'pulse 1.5s ease infinite' }}>—</span>
              ) : value}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick access modules */}
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Access</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Discover Orbit', path: '/dashboard/discover', desc: 'Keywords & SEO research', color: '#60a5fa', glow: 'rgba(59,130,246,0.2)' },
            { label: 'Visibility Orbit', path: '/dashboard/visibility', desc: 'AI brand monitoring', color: '#c084fc', glow: 'rgba(139,92,246,0.2)' },
            { label: 'Create Orbit', path: '/dashboard/create', desc: 'AI content briefs', color: '#34d399', glow: 'rgba(16,185,129,0.2)' },
            { label: 'Optimize Orbit', path: '/dashboard/optimize', desc: 'Content optimization', color: '#fbbf24', glow: 'rgba(245,158,11,0.2)' },
            { label: 'Knowledge Core', path: '/dashboard/knowledge', desc: 'Entity & facts DB', color: '#f87171', glow: 'rgba(239,68,68,0.2)' },
          ].map(({ label, path, desc, color, glow }) => (
            <a key={label} href={path} style={{
              display: 'block',
              background: 'linear-gradient(135deg, #111827 0%, #161f2e 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '1rem', textDecoration: 'none',
              borderLeft: `3px solid ${color}`,
              transition: 'box-shadow 0.15s, transform 0.15s',
              boxShadow: `0 2px 12px rgba(0,0,0,0.4)`,
            }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), 0 0 12px ${glow}`;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.4)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{desc}</div>
            </a>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

// ── Main DashboardPage ────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) navigate('/');
  }, [navigate]);

  const segments = location.pathname.split('/').filter(Boolean);
  const activeModule = segments[1] ?? '';
  const isHome = segments.length === 1;

  const pageTitle = isHome ? 'Mission Control' : (MODULE_TITLES[activeModule] ?? 'Dashboard');
  const moduleClass = MODULE_CLASSES[activeModule] ?? 'orbit-module';
  const subNav = MODULE_SUBNAV[activeModule] ?? [];
  const basePath = `/dashboard/${activeModule}`;

  const userStr = localStorage.getItem('orbit_user') || localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const orgName = user?.org_name || user?.company_name || null;

  const hasSubnav = !isHome && (
    subNav.length > 0 ||
    activeModule === 'visibility' ||
    activeModule === 'discover'
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#080b0f', overflow: 'hidden' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* ── Top bar ── */}
        <header className="topbar" style={{ flexShrink: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f1f5f9', margin: 0, letterSpacing: '0.01em' }}>{pageTitle}</h2>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Discover: Project picker stays alongside brand switcher */}
            {activeModule === 'discover' && <DiscoverProjectPicker />}

            {/* Unified brand + project switcher — always visible */}
            <BrandSwitcher />

            {orgName && (
              <span style={{ fontSize: 13, color: '#94a3b8', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 12 }}>
                {orgName}
              </span>
            )}
          </div>
        </header>

        {/* ── Per-module sub-navigation (only nav tabs, no pickers here) ── */}
        {hasSubnav && (
          <div style={{
            background: 'rgba(13,17,23,0.97)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '0 1.5rem', display: 'flex', gap: 0, flexShrink: 0,
            overflowX: 'auto', alignItems: 'center',
          }}>
            {activeModule === 'visibility' ? (
              <VisibilitySubNav basePath={basePath} />
            ) : (
              subNav.map(({ label, path }) => {
                const fullPath = `${basePath}${path ? `/${path}` : ''}`;
                const isExact = path === '' || path === 'dashboard';
                return (
                  <NavLink key={path} to={fullPath} end={isExact} style={({ isActive }) => navTabStyle(isActive)}>
                    {label}
                  </NavLink>
                );
              })
            )}
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {isHome ? (
            <MissionControlHome />
          ) : activeModule === 'settings' ? (
            <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center', background: '#080b0f', minHeight: '100%' }}>
              <h3 style={{ fontSize: 20, color: '#f1f5f9', marginBottom: 8 }}>Settings</h3>
              <p style={{ marginTop: 8 }}>Platform settings coming soon.</p>
            </div>
          ) : (
            <div className={moduleClass} style={{
              minHeight: '100%', width: '100%',
              // Editor is full-screen — no outer padding; all other pages get 2rem
              padding: location.pathname.includes('/editor/') ? 0 : '2rem',
              boxSizing: 'border-box',
            }}>
              <ErrorBoundary moduleName={MODULE_TITLES[activeModule]}>
                <Outlet />
              </ErrorBoundary>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
