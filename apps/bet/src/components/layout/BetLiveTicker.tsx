/**
 * BetLiveTicker v2 — JS-driven scroll engine
 *
 * - Auto-scrolls via requestAnimationFrame (adapts speed to content width)
 * - Touch-drag: pause auto-scroll, let user swipe to any match, resume on release
 * - Faster on mobile (15s per loop vs 22s desktop)
 * - Click on a match → navigate to its analysis page
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllLiveMatches } from '../../services/sportsService';
import { SPORT_CONFIG } from '../../constants';
import type { Match } from '../../types';

const TICKER_COPIES = 4;

function buildTickerHTML(matches: Match[]): string {
  if (matches.length === 0) return '';
  const item = (m: Match, isReal: boolean) => {
    const sport     = SPORT_CONFIG[m.sport as keyof typeof SPORT_CONFIG];
    const homeScore = m.homeScore ?? 0;
    const awayScore = m.awayScore ?? 0;
    const clock     = m.clockDisplay ?? (m.minute ? `${m.minute}'` : 'LIVE');
    return `<span
      ${isReal ? `data-mid="${m.id}"` : 'aria-hidden="true"'}
      style="display:inline-flex;align-items:center;gap:0.5rem;padding:0 1.8rem;border-right:1px solid rgba(255,255,255,0.06);flex-shrink:0;cursor:pointer;"
    >
      <span style="font-size:0.7rem">${sport?.emoji ?? '🏟️'}</span>
      <span style="font-family:'Outfit',sans-serif;font-weight:600;font-size:0.75rem;color:var(--text2)">${m.homeTeam.shortName ?? m.homeTeam.name.slice(0,3).toUpperCase()}</span>
      <span class="bet-tk-score" style="font-family:'Outfit',sans-serif;font-weight:800;font-size:0.82rem;color:var(--red)">${homeScore} - ${awayScore}</span>
      <span style="font-family:'Outfit',sans-serif;font-weight:600;font-size:0.75rem;color:var(--text2)">${m.awayTeam.shortName ?? m.awayTeam.name.slice(0,3).toUpperCase()}</span>
      <span class="bet-tk-clock" style="font-size:0.62rem;color:rgba(255,68,85,0.8);background:rgba(255,68,85,0.1);padding:0.1rem 0.4rem;border-radius:4px;border:1px solid rgba(255,68,85,0.2)">${clock}</span>
    </span>`;
  };
  // First copy is real (has data-mid for click navigation), rest are clones for seamless looping
  return Array.from({ length: TICKER_COPIES }, (_, ci) =>
    matches.map(m => item(m, ci === 0)).join('')
  ).join('');
}

function buildEmptyHTML(): string {
  return `<span style="display:inline-flex;align-items:center;gap:0.6rem;padding:0 2rem;font-size:0.72rem;color:var(--muted);flex-shrink:0">
    Sin partidos en directo ahora mismo
  </span>`.repeat(4);
}

export function BetLiveTicker() {
  const trackRef    = useRef<HTMLDivElement>(null);
  const matchesRef  = useRef<Match[]>([]);
  const navigate    = useNavigate();

  // Scroll engine state (all in refs — no re-renders)
  const xRef             = useRef(0);
  const halfWRef         = useRef(0);
  const rafRef           = useRef(0);
  const deadRef          = useRef(false);
  const isDragging       = useRef(false);
  const dragStartX       = useRef(0);
  const dragStartTrackX  = useRef(0);

  function startEngine(track: HTMLElement) {
    cancelAnimationFrame(rafRef.current);

    // Measure one loop segment width AFTER layout
    const hw = track.scrollWidth / TICKER_COPIES;
    halfWRef.current = hw;
    if (hw <= 0) return;

    // Speed: traverse one loop segment in N seconds; faster on mobile
    const isMob  = window.innerWidth <= 768;
    const secs   = isMob ? 15 : 22;
    const speed  = hw / secs; // px / second

    let prev = performance.now();

    const tick = (now: number) => {
      if (deadRef.current) return;
      const dt = (now - prev) / 1000;
      prev = now;

      if (!isDragging.current) {
        xRef.current -= speed * dt;
        if (xRef.current <= -hw) xRef.current += hw;
      }

      track.style.transform = `translateX(${xRef.current}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  const refresh = async () => {
    const live  = await fetchAllLiveMatches();
    matchesRef.current = live;
    const track = trackRef.current;
    if (!track) return;

    // Reset position on content update
    xRef.current = 0;
    track.style.transform = 'translateX(0)';
    track.innerHTML = live.length > 0 ? buildTickerHTML(live) : buildEmptyHTML();

    // Start engine after browser has laid out the new content
    requestAnimationFrame(() => startEngine(track));
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    deadRef.current = false;
    track.innerHTML = buildEmptyHTML();
    requestAnimationFrame(() => startEngine(track));

    refresh();
    const pollId = setInterval(refresh, 20_000);

    // ── Click to navigate ────────────────────────────────────────
    const onClick = (e: MouseEvent) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('[data-mid]');
      if (!item) return;
      const mid = item.dataset.mid;
      const m   = matchesRef.current.find(x => String(x.id) === mid);
      if (m) navigate(`/matches/${m.id}`, { state: { match: m } });
    };
    track.addEventListener('click', onClick);

    // ── Touch drag ───────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      isDragging.current    = true;
      dragStartX.current    = e.touches[0].clientX;
      dragStartTrackX.current = xRef.current;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const delta = e.touches[0].clientX - dragStartX.current;
      let newX    = dragStartTrackX.current + delta;
      const hw    = halfWRef.current;
      if (hw > 0) {
        if (newX > 0)    newX -= hw;
        if (newX < -hw)  newX += hw;
      }
      xRef.current = newX;
      track.style.transform = `translateX(${newX}px)`;
    };

    const onTouchEnd = () => { isDragging.current = false; };

    track.addEventListener('touchstart',  onTouchStart, { passive: true });
    track.addEventListener('touchmove',   onTouchMove,  { passive: true });
    track.addEventListener('touchend',    onTouchEnd,   { passive: true });
    track.addEventListener('touchcancel', onTouchEnd,   { passive: true });

    return () => {
      deadRef.current = true;
      cancelAnimationFrame(rafRef.current);
      clearInterval(pollId);
      track.removeEventListener('click', onClick);
      track.removeEventListener('touchstart',  onTouchStart);
      track.removeEventListener('touchmove',   onTouchMove);
      track.removeEventListener('touchend',    onTouchEnd);
      track.removeEventListener('touchcancel', onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bet-live-ticker-bar" style={{
      position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0,
      height: 'var(--topbar-h, 36px)',
      background: '#060810',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      zIndex: 40,
      display: 'flex', alignItems: 'center', overflow: 'hidden',
    }}>
      {/* LIVE badge */}
      <div style={{
        padding: '0 1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
        borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, height: '100%',
        background: 'rgba(255,68,85,0.06)',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 6px var(--red)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.52rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>EN DIRECTO</span>
      </div>

      {/* Track — JS-driven, touch-draggable */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: 'grab', userSelect: 'none' }}>
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            willChange: 'transform',
          }}
        />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .bet-live-ticker-bar { top: 52px !important; }
        }
      `}</style>
    </div>
  );
}
