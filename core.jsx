// ============================================================
// DATA FETCHING
// ============================================================
function getCustomProxy() {
  try { return localStorage.getItem('custom-proxy') || ''; } catch { return ''; }
}

async function fetchWithProxy(url) {
  const custom = getCustomProxy();
  const proxies = [...PROXIES];
  if (custom) {
    const base = custom.includes('?url=') || custom.endsWith('=') ? custom : (custom.replace(/\/$/, '') + '/?url=');
    proxies.unshift({ url: (u) => base + encodeURIComponent(u), type: 'raw' });
  }
  let lastErr;
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy.url(url), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let text = await res.text();
      // Some proxies wrap the payload in { contents: "..." }
      if (proxy.type === 'wrapped') {
        const wrapper = JSON.parse(text);
        text = wrapper.contents;
      }
      const trimmed = (text || '').trim();
      // Reject HTML error pages — only accept real JSON
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        throw new Error('Проксі віддав не JSON (ймовірно HTML-помилку)');
      }
      return JSON.parse(trimmed);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Усі проксі не відповідають');
}

// Швидкий шлях: дані з нашого бекенду (спільний серверний кеш).
// Якщо бекенд недоступний — фолбек на проксі-ланцюжок.
async function fetchFromBackend(apiPath) {
  const res = await fetch(`${BACKEND_BASE}${apiPath}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);
  return res.json();
}

async function loadFPLData(forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const cached = await storage.get('fpl-cache');
      if (cached) {
        const parsed = JSON.parse(cached.value);
        if (Date.now() - parsed.ts < CACHE_TTL) {
          return { ...parsed.data, fromCache: true, cachedAt: parsed.ts };
        }
      }
    } catch (e) {}
  }

  let bootstrap, fixtures;
  try {
    [bootstrap, fixtures] = await Promise.all([
      fetchFromBackend('/api/bootstrap'),
      fetchFromBackend('/api/fixtures'),
    ]);
  } catch (e) {
    // Бекенд лежить — старий шлях через проксі
    [bootstrap, fixtures] = await Promise.all([
      fetchWithProxy(`${FPL_API}/bootstrap-static/`),
      fetchWithProxy(`${FPL_API}/fixtures/`),
    ]);
  }

  const data = { bootstrap, fixtures };
  try { await storage.set('fpl-cache', JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
  return { ...data, fromCache: false, cachedAt: Date.now() };
}

// Тренди за ~24 год (з бази на сервері)
async function loadTrends() {
  return fetchFromBackend('/api/trends');
}

// Історія знімків гравця: ціна/власність/форма у часі (з бази на сервері)
async function loadPlayerSnapshots(playerId) {
  return fetchFromBackend(`/api/history/${playerId}`);
}

// Експертна стрічка (з бази на сервері)
async function loadFeed() {
  return fetchFromBackend('/api/feed');
}
async function loadPlayerFeed(playerId) {
  return fetchFromBackend(`/api/feed/player/${playerId}`);
}

// Середні очки топ-10k по турах (вибіркова оцінка з нашого сервера)
async function loadTop10k() {
  return fetchFromBackend('/api/top10k');
}

// Результат бектесту моделі на завершеному сезоні (з сервера)
async function loadBacktest() {
  return fetchFromBackend('/api/backtest');
}

// Жива точність прогнозів по турах (з сервера; наповнюється з сезоном)
async function loadAccuracy() {
  return fetchFromBackend('/api/accuracy');
}

// Завантаження реальної команди користувача за FPL ID (entry id)
async function loadMyTeam(entryId, fallbackGW) {
  const [entry, history] = await Promise.all([
    fetchWithProxy(`${FPL_API}/entry/${entryId}/`),
    fetchWithProxy(`${FPL_API}/entry/${entryId}/history/`),
  ]);
  // Останній тур, у якому команда реально грала
  const played = (history.current || []).filter(h => h.points !== null && h.points !== undefined);
  const picksGW = played.length ? played[played.length - 1].event : fallbackGW;
  let picks = null;
  try {
    picks = await fetchWithProxy(`${FPL_API}/entry/${entryId}/event/${picksGW}/picks/`);
  } catch (e) { /* picks можуть бути недоступні — не критично */ }
  return { entry, history, picks, picksGW };
}

// ============================================================
// ANALYTICS
// ============================================================
function getCurrentGW(events) {
  const current = events.find(e => e.is_current);
  if (current && !current.finished) return current.id;
  const next = events.find(e => e.is_next);
  if (next) return next.id;
  const lastFinished = [...events].reverse().find(e => e.finished);
  return lastFinished ? lastFinished.id : 1;
}

function getNextFixtures(teamId, fixtures, fromGW, count = 5) {
  return fixtures
    .filter(f => !f.finished && f.event !== null && f.event >= fromGW && (f.team_h === teamId || f.team_a === teamId))
    .sort((a, b) => a.event - b.event)
    .slice(0, count)
    .map(f => ({
      gw: f.event,
      isHome: f.team_h === teamId,
      opponent: f.team_h === teamId ? f.team_a : f.team_h,
      difficulty: f.team_h === teamId ? f.team_h_difficulty : f.team_a_difficulty,
      kickoff: f.kickoff_time,
    }));
}

function availabilityFactor(player) {
  if (player.status === 'a') return 1.0;
  if (player.status === 'd') return (player.chance_of_playing_next_round ?? 50) / 100;
  if (player.status === 'i' || player.status === 's' || player.status === 'u') return 0.05;
  if (player.chance_of_playing_next_round !== null) return player.chance_of_playing_next_round / 100;
  return 1.0;
}

// ============================================================
// МОДЕЛЬ ПРОГНОЗУ v2.1
// Атака: xG/90 та xA/90, скориговані на силу захисту суперника.
// Сухарі: Пуассон з особистого xGC/90 × сила атаки суперника.
// Ротація: очікувані хвилини на МАТЧ КОМАНДИ + ймовірність старту.
// "Інші очки/90": залишок (бонуси, сейви, DefCon, картки) з реальної
// статистики гравця. Малі вибірки -> змішування зі старою формулою.
// ============================================================
const GOAL_VALUE = { 1: 6, 2: 6, 3: 5, 4: 4 };
const CS_VALUE = { 1: 4, 2: 4, 3: 1, 4: 0 };
const AVG_STRENGTH = 1150; // середня сила команд АПЛ у шкалі FPL (~1000-1400)

function predictPlayerPoints(player, teamsMap, fixtures, fromGW, gwsAhead = 1, weights) {
  const w = weights || { form: 1.0, fdr: 0.5, value: 0.0, minutes: 1.0 };
  const nextFixtures = getNextFixtures(player.team, fixtures, fromGW, gwsAhead);
  if (nextFixtures.length === 0) {
    return { total: 0, perGW: 0, fixtures: [], breakdown: { form: 0, fdr: 0, mins: 0, avail: 0 } };
  }

  const mins = player.minutes || 0;
  const form = parseFloat(player.form) || 0;
  const ppg = parseFloat(player.points_per_game) || 0;
  const avail = availabilityFactor(player);

  // Скільки матчів зіграла КОМАНДА (для оцінки ротації гравця)
  const rounds = Math.max(1, fixtures.filter(f => f.finished && (f.team_h === player.team || f.team_a === player.team)).length);
  const starts = Math.min(player.starts || 0, rounds);
  // Виходи з лавки: оцінка з "зайвих" хвилин (старт ≈ 84 хв, камео ≈ 25 хв)
  const cameos = Math.max(0, Math.min(rounds - starts, Math.round((mins - 84 * starts) / 25)));
  const p60 = Math.min(1, starts / rounds);
  const pCameo = Math.min(1 - p60, cameos / rounds);
  const expMins = mins / rounds; // очікувані хвилини на матч команди

  const minutesFactor = w.minutes > 0
    ? (mins > 1000 ? 1.0 : mins > 500 ? 0.85 : mins > 200 ? 0.7 : 0.5)
    : 1.0;

  // Показники на 90 хвилин
  const per90 = (v) => mins > 0 ? (parseFloat(v) || 0) / (mins / 90) : 0;
  const xG90 = per90(player.expected_goals);
  const xA90 = per90(player.expected_assists);
  const xGC90 = per90(player.expected_goals_conceded);

  // "Інші очки" (бонуси, сейви, DefCon, мінуси за картки/пропущені) —
  // залишок реальних очок після голів/асистів/сухарів/виходів
  const appearanceCum = 2 * starts + cameos;
  const explained = (player.goals_scored || 0) * GOAL_VALUE[player.element_type]
    + (player.assists || 0) * 3
    + (player.clean_sheets || 0) * CS_VALUE[player.element_type]
    + appearanceCum;
  const other90 = mins > 0
    ? Math.max(-1, Math.min(3, ((player.total_points || 0) - explained) / (mins / 90)))
    : 0;

  // Вага нової моделі росте з вибіркою: 0 хвилин -> стара формула, 450+ -> нова
  const blendNew = Math.min(1, mins / 450);
  // Сила коригування на суперника керується слайдером FDR (0.5 = стандарт)
  const adjScale = Math.min(2, w.fdr / 0.5);

  let total = 0;
  const detailedFixtures = nextFixtures.map(f => {
    const opp = teamsMap[f.opponent];
    const oppDef = opp ? (f.isHome ? opp.strength_defence_away : opp.strength_defence_home) || AVG_STRENGTH : AVG_STRENGTH;
    const oppAtt = opp ? (f.isHome ? opp.strength_attack_away : opp.strength_attack_home) || AVG_STRENGTH : AVG_STRENGTH;
    const attackAdj = 1 + (AVG_STRENGTH / oppDef - 1) * adjScale;
    const concedeAdj = 1 + (oppAtt / AVG_STRENGTH - 1) * adjScale;

    const appearancePts = 2 * p60 + 1 * pCameo;
    const attackPts = (xG90 * GOAL_VALUE[player.element_type] + xA90 * 3) * (expMins / 90) * attackAdj;
    const csPts = p60 * Math.exp(-(xGC90 * concedeAdj)) * CS_VALUE[player.element_type];
    const otherPts = other90 * (expMins / 90);
    const homeBonus = f.isHome ? 0.2 : 0;
    const newScore = (appearancePts + attackPts + csPts + otherPts + homeBonus) * avail;

    // Стара формула (форма/PPG + FDR) — для змішування і як база для новачків
    const oldBase = (form * 0.7 + ppg * 0.3) * w.form;
    const oldScore = Math.max(0, (oldBase + (3 - f.difficulty) * w.fdr + (f.isHome ? 0.3 : 0)) * minutesFactor * avail);

    const formBoost = 1 + Math.max(-0.15, Math.min(0.15, (form - ppg) * 0.03 * w.form));
    const fixtureScore = Math.max(0, blendNew * newScore * formBoost + (1 - blendNew) * oldScore);

    total += fixtureScore;
    return { ...f, score: fixtureScore };
  });

  return {
    total,
    perGW: total / nextFixtures.length,
    fixtures: detailedFixtures,
    breakdown: { form, avail, mins: minutesFactor, count: nextFixtures.length, xG90: +xG90.toFixed(2), xA90: +xA90.toFixed(2), blendNew: +blendNew.toFixed(2) },
  };
}

function valueScore(player) {
  const cost = player.now_cost / 10;
  return cost > 0 ? player.total_points / cost : 0;
}

function differentialBoost(player) {
  const sel = parseFloat(player.selected_by_percent) || 0;
  if (sel >= 15) return 1.0;
  return 1.0 + (15 - sel) * 0.02;
}

// ============================================================
// OPTIMIZER
// ============================================================
function optimizeSquad(players, teamsMap, fixtures, fromGW, options = {}) {
  const {
    budget = 1000, maxPerTeam = 3, horizon = 5,
    weights = { form: 1.0, fdr: 0.5, value: 0.0, minutes: 1.0 },
    excluded = new Set(), locked = new Set(),
    seasonEnded = false,
  } = options;

  const scored = players
    .filter(p => !excluded.has(p.id))
    .map(p => {
      let score;
      if (seasonEnded) {
        // Retrospective: weight total season points heavily, plus form for late-season risers
        const form = parseFloat(p.form) || 0;
        score = (p.total_points || 0) * 1.0 + form * 5;
      } else {
        const pred = predictPlayerPoints(p, teamsMap, fixtures, fromGW, horizon, weights);
        score = pred.total;
      }
      return { ...p, predScore: score, predPerGW: score / Math.max(1, horizon) };
    })
    .filter(p => p.predScore > 0 || locked.has(p.id));

  const byPos = { 1: [], 2: [], 3: [], 4: [] };
  scored.forEach(p => byPos[p.element_type].push(p));
  Object.keys(byPos).forEach(pos => byPos[pos].sort((a, b) => b.predScore - a.predScore));

  const squad = [];
  const teamCount = {};
  let remainingBudget = budget;
  const posFilled = { 1: 0, 2: 0, 3: 0, 4: 0 };

  const lockedPlayers = scored.filter(p => locked.has(p.id));
  for (const p of lockedPlayers) {
    if (posFilled[p.element_type] >= POSITION_QUOTAS[p.element_type]) continue;
    if ((teamCount[p.team] || 0) >= maxPerTeam) continue;
    if (remainingBudget - p.now_cost < 0) continue;
    squad.push(p);
    teamCount[p.team] = (teamCount[p.team] || 0) + 1;
    remainingBudget -= p.now_cost;
    posFilled[p.element_type]++;
  }

  const minPrices = { 1: 40, 2: 40, 3: 45, 4: 45 };
  const fillOrder = [4, 3, 2, 1];

  for (const pos of fillOrder) {
    const need = POSITION_QUOTAS[pos] - posFilled[pos];
    if (need <= 0) continue;

    for (let slotIdx = 0; slotIdx < need; slotIdx++) {
      let reserved = 0;
      fillOrder.forEach(otherPos => {
        if (otherPos === pos) {
          reserved += (need - slotIdx - 1) * minPrices[pos];
        } else {
          const otherNeed = POSITION_QUOTAS[otherPos] - posFilled[otherPos];
          reserved += otherNeed * minPrices[otherPos];
        }
      });
      const availForThis = remainingBudget - reserved;

      const candidate = byPos[pos].find(p =>
        !squad.find(s => s.id === p.id) &&
        p.now_cost <= availForThis &&
        (teamCount[p.team] || 0) < maxPerTeam
      );

      if (candidate) {
        squad.push(candidate);
        teamCount[candidate.team] = (teamCount[candidate.team] || 0) + 1;
        remainingBudget -= candidate.now_cost;
        posFilled[pos]++;
      } else {
        const fallback = byPos[pos].find(p =>
          !squad.find(s => s.id === p.id) &&
          p.now_cost <= remainingBudget &&
          (teamCount[p.team] || 0) < maxPerTeam
        );
        if (fallback) {
          squad.push(fallback);
          teamCount[fallback.team] = (teamCount[fallback.team] || 0) + 1;
          remainingBudget -= fallback.now_cost;
          posFilled[pos]++;
        }
      }
    }
  }

  const totalCost = squad.reduce((s, p) => s + p.now_cost, 0);
  const valid = squad.length === 15 && totalCost <= budget;

  const formations = [
    [1, 3, 4, 3], [1, 3, 5, 2], [1, 4, 4, 2], [1, 4, 3, 3], [1, 4, 5, 1], [1, 5, 3, 2], [1, 5, 4, 1]
  ];
  let bestXI = null;
  let bestXIScore = -Infinity;
  for (const f of formations) {
    const sortedByPos = { 1: [], 2: [], 3: [], 4: [] };
    squad.forEach(p => sortedByPos[p.element_type].push(p));
    Object.keys(sortedByPos).forEach(pos => sortedByPos[pos].sort((a, b) => b.predScore - a.predScore));
    if (sortedByPos[1].length < f[0] || sortedByPos[2].length < f[1] || sortedByPos[3].length < f[2] || sortedByPos[4].length < f[3]) continue;
    const xi = [
      ...sortedByPos[1].slice(0, f[0]),
      ...sortedByPos[2].slice(0, f[1]),
      ...sortedByPos[3].slice(0, f[2]),
      ...sortedByPos[4].slice(0, f[3]),
    ];
    const score = xi.reduce((s, p) => s + p.predScore, 0);
    if (score > bestXIScore) {
      bestXIScore = score;
      bestXI = { players: xi, formation: f };
    }
  }

  const captain = bestXI ? [...bestXI.players].sort((a, b) => b.predScore - a.predScore)[0] : null;
  const vice = bestXI ? [...bestXI.players].sort((a, b) => b.predScore - a.predScore)[1] : null;

  return {
    squad,
    startingXI: bestXI?.players || [],
    formation: bestXI?.formation || null,
    bench: squad.filter(p => !bestXI?.players.find(x => x.id === p.id)),
    captain, vice, totalCost, valid,
    predictedTotal: bestXIScore,
  };
}
