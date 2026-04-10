import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../context/CurrencyContext';

// ── TYPES ─────────────────────────────────────────────────────────────────
interface BetRecord {
  id: string;
  user_id: string;
  created_at: string;
  match_name: string;
  competition?: string;
  bet_type: string;
  selection: string;
  bookmaker: string;
  odds: number;
  stake: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  notes?: string;
}

type BetStatus = BetRecord['status'];
type FormData = Omit<BetRecord, 'id' | 'user_id' | 'created_at'>;

// ── CONSTANTS ─────────────────────────────────────────────────────────────
const BET_TYPES = [
  '1X2', 'Over/Under 2.5', 'BTTS', 'Hándicap', 'Doble oportunidad',
  'Ambas marcan', 'Ganador partido', 'Otra',
];
const BOOKMAKERS = [
  'Bet365', 'Bwin', 'Betway', 'Unibet', 'Codere', 'Betfair',
  'Betsson', 'William Hill', 'Interwetten', 'Sportingbet', 'Otra',
];
const STATUS_CFG: Record<BetStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'var(--gold)',  bg: 'rgba(201,168,76,0.12)'  },
  won:     { label: 'Ganada',    color: 'var(--green)', bg: 'rgba(0,200,122,0.12)'   },
  lost:    { label: 'Perdida',   color: 'var(--red)',   bg: 'rgba(240,68,88,0.12)'   },
  void:    { label: 'Anulada',   color: 'var(--muted)', bg: 'rgba(90,97,128,0.12)'   },
};
const EMPTY_FORM: FormData = {
  match_name: '', competition: '', bet_type: '1X2', selection: '',
  bookmaker: 'Bet365', odds: 2.00, stake: 10.00, status: 'pending', notes: '',
};

