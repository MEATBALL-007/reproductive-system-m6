#!/usr/bin/env node
/*
 * monitor.js — realtime monitor for the kinetic HTML presentation (Node only, no deps)
 * ----------------------------------------------------------------------------
 * จับตาดูโฟลเดอร์ src/ แบบเรียลไทม์ ขณะที่อีก Claude แก้ไฟล์ดีไซน์:
 *   - เห็นการแก้ไฟล์ใน src/ → รัน build.js ให้อัตโนมัติ (debounce)
 *   - เสิร์ฟ index.html พร้อม live-reload (รีโหลดเองเมื่อ build เสร็จ)
 *   - แสดงสถานะ build (สำเร็จ/ผิดพลาด), log ไฟล์ที่เปลี่ยน, ขนาดไฟล์, เวลา build ล่าสุด
 *
 * วิธีใช้:  node monitor.js            (เปิดที่ http://localhost:5173)
 *          node monitor.js --port 8080
 *          node monitor.js --no-open   (ไม่เปิดเบราว์เซอร์อัตโนมัติ)
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const INDEX = path.join(ROOT, 'index.html');
const BUILD = path.join(ROOT, 'build.js');

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function argVal(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const PORT = parseInt(argVal('--port', '5173'), 10);
const AUTO_OPEN = !argv.includes('--no-open');

// ── live state ────────────────────────────────────────────────────────────────
const state = {
  status: 'idle',          // idle | building | ok | error
  lastBuild: null,         // ISO timestamp
  durationMs: 0,
  sizeKB: 0,
  problems: [],            // self-contained validation errors from build.js
  log: '',                 // last build stdout/stderr
  changes: [],             // recent change events {file, kind, t}
  buildCount: 0,
};

// SSE clients
const clients = new Set();
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { /* dropped */ }
  }
}

// ── build runner (debounced) ────────────────────────────────────────────────
let buildTimer = null;
let building = false;
let pendingRebuild = false;

function scheduleBuild(reason) {
  if (buildTimer) clearTimeout(buildTimer);
  buildTimer = setTimeout(() => runBuild(reason), 180);
}

function runBuild(reason) {
  if (building) { pendingRebuild = true; return; }
  building = true;
  state.status = 'building';
  broadcast('status', publicState());

  const t0 = Date.now();
  let out = '';
  const child = spawn(process.execPath, [BUILD], { cwd: ROOT });
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { out += d; });
  child.on('close', code => {
    state.durationMs = Date.now() - t0;
    state.lastBuild = new Date().toISOString();
    state.log = out.trim();
    state.buildCount++;
    try { state.sizeKB = +(fs.statSync(INDEX).size / 1024).toFixed(1); } catch { state.sizeKB = 0; }

    // ดึงรายการปัญหา self-contained จาก log (build.js พิมพ์ขึ้นต้นด้วย "  - ")
    state.problems = code !== 0
      ? out.split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.replace(/^\s*-\s*/, ''))
      : [];
    state.status = code === 0 ? 'ok' : 'error';

    broadcast('status', publicState());
    if (code === 0) broadcast('reload', { t: Date.now() });

    building = false;
    if (pendingRebuild) { pendingRebuild = false; scheduleBuild('queued'); }
  });
}

// ── watcher ────────────────────────────────────────────────────────────────
function watchTree() {
  // recursive watch รองรับบน macOS/Windows; ถ้าไม่รองรับ fallback เป็น polling
  let usedRecursive = false;
  try {
    fs.watch(SRC, { recursive: true }, (kind, file) => {
      if (!file) return;
      if (/\.(woff2|DS_Store)$/i.test(file)) return; // ฟอนต์ฝังครั้งเดียว ไม่ต้อง rebuild ทุกครั้ง
      recordChange(file, kind);
      scheduleBuild(file);
    });
    usedRecursive = true;
  } catch { /* fall through to polling */ }

  if (!usedRecursive) {
    const mtimes = new Map();
    const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) walk(full);
      else mtimes.set(full, 0);
    });
    walk(SRC);
    setInterval(() => {
      for (const f of mtimes.keys()) {
        try {
          const m = fs.statSync(f).mtimeMs;
          if (mtimes.get(f) && m !== mtimes.get(f)) {
            recordChange(path.relative(SRC, f), 'change');
            scheduleBuild(f);
          }
          mtimes.set(f, m);
        } catch { /* deleted */ }
      }
    }, 400);
  }
  return usedRecursive;
}

