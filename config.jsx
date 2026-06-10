'use strict';
const { useState, useEffect, useMemo, useCallback } = React;

// ============================================================
// ICONS (inline lucide SVGs)
// ============================================================
const ICONS = {
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  refresh: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></>,
  settings: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  trending: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
  zap: <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  calendar: <><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  sparkles: <><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" /></>,
  alert: <><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>,
  chevdown: <path d="m6 9 6 6 6-6" />,
  chevup: <path d="m18 15-6-6-6 6" />,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  crown: <><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></>,
  activity: <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.24 2.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4 12H2" />,
  barchart: <><line x1="18" x2="18" y1="20" y2="4" /><line x1="12" x2="12" y1="20" y2="10" /><line x1="6" x2="6" y1="20" y2="16" /></>,
  link: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></>,
};

function Icon({ name, size = 16, className = '', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {ICONS[name]}
    </svg>
  );
}

// ============================================================
// CONSTANTS
// ============================================================
const POSITIONS = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const POSITIONS_UA = { 1: 'ВРТ', 2: 'ЗАХ', 3: 'ПІВ', 4: 'НАП' };
const POSITION_QUOTAS = { 1: 2, 2: 5, 3: 5, 4: 3 };

const FDR_COLORS = {
  1: { bg: '#1a5d3a', text: '#a7f3d0', label: 'Дуже легко' },
  2: { bg: '#3f6212', text: '#d9f99d', label: 'Легко' },
  3: { bg: '#713f12', text: '#fde68a', label: 'Середньо' },
  4: { bg: '#7c2d12', text: '#fed7aa', label: 'Складно' },
  5: { bg: '#7f1d1d', text: '#fecaca', label: 'Дуже складно' },
};

const PROXIES = [
  { url: (u) => `https://fpl-proxy.ybolshakov96.workers.dev/?url=${encodeURIComponent(u)}`, type: 'raw' },
  { url: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`, type: 'raw' },
  { url: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`, type: 'raw' },
  { url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, type: 'raw' },
  { url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, type: 'wrapped' },
  { url: (u) => `https://thingproxy.freeboard.io/fetch/${u}`, type: 'raw' },
];

const FPL_API = 'https://fantasy.premierleague.com/api';
// Твій бекенд через HTTPS-міст (Cloudflare Worker → Oracle-сервер)
const BACKEND_BASE = 'https://fpl-proxy.ybolshakov96.workers.dev';
const CACHE_TTL = 30 * 60 * 1000;

const EXPERT_SOURCES = [
  { name: 'r/FantasyPL', url: 'https://www.reddit.com/r/FantasyPL/', desc: 'Найбільша FPL-спільнота, обговорення турів і трансферів' },
  { name: 'FPL Scout (офіційний)', url: 'https://www.premierleague.com/news/fantasy', desc: 'Офіційні поради від експертів Прем\'єр-ліги' },
  { name: 'Fantasy Football Scout', url: 'https://www.fantasyfootballscout.co.uk/', desc: 'Аналітичні статті, частина безкоштовна' },
  { name: 'FPL Family (YouTube)', url: 'https://www.youtube.com/@FPLFamily', desc: 'Щотижневі огляди турів і поради' },
  { name: "Let's Talk FPL (YouTube)", url: 'https://www.youtube.com/@LetsTalkFPL', desc: 'Глибокі розбори, scout picks, capt vote' },
  { name: 'FPL Harry (YouTube)', url: 'https://www.youtube.com/@FPLHarry', desc: 'Стратегія на чипи і довгострокове планування' },
  { name: 'FPL Statistics', url: 'https://www.fplstatistics.co.uk/', desc: 'Прогноз змін цін гравців' },
  { name: 'LiveFPL', url: 'https://www.livefpl.net/', desc: 'Живий розрахунок очок під час турів' },
];

// ============================================================
// STORAGE (localStorage shim)
// ============================================================
const storage = {
  get: async (key) => {
    const v = localStorage.getItem(key);
    if (v === null) return null;
    return { value: v };
  },
  set: async (key, value) => {
    try { localStorage.setItem(key, value); return { value }; } catch (e) { return null; }
  },
};
