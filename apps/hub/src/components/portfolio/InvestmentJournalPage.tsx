import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../context/CurrencyContext';

// ── TYPES ─────────────────────────────────────────────────────────────────
interface InvestmentRecord {
  id: string;
  user_id: string;
  created_at: string;
  asset_name: string;
  asset_type: string;
  ticker?: string;
  direction: 'long' | 'short';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  date_opened: string;
  date_closed?: string;
  status: 'open' | 'closed' | 'partial';
  fees: number;
  notes?: string;
}

type InvStatus = InvestmentRecord['status'];
type FormData  = Omit<InvestmentRecord, 'id' | 'user_id' | 'created_at'>;

// ── CONSTANTS ─────────────────────────────────────────────────────────────
const ASSET_TYPES = [
  'Acción', 'Crypto', 'ETF', 'Fondo de inversión',
  'Forex', 'Materia Prima', 'Bono/Renta fija', 'Otro',
];
const STATUS_CFG: Record<InvStatus, { label: string; color: string; bg: string }> = {
  open:    { label: 'Abierta',  color: 'var(--cyan)',  bg: 'rgba(59,158,255,0.12)'  },
  closed:  { label: 'Cerrada',  color: 'var(--muted)', bg: 'rgba(90,97,128,0.12)'   },
  partial: { label: 'Parcial',  color: 'var(--gold)',  bg: 'rgba(201,168,76,0.12)'  },
};
const EMPTY_FORM: FormData = {
  asset_name:  '',
  asset_type:  'Acción',
  ticker:      '',
  direction:   'long',
  quantity:    1,
  entry_price: 0,
  exit_price:  undefined,
  date_opened: new Date().toISOString().split('T')[0],
  date_closed: undefined,
  status:      'open',
  fees:        0,
  notes:       '',
};

// ── HELPERS ───────────────────────────────────────────────────────────────
function getPL(rec: InvestmentRecord): number | null {
  if (!rec.exit_price) return null;
  const gross = rec.direction === 'long'
    ? (rec.exit_price - rec.entry_price) * rec.quantity
    : (rec.entry_price - rec.exit_price) * rec.quantity;
  return +(gross - rec.fees).toFixed(2);
}