function recordChange(file, kind) {
  const entry = { file: String(file).replace(/\\/g, '/'), kind, t: Date.now() };
  state.changes.unshift(entry);
  state.changes = state.changes.slice(0, 30);
  broadcast('change', entry);
}

function publicState() {
  return {
    status: state.status,
    lastBuild: state.lastBuild,
    durationMs: state.durationMs,
    sizeKB: state.sizeKB,
    problems: state.problems,
    log: state.log,
    buildCount: state.buildCount,
    changes: state.changes,
  };
}

// ── http server ───────────────────────────────────────────────────────────────
const LIVE_RELOAD_SNIPPET = `
<script>
(function(){
  try {
    var es = new EventSource('/__events');
    es.addEventListener('reload', function(){ location.reload(); });
  } catch(e){}
})();
</script>`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(dashboardHtml());
    return;
  }

  if (url === '/__preview') {
    let html;
    try { html = fs.readFileSync(INDEX, 'utf8'); }
    catch { res.writeHead(404); res.end('index.html not built yet'); return; }
    // ฉีด live-reload ก่อน </body>
    html = html.includes('</body>')
      ? html.replace('</body>', LIVE_RELOAD_SNIPPET + '</body>')
      : html + LIVE_RELOAD_SNIPPET;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
    return;
  }

  if (url === '/__events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    res.write(`event: status\ndata: ${JSON.stringify(publicState())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (url === '/__state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(publicState()));
    return;
  }

  if (url === '/__rebuild') {
    runBuild('manual');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
    return;
  }

  res.writeHead(404); res.end('not found');
});

