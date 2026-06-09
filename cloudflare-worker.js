// Cloudflare Worker — CORS-проксі для FPL / FIFA даних
// Скопіюй увесь цей код у редактор воркера на dash.cloudflare.com
// (інструкція покроково — у файлі CLOUDFLARE-PROXY.md)

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    // CORS-заголовки, які дозволяють твоєму сайту читати відповідь
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    // Браузер спочатку шле OPTIONS (preflight) — відповідаємо одразу
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (!target) {
      return new Response('Додай ?url=<адреса> до запиту', { status: 400, headers: cors });
    }

    // Дозволяємо тільки потрібні домени (щоб твій проксі ніхто не використовував для іншого)
    const allowed = ['fantasy.premierleague.com', 'play.fifa.com'];
    let host;
    try { host = new URL(target).hostname; } catch { return new Response('Невалідний url', { status: 400, headers: cors }); }
    if (!allowed.some(d => host === d || host.endsWith('.' + d))) {
      return new Response('Домен не дозволено', { status: 403, headers: cors });
    }

    // Тягнемо дані з цільового сервера і віддаємо назад з CORS-заголовками
    try {
      const resp = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      });
      const body = await resp.text();
      return new Response(body, {
        status: resp.status,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  },
};