function getOpenValue(rec: InvestmentRecord): number {
  return rec.entry_price * rec.quantity;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtMoney(val: number, sym: string) {
  const sign = val > 0 ? '+' : '';
  return `${sign}${sym}${Math.abs(val).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── ICONS ─────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6m4-6v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const TrendUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const TrendDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
  </svg>
);
const BriefcaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
);
const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
);
const CoinsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="8" cy="8" r="6"/>
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
    <path d="M7 6h1v4"/>
  </svg>
);
const PercentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="19" y1="5" x2="5" y2="19"/>
    <circle cx="6.5" cy="6.5" r="2.5"/>
    <circle cx="17.5" cy="17.5" r="2.5"/>
  </svg>
);

// ── INPUT STYLES ──────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10,
  background: 'var(--card2)', border: '1px solid var(--border2)',
  color: 'var(--text)', fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.15s', fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '0.3rem', display: 'block',
};

// ── FORM MODAL ────────────────────────────────────────────────────────────
function InvestmentFormModal({ editing, onClose, onSave }: {
  editing:  InvestmentRecord | null;
  onClose:  () => void;
  onSave:   (data: FormData) => Promise<void>;
}) {
  const [form, setForm] = useState<FormData>(
    editing
      ? {
          asset_name:  editing.asset_name,
          asset_type:  editing.asset_type,
          ticker:      editing.ticker ?? '',
          direction:   editing.direction,
          quantity:    editing.quantity,
          entry_price: editing.entry_price,
          exit_price:  editing.exit_price,
          date_opened: editing.date_opened,
          date_closed: editing.date_closed,
          status:      editing.status,
          fees:        editing.fees,
          notes:       editing.notes ?? '',
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState<string | null>(null);

  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.asset_name.trim()) { setErr('Introduce el nombre del activo'); return; }
    if (form.quantity   <= 0)    { setErr('La cantidad debe ser mayor que 0'); return; }
    if (form.entry_price <= 0)   { setErr('El precio de entrada debe ser mayor que 0'); return; }
    if (form.exit_price !== undefined && form.exit_price !== null && (form.exit_price as number) <= 0) {
      setErr('El precio de salida debe ser mayor que 0'); return;
    }
    setSaving(true); setErr(null);
    // Normalise: if exit_price is empty string convert to undefined
    const payload: FormData = {
      ...form,
      exit_price:  form.exit_price ? Number(form.exit_price) : undefined,
      date_closed: form.date_closed || undefined,
    };
    try { await onSave(payload); }
    catch { setErr('Error al guardar. Inténtalo de nuevo.'); }
    finally { setSaving(false); }
  };

  // Profit preview
  const previewPL = form.exit_price && Number(form.exit_price) > 0 && form.quantity > 0 && form.entry_price > 0
    ? (() => {
        const gross = form.direction === 'long'
          ? (Number(form.exit_price) - form.entry_price) * form.quantity
          : (form.entry_price - Number(form.exit_price)) * form.quantity;
        return +(gross - (form.fees ?? 0)).toFixed(2);
      })()
    : null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(4,6,15,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        className="glass-2"
        style={{ width: '100%', maxWidth: 600, borderRadius: 20, overflow: 'hidden', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {editing ? 'Editar operación' : 'Añadir operación'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* Asset name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Activo *</label>
              <input
                value={form.asset_name}
                onChange={e => set('asset_name', e.target.value)}
                placeholder="Ej: Apple, Bitcoin, S&P 500 ETF..."
                style={inputStyle}
              />
            </div>

            {/* Type */}
            <div>
              <label style={labelStyle}>Tipo de activo *</label>
              <select value={form.asset_type} onChange={e => set('asset_type', e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Ticker */}
            <div>
              <label style={labelStyle}>Ticker / Símbolo</label>
              <input
                value={form.ticker ?? ''}
                onChange={e => set('ticker', e.target.value)}
                placeholder="Ej: AAPL, BTC, SPY..."
                style={inputStyle}
              />
            </div>

            {/* Direction */}
            <div>
              <label style={labelStyle}>Dirección *</label>
              <select value={form.direction} onChange={e => set('direction', e.target.value as 'long' | 'short')} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                <option value="long">Compra (Long) ↑</option>
                <option value="short">Venta corta (Short) ↓</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value as InvStatus)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                <option value="open">Abierta</option>
                <option value="closed">Cerrada</option>
                <option value="partial">Parcial</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label style={labelStyle}>Cantidad / Acciones *</label>
              <input
                type="number" step="0.000001" min="0.000001"
                value={form.quantity}
                onChange={e => set('quantity', parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>

            {/* Entry price */}
            <div>
              <label style={labelStyle}>Precio de entrada *</label>
              <input
                type="number" step="0.000001" min="0.000001"
                value={form.entry_price}
                onChange={e => set('entry_price', parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>

            {/* Exit price */}
            <div>
              <label style={labelStyle}>Precio de salida</label>
              <input
                type="number" step="0.000001" min="0"
                value={form.exit_price ?? ''}
                onChange={e => set('exit_price', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Dejar vacío si está abierta"
                style={inputStyle}
              />
            </div>

            {/* Fees */}
            <div>
              <label style={labelStyle}>Comisiones (€)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.fees}
                onChange={e => set('fees', parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>

            {/* Date opened */}
            <div>
              <label style={labelStyle}>Fecha apertura</label>
              <input
                type="date"
                value={form.date_opened}
                onChange={e => set('date_opened', e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Date closed */}
            <div>
              <label style={labelStyle}>Fecha cierre</label>
              <input
                type="date"
                value={form.date_closed ?? ''}
                onChange={e => set('date_closed', e.target.value || undefined)}
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notas / Análisis</label>
              <textarea
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="Razonamiento de la operación, análisis técnico/fundamental..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          {err && (
            <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(240,68,88,0.1)', border: '1px solid rgba(240,68,88,0.25)', borderRadius: 10, color: 'var(--red)', fontSize: '0.83rem' }}>
              {err}
            </div>
          )}

          {/* Preview */}
          {previewPL !== null && (
            <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: previewPL >= 0 ? 'rgba(0,200,122,0.06)' : 'rgba(240,68,88,0.06)', border: `1px solid ${previewPL >= 0 ? 'rgba(0,200,122,0.18)' : 'rgba(240,68,88,0.18)'}`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text2)' }}>
              <span>P&L estimado</span>
              <span style={{ color: previewPL >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                {previewPL >= 0 ? '+' : ''}€{previewPL.toFixed(2)}
              </span>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn btn-gold" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', minHeight: 46, fontSize: '0.9rem' }}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Añadir operación'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="glass" style={{ borderRadius: 14, padding: '1rem 1.2rem', display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, marginTop: 2, background: color ? `${color}18` : 'var(--card3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color ?? 'var(--muted)' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: color ?? 'var(--text)', lineHeight: 1.2, marginTop: '0.12rem' }}>{value}</div>
        {sub && <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.12rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────
export function InvestmentJournalPage() {
  const { user }     = useAuth();
  const { currency } = useCurrency();
  const sym          = currency === 'USD' ? '$' : '€';

  const [records,    setRecords]    = useState<InvestmentRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState<string | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<InvestmentRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<'all' | InvStatus>('all');

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('investment_records')
        .select('*')
        .order('date_opened', { ascending: false });
      if (error) setFetchErr(error.message);
      else setRecords(data as InvestmentRecord[]);
      setLoading(false);
    })();
  }, [user]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const open    = records.filter(r => r.status === 'open');
    const closed  = records.filter(r => r.status === 'closed');

    const openCapital  = open.reduce((s, r) => s + getOpenValue(r), 0);
    const closedPLs    = closed.map(getPL).filter((v): v is number => v !== null);
    const realizedPL   = closedPLs.reduce((s, v) => s + v, 0);
    const totalInvested = closed.reduce((s, r) => s + getOpenValue(r), 0);
    const roi           = totalInvested > 0 ? (realizedPL / totalInvested) * 100 : 0;
    const wins          = closedPLs.filter(v => v > 0).length;
    const winRate       = closed.length > 0 ? (wins / closed.length) * 100 : 0;

    return {
      total: records.length, open: open.length, closed: closed.length,
      openCapital, realizedPL, roi, winRate, wins,
    };
  }, [records]);

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const saveRecord = async (data: FormData) => {
    if (editing) {
      const { data: updated, error } = await supabase
        .from('investment_records').update(data).eq('id', editing.id).select().single();
      if (error) throw error;
      setRecords(rs => rs.map(r => r.id === editing.id ? (updated as InvestmentRecord) : r));
    } else {
      const { data: created, error } = await supabase
        .from('investment_records').insert({ ...data, user_id: user!.id }).select().single();
      if (error) throw error;
      setRecords(rs => [created as InvestmentRecord, ...rs]);
    }
    setShowForm(false);
    setEditing(null);
  };

  const deleteRecord = async (id: string) => {
    const { error } = await supabase.from('investment_records').delete().eq('id', id);
    if (!error) {
      setRecords(rs => rs.filter(r => r.id !== id));
      setDeletingId(null);
    }
  };

  const openAdd  = () => { setEditing(null);   setShowForm(true); };
  const openEdit = (r: InvestmentRecord) => { setEditing(r); setShowForm(true); };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 3rem) 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
            Mi Cartera de Inversión
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text2)', fontSize: '0.9rem' }}>
            Registra tus operaciones, controla posiciones abiertas y analiza tu rentabilidad
          </p>
        </div>
        <button className="btn btn-gold" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <PlusIcon /> Añadir operación
        </button>
      </div>

      {/* Stats */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '0.7rem', marginBottom: '1.75rem' }}>
          <StatCard
            icon={<BriefcaseIcon />}
            label="Operaciones"
            value={String(stats.total)}
            sub={`${stats.open} abiertas · ${stats.closed} cerradas`}
            color="var(--cyan)"
          />
          <StatCard
            icon={<CoinsIcon />}
            label="Capital abierto"
            value={`${sym}${stats.openCapital.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="Posiciones activas"
            color="var(--gold)"
          />
          <StatCard
            icon={stats.realizedPL >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
            label="P&L realizado"
            value={`${stats.realizedPL >= 0 ? '+' : ''}${sym}${Math.abs(stats.realizedPL).toFixed(2)}`}
            sub={`${stats.wins} ops. ganadoras`}
            color={stats.realizedPL > 0 ? 'var(--green)' : stats.realizedPL < 0 ? 'var(--red)' : 'var(--muted)'}
          />
          <StatCard
            icon={<ChartIcon />}
            label="Tasa de acierto"
            value={stats.closed > 0 ? `${stats.winRate.toFixed(1)}%` : '—'}
            sub={`${stats.wins} de ${stats.closed} cerradas`}
            color={stats.winRate >= 55 ? 'var(--green)' : stats.winRate > 0 ? 'var(--red)' : 'var(--muted)'}
          />
          <StatCard
            icon={<PercentIcon />}
            label="ROI realizado"
            value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}
            sub={stats.roi > 0 ? 'Rentable' : stats.roi < 0 ? 'En pérdidas' : 'Neutro'}
            color={stats.roi > 0 ? 'var(--green)' : stats.roi < 0 ? 'var(--red)' : 'var(--muted)'}
          />
        </div>
      )}

      {/* Filters */}
      {records.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {(
            [
              { key: 'all',     label: `Todas (${records.length})` },
              { key: 'open',    label: `Abiertas (${stats.open})` },
              { key: 'closed',  label: `Cerradas (${stats.closed})` },
              { key: 'partial', label: 'Parciales' },
            ] as const
          ).map(({ key, label }) => {
            const active = filter === key;
            const colorMap: Record<string, string> = { all: 'var(--cyan)', open: 'var(--cyan)', closed: 'var(--muted)', partial: 'var(--gold)' };
            const c = colorMap[key];
            return (
              <button key={key} onClick={() => setFilter(key)}
                style={{ padding: '0.38rem 0.85rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 600 : 400, background: active ? `${c}18` : 'transparent', border: `1px solid ${active ? c : 'var(--border)'}`, color: active ? c : 'var(--text2)', transition: 'all 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>Cargando operaciones...</div>

      ) : fetchErr ? (
        <div style={{ padding: '1rem', background: 'rgba(240,68,88,0.1)', borderRadius: 12, color: 'var(--red)', fontSize: '0.875rem' }}>{fetchErr}</div>

      ) : records.length === 0 ? (
        <div className="glass" style={{ borderRadius: 20, padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>📈</div>
          <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700 }}>
            Sin operaciones todavía
          </h3>
          <p style={{ color: 'var(--text2)', margin: '0 0 1.75rem', maxWidth: 420, marginInline: 'auto', lineHeight: 1.6 }}>
            Empieza registrando tu primera operación para llevar el control de tu cartera y calcular tu rentabilidad real.
          </p>
          <button className="btn btn-gold" onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <PlusIcon /> Añadir primera operación
          </button>
        </div>

      ) : filtered.length === 0 ? (
        <div className="glass" style={{ borderRadius: 14, padding: '2.5rem', textAlign: 'center', color: 'var(--text2)' }}>
          No hay operaciones con el filtro seleccionado
        </div>

      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Fecha', 'Activo', 'Tipo', 'Dir.', 'Cantidad', 'Entrada', 'Salida', 'Estado', 'P&L', ''].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(rec => {
                const pl        = getPL(rec);
                const cfg       = STATUS_CFG[rec.status];
                const isDelConf = deletingId === rec.id;
                return (
                  <tr
                    key={rec.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--card)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Date */}
                    <td style={{ padding: '0.8rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {fmtDate(rec.date_opened)}
                    </td>

                    {/* Asset */}
                    <td style={{ padding: '0.8rem 0.75rem', minWidth: 130 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{rec.asset_name}</div>
                      {rec.ticker && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{rec.ticker}</div>}
                    </td>

                    {/* Type */}
                    <td style={{ padding: '0.8rem 0.75rem', color: 'var(--text2)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {rec.asset_type}
                    </td>

                    {/* Direction */}
                    <td style={{ padding: '0.8rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: rec.direction === 'long' ? 'var(--green)' : 'var(--red)' }}>
                        {rec.direction === 'long' ? '↑ Long' : '↓ Short'}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td style={{ padding: '0.8rem 0.75rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {Number(rec.quantity).toLocaleString('es-ES', { maximumFractionDigits: 6 })}
                    </td>

                    {/* Entry */}
                    <td style={{ padding: '0.8rem 0.75rem', fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {sym}{Number(rec.entry_price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>

                    {/* Exit */}
                    <td style={{ padding: '0.8rem 0.75rem', fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {rec.exit_price
                        ? `${sym}${Number(rec.exit_price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                        : <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 400 }}>—</span>}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.8rem 0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
                        {cfg.label}
                      </span>
                    </td>

                    {/* P&L */}
                    <td style={{ padding: '0.8rem 0.75rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap', color: pl === null ? 'var(--muted)' : pl > 0 ? 'var(--green)' : pl < 0 ? 'var(--red)' : 'var(--muted)' }}>
                      {pl === null
                        ? <span style={{ fontWeight: 400, fontSize: '0.72rem', color: 'var(--muted)' }}>Abierta</span>
                        : pl === 0 ? '—'
                        : fmtMoney(pl, sym)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.8rem 0.75rem' }}>
                      {isDelConf ? (
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button onClick={() => deleteRecord(rec.id)} style={{ padding: '0.22rem 0.6rem', borderRadius: 8, border: '1px solid var(--red)', background: 'rgba(240,68,88,0.1)', color: 'var(--red)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Sí, borrar</button>
                          <button onClick={() => setDeletingId(null)} style={{ padding: '0.22rem 0.5rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.72rem' }}>No</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button onClick={() => openEdit(rec)} style={{ padding: '0.3rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'var(--cyan)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            title="Editar"><EditIcon /></button>
                          <button onClick={() => setDeletingId(rec.id)} style={{ padding: '0.3rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            title="Eliminar"><TrashIcon /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <InvestmentFormModal
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={saveRecord}
        />
      )}
    </div>
  );
}