// ── dashboard page ───────────────────────────────────────────────────────────
function dashboardHtml() {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>● Monitor · ระบบสืบพันธุ์ของมนุษย์</title>
<style>
  :root {
    --bg:#0a0f1e; --panel:#0f1424; --line:#1e2a44;
    --ink:#e6edf6; --dim:#8aa0bd; --faint:#5b6f8d;
    --ok:#34d399; --err:#fb7185; --busy:#fbbf24; --acc:#60a5fa;
  }
  * { box-sizing:border-box; }
  html,body { margin:0; height:100%; }
  body {
    background:var(--bg); color:var(--ink);
    font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
    display:grid; grid-template-columns:340px 1fr; height:100vh; overflow:hidden;
  }
  .side {
    border-right:1px solid var(--line); background:linear-gradient(180deg,#0c1322,#0a0f1e);
    display:flex; flex-direction:column; min-height:0;
  }
  .brand { padding:16px 18px; border-bottom:1px solid var(--line); }
  .brand h1 { font-size:14px; margin:0 0 3px; letter-spacing:.2px; }
  .brand p { margin:0; font-size:11px; color:var(--faint); }
  .statusbar {
    display:flex; align-items:center; gap:10px; padding:14px 18px;
    border-bottom:1px solid var(--line);
  }
  .dot { width:11px; height:11px; border-radius:50%; flex:0 0 auto; box-shadow:0 0 0 0 transparent; }
  .dot.idle { background:var(--faint); }
  .dot.ok { background:var(--ok); box-shadow:0 0 12px var(--ok); }
  .dot.error { background:var(--err); box-shadow:0 0 12px var(--err); }
  .dot.building { background:var(--busy); animation:pulse 1s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .stat-label { font-size:13px; font-weight:600; }
  .stat-sub { font-size:11px; color:var(--dim); margin-left:auto; font-variant-numeric:tabular-nums; }
  .metrics { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--line); }
  .metric { background:var(--panel); padding:11px 14px; }
  .metric .k { font-size:10px; color:var(--faint); text-transform:uppercase; letter-spacing:.6px; }
  .metric .v { font-size:17px; font-weight:600; margin-top:3px; font-variant-numeric:tabular-nums; }
  .section { padding:12px 16px; border-bottom:1px solid var(--line); }
  .section h2 { font-size:10px; color:var(--faint); text-transform:uppercase; letter-spacing:.7px; margin:0 0 9px; }
  .problems { color:var(--err); font-size:12px; line-height:1.7; font-family:ui-monospace,monospace; }
  .changes { flex:1; min-height:0; overflow:auto; padding:12px 16px; }
  .chg { display:flex; gap:8px; font-size:11.5px; padding:4px 0; border-bottom:1px solid #131c30; font-family:ui-monospace,monospace; }
  .chg .t { color:var(--faint); flex:0 0 auto; }
  .chg .f { color:var(--acc); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .chg .k { color:var(--faint); margin-left:auto; flex:0 0 auto; }
  .log { font-family:ui-monospace,monospace; font-size:11px; color:var(--dim); white-space:pre-wrap; max-height:130px; overflow:auto; line-height:1.5; }
  .toolbar { display:flex; gap:8px; padding:12px 16px; border-top:1px solid var(--line); }
  button {
    flex:1; background:#15203a; color:var(--ink); border:1px solid var(--line);
    border-radius:8px; padding:8px; font-size:12px; cursor:pointer; font-family:inherit;
  }
  button:hover { border-color:var(--acc); }
  .main { position:relative; min-width:0; }
  .preview { width:100%; height:100%; border:0; background:#0a0f1e; display:block; }
  .flash {
    position:absolute; top:14px; right:16px; background:var(--ok); color:#04231a;
    font-size:11px; font-weight:700; padding:5px 11px; border-radius:999px;
    opacity:0; transition:opacity .25s; pointer-events:none;
  }
  .flash.show { opacity:1; }
  .flash.err { background:var(--err); color:#2a0710; }
</style>
</head>
<body>
  <aside class="side">
    <div class="brand">
      <h1>● Realtime Monitor</h1>
      <p>ระบบสืบพันธุ์ของมนุษย์ · สุขศึกษา ม.6/7</p>
    </div>
    <div class="statusbar">
      <span id="dot" class="dot idle"></span>
      <span id="statusLabel" class="stat-label">รอการเปลี่ยนแปลง…</span>
      <span id="statusSub" class="stat-sub"></span>
    </div>
    <div class="metrics">
      <div class="metric"><div class="k">ขนาด index.html</div><div class="v" id="mSize">—</div></div>
      <div class="metric"><div class="k">build ล่าสุด</div><div class="v" id="mTime">—</div></div>
      <div class="metric"><div class="k">ใช้เวลา</div><div class="v" id="mDur">—</div></div>
      <div class="metric"><div class="k">จำนวน build</div><div class="v" id="mCount">0</div></div>
    </div>
    <div class="section" id="problemsWrap" style="display:none">
      <h2>ปัญหา self-contained</h2>
      <div class="problems" id="problems"></div>
    </div>
    <div class="section">
      <h2>build log</h2>
      <div class="log" id="log">—</div>
    </div>
    <div class="changes">
      <h2 style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.7px;margin:0 0 9px;">ไฟล์ที่เปลี่ยนล่าสุด</h2>
      <div id="changes"></div>
    </div>
    <div class="toolbar">
      <button id="rebuild">↻ Rebuild</button>
      <button id="openPreview">⤢ เปิดพรีวิวเต็มจอ</button>
    </div>
  </aside>
  <main class="main">
    <iframe id="preview" class="preview" src="/__preview"></iframe>
    <div id="flash" class="flash">↻ reloaded</div>
  </main>

<script>
  const $ = s => document.querySelector(s);
  const dot = $('#dot'), statusLabel = $('#statusLabel'), statusSub = $('#statusSub');
  const labels = { idle:'รอการเปลี่ยนแปลง…', building:'กำลัง build…', ok:'build สำเร็จ', error:'build ผิดพลาด' };

  function fmtTime(iso){ if(!iso) return '—'; const d=new Date(iso); return d.toLocaleTimeString('th-TH',{hour12:false}); }
  function ago(t){ const s=Math.round((Date.now()-t)/1000); return s<60? s+'s':(Math.round(s/60)+'m'); }

  function render(s){
    dot.className = 'dot ' + s.status;
    statusLabel.textContent = labels[s.status] || s.status;
    statusSub.textContent = s.lastBuild ? fmtTime(s.lastBuild) : '';
    $('#mSize').textContent = s.sizeKB ? s.sizeKB + ' KB' : '—';
    $('#mTime').textContent = fmtTime(s.lastBuild);
    $('#mDur').textContent  = s.durationMs ? s.durationMs + ' ms' : '—';
    $('#mCount').textContent = s.buildCount;
    $('#log').textContent = s.log || '—';

    const pw = $('#problemsWrap');
    if (s.problems && s.problems.length){
      pw.style.display = 'block';
      $('#problems').innerHTML = s.problems.map(p => '✗ '+p).join('<br>');
    } else { pw.style.display = 'none'; }

    if (s.changes) renderChanges(s.changes);
  }
  function renderChanges(list){
    $('#changes').innerHTML = list.map(c =>
      '<div class="chg"><span class="t">'+ago(c.t)+'</span><span class="f">'+c.file+'</span><span class="k">'+c.kind+'</span></div>'
    ).join('') || '<div style="color:var(--faint);font-size:11px">ยังไม่มีการเปลี่ยนแปลง</div>';
  }

  function flash(ok){
    const f=$('#flash');
    f.textContent = ok? '↻ reloaded' : '✗ build error';
    f.className = 'flash show' + (ok?'':' err');
    setTimeout(()=>f.className='flash',1400);
  }

  const es = new EventSource('/__events');
  es.addEventListener('status', e => { const s=JSON.parse(e.data); render(s); if(s.status==='error') flash(false); });
  es.addEventListener('change', () => { fetch('/__state').then(r=>r.json()).then(render); });
  es.addEventListener('reload', () => {
    $('#preview').contentWindow.location.reload();
    flash(true);
  });

  $('#rebuild').onclick = () => fetch('/__rebuild');
  $('#openPreview').onclick = () => window.open('/__preview','_blank');
  setInterval(()=>{ fetch('/__state').then(r=>r.json()).then(s=>renderChanges(s.changes||[])); }, 5000);
</script>
</body>
</html>`;
}

// ── boot ──────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  const recursive = watchTree();
  // build แรกถ้ายังไม่มี index.html หรือเก่ากว่า src
  if (!fs.existsSync(INDEX)) runBuild('initial');
  else { try { state.sizeKB = +(fs.statSync(INDEX).size / 1024).toFixed(1); state.status='ok'; } catch {} }

  const url = `http://localhost:${PORT}`;
  console.log(`\n  ● Realtime monitor พร้อมแล้ว`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Dashboard : ${url}`);
  console.log(`  Preview   : ${url}/__preview`);
  console.log(`  Watching  : src/  (${recursive ? 'fs.watch recursive' : 'polling 400ms'})`);
  console.log(`  หยุด: Ctrl+C\n`);

  if (AUTO_OPEN) {
    const opener = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'start' : 'xdg-open';
    try { execSync(`${opener} ${url}`); } catch { /* ignore */ }
  }
});
