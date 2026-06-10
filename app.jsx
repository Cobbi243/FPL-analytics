// ============================================================
// MAIN APP
// ============================================================
function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('dashboard');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [weights, setWeights] = useState({ form: 1.0, fdr: 0.5, value: 0.0, minutes: 1.0 });
  const [proxyInput, setProxyInput] = useState(() => { try { return localStorage.getItem('custom-proxy') || ''; } catch { return ''; } });

  const saveProxy = (val) => {
    setProxyInput(val);
    try { val ? localStorage.setItem('custom-proxy', val.trim()) : localStorage.removeItem('custom-proxy'); } catch {}
  };

  const load = useCallback(async (force = false) => {
    setLoading(true); setError(null);
    try { setData(await loadFPLData(force)); }
    catch (e) { setError(e.message || 'Помилка'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <Icon name="alert" size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl mb-2" style={{ fontFamily: 'Fraunces, serif' }}>Не вдалося завантажити</h2>
          <p className="text-stone-400 text-sm mb-4">{error}</p>
          <p className="text-stone-500 text-xs mb-6">Усі CORS-проксі не відповідають. Спробуй ще раз, або встанови власний проксі (надійніше).</p>
          <div className="flex gap-2 justify-center mb-5">
            <button onClick={() => load(true)} className="px-4 py-2 bg-lime-500 text-stone-950 font-semibold rounded-lg">Спробувати знову</button>
          </div>
          <div className="p-4 rounded-lg border border-stone-800 bg-stone-900/40 text-left">
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Власний проксі (опціонально)</div>
            <input type="text" value={proxyInput} onChange={e => saveProxy(e.target.value)} placeholder="https://твій-сервер/?url=" className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm placeholder:text-stone-600 focus:outline-none focus:border-lime-500/50" />
            <div className="text-[11px] text-stone-500 mt-2 leading-snug">Встав адресу свого проксі (Cloudflare Worker або сервер) і натисни «Спробувати знову».</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-stone-800 border-t-lime-500 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-stone-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>Завантажую дані FPL...</div>
          <div className="text-xs text-stone-600 mt-2">Це може зайняти 5–15 секунд</div>
        </div>
      </div>
    );
  }

  const { bootstrap, fixtures } = data;
  const { elements: players, teams } = bootstrap;
  const currentGW = getCurrentGW(bootstrap.events);
  const currentEvent = bootstrap.events.find(e => e.id === currentGW);
  const seasonEnded = fixtures.filter(f => !f.finished && f.event !== null).length === 0;

  const tabs = [
    { id: 'dashboard', label: 'Дашборд', icon: 'trending' },
    { id: 'players', label: 'Гравці', icon: 'users' },
    { id: 'captain', label: 'Капітан', icon: 'crown' },
    { id: 'optimizer', label: 'Оптимізатор', icon: 'zap' },
    { id: 'consistency', label: 'Стабільність', icon: 'activity' },
    { id: 'trends', label: 'Тренди', icon: 'barchart' },
    { id: 'fixtures', label: 'Календар', icon: 'calendar' },
  ];

  return (
    <div className="min-h-screen text-stone-100" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at top, rgba(79, 175, 125, 0.07), transparent 55%), radial-gradient(ellipse at bottom right, rgba(120, 140, 150, 0.04), transparent 55%)',
      }} />
      <div className="relative">
        <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-5 min-w-0">
              <div className="min-w-0">
                <div className="text-2xl md:text-3xl tracking-tight leading-none" style={{ fontFamily: 'Fraunces, serif', fontWeight: 600 }}>
                  FPL<span className="text-lime-400">.</span>UA
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mt-0.5 truncate">Fantasy Premier League · Аналітика</div>
              </div>
              {currentEvent && (
                <div className="hidden md:flex items-center gap-3 pl-5 ml-2 border-l border-stone-800">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-stone-500">Тур</div>
                    <div className="font-mono text-lg text-stone-200 leading-none mt-0.5">GW{currentGW}</div>
                  </div>
                  {currentEvent.deadline_time && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-stone-500">Дедлайн</div>
                      <div className="font-mono text-sm text-stone-300 leading-none mt-0.5">
                        {new Date(currentEvent.deadline_time).toLocaleString('uk-UA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setShowGlossary(true)} className="p-2 rounded-lg hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition-colors" title="Словник скорочень">
                <Icon name="help" size={18} />
              </button>
              <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition-colors" title="Налаштування">
                <Icon name="settings" size={18} />
              </button>
              <button onClick={() => load(true)} disabled={loading} className="p-2 rounded-lg hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-40" title="Оновити">
                <Icon name="refresh" size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          <div className="border-t border-stone-900">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
              <nav className="flex gap-1 overflow-x-auto -mb-px">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setView(t.id)}
                    className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
                      view === t.id ? 'border-lime-400 text-lime-400' : 'border-transparent text-stone-400 hover:text-stone-200'
                    }`}>
                    <Icon name={t.icon} size={14} /> {t.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </header>

        {data?.fromCache && (
          <div className="max-w-7xl mx-auto px-4 md:px-6 pt-3">
            <div className="text-[11px] text-stone-600 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-stone-600" />
              Кеш від {new Date(data.cachedAt).toLocaleTimeString('uk-UA')}. Натисни оновлення для свіжих даних.
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-20">
          {view === 'dashboard' && <DashboardView players={players} teams={teams} fixtures={fixtures} currentGW={currentGW} weights={weights} seasonEnded={seasonEnded} onPlayerClick={setSelectedPlayer} />}
          {view === 'players' && <PlayersView players={players} teams={teams} fixtures={fixtures} currentGW={currentGW} weights={weights} onPlayerClick={setSelectedPlayer} />}
          {view === 'captain' && <CaptainView players={players} teams={teams} fixtures={fixtures} currentGW={currentGW} weights={weights} seasonEnded={seasonEnded} onPlayerClick={setSelectedPlayer} />}
          {view === 'optimizer' && <OptimizerView players={players} teams={teams} fixtures={fixtures} currentGW={currentGW} weights={weights} seasonEnded={seasonEnded} onPlayerClick={setSelectedPlayer} />}
          {view === 'consistency' && <ConsistencyView players={players} teams={teams} onPlayerClick={setSelectedPlayer} />}
          {view === 'trends' && <TrendsView players={players} teams={teams} onPlayerClick={setSelectedPlayer} />}
          {view === 'fixtures' && <FixturesView teams={teams} fixtures={fixtures} currentGW={currentGW} />}
        </main>

        <footer className="max-w-7xl mx-auto px-4 md:px-6 py-6 border-t border-stone-900 text-xs text-stone-600">
          <div className="flex flex-col md:flex-row justify-between gap-2">
            <div>Дані: офіційне FPL API · Без афіляції з Прем'єр-лігою.</div>
            <div>Прогнози — наша евристика, не фінансова порада 😉</div>
          </div>
        </footer>
      </div>

      <PlayerModal player={selectedPlayer} team={selectedPlayer ? teams.find(t => t.id === selectedPlayer.team) : null} fixtures={fixtures} currentGW={currentGW} teams={teams} onClose={() => setSelectedPlayer(null)} />
      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} weights={weights} setWeights={setWeights} />
      <GlossaryDrawer open={showGlossary} onClose={() => setShowGlossary(false)} />
    </div>
  );
}


// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
