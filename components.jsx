// ============================================================
// SHARED COMPONENTS
// ============================================================
function PriceTag({ cost }) {
  return <span className="font-mono">£{(cost / 10).toFixed(1)}m</span>;
}

function StatusDot({ player }) {
  let color = '#22c55e'; let title = 'Доступний';
  if (player.status === 'd') { color = '#eab308'; title = `Під сумнівом (${player.chance_of_playing_next_round ?? '?'}%)`; }
  else if (player.status === 'i') { color = '#ef4444'; title = `Травмований: ${player.news || ''}`; }
  else if (player.status === 's') { color = '#ef4444'; title = `Дискваліфікований: ${player.news || ''}`; }
  else if (player.status === 'u') { color = '#71717a'; title = `Недоступний: ${player.news || ''}`; }
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} title={title} />;
}

function FDRBadge({ fdr, isHome, oppShort }) {
  const c = FDR_COLORS[fdr] || FDR_COLORS[3];
  return (
    <div className="text-[10px] font-mono px-1.5 py-1 rounded text-center leading-tight whitespace-nowrap" style={{ backgroundColor: c.bg, color: c.text }}>
      <div className="font-semibold">{oppShort}</div>
      <div className="opacity-75 text-[9px]">{isHome ? 'д' : 'в'}</div>
    </div>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div className={`p-3 rounded-lg border ${accent ? 'border-lime-500/30 bg-lime-500/5' : 'border-stone-800 bg-stone-950/50'}`}>
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className={`font-mono text-xl mt-1 ${accent ? 'text-lime-400' : 'text-stone-100'}`}>{value}</div>
    </div>
  );
}

