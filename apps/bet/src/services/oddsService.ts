/**
 * oddsService — Cuotas por casa de apuestas
 *
 * Cuotas reales via The Odds API (theoddsapi.com).
 * Requiere VITE_ODDS_API_KEY en las variables de entorno.
 *
 * Cuando no hay API key o el partido no aparece en el feed,
 * las cuotas se derivan del modelo de IA con calibración por casa.
 */

const ODDS_API_KEY  = (import.meta as any).env?.VITE_ODDS_API_KEY ?? '';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// ── Casas configuradas ─────────────────────────────────────────────────────
export interface Bookmaker {
  id:          string;
  name:        string;
  shortName:   string;
  logo:        string;
  color:       string;
  registerUrl: string;
  loginUrl:    string;
  /** Factor de pago típico — mayor = mejores cuotas para el usuario */
  payoutRate:  number;
  /** ID del bookmaker en The Odds API (null = no disponible) */
  oddsApiKey:  string | null;
}

export const BOOKMAKERS: Bookmaker[] = [
  {
    id: 'bet365', name: 'Bet365', shortName: 'B365',
    logo: 'https://www.google.com/s2/favicons?domain=bet365.es&sz=32',
    color: '#00a651',
    registerUrl: 'https://www.bet365.es/#/AC/B1/C1/D1002/E3/N/',
    loginUrl:    'https://www.bet365.es/',
    payoutRate:  0.940,
    oddsApiKey:  'bet365',
  },
  {
    id: 'williamhill', name: 'William Hill', shortName: 'WH',
    logo: 'https://www.google.com/s2/favicons?domain=williamhill.es&sz=32',
    color: '#8b8b8b',
    registerUrl: 'https://sports.williamhill.es/registration',
    loginUrl:    'https://sports.williamhill.es/',
    payoutRate:  0.925,
    oddsApiKey:  'williamhill',
  },
  {
    id: 'betfair', name: 'Betfair', shortName: 'BF',
    logo: 'https://www.google.com/s2/favicons?domain=betfair.com&sz=32',
    color: '#f5a623',
    registerUrl: 'https://register.betfair.es/',
    loginUrl:    'https://www.betfair.es/',
    payoutRate:  0.975,
    oddsApiKey:  'betfair_ex_eu',
  },
  {
    id: 'unibet', name: 'Unibet', shortName: 'UNI',
    logo: 'https://www.google.com/s2/favicons?domain=unibet.es&sz=32',
    color: '#007d3c',
    registerUrl: 'https://www.unibet.es/registro',
    loginUrl:    'https://www.unibet.es/',
    payoutRate:  0.930,
    oddsApiKey:  'unibet_eu',
  },
  {
    id: 'bwin', name: 'Bwin', shortName: 'BW',
    logo: 'https://www.google.com/s2/favicons?domain=bwin.es&sz=32',
    color: '#ff6600',
    registerUrl: 'https://sports.bwin.es/es/sports/registration',
    loginUrl:    'https://sports.bwin.es/',
    payoutRate:  0.920,
    oddsApiKey:  'bwin',
  },
  {
    id: 'codere', name: 'Codere', shortName: 'CDR',
    logo: 'https://www.google.com/s2/favicons?domain=codere.com&sz=32',
    color: '#e30613',
    registerUrl: 'https://www.codere.es/registro',
    loginUrl:    'https://www.codere.es/',
    payoutRate:  0.905,
    oddsApiKey:  null, // No disponible en Odds API → calibrado desde mercado real
  },
];

// ── Mapping ESPN competition ID → Odds API sport key ──────────────────────
const SPORT_KEYS: Record<number, string> = {
  2:   'soccer_uefa_champs_league',
  3:   'soccer_uefa_europa_league',
  4:   'soccer_uefa_europa_conference_league',
  39:  'soccer_england_premier_league',
  40:  'soccer_england_championship',
  61:  'soccer_france_ligue_one',
  62:  'soccer_france_ligue_two',
  78:  'soccer_germany_bundesliga',
  79:  'soccer_germany_bundesliga2',
  94:  'soccer_portugal_primeira_liga',
  128: 'soccer_argentina_primera_division',
  135: 'soccer_italy_serie_a',
  136: 'soccer_italy_serie_b',
  140: 'soccer_spain_la_liga',
  141: 'soccer_spain_segunda_division',
  262: 'soccer_mexico_ligamx',
  848: 'soccer_uefa_nations_league',
};
const NBA_KEY    = 'basketball_nba';
const TENNIS_KEY = 'tennis_atp_french_open'; // placeholder — tennis odds rarely available

