export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const query = url.searchParams;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // 📊 GET /view
    if (request.method === 'GET' && pathname === '/view') {
      const date = query.get('date') || new Date().toISOString().slice(0, 10);
      const list = await env.LOGS_KV.list({ prefix: `log:${date}` });

      const results = [];
      for (const key of list.keys) {
        const value = await env.LOGS_KV.get(key.name);
        if (!value) continue;
        const item = JSON.parse(value);
        if (matchFilters(item, query)) results.push(item);
      }

      const acceptHeader = request.headers.get("Accept") || "";
      const wantsJSON = acceptHeader.includes("application/json");

      if (wantsJSON) {
        return new Response(JSON.stringify(results, null, 2), {
          status: 200,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      // 回傳 HTML 表格畫面
      return new Response(renderHTML(results, date, query), {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 📨 POST /
    if (request.method === 'POST') {
      const today = new Date().toISOString().slice(0, 10);
      const counterKey = `counter:${today}`;
      const currentCount = parseInt(await env.LOGS_KV.get(counterKey)) || 0;

      if (currentCount >= 800) {
        return new Response('🚫 每日寫入上限已達，請明天再試', {
          status: 429, headers: corsHeaders()
        });
      }

      let data;
      try {
        data = await request.json();
        if (!data.localTimeUTC) data.localTimeUTC = new Date().toISOString();
      } catch {
        return new Response('❌ JSON 格式錯誤', {
          status: 400, headers: corsHeaders()
        });
      }

      const timestamp = new Date().toISOString();
      const logKey = `log:${today}:${timestamp}`;
      await env.LOGS_KV.put(logKey, JSON.stringify(data));
      await env.LOGS_KV.put(counterKey, (currentCount + 1).toString());

      return new Response('✅ 資料已記錄', {
        status: 200, headers: corsHeaders()
      });
    }

    return new Response('⛔ 路徑錯誤', {
      status: 404, headers: corsHeaders()
    });
  }
};

// ✅ 篩選器（支援巢狀屬性）
function matchFilters(item, query) {
  for (const [key, value] of query.entries()) {
    if (key === 'date') continue;
    const keys = key.split('.');
    let actual = item;
    for (const k of keys) actual = actual?.[k];
    if (actual?.toString() !== value) return false;
  }
  return true;
}

// ✅ CORS
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

// ✅ HTML 表格畫面產生
function renderHTML(data, date, query) {
  const filters = [...query.entries()]
    .filter(([k]) => k !== 'date')
    .map(([k, v]) => `<span><code>${k}</code>=<code>${v}</code></span>`)
    .join(', ') || '無';

  const rows = data.map(item => `
    <tr>
      <td>${item.os || ''}</td>
      <td>${item.language || ''}</td>
      <td>${item.timezone || ''}</td>
      <td>${item.localTimeUTC || ''}</td>
      <td>${item.touchSupport ? '✅' : '❌'}</td>
      <td>${item.screen?.width || ''} × ${item.screen?.height || ''}</td>
      <td><code style="font-size: 0.75em">${item.userAgent?.slice(0, 80)}...</code></td>
    </tr>
  `).join('\n');

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <title>📊 裝置資料紀錄 (${date})</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #f9f9f9; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #eee; }
    code { background: #f2f2f2; padding: 2px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>📊 裝置資料紀錄 - ${date}</h1>
  <p>🔍 篩選條件：${filters}</p>
  <p>共 <strong>${data.length}</strong> 筆</p>
  <table>
    <thead>
      <tr>
        <th>OS</th>
        <th>語言</th>
        <th>時區</th>
        <th>UTC 時間</th>
        <th>觸控</th>
        <th>螢幕尺寸</th>
        <th>User-Agent</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7">尚無資料</td></tr>'}
    </tbody>
  </table>
</body>
</html>
`.trim();
}