function Section({ icon, title, subtitle, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <div className="flex items-center gap-2 text-stone-300" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {icon} <span className="font-semibold">{title}</span>
        </div>
        {subtitle && <div className="text-xs text-stone-500">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function RankedRow({ rank, player, team, metric, metricLabel, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-stone-900 bg-stone-950/40 hover:bg-stone-900/60 hover:border-stone-700 transition-all text-left">
      <div className="font-mono text-stone-600 w-6 text-sm">{rank}</div>
      <StatusDot player={player} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>{player.web_name}</div>
        <div className="text-[11px] text-stone-500">{team?.short_name} · {POSITIONS_UA[player.element_type]} · £{(player.now_cost/10).toFixed(1)}m</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-mono text-sm text-lime-400">{metric}</div>
        <div className="text-[10px] text-stone-600">{metricLabel}</div>
      </div>
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div className="p-12 text-center rounded-xl border border-stone-800 bg-stone-900/30">
      <div className="text-stone-500" style={{ fontFamily: 'DM Sans, sans-serif' }}>{message}</div>
    </div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ players, teams, fixtures, currentGW, weights, seasonEnded, onPlayerClick }) {
  const teamsMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);

  // Live season — predictions for next GW
  const enrichedLive = useMemo(() => {
    if (seasonEnded) return [];
    return players
      .filter(p => p.status !== 'u' && parseFloat(p.form) > 0)
      .map(p => {
        const pred1 = predictPlayerPoints(p, teamsMap, fixtures, currentGW, 1, weights);
        const pred5 = predictPlayerPoints(p, teamsMap, fixtures, currentGW, 5, weights);
        return { ...p, team: teamsMap[p.team], predNext: pred1.total, pred5: pred5.total, value: valueScore(p) };
      });
  }, [players, teamsMap, fixtures, currentGW, weights, seasonEnded]);

  // Season-ended — retrospective on total points and form
  const enrichedSeason = useMemo(() => {
    return players
      .filter(p => p.total_points > 0 || parseFloat(p.form) > 0)
      .map(p => ({ ...p, team: teamsMap[p.team], value: valueScore(p) }));
  }, [players, teamsMap]);

  // === SEASON ENDED VIEW ===
  if (seasonEnded) {
    const topScorers = [...enrichedSeason].sort((a, b) => b.total_points - a.total_points).slice(0, 6);
    const topValue = [...enrichedSeason].filter(p => p.total_points > 50).sort((a, b) => b.value - a.value).slice(0, 6);
    const inForm = [...enrichedSeason].sort((a, b) => parseFloat(b.form) - parseFloat(a.form)).slice(0, 6);
    const differentials = [...enrichedSeason]
      .filter(p => parseFloat(p.selected_by_percent) < 10 && p.total_points > 100)
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 6);
    const star = topScorers[0];

    return (
      <div className="space-y-8">
        {star && (
          <section>
            <div className="flex items-center gap-2 mb-3 text-stone-400 text-sm uppercase tracking-wider" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              <Icon name="star" size={14} /> Гравець сезону
            </div>
            <button onClick={() => onPlayerClick(star)} className="w-full text-left relative overflow-hidden rounded-2xl border border-lime-500/20 bg-gradient-to-br from-stone-900 via-stone-900 to-lime-950/40 p-6 md:p-8 hover:border-lime-500/40 transition-all group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-lime-500/10 transition-all" />
              <div className="relative grid md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h2 className="text-4xl md:text-5xl tracking-tight" style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}>
                      {star.first_name} {star.second_name}
                    </h2>
                    <div className="text-stone-400 text-sm">{star.team?.name} · {POSITIONS_UA[star.element_type]}</div>
                  </div>
                  <p className="text-stone-300 mt-3 text-sm md:text-base leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Топ-бомбардир сезону 2025/26 за версією FPL. {star.total_points} очок, {star.goals_scored} голів, {star.assists} асистів. Сезон завершено — побачимось у серпні на старті нового!
                  </p>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-1 gap-3">
                  <Stat label="Очки" value={star.total_points} accent />
                  <Stat label="Голи" value={star.goals_scored} />
                  <Stat label="Асисти" value={star.assists} />
                </div>
              </div>
            </button>
          </section>
        )}

        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 text-sm text-amber-200/80" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          <div className="flex items-start gap-2">
            <Icon name="alert" size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Сезон 2025/26 завершено.</strong> Прогнози капітана й оптимізатор стають корисними знову з кінця липня, коли FPL відкриє новий сезон і з'явиться новий календар. А поки що дивись підсумки сезону нижче — пригодиться для планування на наступний.
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Section icon={<Icon name="trending" size={14} />} title="Топ-бомбардири сезону" subtitle="за загальною кількістю очок">
            <div className="space-y-2">{topScorers.map((p, i) => <RankedRow key={p.id} rank={i + 1} player={p} team={p.team} metric={p.total_points} metricLabel="очк." onClick={() => onPlayerClick(p)} />)}</div>
          </Section>
          <Section icon={<Icon name="target" size={14} />} title="Найкраща цінність" subtitle="очки за £m">
            <div className="space-y-2">{topValue.map((p, i) => <RankedRow key={p.id} rank={i + 1} player={p} team={p.team} metric={p.value.toFixed(1)} metricLabel="очк/£" onClick={() => onPlayerClick(p)} />)}</div>
          </Section>
          <Section icon={<Icon name="activity" size={14} />} title="У формі на фініші" subtitle="останні матчі сезону">
            <div className="space-y-2">{inForm.map((p, i) => <RankedRow key={p.id} rank={i + 1} player={p} team={p.team} metric={p.form} metricLabel="форма" onClick={() => onPlayerClick(p)} />)}</div>
          </Section>
          <Section icon={<Icon name="sparkles" size={14} />} title="Прихована перлина сезону" subtitle="низька власність, високі очки">
            <div className="space-y-2">{differentials.map((p, i) => <RankedRow key={p.id} rank={i + 1} player={p} team={p.team} metric={`${p.selected_by_percent}%`} metricLabel="власн." onClick={() => onPlayerClick(p)} />)}</div>
          </Section>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-3 text-stone-400 text-sm uppercase tracking-wider" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <Icon name="link" size={14} /> Експертні джерела
          </div>
          <div className="text-xs text-stone-500 mb-4 italic">Курований список безкоштовних якісних ресурсів. Думки експертів — паралельно з твоїм аналізом.</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {EXPERT_SOURCES.map(src => (
              <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg border border-stone-800 bg-stone-900/40 hover:border-lime-500/30 hover:bg-stone-900/80 transition-all">
                <div className="font-semibold text-sm flex items-center gap-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {src.name} <Icon name="link" size={11} className="text-stone-500" />
                </div>
                <div className="text-xs text-stone-400 mt-1 leading-snug">{src.desc}</div>
              </a>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // === LIVE SEASON VIEW ===
  const captainPicks = [...enrichedLive].sort((a, b) => b.predNext - a.predNext).slice(0, 5);
  const onFire = [...enrichedLive].sort((a, b) => parseFloat(b.form) - parseFloat(a.form)).slice(0, 6);
  const valuePicks = [...enrichedLive].filter(p => p.now_cost <= 65).sort((a, b) => b.value - a.value).slice(0, 6);
  const differentials = [...enrichedLive].filter(p => parseFloat(p.selected_by_percent) < 10 && p.predNext > 3)
    .sort((a, b) => b.predNext * differentialBoost(b) - a.predNext * differentialBoost(a)).slice(0, 6);
  const captainOfWeek = captainPicks[0];

  return (
    <div className="space-y-8">
      {captainOfWeek && (
        <section>
          <div className="flex items-center gap-2 mb-3 text-stone-400 text-sm uppercase tracking-wider" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <Icon name="crown" size={14} /> Капітан тижня (GW{currentGW})
          </div>
          <button onClick={() => onPlayerClick(captainOfWeek)} className="w-full text-left relative overflow-hidden rounded-2xl border border-lime-500/20 bg-gradient-to-br from-stone-900 via-stone-900 to-lime-950/40 p-6 md:p-8 hover:border-lime-500/40 transition-all group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-lime-500/10 transition-all" />
            <div className="relative grid md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="text-4xl md:text-5xl tracking-tight" style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}>
                    {captainOfWeek.first_name} {captainOfWeek.second_name}
                  </h2>
                  <div className="text-stone-400 text-sm">{captainOfWeek.team?.name} · {POSITIONS_UA[captainOfWeek.element_type]}</div>
                </div>
                <p className="text-stone-300 mt-3 text-sm md:text-base leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Топ-капітан за нашим скорингом на тур {currentGW}. Форма {captainOfWeek.form}, очікувані очки {captainOfWeek.predNext.toFixed(1)}.
                  {captainOfWeek.news && <span className="block mt-1 text-yellow-500/80 text-xs">⚠ {captainOfWeek.news}</span>}
                </p>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-1 gap-3">
                <Stat label="Очікувано" value={captainOfWeek.predNext.toFixed(1)} accent />
                <Stat label="Ціна" value={`£${(captainOfWeek.now_cost/10).toFixed(1)}m`} />
                <Stat label="Власників" value={`${captainOfWeek.selected_by_percent}%`} />
              </div>
            </div>
          </button>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Section icon={<Icon name="crown" size={14} />} title="Топ-капітани" subtitle={`на GW${currentGW}`}>
          <div className="space-y-2">{captainPicks.slice(0, 5).map((p, i) => <RankedRow key={p.id} rank={i + 1} player={p} team={p.team} metric={p.predNext.toFixed(1)} metricLabel="очк." onClick={() => onPlayerClick(p)} />)}</div>
        </Section>
        <Section icon={<Icon name="activity" size={14} />} title="У формі" subtitle="за останній місяць">
          <div className="space-y-2">{onFire.map((p, i) => <RankedRow key={p.id} rank={i + 1} player={p} team={p.team} metric={p.form} metricLabel="форма" onClick={() => onPlayerClick(p)} />)}</div>
        </Section>
        <Section icon={<Icon name="target" size={14} />} title="Цінність" subtitle="очки за £m">
          <div className="space-y-2">{valuePicks.map((p, i) => <RankedRow key={p.id} rank={i + 1} player={p} team={p.team} metric={p.value.toFixed(1)} metricLabel="очк/£" onClick={() => onPlayerClick(p)} />)}</div>
        </Section>
        <Section icon={<Icon name="sparkles" size={14} />} title="Диференціали" subtitle="низька власність, високий потенціал">
          <div className="space-y-2">{differentials.map((p, i) => <RankedRow key={p.id} rank={i + 1} player={p} team={p.team} metric={`${p.selected_by_percent}%`} metricLabel="власн." onClick={() => onPlayerClick(p)} />)}</div>
        </Section>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3 text-stone-400 text-sm uppercase tracking-wider" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          <Icon name="link" size={14} /> Експертні джерела
        </div>
        <div className="text-xs text-stone-500 mb-4 italic">Курований список безкоштовних якісних ресурсів. Думки експертів — паралельно з твоїм аналізом.</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EXPERT_SOURCES.map(src => (
            <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg border border-stone-800 bg-stone-900/40 hover:border-lime-500/30 hover:bg-stone-900/80 transition-all">
              <div className="font-semibold text-sm flex items-center gap-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {src.name} <Icon name="link" size={11} className="text-stone-500" />
              </div>
              <div className="text-xs text-stone-400 mt-1 leading-snug">{src.desc}</div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// PLAYERS VIEW
// ============================================================
function PlayersView({ players, teams, fixtures, currentGW, weights, onPlayerClick }) {
  const teamsMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [maxCost, setMaxCost] = useState(150);
  const [sortBy, setSortBy] = useState('predNext');
  const [sortDir, setSortDir] = useState('desc');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const enriched = useMemo(() => players.map(p => {
    const pred = predictPlayerPoints(p, teamsMap, fixtures, currentGW, 5, weights);
    return {
      ...p, team: teamsMap[p.team],
      predNext: predictPlayerPoints(p, teamsMap, fixtures, currentGW, 1, weights).total,
      pred5: pred.total, value: valueScore(p),
    };
  }), [players, teamsMap, fixtures, currentGW, weights]);

  const filtered = useMemo(() => {
    let res = enriched;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(p => `${p.first_name} ${p.second_name} ${p.web_name}`.toLowerCase().includes(q) ||
        p.team?.name?.toLowerCase().includes(q) || p.team?.short_name?.toLowerCase().includes(q));
    }
    if (posFilter !== 'all') res = res.filter(p => p.element_type === Number(posFilter));
    if (teamFilter !== 'all') res = res.filter(p => p.team?.id === Number(teamFilter));
    res = res.filter(p => p.now_cost <= maxCost);
    if (onlyAvailable) res = res.filter(p => p.status === 'a');
    res = [...res].sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'predNext': av = a.predNext; bv = b.predNext; break;
        case 'pred5': av = a.pred5; bv = b.pred5; break;
        case 'form': av = parseFloat(a.form); bv = parseFloat(b.form); break;
        case 'totalPoints': av = a.total_points; bv = b.total_points; break;
        case 'cost': av = a.now_cost; bv = b.now_cost; break;
        case 'value': av = a.value; bv = b.value; break;
        case 'ownership': av = parseFloat(a.selected_by_percent); bv = parseFloat(b.selected_by_percent); break;
        case 'xG': av = parseFloat(a.expected_goals); bv = parseFloat(b.expected_goals); break;
        case 'xA': av = parseFloat(a.expected_assists); bv = parseFloat(b.expected_assists); break;
        case 'xGC': av = parseFloat(a.expected_goals_conceded); bv = parseFloat(b.expected_goals_conceded); break;
        default: av = 0; bv = 0;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return res.slice(0, 100);
  }, [enriched, search, posFilter, teamFilter, maxCost, sortBy, sortDir, onlyAvailable]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const SortHeader = ({ k, children, align = 'left' }) => (
    <th className={`px-2 py-2 text-[11px] uppercase tracking-wider text-stone-500 font-medium cursor-pointer hover:text-stone-200 transition-colors select-none ${align === 'right' ? 'text-right' : 'text-left'}`} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === k && (sortDir === 'desc' ? <Icon name="chevdown" size={11} /> : <Icon name="chevup" size={11} />)}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Пошук гравця або команди..."
            className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-stone-600 focus:outline-none focus:border-lime-500/50"
            style={{ fontFamily: 'DM Sans, sans-serif' }} />
        </div>
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className="bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm">
          <option value="all">Усі позиції</option>
          <option value="1">Воротарі</option>
          <option value="2">Захисники</option>
          <option value="3">Півзахисники</option>
          <option value="4">Нападники</option>
        </select>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm max-w-[180px]">
          <option value="all">Усі команди</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
          <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} className="accent-lime-500" />
          Тільки доступні
        </label>
        <div className="flex items-center gap-2 text-sm text-stone-400">
          Макс. ціна:
          <input type="range" min="40" max="150" value={maxCost} onChange={e => setMaxCost(Number(e.target.value))} className="accent-lime-500 w-24" />
          <span className="font-mono text-stone-200 w-14">£{(maxCost/10).toFixed(1)}m</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-800">
        <table className="w-full text-sm">
          <thead className="bg-stone-900/70">
            <tr>
              <th className="px-2 py-2 text-left text-[11px] uppercase tracking-wider text-stone-500 font-medium">Гравець</th>
              <SortHeader k="cost" align="right">Ціна</SortHeader>
              <SortHeader k="predNext" align="right">След.</SortHeader>
              <SortHeader k="pred5" align="right">5 турів</SortHeader>
              <SortHeader k="form" align="right">Форма</SortHeader>
              <SortHeader k="totalPoints" align="right">Очки</SortHeader>
              <SortHeader k="value" align="right">Цінн.</SortHeader>
              <SortHeader k="ownership" align="right">%</SortHeader>
              <SortHeader k="xG" align="right">xG</SortHeader>
              <SortHeader k="xA" align="right">xA</SortHeader>
              <SortHeader k="xGC" align="right">xGC</SortHeader>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} onClick={() => onPlayerClick(p)} className={`border-t border-stone-900 hover:bg-stone-900/40 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-stone-950/30' : ''}`}>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <StatusDot player={p} />
                    <div>
                      <div className="font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>{p.web_name}</div>
                      <div className="text-[10px] text-stone-500">{p.team?.short_name} · {POSITIONS_UA[p.element_type]}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 text-right font-mono text-stone-200">£{(p.now_cost/10).toFixed(1)}</td>
                <td className="px-2 py-2 text-right font-mono text-lime-400">{p.predNext.toFixed(1)}</td>
                <td className="px-2 py-2 text-right font-mono text-stone-300">{p.pred5.toFixed(1)}</td>
                <td className="px-2 py-2 text-right font-mono text-stone-300">{p.form}</td>
                <td className="px-2 py-2 text-right font-mono text-stone-300">{p.total_points}</td>
                <td className="px-2 py-2 text-right font-mono text-stone-400">{p.value.toFixed(1)}</td>
                <td className="px-2 py-2 text-right font-mono text-stone-500">{p.selected_by_percent}%</td>
                <td className="px-2 py-2 text-right font-mono text-stone-400">{p.expected_goals}</td>
                <td className="px-2 py-2 text-right font-mono text-stone-400">{p.expected_assists}</td>
                <td className="px-2 py-2 text-right font-mono text-stone-400">{p.expected_goals_conceded}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-stone-500 text-sm">Нічого не знайдено за цими фільтрами</div>}
      </div>
      <div className="text-xs text-stone-600 text-center">Показано перші 100 результатів</div>
    </div>
  );
}

// ============================================================
// FIXTURES VIEW
// ============================================================
function FixturesView({ teams, fixtures, currentGW }) {
  const teamsMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);

  const { gwList, mode } = useMemo(() => {
    const upcoming = [...new Set(fixtures.filter(f => !f.finished && f.event !== null).map(f => f.event))].sort((a, b) => a - b);
    if (upcoming.length > 0) return { gwList: upcoming.slice(0, 8), mode: 'upcoming' };
    // Season over — show last 8 finished GWs as a results timeline
    const finished = [...new Set(fixtures.filter(f => f.finished && f.event !== null).map(f => f.event))].sort((a, b) => a - b);
    return { gwList: finished.slice(-8), mode: 'results' };
  }, [fixtures]);

  const matrix = useMemo(() => {
    return teams.map(team => {
      const row = gwList.map(gw => {
        const fix = fixtures.find(f => f.event === gw && (f.team_h === team.id || f.team_a === team.id));
        if (!fix) return null;
        const isHome = fix.team_h === team.id;
        const opponent = teamsMap[isHome ? fix.team_a : fix.team_h];
        const myScore = isHome ? fix.team_h_score : fix.team_a_score;
        const oppScore = isHome ? fix.team_a_score : fix.team_h_score;
        let result = null;
        if (fix.finished && myScore !== null) result = myScore > oppScore ? 'w' : myScore < oppScore ? 'l' : 'd';
        return { gw, isHome, opp: opponent, fdr: isHome ? fix.team_h_difficulty : fix.team_a_difficulty, finished: fix.finished, myScore, oppScore, result, kickoff: fix.kickoff_time };
      });
      const avgFDR = row.filter(Boolean).reduce((s, f) => s + f.fdr, 0) / Math.max(1, row.filter(Boolean).length);
      return { team, fixtures: row, avgFDR };
    }).sort((a, b) => mode === 'upcoming' ? a.avgFDR - b.avgFDR : a.team.name.localeCompare(b.team.name));
  }, [teams, teamsMap, fixtures, gwList, mode]);

  if (gwList.length === 0) {
    return <EmptyState message="Немає даних про матчі" />;
  }

  const resultColor = { w: '#1a5d3a', l: '#7f1d1d', d: '#57534e' };

  return (
    <div className="space-y-4">
      <div className="text-sm text-stone-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {mode === 'upcoming'
          ? <>Складність наступних {gwList.length} турів (fixture ticker). Команди відсортовано від найлегшого календаря до найскладнішого — шукай блоки зелених клітинок для гарних відрізків.</>
          : <>Сезон завершено — показую результати останніх {gwList.length} турів. Календар майбутніх матчів з'явиться на старті нового сезону в серпні.</>}
      </div>
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="text-stone-500">{mode === 'upcoming' ? 'Складність:' : 'Колір клітинки — складність суперника. Рамка — результат:'}</span>
        {mode === 'upcoming'
          ? [1, 2, 3, 4, 5].map(f => (
              <div key={f} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: FDR_COLORS[f].bg }} />
                <span className="text-stone-400">{FDR_COLORS[f].label}</span>
              </div>
            ))
          : [['w','перемога','#22c55e'],['d','нічия','#a8a29e'],['l','поразка','#ef4444']].map(([k,l,c]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2" style={{ borderColor: c }} />
                <span className="text-stone-400">{l}</span>
              </div>
            ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-stone-800">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-900/70">
              <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-stone-500 font-medium sticky left-0 bg-stone-900/70">Команда</th>
              {mode === 'upcoming' && <th className="px-2 py-2 text-center text-[11px] uppercase tracking-wider text-stone-500 font-medium">Сер.</th>}
              {gwList.map(gw => <th key={gw} className="px-1 py-2 text-center text-[11px] uppercase tracking-wider text-stone-500 font-medium min-w-[52px]">GW{gw}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ team, fixtures: row, avgFDR }) => (
              <tr key={team.id} className="border-t border-stone-900 hover:bg-stone-900/30">
                <td className="px-3 py-2 font-medium sticky left-0 bg-stone-950" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <span className="text-stone-200">{team.name}</span>
                </td>
                {mode === 'upcoming' && <td className="px-2 py-2 text-center font-mono text-stone-400 text-sm">{avgFDR.toFixed(1)}</td>}
                {row.map((f, i) => (
                  <td key={i} className="px-1 py-1.5">
                    {!f ? <div className="text-center text-stone-700">—</div> :
                      f.finished && f.myScore !== null ? (
                        <div className="text-[10px] font-mono px-1.5 py-1 rounded text-center leading-tight border-2" style={{ backgroundColor: FDR_COLORS[f.fdr].bg, borderColor: resultColor[f.result] || 'transparent', color: FDR_COLORS[f.fdr].text }}>
                          <div className="font-semibold">{f.opp?.short_name}{f.isHome ? '' : ''}</div>
                          <div className="opacity-90">{f.myScore}-{f.oppScore}</div>
                        </div>
                      ) : <FDRBadge fdr={f.fdr} isHome={f.isHome} oppShort={f.opp?.short_name} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// CAPTAIN VIEW
// ============================================================
function CaptainView({ players, teams, fixtures, currentGW, weights, seasonEnded, onPlayerClick }) {
  const teamsMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);

  if (seasonEnded) {
    return (
      <div className="space-y-4">
        <EmptyState message="Сезон 2025/26 завершено — немає кого вибирати капітаном на наступний тур. Повертайся в кінці липня, на старт нового сезону FPL 🏆" />
        <div className="text-center text-xs text-stone-600">А поки що — глянь топ-бомбардирів сезону на вкладці «Дашборд»</div>
      </div>
    );
  }
  const candidates = useMemo(() => {
    return players
      .filter(p => p.status === 'a' || p.status === 'd')
      .filter(p => p.element_type === 3 || p.element_type === 4 || (p.element_type === 2 && parseFloat(p.form) > 5))
      .map(p => {
        const pred = predictPlayerPoints(p, teamsMap, fixtures, currentGW, 1, weights);
        return { ...p, team: teamsMap[p.team], pred: pred.total, predFixtures: pred.fixtures, breakdown: pred.breakdown };
      })
      .filter(p => p.pred > 0)
      .sort((a, b) => b.pred - a.pred)
      .slice(0, 12);
  }, [players, teamsMap, fixtures, currentGW, weights]);

  if (candidates.length === 0) {
    return <EmptyState message="Немає даних для прогнозу на наступний тур (можливо, сезон завершено)" />;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-stone-400 mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        Топ-12 кандидатів на капітана на GW{currentGW}. Скоринг враховує форму, складність суперника, домашнє поле і ризик ротації.
      </div>
      <div className="grid gap-3">
        {candidates.map((p, i) => (
          <button key={p.id} onClick={() => onPlayerClick(p)}
            className={`text-left p-4 rounded-xl border transition-all ${
              i === 0 ? 'border-lime-500/40 bg-gradient-to-r from-lime-950/30 to-stone-900/30' :
              i < 3 ? 'border-stone-700 bg-stone-900/40' : 'border-stone-800 bg-stone-900/20'
            } hover:border-lime-500/40`}>
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-1 text-center">
                {i === 0 ? <Icon name="crown" size={24} className="text-lime-400 mx-auto" /> : <div className="text-2xl font-mono text-stone-600" style={{ fontFamily: 'Fraunces, serif' }}>{i + 1}</div>}
              </div>
              <div className="col-span-5 md:col-span-4">
                <div className="flex items-center gap-2">
                  <StatusDot player={p} />
                  <div className="font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>{p.first_name} {p.second_name}</div>
                </div>
                <div className="text-xs text-stone-400 mt-1">{p.team?.name} · {POSITIONS_UA[p.element_type]} · £{(p.now_cost/10).toFixed(1)}m</div>
              </div>
              <div className="col-span-3 md:col-span-3 flex gap-1.5 flex-wrap">
                {p.predFixtures.map((f, fi) => <FDRBadge key={fi} fdr={f.difficulty} isHome={f.isHome} oppShort={teamsMap[f.opponent]?.short_name} />)}
              </div>
              <div className="col-span-3 md:col-span-4 grid grid-cols-3 gap-2 text-right">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-600">Очк.</div>
                  <div className="font-mono text-lg text-lime-400">{p.pred.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-600">Форма</div>
                  <div className="font-mono text-lg text-stone-200">{p.form}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-600">Власн.</div>
                  <div className="font-mono text-lg text-stone-400">{p.selected_by_percent}%</div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// OPTIMIZER VIEW
// ============================================================
function OptimizerView({ players, teams, fixtures, currentGW, weights, seasonEnded, onPlayerClick }) {
  const teamsMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);
  const [horizon, setHorizon] = useState(5);
  const [maxBudget, setMaxBudget] = useState(1000);
  const [maxPerTeam, setMaxPerTeam] = useState(3);
  const [result, setResult] = useState(null);
  const [computing, setComputing] = useState(false);

  const run = useCallback(() => {
    setComputing(true);
    setTimeout(() => {
      const r = optimizeSquad(players, teamsMap, fixtures, currentGW, {
        budget: maxBudget, maxPerTeam, horizon, weights, seasonEnded,
        excluded: new Set(), locked: new Set(),
      });
      setResult(r);
      setComputing(false);
    }, 50);
  }, [players, teamsMap, fixtures, currentGW, maxBudget, maxPerTeam, horizon, weights, seasonEnded]);

  useEffect(() => { run(); }, []); // eslint-disable-line

  const PlayerSlot = ({ p, isCaptain, isVice, isBench }) => (
    <button onClick={() => onPlayerClick(p)} className={`relative w-full p-2.5 rounded-lg border text-left transition-all ${
      isCaptain ? 'border-lime-500/50 bg-lime-950/20' : isVice ? 'border-stone-500/40 bg-stone-800/40' :
      isBench ? 'border-stone-800 bg-stone-900/20' : 'border-stone-800 bg-stone-900/40'
    } hover:border-lime-500/40`}>
      {isCaptain && <Icon name="crown" size={12} className="absolute top-1 right-1 text-lime-400" />}
      {isVice && <span className="absolute top-1 right-1 text-[9px] font-mono text-stone-400">VC</span>}
      <div className="flex items-center gap-1">
        <StatusDot player={p} />
        <div className="font-semibold text-sm truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>{p.web_name}</div>
      </div>
      <div className="text-[10px] text-stone-500 mt-0.5">{teamsMap[p.team]?.short_name} · £{(p.now_cost/10).toFixed(1)}m</div>
      <div className="text-xs text-lime-400 font-mono mt-1">{p.predScore.toFixed(1)} pts</div>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="text-sm text-stone-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {seasonEnded
          ? '🏆 Сезон завершено — підбираю «команду сезону» на основі підсумкових очок і форми. Корисно щоб подивитись, як виглядає ідеальний ретроспективний склад.'
          : 'Підбирає оптимальний склад 15 гравців під твої обмеження. Алгоритм: жадібна евристика з врахуванням прогнозу очок, бюджету, позицій і клубів.'}
      </div>
      <div className="grid md:grid-cols-3 gap-4 p-4 rounded-xl border border-stone-800 bg-stone-900/40">
        <div>
          <label className="text-xs uppercase tracking-wider text-stone-500 block mb-2">{seasonEnded ? 'Контекст оцінки' : 'Горизонт планування'}</label>
          <select value={horizon} onChange={e => setHorizon(Number(e.target.value))} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm" disabled={seasonEnded}>
            <option value="1">Наступний тур</option>
            <option value="3">3 тури</option>
            <option value="5">5 турів</option>
            <option value="8">8 турів</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-stone-500 block mb-2">Бюджет: £{(maxBudget/10).toFixed(1)}m</label>
          <input type="range" min="850" max="1050" value={maxBudget} onChange={e => setMaxBudget(Number(e.target.value))} className="w-full accent-lime-500" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-stone-500 block mb-2">Макс. з одного клубу: {maxPerTeam}</label>
          <input type="range" min="1" max="3" value={maxPerTeam} onChange={e => setMaxPerTeam(Number(e.target.value))} className="w-full accent-lime-500" />
        </div>
      </div>
      <button onClick={run} disabled={computing}
        className="px-5 py-2.5 bg-lime-500 text-stone-950 font-semibold rounded-lg hover:bg-lime-400 transition-colors disabled:opacity-50"
        style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {computing ? 'Розрахунок...' : 'Згенерувати склад'}
      </button>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Вартість" value={`£${(result.totalCost/10).toFixed(1)}m`} />
            <Stat label="Залишок" value={`£${((maxBudget - result.totalCost)/10).toFixed(1)}m`} />
            <Stat label="Прогноз" value={result.predictedTotal.toFixed(1)} accent />
            <Stat label="Формація" value={result.formation ? result.formation.slice(1).join('-') : '—'} />
          </div>

          {result.formation && (
            <div>
              <div className="text-sm uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                <Icon name="star" size={14} /> Стартовий склад
              </div>
              <div className="rounded-xl border border-stone-800 bg-gradient-to-b from-emerald-950/20 to-stone-950 p-4 space-y-3">
                {[1, 2, 3, 4].map(pos => {
                  const inPos = result.startingXI.filter(p => p.element_type === pos);
                  if (inPos.length === 0) return null;
                  return (
                    <div key={pos} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${inPos.length}, minmax(0, 1fr))` }}>
                      {inPos.map(p => <PlayerSlot key={p.id} p={p} isCaptain={p.id === result.captain?.id} isVice={p.id === result.vice?.id} />)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.bench.length > 0 && (
            <div>
              <div className="text-sm uppercase tracking-wider text-stone-400 mb-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>Лавка</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {result.bench.map(p => <PlayerSlot key={p.id} p={p} isBench />)}
              </div>
            </div>
          )}

          {!result.valid && (
            <div className="p-3 rounded-lg border border-orange-500/40 bg-orange-950/20 text-orange-300 text-sm flex items-start gap-2">
              <Icon name="alert" size={16} className="flex-shrink-0 mt-0.5" />
              <div>Не вдалося сформувати повний склад під ці обмеження — спробуй збільшити бюджет.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PLAYER MODAL
// ============================================================
function PlayerModal({ player, team, fixtures, currentGW, teams, onClose }) {
  const [history, setHistory] = useState(null);
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    setHistory(null);
    setLoadingHist(true);
    fetchWithProxy(`${FPL_API}/element-summary/${player.id}/`)
      .then(d => { if (!cancelled) setHistory((d.history || []).filter(h => h.minutes > 0)); })
      .catch(() => { if (!cancelled) setHistory([]); })
      .finally(() => { if (!cancelled) setLoadingHist(false); });
    return () => { cancelled = true; };
  }, [player]);

  if (!player) return null;
  const teamsMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const nextFixtures = getNextFixtures(player.team, fixtures, currentGW, 6);

  const chartData = (history || []).map(h => ({
    gw: h.round,
    actual: h.total_points,
    xp: expectedPointsForGW(player.element_type, h),
  })).sort((a, b) => a.gw - b.gw);

  const totalActual = chartData.reduce((s, d) => s + d.actual, 0);
  const totalXP = chartData.reduce((s, d) => s + d.xp, 0);
  const overPerf = totalActual - totalXP;

  // SVG line chart
  const W = 600, H = 220, pad = 30;
  let chart = null;
  if (chartData.length > 0) {
    const gws = chartData.map(d => d.gw);
    const minGW = Math.min(...gws), maxGW = Math.max(...gws);
    const yMax = Math.max(6, ...chartData.map(d => Math.max(d.actual, d.xp))) + 1;
    const sx = gw => pad + ((gw - minGW) / Math.max(1, maxGW - minGW)) * (W - pad * 2);
    const sy = v => H - pad - (v / yMax) * (H - pad * 2);
    const actualPts = chartData.map(d => `${sx(d.gw)},${sy(d.actual)}`).join(' ');
    const xpPts = chartData.map(d => `${sx(d.gw)},${sy(d.xp)}`).join(' ');
    chart = (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 2, 4, 6, 8, 10].filter(v => v <= yMax).map(v => (
          <g key={v}>
            <line x1={pad} y1={sy(v)} x2={W - pad} y2={sy(v)} stroke="#292524" strokeWidth="1" />
            <text x={pad - 6} y={sy(v) + 3} fill="#78716c" fontSize="10" textAnchor="end" fontFamily="monospace">{v}</text>
          </g>
        ))}
        {chartData.map(d => (
          <text key={d.gw} x={sx(d.gw)} y={H - pad + 14} fill="#78716c" fontSize="9" textAnchor="middle" fontFamily="monospace">{d.gw}</text>
        ))}
        <polyline points={xpPts} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 3" opacity="0.85" />
        <polyline points={actualPts} fill="none" stroke="#6fcd9c" strokeWidth="2.5" />
        {chartData.map(d => <circle key={'a'+d.gw} cx={sx(d.gw)} cy={sy(d.actual)} r="3" fill="#6fcd9c" />)}
        {chartData.map(d => <circle key={'x'+d.gw} cx={sx(d.gw)} cy={sy(d.xp)} r="2.5" fill="#fbbf24" />)}
      </svg>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-stone-950/95 backdrop-blur border-b border-stone-800 p-5 flex items-start justify-between">
          <div>
            <div className="text-3xl tracking-tight" style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}>
              {player.first_name} {player.second_name}
            </div>
            <div className="text-sm text-stone-400 mt-1 flex items-center gap-2">
              <StatusDot player={player} />
              {team?.name} · {POSITIONS_UA[player.element_type]} · £{(player.now_cost/10).toFixed(1)}m
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg transition-colors"><Icon name="x" size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          {player.news && (
            <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-950/20 text-yellow-300 text-sm flex gap-2">
              <Icon name="alert" size={16} className="flex-shrink-0 mt-0.5" />
              <div>{player.news}</div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Очки" value={player.total_points} />
            <Stat label="Форма" value={player.form} />
            <Stat label="Власн." value={`${player.selected_by_percent}%`} />
            <Stat label="ICT" value={player.ict_index} />
            <Stat label="xG" value={player.expected_goals} />
            <Stat label="xA" value={player.expected_assists} />
            <Stat label="xGC" value={player.expected_goals_conceded} />
            <Stat label="Сухарі" value={player.clean_sheets} />
          </div>

          {/* Actual vs expected points chart */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-sm uppercase tracking-wider text-stone-500" style={{ fontFamily: 'DM Sans, sans-serif' }}>Очки: факт vs очікувані (xP)</div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-lime-400"><span className="w-3 h-0.5 bg-lime-400 inline-block" />факт</span>
                <span className="flex items-center gap-1 text-amber-400"><span className="w-3 h-0.5 bg-amber-400 inline-block" style={{ borderTop: '2px dashed' }} />xP</span>
              </div>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-3">
              {loadingHist ? (
                <div className="text-stone-500 text-sm py-8 text-center">Завантажую історію матчів...</div>
              ) : chartData.length === 0 ? (
                <div className="text-stone-500 text-sm py-8 text-center">Немає зіграних матчів (можливо, сезон ще не почався)</div>
              ) : (
                <>
                  {chart}
                  <div className="mt-2 text-xs text-stone-400 text-center">
                    Факт: <span className="font-mono text-lime-400">{totalActual}</span> · Очікувано: <span className="font-mono text-amber-400">{totalXP.toFixed(1)}</span> ·{' '}
                    {overPerf >= 0
                      ? <span className="text-lime-400">перформить на {overPerf.toFixed(1)} вище рівня (реалізація/везіння)</span>
                      : <span className="text-orange-400">недобирає {Math.abs(overPerf).toFixed(1)} (потенціал зростання)</span>}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm uppercase tracking-wider text-stone-500 mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Наступні матчі</div>
            <div className="flex gap-2 flex-wrap">
              {nextFixtures.length === 0 ? <div className="text-stone-500 text-sm">Немає майбутніх матчів</div> :
                nextFixtures.map((f, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="text-[10px] text-stone-600">GW{f.gw}</div>
                    <FDRBadge fdr={f.difficulty} isHome={f.isHome} oppShort={teamsMap[f.opponent]?.short_name} />
                  </div>
                ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-lg border border-stone-800 bg-stone-900/40">
              <div className="text-stone-500 text-xs uppercase tracking-wider mb-1">Хвилин</div>
              <div className="font-mono text-stone-200">{player.minutes}</div>
            </div>
            <div className="p-3 rounded-lg border border-stone-800 bg-stone-900/40">
              <div className="text-stone-500 text-xs uppercase tracking-wider mb-1">Очк/матч</div>
              <div className="font-mono text-stone-200">{player.points_per_game}</div>
            </div>
            <div className="p-3 rounded-lg border border-stone-800 bg-stone-900/40">
              <div className="text-stone-500 text-xs uppercase tracking-wider mb-1">Голи</div>
              <div className="font-mono text-stone-200">{player.goals_scored}</div>
            </div>
            <div className="p-3 rounded-lg border border-stone-800 bg-stone-900/40">
              <div className="text-stone-500 text-xs uppercase tracking-wider mb-1">Асисти</div>
              <div className="font-mono text-stone-200">{player.assists}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS DRAWER
// ============================================================
function SettingsDrawer({ open, onClose, weights, setWeights }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-stone-950 border-l border-stone-800 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-2xl tracking-tight" style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}>Налаштування</div>
            <div className="text-xs text-stone-500 mt-1">Ваги формули прогнозу очок</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg"><Icon name="x" size={18} /></button>
        </div>
        <div className="space-y-5">
          {[
            { key: 'form', label: 'Вага форми', desc: 'Як сильно враховувати поточну форму гравця' },
            { key: 'fdr', label: 'Вага складності календаря', desc: 'Бонус/штраф за легких/складних суперників' },
            { key: 'minutes', label: 'Ризик ротації', desc: 'Знижка для гравців з малою кількістю хвилин' },
          ].map(({ key, label, desc }) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
                <span className="font-mono text-lime-400">{weights[key].toFixed(1)}</span>
              </div>
              <input type="range" min="0" max="2" step="0.1" value={weights[key]} onChange={e => setWeights({ ...weights, [key]: parseFloat(e.target.value) })} className="w-full accent-lime-500" />
              <div className="text-xs text-stone-500 mt-1">{desc}</div>
            </div>
          ))}
          <button onClick={() => setWeights({ form: 1.0, fdr: 0.5, value: 0.0, minutes: 1.0 })} className="w-full py-2 rounded-lg border border-stone-700 hover:border-lime-500/40 text-sm text-stone-300">
            Скинути до стандартних
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXPECTED POINTS (xP) — used in player history chart
// ============================================================
// Compute expected points for a single gameweek from underlying stats.
function expectedPointsForGW(pos, gw) {
  // gw: { minutes, expected_goals, expected_assists, expected_goals_conceded }
  const mins = gw.minutes || 0;
  if (mins === 0) return 0;
  const xG = parseFloat(gw.expected_goals) || 0;
  const xA = parseFloat(gw.expected_assists) || 0;
  const xGC = parseFloat(gw.expected_goals_conceded) || 0;
  const goalVal = pos === 4 ? 4 : pos === 3 ? 5 : 6; // FWD/MID/DEF-GK
  const csVal = (pos === 1 || pos === 2) ? 4 : pos === 3 ? 1 : 0;
  const appearance = mins >= 60 ? 2 : 1;
  // Clean sheet probability ~ Poisson P(0 conceded) = e^-xGC (only counts if played 60+)
  const csProb = mins >= 60 ? Math.exp(-xGC) : 0;
  // GK/DEF also lose ~0.33 pt per 2 goals conceded (approx)
  const concededPenalty = (pos === 1 || pos === 2) ? -(xGC / 2) * 0.5 : 0;
  return appearance + xG * goalVal + xA * 3 + csProb * csVal + concededPenalty;
}

// ============================================================
// CONSISTENCY VIEW
// ============================================================
function ConsistencyView({ players, teams, onPlayerClick }) {
  const teamsMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);
  const [posFilter, setPosFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [minMinutes, setMinMinutes] = useState(900);

  const data = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .filter(p => p.minutes >= minMinutes)
      .filter(p => posFilter === 'all' || p.element_type === Number(posFilter))
      .filter(p => teamFilter === 'all' || p.team === Number(teamFilter))
      .filter(p => !q || `${p.first_name} ${p.second_name} ${p.web_name}`.toLowerCase().includes(q))
      .map(p => {
        const ppg = parseFloat(p.points_per_game) || 0;
        const form = parseFloat(p.form) || 0;
        // Stability score: rewards high baseline AND recent form being close to/above it
        const stability = (ppg * 0.55 + form * 0.45);
        return { ...p, team: teamsMap[p.team], ppg, form, stability };
      })
      .sort((a, b) => b.stability - a.stability);
  }, [players, teamsMap, posFilter, teamFilter, search, minMinutes]);

  const top = data.slice(0, 40);
  // Scatter bounds
  const maxPPG = Math.max(6, ...top.map(p => p.ppg)) + 0.5;
  const maxForm = Math.max(6, ...top.map(p => p.form)) + 0.5;
  const W = 720, H = 460, pad = 44;
  const sx = (v) => pad + (v / maxPPG) * (W - pad * 2);
  const sy = (v) => H - pad - (v / maxForm) * (H - pad * 2);
  const posColor = { 1: '#fbbf24', 2: '#34d399', 3: '#60a5fa', 4: '#f87171' };

  return (
    <div className="space-y-5">
      <div className="text-sm text-stone-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        Хто набирає <strong className="text-stone-200">стабільно</strong>. Вісь X — очки за матч за сезон, вісь Y — форма (останні матчі). Гравці у верхньому-правому куті — стабільно сильні. Вище діагоналі — на ході, нижче — спад.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Пошук за прізвищем..."
            className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-stone-600 focus:outline-none focus:border-lime-500/50"
            style={{ fontFamily: 'DM Sans, sans-serif' }} />
        </div>
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className="bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm">
          <option value="all">Усі позиції</option>
          <option value="1">Воротарі</option>
          <option value="2">Захисники</option>
          <option value="3">Півзахисники</option>
          <option value="4">Нападники</option>
        </select>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm max-w-[180px]">
          <option value="all">Усі клуби</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-stone-400">
          Мін. хвилин:
          <input type="range" min="0" max="3000" step="100" value={minMinutes} onChange={e => setMinMinutes(Number(e.target.value))} className="accent-lime-500 w-32" />
          <span className="font-mono text-stone-200 w-12">{minMinutes}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400 ml-auto">
          {[[1,'ВРТ'],[2,'ЗАХ'],[3,'ПІВ'],[4,'НАП']].map(([k,l]) => (
            <span key={k} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: posColor[k] }} />{l}</span>
          ))}
        </div>
      </div>

      {/* Scatter diagram */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/30 p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 600 }}>
          {/* grid */}
          {[1,2,3,4,5,6,7].map(v => v <= maxPPG && (
            <g key={'x'+v}>
              <line x1={sx(v)} y1={pad} x2={sx(v)} y2={H-pad} stroke="#292524" strokeWidth="1" />
              <text x={sx(v)} y={H-pad+16} fill="#78716c" fontSize="11" textAnchor="middle" fontFamily="monospace">{v}</text>
            </g>
          ))}
          {[1,2,3,4,5,6,7].map(v => v <= maxForm && (
            <g key={'y'+v}>
              <line x1={pad} y1={sy(v)} x2={W-pad} y2={sy(v)} stroke="#292524" strokeWidth="1" />
              <text x={pad-8} y={sy(v)+4} fill="#78716c" fontSize="11" textAnchor="end" fontFamily="monospace">{v}</text>
            </g>
          ))}
          {/* diagonal (form == ppg) */}
          <line x1={sx(0)} y1={sy(0)} x2={sx(Math.min(maxPPG,maxForm))} y2={sy(Math.min(maxPPG,maxForm))} stroke="#44403c" strokeWidth="1" strokeDasharray="4 4" />
          {/* axis labels */}
          <text x={W/2} y={H-6} fill="#a8a29e" fontSize="12" textAnchor="middle" fontFamily="sans-serif">Очки за матч (сезон) →</text>
          <text x={14} y={H/2} fill="#a8a29e" fontSize="12" textAnchor="middle" fontFamily="sans-serif" transform={`rotate(-90 14 ${H/2})`}>Форма (останні матчі) →</text>
          {/* points */}
          {top.map(p => (
            <g key={p.id} className="cursor-pointer" onClick={() => onPlayerClick(p)}>
              <circle cx={sx(p.ppg)} cy={sy(p.form)} r="5" fill={posColor[p.element_type]} opacity="0.85" />
              <text x={sx(p.ppg)+7} y={sy(p.form)+3} fill="#d6d3d1" fontSize="10" fontFamily="sans-serif">{p.web_name}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Ranked stability list */}
      <div>
        <div className="text-sm uppercase tracking-wider text-stone-400 mb-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>Рейтинг стабільності</div>
        <div className="grid sm:grid-cols-2 gap-2">
          {top.slice(0, 16).map((p, i) => (
            <button key={p.id} onClick={() => onPlayerClick(p)} className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-stone-900 bg-stone-950/40 hover:bg-stone-900/60 hover:border-stone-700 transition-all text-left">
              <div className="font-mono text-stone-600 w-6 text-sm">{i + 1}</div>
              <StatusDot player={p} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>{p.web_name}</div>
                <div className="text-[11px] text-stone-500">{p.team?.short_name} · {POSITIONS_UA[p.element_type]} · PPG {p.ppg.toFixed(1)} · форма {p.form.toFixed(1)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-sm text-lime-400">{p.stability.toFixed(1)}</div>
                <div className="text-[10px] text-stone-600">стабільн.</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GLOSSARY DRAWER
// ============================================================
const GLOSSARY = [
  { term: 'xG', full: 'Expected Goals · очікувані голи', desc: 'Скільки голів гравець «мав би» забити за якістю своїх моментів. Високий xG при малій кількості голів = не щастить, скоро забиватиме.' },
  { term: 'xA', full: 'Expected Assists · очікувані асисти', desc: 'Скільки результативних передач гравець «мав би» віддати за якістю своїх пасів під удар.' },
  { term: 'xGC', full: 'Expected Goals Conceded · очікувані пропущені', desc: 'Скільки голів команда гравця «мала б» пропустити. Низький xGC = більше шансів на «сухар». Важливо для захисників і воротарів.' },
  { term: 'xP', full: 'Expected Points · очікувані очки', desc: 'Скільки очок FPL гравець «мав би» набрати за підкладковою статистикою (xG, xA, ймовірність сухаря). Порівняння з реальними очками показує, хто перформить вище/нижче свого рівня.' },
  { term: 'FDR', full: 'Fixture Difficulty Rating · складність матчу', desc: 'Оцінка складності суперника від 1 (дуже легко) до 5 (дуже складно). Зелений = легкий суперник, червоний = важкий.' },
  { term: 'ICT', full: 'Influence · Creativity · Threat', desc: 'Зведений індекс впливу гравця на гру: вплив на результат, креативність (створення моментів) і загроза (власні моменти).' },
  { term: 'PPG', full: 'Points Per Game · очки за матч', desc: 'Середня кількість очок за матч за весь сезон. Показує загальний рівень гравця.' },
  { term: 'Форма', full: 'Form', desc: 'Середня кількість очок за останні матчі (приблизно місяць). Показує, наскільки гравець «гарячий» прямо зараз.' },
  { term: 'Власність', full: 'Ownership · % selected', desc: 'Який відсоток усіх гравців FPL має цього футболіста. Висока власність = популярний вибір; низька = диференціал.' },
  { term: 'Диференціал', full: 'Differential', desc: 'Гравець з низькою власністю (зазвичай <10%) і добрим потенціалом. Якщо «вистрелить» — даєш перевагу над суперниками, бо в них його немає.' },
  { term: 'Цінність', full: 'Value', desc: 'Очки за кожен £1m ціни. Допомагає знайти недорогих гравців, що приносять багато очок (enablers).' },
  { term: 'Сухар', full: 'Clean Sheet · «суха» гра', desc: 'Матч без пропущених голів. Дає +4 очки захисникам і воротарям, +1 півзахисникам.' },
  { term: 'Стабільність', full: 'наш показник', desc: 'Зважене поєднання PPG (рівень за сезон) і форми (останні матчі). Високий = гравець стабільно набирає, а не разово «вистрелив».' },
  { term: 'GW', full: 'Gameweek · ігровий тур', desc: 'Один тур чемпіонату. Сезон APL — 38 турів. Перед кожним туром є дедлайн на зміни складу.' },
  { term: 'BPS', full: 'Bonus Points System', desc: 'Система, що нараховує бонусні очки (3, 2, 1) найкращим гравцям матчу за статистикою (паси, відбори, удари тощо).' },
  { term: 'Капітан / VC', full: 'Captain / Vice-captain', desc: 'Очки капітана множаться на 2. Якщо капітан не зіграв — множник переходить на віцекапітана (VC).' },
];

function GlossaryDrawer({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-stone-950 border-l border-stone-800 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-2xl tracking-tight" style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}>Словник</div>
            <div className="text-xs text-stone-500 mt-1">Що означають скорочення й метрики</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg"><Icon name="x" size={18} /></button>
        </div>
        <div className="space-y-3">
          {GLOSSARY.map(g => (
            <div key={g.term} className="p-3 rounded-lg border border-stone-800 bg-stone-900/40">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-mono text-lime-400 font-semibold">{g.term}</span>
                <span className="text-xs text-stone-500">{g.full}</span>
              </div>
              <div className="text-sm text-stone-300 mt-1.5 leading-snug" style={{ fontFamily: 'DM Sans, sans-serif' }}>{g.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