// ── Deterministic pseudo-random seeded on string ──────────────────────────
function seededRand(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

// ── Derive odds per bookmaker from base probability ────────────────────────
export function deriveBookmakerOdds(
  baseProb:  number,
  matchSeed: string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const bk of BOOKMAKERS) {
    const variation  = seededRand(bk.id + matchSeed) * 0.06 - 0.03;
    const impliedProb = Math.min(0.95, Math.max(0.05, (baseProb / 100) * (1 + variation)));
    result[bk.id] = Math.max(1.01, parseFloat((1 / impliedProb * bk.payoutRate).toFixed(2)));
  }
  return result;
}

/**
 * Calibra las cuotas de casas sin API a partir de los precios reales del mercado.
 * Más preciso que derivar desde probabilidades del modelo IA.
 */
function calibrateFromRealMarket(
  realPerBookmaker: Record<string, number>,
  matchId: string,
  key: string,
): Record<string, number> {
  const result = { ...realPerBookmaker };

  if (Object.keys(realPerBookmaker).length === 0) return result;

  // Probabilidad implícita promedio de las cuotas reales
  const realOdds     = Object.values(realPerBookmaker);
  const avgImpliedProb = realOdds.reduce((s, o) => s + 1 / o, 0) / realOdds.length;

  for (const bk of BOOKMAKERS) {
    if (bk.oddsApiKey !== null || result[bk.id]) continue; // ya tiene dato real
    // Variación ±1.5% respecto al mercado real
    const variation   = seededRand(bk.id + matchId + key) * 0.03 - 0.015;
    const impliedProb = Math.min(0.95, Math.max(0.05, avgImpliedProb * (1 + variation)));
    result[bk.id] = Math.max(1.01, parseFloat((1 / impliedProb * bk.payoutRate).toFixed(2)));
  }

  return result;
}

export function bestOdds(perBookmaker: Record<string, number>): number {
  return Math.max(...Object.values(perBookmaker));
}

export function bestBookmaker(perBookmaker: Record<string, number>): string {
  return Object.entries(perBookmaker).reduce((a, b) => b[1] > a[1] ? b : a)[0];
}

// ── Tipos ─────────────────────────────────────────────────────────────────
export interface MarketBookmakerOdds {
  perBookmaker:    Record<string, number>;
  best:            number;
  bestBookmakerId: string;
  /** true = al menos parte de las cuotas son de The Odds API en tiempo real */
  isRealtime:      boolean;
}

export interface MatchBookmakerOdds {
  result: {
    home: MarketBookmakerOdds;
    draw: MarketBookmakerOdds;
    away: MarketBookmakerOdds;
  };
  over25:   MarketBookmakerOdds;
  under25:  MarketBookmakerOdds;
  bttsYes:  MarketBookmakerOdds;
  bttsNo:   MarketBookmakerOdds;
  handicap: MarketBookmakerOdds;
}

// ── Odds API response types ────────────────────────────────────────────────
interface OddsApiOutcome { name: string; price: number; point?: number }
interface OddsApiBookmaker {
  key:     string;
  markets: Array<{ key: string; outcomes: OddsApiOutcome[] }>;
}
interface OddsApiEvent {
  id:         string;
  home_team:  string;
  away_team:  string;
  bookmakers: OddsApiBookmaker[];
}

function normTeamName(s: string): string {
  return s.toLowerCase()
    .replace(/\b(fc|cf|sc|ac|bc|cd|rc|sd|ud|rcd|afc|utd|united|city|club|athletic|atlético|atletico|deportivo|sporting|calcio|football|cf)\b/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length > 3 && b.length > 3) return a.includes(b) || b.includes(a);
  return false;
}

