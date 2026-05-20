import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Edit2, Globe, Building2, Users, AlignLeft, X, Check, Loader2, Trash2 } from 'lucide-react';
import { useBrandStore, type Brand } from '../../store/brandStore';
import toast from 'react-hot-toast';

// ── helpers ───────────────────────────────────────────────────────────────────
const getToken = () =>
  document.cookie.match(/(?:^| )orbit_token=([^;]+)/)?.[2] ||
  localStorage.getItem('access_token') ||
  '';

const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

const INDUSTRIES = [
  'Technology', 'E-Commerce', 'Healthcare', 'Finance', 'Education',
  'Media & Entertainment', 'Travel & Hospitality', 'Real Estate',
  'Food & Beverage', 'Automotive', 'Fashion & Apparel', 'Advertisements', 'Other',
];

// ── empty form ────────────────────────────────────────────────────────────────
const emptyForm = (): Omit<Brand, 'id' | 'created_at'> => ({
  name: '', website: '', industry: '', description: '', target_audience: '',
});

// ── Brand Form Modal ──────────────────────────────────────────────────────────
interface BrandModalProps {
  brand?: Brand | null;
  onClose: () => void;
  onSaved: (brand: Brand) => void;
}

const BrandModal: React.FC<BrandModalProps> = ({ brand, onClose, onSaved }) => {
  const isEdit = !!brand;
  const [form, setForm] = useState(brand ? {
    name: brand.name,
    website: brand.website ?? '',
    industry: brand.industry ?? '',
    description: brand.description ?? '',
    target_audience: brand.target_audience ?? '',
  } : emptyForm());
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Brand name is required.');
      const payload = { ...form };
      if (isEdit) {
        const { data } = await axios.put(`/api/brands/${brand!.id}`, payload, { headers: authHeader() });
        return data as Brand;
      }
      const { data } = await axios.post('/api/brands', payload, { headers: authHeader() });
      return data as Brand;
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      toast.success(isEdit ? 'Brand updated!' : 'Brand created!');
      onSaved(saved);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save brand.');
    },
  });

  const field = (key: keyof typeof form, label: string, icon: React.ReactNode, placeholder: string, multiline = false) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon}{label}
      </label>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          style={inputStyle}
        />
      ) : (
        <input
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              {isEdit ? 'Edit Brand' : 'Create Brand'}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              {isEdit ? 'Update brand details' : 'Add a new brand to your workspace'}
            </p>
          </div>
          <button onClick={onClose} style={iconBtnStyle}><X size={16} /></button>
        </div>

        {field('name', 'Brand Name *', <Building2 size={12} />, 'e.g. Acme Corp')}
        {field('website', 'Website', <Globe size={12} />, 'https://acme.com')}

        {/* Industry dropdown */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Building2 size={12} />Industry
          </label>
          <select
            value={form.industry}
            onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
            style={{ ...inputStyle, appearance: 'auto' }}
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        {field('description', 'Description', <AlignLeft size={12} />, 'Brief overview of the brand…', true)}
        {field('target_audience', 'Target Audience', <Users size={12} />, 'e.g. B2B SaaS marketers, 25–45')}

        {error && (
          <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.name.trim()}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px', borderRadius: 8, border: 'none', cursor: save.isPending ? 'wait' : 'pointer',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 600,
              opacity: !form.name.trim() ? 0.5 : 1,
            }}
          >
            {save.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            {isEdit ? 'Save Changes' : 'Create Brand'}
          </button>
          <button onClick={onClose} style={{ padding: '10px 16px', background: '#1e293b', border: 'none', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
            Cancel
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
};

// ── Brand Card ────────────────────────────────────────────────────────────────
interface BrandCardProps {
  brand: Brand;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const BrandCard: React.FC<BrandCardProps> = ({ brand, isActive, onSelect, onEdit, onDelete }) => (
  <div
    style={{
      background: 'linear-gradient(135deg,#111827 0%,#161f2e 100%)',
      border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 14, padding: '1.25rem',
      boxShadow: isActive
        ? '0 4px 24px rgba(99,102,241,0.25), 0 0 0 1px rgba(99,102,241,0.15)'
        : '0 2px 12px rgba(0,0,0,0.4)',
      transition: 'all 0.2s',
      position: 'relative',
    }}
  >
    {isActive && (
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
        borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: '#a5b4fc',
        letterSpacing: '0.05em',
      }}>ACTIVE</div>
    )}

    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 16, color: '#fff',
        boxShadow: '0 0 12px rgba(99,102,241,0.3)',
      }}>
        {brand.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand.name}</h3>
        {brand.industry && <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, background: 'rgba(99,102,241,0.12)', borderRadius: 4, padding: '1px 6px' }}>{brand.industry}</span>}
      </div>
    </div>

    {brand.website && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Globe size={11} color="#475569" />
        <a href={brand.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {brand.website.replace(/^https?:\/\//, '')}
        </a>
      </div>
    )}

    {brand.description && (
      <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {brand.description}
      </p>
    )}

    {brand.target_audience && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Users size={11} color="#475569" />
        <span style={{ fontSize: 11, color: '#64748b' }}>{brand.target_audience}</span>
      </div>
    )}

    <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
      <button
        onClick={onSelect}
        disabled={isActive}
        style={{
          flex: 1, padding: '7px', borderRadius: 7, border: 'none', cursor: isActive ? 'default' : 'pointer',
          background: isActive ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)',
          color: isActive ? '#6366f1' : '#a5b4fc', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'all 0.15s',
        }}
      >
        {isActive ? <><Check size={12} />Selected</> : 'Set Active'}
      </button>
      <button onClick={onEdit} style={{ padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
        <Edit2 size={13} />
      </button>
      <button onClick={onDelete} style={{ padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
        <Trash2 size={13} />
      </button>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const BrandsPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const { currentBrand, setCurrentBrand, setBrands } = useBrandStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();

  // Auto-open Create modal when navigated from the "New Brand" topbar shortcut
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowModal(true);
      setEditBrand(null);
      setSearchParams({}, { replace: true }); // clean URL
    }
  }, []);

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await axios.get('/api/brands', { headers: authHeader() });
      return data as Brand[];
    },
    onSuccess: (data: Brand[]) => {
      setBrands(data);
      // Auto-select first brand if none active
      if (!currentBrand && data.length > 0) setCurrentBrand(data[0]);
    },
  } as any);

  const deleteMut = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/brands/${id}`, { headers: authHeader() }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      if (currentBrand?.id === id) setCurrentBrand(null);
      toast.success('Brand deleted');
    },
    onError: () => toast.error('Failed to delete brand'),
  });

  const handleSaved = (saved: Brand) => {
    setShowModal(false);
    setEditBrand(null);
    if (!currentBrand) setCurrentBrand(saved);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Brand Management</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>
            Manage your brands and set the active context for all Orbit modules.
          </p>
        </div>
        <button
          onClick={() => { setEditBrand(null); setShowModal(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
            borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          <Plus size={16} />New Brand
        </button>
      </div>

      {/* Brand grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : brands.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'linear-gradient(135deg,#111827,#161f2e)',
          border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 16,
        }}>
          <Building2 size={40} color="#334155" style={{ marginBottom: 16 }} />
          <h3 style={{ color: '#475569', fontSize: 16, marginBottom: 8 }}>No brands yet</h3>
          <p style={{ color: '#334155', fontSize: 14, marginBottom: 20 }}>Create your first brand to get started with Orbit modules.</p>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: '10px 20px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            <Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Create Brand
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.25rem' }}>
          {brands.map(b => (
            <BrandCard
              key={b.id}
              brand={b}
              isActive={currentBrand?.id === b.id}
              onSelect={() => setCurrentBrand(b)}
              onEdit={() => { setEditBrand(b); setShowModal(true); }}
              onDelete={() => {
                if (window.confirm(`Delete "${b.name}"?`)) deleteMut.mutate(b.id);
              }}
            />
          ))}
        </div>
      )}

      {showModal && (
        <BrandModal
          brand={editBrand}
          onClose={() => { setShowModal(false); setEditBrand(null); }}
          onSaved={handleSaved}
        />
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default BrandsPage;

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', resize: 'vertical' as const, fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', zIndex: 1000, padding: 16,
};

const modalStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg,#0f172a 0%,#131f35 100%)',
  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16,
  padding: '1.5rem', width: '100%', maxWidth: 480,
  boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
  maxHeight: '90vh', overflowY: 'auto',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: 8, cursor: 'pointer', color: '#94a3b8',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