// ── HELPERS ───────────────────────────────────────────────────────────────
function getPL(bet: BetRecord): number | null {
  if (bet.status === 'won')  return +(bet.stake * bet.odds - bet.stake).toFixed(2);
  if (bet.status === 'lost') return -bet.stake;
  if (bet.status === 'void') return 0;
  return null;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtMoney(val: number, sym: string) {
  const sign = val > 0 ? '+' : '';
  return `${sign}${sym}${Math.abs(val).toFixed(2)}`;
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
    <path d="M10 11v6m4-6v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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
const TargetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
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
const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
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

// ── BET FORM MODAL ────────────────────────────────────────────────────────
function BetFormModal({ editing, onClose, onSave }: {
  editing:  BetRecord | null;
  onClose:  () => void;
  onSave:   (data: FormData) => Promise<void>;
}) {
  const [form, setForm] = useState<FormData>(
    editing
      ? {
          match_name:  editing.match_name,
          competition: editing.competition  ?? '',
          bet_type:    editing.bet_type,
          selection:   editing.selection,
          bookmaker:   editing.bookmaker,
          odds:        editing.odds,
          stake:       editing.stake,
          status:      editing.status,
          notes:       editing.notes ?? '',
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState<string | null>(null);

  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.match_name.trim()) { setErr('Introduce el nombre del partido'); return; }
    if (!form.selection.trim())  { setErr('Introduce la selección');          return; }
    if (form.odds  <= 1)         { setErr('La cuota debe ser mayor que 1');   return; }
    if (form.stake <= 0)         { setErr('El stake debe ser mayor que 0');   return; }
    setSaving(true); setErr(null);
    try { await onSave(form); }
    catch { setErr('Error al guardar. Inténtalo de nuevo.'); }
    finally { setSaving(false); }
  };

  const potentialReturn = form.odds > 1 && form.stake > 0
    ? (form.stake * form.odds - form.stake).toFixed(2)
    : null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(4,6,15,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        className="glass-2"
        style={{ width: '100%', maxWidth: 560, borderRadius: 20, overflow: 'hidden', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Modal header */}
        <div style={{ padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {editing ? 'Editar apuesta' : 'Añadir apuesta'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <CloseIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* Partido — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Partido *</label>
              <input
                value={form.match_name}
                onChange={e => set('match_name', e.target.value)}
                placeholder="Ej: Real Madrid vs Barcelona"
                style={inputStyle}
              />
            </div>

            {/* Competición */}
            <div>
              <label style={labelStyle}>Competición</label>
              <input
                value={form.competition ?? ''}
                onChange={e => set('competition', e.target.value)}
                placeholder="Ej: La Liga"
                style={inputStyle}
              />
            </div>

            {/* Tipo de apuesta */}
            <div>
              <label style={labelStyle}>Tipo de apuesta *</label>
              <select value={form.bet_type} onChange={e => set('bet_type', e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                {BET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Selección — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Selección *</label>
              <input
                value={form.selection}
                onChange={e => set('selection', e.target.value)}
                placeholder="Ej: Real Madrid gana, Over 2.5 goles..."
                style={inputStyle}
              />
            </div>

            {/* Casa de apuestas */}
            <div>
              <label style={labelStyle}>Casa de apuestas</label>
              <select value={form.bookmaker} onChange={e => set('bookmaker', e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                {BOOKMAKERS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value as BetStatus)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                <option value="pending">Pendiente</option>
                <option value="won">Ganada ✓</option>
                <option value="lost">Perdida ✗</option>
                <option value="void">Anulada</option>
              </select>
            </div>

            {/* Cuota */}
            <div>
              <label style={labelStyle}>Cuota *</label>
              <input
                type="number" step="0.01" min="1.01"
                value={form.odds}
                onChange={e => set('odds', parseFloat(e.target.value) || 1.01)}
                style={inputStyle}
              />
            </div>

            {/* Stake */}
            <div>
              <label style={labelStyle}>Stake (€) *</label>
              <input
                type="number" step="0.5" min="0.01"
                value={form.stake}
                onChange={e => set('stake', parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>

            {/* Notas — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notas</label>
              <textarea
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="Razonamiento, análisis, cualquier información adicional..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Error */}
          {err && (
            <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(240,68,88,0.1)', border: '1px solid rgba(240,68,88,0.25)', borderRadius: 10, color: 'var(--red)', fontSize: '0.83rem' }}>
              {err}
            </div>
          )}

          {/* Profit preview */}
          {potentialReturn && (
            <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(0,200,122,0.06)', border: '1px solid rgba(0,200,122,0.18)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text2)' }}>
              <span>Retorno potencial (beneficio)</span>
              <span style={{ color: 'var(--green)', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                +€{potentialReturn}
              </span>
            </div>
          )}

          <button
            type="submit" disabled={saving}
            className="btn btn-gold"
            style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', minHeight: 46, fontSize: '0.9rem' }}
          >
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Añadir apuesta'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon:   React.ReactNode;
  label:  string;
  value:  string;
  sub?:   string;
  color?: string;
}) {
  return (
    <div className="glass" style={{ borderRadius: 14, padding: '1rem 1.2rem', display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0, marginTop: 2,
        background: color ? `${color}18` : 'var(--card3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color ?? 'var(--muted)',
      }}>
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
export function BettingJournalPage() {
  const { user }     = useAuth();
  const { currency } = useCurrency();
  const sym          = currency === 'USD' ? '$' : '€';

  const [bets,       setBets]       = useState<BetRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState<string | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [editingBet, setEditingBet] = useState<BetRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<'all' | BetStatus>('all');

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bet_records')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) setFetchErr(error.message);
      else setBets(data as BetRecord[]);
      setLoading(false);
    })();
  }, [user]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const won      = bets.filter(b => b.status === 'won');
    const lost     = bets.filter(b => b.status === 'lost');
    const resolved = [...won, ...lost];
    const invested = resolved.reduce((s, b) => s + b.stake, 0);
    const returns  = won.reduce((s, b) => s + b.stake * b.odds, 0);
    const balance  = returns - invested;
    const roi      = invested > 0 ? (balance / invested) * 100 : 0;
    const winRate  = resolved.length > 0 ? (won.length / resolved.length) * 100 : 0;
    return {
      total:    bets.length,
      won:      won.length,
      lost:     lost.length,
      pending:  bets.filter(b => b.status === 'pending').length,
      invested, returns, balance, roi, winRate,
    };
  }, [bets]);

  const filtered = filter === 'all' ? bets : bets.filter(b => b.status === filter);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const saveBet = async (data: FormData) => {
    if (editingBet) {
      const { data: updated, error } = await supabase
        .from('bet_records').update(data).eq('id', editingBet.id).select().single();
      if (error) throw error;
      setBets(bs => bs.map(b => b.id === editingBet.id ? (updated as BetRecord) : b));
    } else {
      const { data: created, error } = await supabase
        .from('bet_records').insert({ ...data, user_id: user!.id }).select().single();
      if (error) throw error;
      setBets(bs => [created as BetRecord, ...bs]);
    }
    setShowForm(false);
    setEditingBet(null);
  };

  const deleteBet = async (id: string) => {
    const { error } = await supabase.from('bet_records').delete().eq('id', id);
    if (!error) {
      setBets(bs => bs.filter(b => b.id !== id));
      setDeletingId(null);
    }
  };

  const openAdd  = () => { setEditingBet(null); setShowForm(true); };
  const openEdit = (bet: BetRecord) => { setEditingBet(bet); setShowForm(true); };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 3rem) 1rem' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
            Mi Registro de Apuestas
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text2)', fontSize: '0.9rem' }}>
            Anota tus apuestas, controla resultados y analiza tu rentabilidad
          </p>
        </div>
        <button
          className="btn btn-gold"
          onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
        >
          <PlusIcon /> Añadir apuesta
        </button>
      </div>

      {/* ── Stats ── */}
      {bets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '0.7rem', marginBottom: '1.75rem' }}>
          <StatCard
            icon={<ListIcon />}
            label="Apuestas"
            value={String(stats.total)}
            sub={`${stats.won} G · ${stats.lost} P · ${stats.pending} pend.`}
            color="var(--cyan)"
          />
          <StatCard
            icon={<TargetIcon />}
            label="Acierto"
            value={stats.won + stats.lost > 0 ? `${stats.winRate.toFixed(1)}%` : '—'}
            sub={`${stats.won} de ${stats.won + stats.lost} resueltas`}
            color={stats.winRate >= 55 ? 'var(--green)' : stats.winRate > 0 ? 'var(--red)' : 'var(--muted)'}
          />
          <StatCard
            icon={<CoinsIcon />}
            label="Total apostado"
            value={`${sym}${stats.invested.toFixed(2)}`}
            sub={`Retorno: ${sym}${stats.returns.toFixed(2)}`}
            color="var(--gold)"
          />
          <StatCard
            icon={stats.balance >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
            label="Balance"
            value={`${stats.balance >= 0 ? '+' : ''}${sym}${stats.balance.toFixed(2)}`}
            sub={stats.balance > 0 ? 'En positivo' : stats.balance < 0 ? 'En negativo' : 'Neutro'}
            color={stats.balance > 0 ? 'var(--green)' : stats.balance < 0 ? 'var(--red)' : 'var(--muted)'}
          />
          <StatCard
            icon={<PercentIcon />}
            label="ROI"
            value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}
            sub={stats.roi > 10 ? 'Excelente' : stats.roi > 0 ? 'Rentable' : stats.roi < 0 ? 'En pérdidas' : 'Neutro'}
            color={stats.roi > 0 ? 'var(--green)' : stats.roi < 0 ? 'var(--red)' : 'var(--muted)'}
          />
        </div>
      )}

      {/* ── Filters ── */}
      {bets.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {(
            [
              { key: 'all',     label: `Todas (${bets.length})` },
              { key: 'pending', label: `Pendientes (${stats.pending})` },
              { key: 'won',     label: `Ganadas (${stats.won})` },
              { key: 'lost',    label: `Perdidas (${stats.lost})` },
              { key: 'void',    label: 'Anuladas' },
            ] as const
          ).map(({ key, label }) => {
            const active   = filter === key;
            const colorMap: Record<string, string> = {
              all: 'var(--cyan)', pending: 'var(--gold)', won: 'var(--green)', lost: 'var(--red)', void: 'var(--muted)',
            };
            const c = colorMap[key];
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '0.38rem 0.85rem', borderRadius: 20, cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: active ? 600 : 400,
                  background: active ? `${c}18` : 'transparent',
                  border: `1px solid ${active ? c : 'var(--border)'}`,
                  color: active ? c : 'var(--text2)',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
          Cargando apuestas...
        </div>

      ) : fetchErr ? (
        <div style={{ padding: '1rem', background: 'rgba(240,68,88,0.1)', borderRadius: 12, color: 'var(--red)', fontSize: '0.875rem' }}>
          {fetchErr}
        </div>

      ) : bets.length === 0 ? (
        /* ── Empty state ── */
        <div className="glass" style={{ borderRadius: 20, padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>📋</div>
          <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700 }}>
            Sin apuestas todavía
          </h3>
          <p style={{ color: 'var(--text2)', margin: '0 0 1.75rem', maxWidth: 400, marginInline: 'auto', lineHeight: 1.6 }}>
            Empieza añadiendo tu primera apuesta para llevar el control de tus resultados y ver si eres rentable a largo plazo.
          </p>
          <button className="btn btn-gold" onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <PlusIcon /> Añadir primera apuesta
          </button>
        </div>

      ) : filtered.length === 0 ? (
        <div className="glass" style={{ borderRadius: 14, padding: '2.5rem', textAlign: 'center', color: 'var(--text2)' }}>
          No hay apuestas con el filtro seleccionado
        </div>

      ) : (
        /* ── Table ── */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Fecha', 'Partido', 'Apuesta', 'Casa', 'Cuota', 'Stake', 'Estado', 'P&L', ''].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(bet => {
                const pl        = getPL(bet);
                const cfg       = STATUS_CFG[bet.status];
                const isDelConf = deletingId === bet.id;
                return (
                  <tr
                    key={bet.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--card)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Date */}
                    <td style={{ padding: '0.8rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {fmtDate(bet.created_at)}
                    </td>

                    {/* Match */}
                    <td style={{ padding: '0.8rem 0.75rem', minWidth: 140 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{bet.match_name}</div>
                      {bet.competition && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{bet.competition}</div>
                      )}
                    </td>

                    {/* Bet type + selection */}
                    <td style={{ padding: '0.8rem 0.75rem', minWidth: 130 }}>
                      <div style={{ color: 'var(--text2)' }}>{bet.bet_type}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{bet.selection}</div>
                    </td>

                    {/* Bookmaker */}
                    <td style={{ padding: '0.8rem 0.75rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {bet.bookmaker}
                    </td>

                    {/* Odds */}
                    <td style={{ padding: '0.8rem 0.75rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text)' }}>
                      {Number(bet.odds).toFixed(2)}
                    </td>

                    {/* Stake */}
                    <td style={{ padding: '0.8rem 0.75rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {sym}{Number(bet.stake).toFixed(2)}
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: '0.8rem 0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
                        {cfg.label}
                      </span>
                    </td>

                    {/* P&L */}
                    <td style={{
                      padding: '0.8rem 0.75rem',
                      fontWeight: 700, fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap',
                      color: pl === null ? 'var(--muted)' : pl > 0 ? 'var(--green)' : pl < 0 ? 'var(--red)' : 'var(--muted)',
                    }}>
                      {pl === null
                        ? <span style={{ fontWeight: 400, fontSize: '0.72rem', color: 'var(--muted)' }}>—</span>
                        : pl === 0 ? '—'
                        : fmtMoney(pl, sym)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.8rem 0.75rem' }}>
                      {isDelConf ? (
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button
                            onClick={() => deleteBet(bet.id)}
                            style={{ padding: '0.22rem 0.6rem', borderRadius: 8, border: '1px solid var(--red)', background: 'rgba(240,68,88,0.1)', color: 'var(--red)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                          >
                            Sí, borrar
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            style={{ padding: '0.22rem 0.5rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.72rem' }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => openEdit(bet)}
                            style={{ padding: '0.3rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'var(--cyan)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            title="Editar"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => setDeletingId(bet.id)}
                            style={{ padding: '0.3rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            title="Eliminar"
                          >
                            <TrashIcon />
                          </button>
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

      {/* ── Modal ── */}
      {showForm && (
        <BetFormModal
          editing={editingBet}
          onClose={() => { setShowForm(false); setEditingBet(null); }}
          onSave={saveBet}
        />
      )}
    </div>
  );
}