// ── Parse Odds API event → MatchBookmakerOdds (partial) ───────────────────
function parseOddsApiEvent(
  event:   OddsApiEvent,
  matchId: string,
): Partial<MatchBookmakerOdds> {
  // Build lookup: oddsApiKey → OddsApiBookmaker
  const bkMap: Record<string, OddsApiBookmaker> = {};
  for (const bk of event.bookmakers) bkMap[bk.key] = bk;

  function getOutcome(apiKey: string, marketKey: string, outcomeName: string): number | null {
    const bk = bkMap[apiKey];
    if (!bk) return null;
    const market = bk.markets.find(m => m.key === marketKey);
    if (!market) return null;
    const out = market.outcomes.find(o => {
      const n = normTeamName(o.name);
      return n === normTeamName(outcomeName) || n.includes(normTeamName(outcomeName)) || normTeamName(outcomeName).includes(n);
    });
    return out?.price ?? null;
  }

  const homeTeam = event.home_team;
  const awayTeam = event.away_team;
  const result: Partial<MatchBookmakerOdds> = {};

  // ── 1X2 ─────────────────────────────────────────────────────────────────
  const homeOdds: Record<string, number> = {};
  const drawOdds: Record<string, number> = {};
  const awayOdds: Record<string, number> = {};

  for (const bk of BOOKMAKERS) {
    if (!bk.oddsApiKey) continue;
    const h = getOutcome(bk.oddsApiKey, 'h2h', homeTeam);
    const d = getOutcome(bk.oddsApiKey, 'h2h', 'Draw');
    const a = getOutcome(bk.oddsApiKey, 'h2h', awayTeam);
    if (h) homeOdds[bk.id] = h;
    if (d) drawOdds[bk.id] = d;
    if (a) awayOdds[bk.id] = a;
  }

  if (Object.keys(homeOdds).length > 0) {
    // Calibrar casas sin API (Codere) a partir del mercado real
    const allHome = calibrateFromRealMarket(homeOdds, matchId, 'home');
    const allDraw = calibrateFromRealMarket(drawOdds, matchId, 'draw');
    const allAway = calibrateFromRealMarket(awayOdds, matchId, 'away');
    result.result = {
      home: { perBookmaker: allHome, best: bestOdds(allHome), bestBookmakerId: bestBookmaker(allHome), isRealtime: true },
      draw: { perBookmaker: allDraw, best: bestOdds(allDraw), bestBookmakerId: bestBookmaker(allDraw), isRealtime: true },
      away: { perBookmaker: allAway, best: bestOdds(allAway), bestBookmakerId: bestBookmaker(allAway), isRealtime: true },
    };
  }

  // ── Over/Under 2.5 ──────────────────────────────────────────────────────
  const over25:  Record<string, number> = {};
  const under25: Record<string, number> = {};

  for (const bk of BOOKMAKERS) {
    if (!bk.oddsApiKey) continue;
    const ov = getOutcome(bk.oddsApiKey, 'totals', 'Over');
    const un = getOutcome(bk.oddsApiKey, 'totals', 'Under');
    if (ov) over25[bk.id]  = ov;
    if (un) under25[bk.id] = un;
  }

  if (Object.keys(over25).length > 0) {
    const allOver  = calibrateFromRealMarket(over25,  matchId, 'over25');
    const allUnder = calibrateFromRealMarket(under25, matchId, 'under25');
    result.over25  = { perBookmaker: allOver,  best: bestOdds(allOver),  bestBookmakerId: bestBookmaker(allOver),  isRealtime: true };
    result.under25 = { perBookmaker: allUnder, best: bestOdds(allUnder), bestBookmakerId: bestBookmaker(allUnder), isRealtime: true };
  }

  // ── BTTS ────────────────────────────────────────────────────────────────
  const bttsYes: Record<string, number> = {};
  const bttsNo:  Record<string, number> = {};

  for (const bk of BOOKMAKERS) {
    if (!bk.oddsApiKey) continue;
    const yes = getOutcome(bk.oddsApiKey, 'btts', 'Yes');
    const no  = getOutcome(bk.oddsApiKey, 'btts', 'No');
    if (yes) bttsYes[bk.id] = yes;
    if (no)  bttsNo[bk.id]  = no;
  }

  if (Object.keys(bttsYes).length > 0) {
    const allYes = calibrateFromRealMarket(bttsYes, matchId, 'bttsYes');
    const allNo  = calibrateFromRealMarket(bttsNo,  matchId, 'bttsNo');
    result.bttsYes = { perBookmaker: allYes, best: bestOdds(allYes), bestBookmakerId: bestBookmaker(allYes), isRealtime: true };
    result.bttsNo  = { perBookmaker: allNo,  best: bestOdds(allNo),  bestBookmakerId: bestBookmaker(allNo),  isRealtime: true };
  }

  // ── Handicap (spreads) ──────────────────────────────────────────────────
  const handicapHome: Record<string, number> = {};

  for (const bk of BOOKMAKERS) {
    if (!bk.oddsApiKey) continue;
    const h = getOutcome(bk.oddsApiKey, 'spreads', homeTeam);
    if (h) handicapHome[bk.id] = h;
  }

  if (Object.keys(handicapHome).length > 0) {
    const allHcp = calibrateFromRealMarket(handicapHome, matchId, 'handicap');
    result.handicap = { perBookmaker: allHcp, best: bestOdds(allHcp), bestBookmakerId: bestBookmaker(allHcp), isRealtime: true };
  }

  return result;
}

// ── Cache ─────────────────────────────────────────────────────────────────
const CACHE: Map<string, { data: Partial<MatchBookmakerOdds>; at: number }> = new Map();
const CACHE_TTL = 5 * 60_000; // 5 min

/**
 * Obtiene cuotas por casa para un partido.
 * - Con VITE_ODDS_API_KEY: cuotas reales + casas sin API calibradas desde mercado real
 * - Sin API key: cuotas estimadas del modelo IA
 */
export async function fetchBookmakerOdds(
  homeTeam:      string,
  awayTeam:      string,
  competitionId: number,
  sport:         string,
  markets:       { homeProb: number; drawProb: number; awayProb: number; over25Prob: number; bttsProb: number; handicapProb: number },
  matchId:       string,
): Promise<MatchBookmakerOdds> {

  const cacheKey = matchId;
  const cached   = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return buildFull(cached.data, markets, matchId);
  }

  let realtimeData: Partial<MatchBookmakerOdds> = {};

  if (!ODDS_API_KEY) {
    console.warn('[Odds] VITE_ODDS_API_KEY no configurada — usando cuotas estimadas. Añádela en Vercel para cuotas reales.');
  } else {
    try {
      const sportKey = sport === 'basketball'
        ? NBA_KEY
        : sport === 'tennis'
          ? TENNIS_KEY
          : (SPORT_KEYS[competitionId] ?? '');

      if (!sportKey) {
        console.warn('[Odds] Sin sport key para competitionId', competitionId);
      } else {
        // Pedimos todos los mercados disponibles sin filtrar por bookmaker
        // para obtener el máximo de casas posibles
        const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h,totals,btts,spreads&oddsFormat=decimal`;
        const res = await fetch(url);

        if (!res.ok) {
          console.error('[Odds] HTTP', res.status, await res.text().catch(() => ''));
        } else {
          const events: OddsApiEvent[] = await res.json();
          const normHome = normTeamName(homeTeam);
          const normAway = normTeamName(awayTeam);

          const event = events.find(e =>
            namesMatch(normTeamName(e.home_team), normHome) &&
            namesMatch(normTeamName(e.away_team), normAway),
          );

          if (event) {
            const parsed = parseOddsApiEvent(event, matchId);
            realtimeData = parsed;
            const marketsFound = Object.keys(parsed).join(', ') || 'ninguno';
            console.log(`[Odds] ✅ Cuotas reales: ${homeTeam} vs ${awayTeam} | mercados: ${marketsFound}`);
          } else {
            console.warn('[Odds] ⚠️ Partido no encontrado:', homeTeam, 'vs', awayTeam,
              '— eventos disponibles:', events.slice(0, 5).map(e => `${e.home_team} vs ${e.away_team}`));
          }
        }
      }
    } catch (err) {
      console.error('[Odds] ❌ Error:', err);
    }
  }

  CACHE.set(cacheKey, { data: realtimeData, at: Date.now() });
  return buildFull(realtimeData, markets, matchId);
}

/** Rellena con cuotas derivadas del modelo IA los mercados sin datos reales */
function buildFull(
  partial:  Partial<MatchBookmakerOdds>,
  markets:  { homeProb: number; drawProb: number; awayProb: number; over25Prob: number; bttsProb: number; handicapProb: number },
  matchId:  string,
): MatchBookmakerOdds {

  function derived(prob: number, key: string): MarketBookmakerOdds {
    const pb = deriveBookmakerOdds(prob, matchId + key);
    return { perBookmaker: pb, best: bestOdds(pb), bestBookmakerId: bestBookmaker(pb), isRealtime: false };
  }

  return {
    result:   partial.result ?? {
      home: derived(markets.homeProb,  'home'),
      draw: derived(markets.drawProb,  'draw'),
      away: derived(markets.awayProb,  'away'),
    },
    over25:   partial.over25   ?? derived(markets.over25Prob,         'over25'),
    under25:  partial.under25  ?? derived(100 - markets.over25Prob,   'under25'),
    bttsYes:  partial.bttsYes  ?? derived(markets.bttsProb,           'bttsYes'),
    bttsNo:   partial.bttsNo   ?? derived(100 - markets.bttsProb,     'bttsNo'),
    handicap: partial.handicap ?? derived(markets.handicapProb,       'handicap'),
  };
}
