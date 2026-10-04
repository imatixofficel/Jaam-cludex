#!/usr/bin/env node
import express from 'express';
import dotenv from 'dotenv';
import chalk from 'chalk';
import boxen from 'boxen';
import open from 'open';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

dotenv.config();
const DIR = path.dirname(fileURLToPath(import.meta.url));
const HOME = path.join(os.homedir(), '.jaam');
const CFG = path.join(HOME, 'config.json');
const PORT = Number(process.env.PORT) || 8787;
const gold = chalk.hex('#FFD700'), violet = chalk.hex('#8B6CFF'), soft = chalk.hex('#C9B8FF');

// ───────── Terminal banner ─────────
console.log('\n' + gold.bold('   ✦ ✦ ✦   به نام خداوند دادار پاک   ✦ ✦ ✦'));
console.log(gold.bold('        پدید آور آدم از آب و خاک\n'));
console.log(violet(`     ██╗ █████╗  █████╗ ███╗   ███╗
     ██║██╔══██╗██╔══██╗████╗ ████║
     ██║███████║███████║██╔████╔██║
██   ██║██╔══██║██╔══██║██║╚██╔╝██║
╚█████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║
 ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝`));
console.log(gold.bold('\n   Jaam — See the Truth | جام — ببین حقیقت رو'));
console.log(gold('   Claude × Matrix — Unlimited AI Bridge\n'));
console.log(soft('   «سال‌ها دل طلب جام جم از ما می‌کرد\n    وآنچه خود داشت ز بیگانه تمنا می‌کرد»  — حافظ\n'));

// ───────── Config ─────────
const DEFAULTS = { provider: process.env.DEFAULT_PROVIDER || 'openai', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', active: false };
const loadCfg = () => { try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CFG, 'utf8')) }; } catch { return { ...DEFAULTS }; } };
const saveCfg = c => { fs.mkdirSync(HOME, { recursive: true }); fs.writeFileSync(CFG, JSON.stringify(c, null, 2)); };
const mask = k => (k ? k.slice(0, 4) + '••••••••' + k.slice(-3) : '');

// ───────── Protocol conversion ─────────
const txt = c => (typeof c === 'string' ? c : (c || []).filter(b => b.type === 'text').map(b => b.text).join('\n'));
const STOP = { stop: 'end_turn', length: 'max_tokens', tool_calls: 'tool_use' };

function anthropicToOpenAI(b, cfg) {
  const m = [];
  if (b.system) m.push({ role: 'system', content: txt(b.system) });
  for (const x of b.messages || []) {
    if (typeof x.content === 'string') { m.push({ role: x.role, content: x.content }); continue; }
    if (x.role === 'assistant') {
      const calls = x.content.filter(c => c.type === 'tool_use').map(c => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.input || {}) } }));
      const o = { role: 'assistant', content: txt(x.content) || null };
      if (calls.length) o.tool_calls = calls;
      m.push(o);
    } else {
      for (const c of x.content.filter(c => c.type === 'tool_result')) m.push({ role: 'tool', tool_call_id: c.tool_use_id, content: txt(c.content) });
      const t = txt(x.content);
      if (t) m.push({ role: 'user', content: t });
    }
  }
  const o = { model: cfg.model, messages: m, max_tokens: b.max_tokens, stream: !!b.stream };
  if (b.temperature != null) o.temperature = b.temperature;
  if (b.tools?.length) o.tools = b.tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  return o;
}

function openAIToAnthropic(r, model) {
  const ch = r.choices[0], msg = ch.message, content = [];
  if (msg.content) content.push({ type: 'text', text: msg.content });
  for (const t of msg.tool_calls || []) {
    let input = {}; try { input = JSON.parse(t.function.arguments || '{}'); } catch {}
    content.push({ type: 'tool_use', id: t.id, name: t.function.name, input });
  }
  return { id: 'msg_' + Date.now(), type: 'message', role: 'assistant', model, content: content.length ? content : [{ type: 'text', text: '' }], stop_reason: STOP[ch.finish_reason] || 'end_turn', stop_sequence: null, usage: { input_tokens: r.usage?.prompt_tokens || 0, output_tokens: r.usage?.completion_tokens || 0 } };
}

async function streamToAnthropic(up, res, model) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify({ type: e, ...d })}\n\n`);
  send('message_start', { message: { id: 'msg_' + Date.now(), type: 'message', role: 'assistant', model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } });
  let idx = -1, cur = null, stop = 'end_turn'; const tools = {};
  const close = () => { if (cur !== null) { send('content_block_stop', { index: idx }); cur = null; } };
  const dec = new TextDecoder(); let buf = '';
  for await (const chunk of up.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    for (const l of lines) {
      if (!l.startsWith('data:')) continue;
      const d = l.slice(5).trim(); if (!d || d === '[DONE]') continue;
      let j; try { j = JSON.parse(d); } catch { continue; }
      const c = j.choices?.[0]; if (!c) continue;
      const dl = c.delta || {};
      if (dl.content) {
        if (cur !== 'text') { close(); idx++; cur = 'text'; send('content_block_start', { index: idx, content_block: { type: 'text', text: '' } }); }
        send('content_block_delta', { index: idx, delta: { type: 'text_delta', text: dl.content } });
      }
      for (const t of dl.tool_calls || []) {
        const k = t.index ?? 0;
        if (tools[k] === undefined) { close(); idx++; tools[k] = idx; cur = 'tool' + k; send('content_block_start', { index: idx, content_block: { type: 'tool_use', id: t.id || 'toolu_' + Date.now() + k, name: t.function?.name || '', input: {} } }); }
        if (t.function?.arguments) send('content_block_delta', { index: tools[k], delta: { type: 'input_json_delta', partial_json: t.function.arguments } });
      }
      if (c.finish_reason) stop = STOP[c.finish_reason] || 'end_turn';
    }
  }
  close();
  send('message_delta', { delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 0 } });
  send('message_stop', {});
  res.end();
}

// ───────── Server ─────────
const app = express();
app.use(express.json({ limit: '50mb' }));
app.get('/background.jpg', (req, res, next) => { const f = path.join(HOME, 'background.jpg'); fs.existsSync(f) ? res.sendFile(f) : next(); });
app.use(express.static(path.join(DIR, 'public')));
app.use((req, _res, next) => { if (req.path !== '/api/config') console.log(violet(`  ➜ ${new Date().toLocaleTimeString()}  ${req.method} ${req.path}`)); next(); });

const err = msg => ({ type: 'error', error: { type: 'api_error', message: msg } });

app.get('/', (_req, res) => res.type('html').send(PANEL));
app.get('/api/config', (_req, res) => { const c = loadCfg(); res.json({ ...c, apiKey: mask(c.apiKey), hasKey: !!c.apiKey, port: PORT }); });
app.post('/api/config', (req, res) => {
  const old = loadCfg(), b = req.body || {};
  const c = { provider: b.provider || old.provider, apiKey: b.apiKey?.trim() || old.apiKey, baseUrl: (b.baseUrl || old.baseUrl).trim(), model: (b.model || old.model).trim() };
  c.active = !!(c.apiKey && c.baseUrl && c.model);
  saveCfg(c);
  res.json({ ok: true, active: c.active });
});

app.post('/v1/messages/count_tokens', (req, res) => res.json({ input_tokens: Math.ceil(JSON.stringify(req.body).length / 4) }));

app.post('/v1/messages', async (req, res) => {
  const cfg = loadCfg();
  if (!cfg.apiKey) return res.status(401).json(err(`API Key تنظیم نشده است. پنل را در http://localhost:${PORT} باز کنید.`));
  try {
    const body = anthropicToOpenAI(req.body, cfg);
    const up = await fetch(cfg.baseUrl.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey }, body: JSON.stringify(body) });
    if (!up.ok) return res.status(up.status).json(err((await up.text()).slice(0, 600)));
    if (body.stream) return await streamToAnthropic(up, res, req.body.model);
    res.json(openAIToAnthropic(await up.json(), req.body.model));
  } catch (e) {
    console.log(chalk.red('  ✖ ' + e.message));
    if (!res.headersSent) res.status(502).json(err('سرویس مقصد پاسخ نداد: ' + e.message)); else res.end();
  }
});

// ───────── Panel (single page, inline CSS/JS) ─────────
const PANEL = `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>جام | Jaam</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<style>
*{box-sizing:border-box;margin:0}
:root{--glass:rgba(255,255,255,.055);--line:rgba(255,255,255,.13);--v:#8b6cff;--v2:#c9b8ff;--gold:#f3dfa2;--ok:#4ade80;--bad:#f87171}
body{font-family:'Vazirmatn','Vazir',Tahoma,sans-serif;color:#eee9ff;min-height:100vh;padding:20px;
 background:url(/background.jpg) center/cover fixed,radial-gradient(1000px 600px at 70% -10%,#3b2a8f 0%,transparent 60%),radial-gradient(800px 500px at 0% 100%,#2a1a6e 0%,transparent 60%),#0a0620}
/* BACKGROUND_IMAGE_HERE: عکس را با نام background.jpg در پوشه public بگذارید */
.shell{max-width:1180px;margin:auto;display:grid;grid-template-columns:210px 1fr 290px;gap:16px;border:1px solid var(--line);border-radius:28px;padding:16px;background:rgba(20,12,60,.45);backdrop-filter:blur(18px)}
.g{background:var(--glass);border:1px solid var(--line);border-radius:20px;padding:18px;backdrop-filter:blur(10px)}
nav{display:flex;flex-direction:column;gap:6px}
nav b{font-size:20px;margin-bottom:14px;display:block}
nav a{padding:11px 14px;border-radius:12px;color:var(--v2);text-decoration:none;font-size:14px}
nav a.on{background:linear-gradient(90deg,rgba(139,108,255,.4),rgba(139,108,255,.1));color:#fff;border:1px solid rgba(139,108,255,.6)}
nav .links{margin-top:auto;font-size:12px;opacity:.8;line-height:2}
main{display:flex;flex-direction:column;gap:16px}
.hero{text-align:center;padding:26px 10px 6px}
.verse{font-size:clamp(19px,2.6vw,28px);line-height:2.1;color:var(--gold);font-weight:500}
.hero h1{font-size:15px;font-weight:400;color:var(--v2);margin-top:8px}
.tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.tile{cursor:pointer;padding:14px 8px;text-align:center;font-size:14px;border-radius:16px;background:var(--glass);border:1px solid var(--line);color:inherit;font-family:inherit}
.tile.on{border-color:var(--v);background:rgba(139,108,255,.25);box-shadow:0 0 18px rgba(139,108,255,.4)}
label{display:block;font-size:13px;color:var(--v2);margin:12px 0 6px}
input{width:100%;padding:13px 14px;border-radius:14px;border:1px solid var(--line);background:rgba(8,4,30,.55);color:#fff;font:14px 'Vazirmatn',monospace;direction:ltr;text-align:left}
input:focus{outline:2px solid var(--v);outline-offset:1px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
button.go{margin-top:18px;width:100%;padding:14px;border:0;border-radius:14px;font:600 15px 'Vazirmatn';color:#fff;cursor:pointer;background:linear-gradient(135deg,#7c5cff,#a58bff);box-shadow:0 6px 24px rgba(124,92,255,.5)}
aside{display:flex;flex-direction:column;gap:16px}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--bad);margin-left:8px}
.dot.on{background:var(--ok);box-shadow:0 0 10px var(--ok)}
.kv{font-size:13px;line-height:2.1;color:var(--v2)}.kv span{color:#fff;direction:ltr;unicode-bidi:embed}
pre{direction:ltr;text-align:left;font-size:12px;background:rgba(8,4,30,.6);padding:12px;border-radius:12px;overflow:auto;margin-top:8px;color:#d9ceff}
#msg{margin-top:12px;font-size:13px;min-height:20px}
@media(max-width:900px){.shell{grid-template-columns:1fr}.tiles{grid-template-columns:repeat(3,1fr)}nav{display:none}.row{grid-template-columns:1fr}}
</style></head><body>
<div class="shell">
<nav class="g"><b>☕ جام</b><a class="on" href="#">تنظیمات</a><a href="https://t.me/Imatix7">تلگرام</a><a href="https://github.com/imatixofficel">گیت‌هاب</a>
<div class="links">Jaam v1.0.0<br>Claude × Matrix</div></nav>
<main>
<div class="g hero"><div class="verse">به نام خداوند دادار پاک<br>پدید آور آدم از آب و خاک</div><h1>جام — ببین حقیقت رو · Jaam, the AI bridge for Claude Code</h1></div>
<div class="g"><div class="tiles" id="tiles"></div>
<label for="key">API Key</label><input id="key" type="password" placeholder="sk-…" autocomplete="off">
<label for="url">Base URL</label><input id="url" placeholder="https://api.openai.com/v1">
<label for="model">Model</label><input id="model" placeholder="gpt-4o">
<button class="go" onclick="save()">ذخیره و فعال‌سازی</button><div id="msg"></div></div>
</main>
<aside>
<div class="g"><div style="font-size:15px;margin-bottom:8px"><i class="dot" id="dot"></i><span id="st">غیرفعال</span></div>
<div class="kv">سرویس: <span id="sP">—</span><br>مدل: <span id="sM">—</span><br>کلید: <span id="sK">—</span></div></div>
<div class="g"><div style="font-size:14px">اتصال Claude Code</div><pre id="cmd"></pre></div>
</aside></div>
<script>
var P={openai:['OpenAI','https://api.openai.com/v1','gpt-4o'],gemini:['Gemini','https://generativelanguage.googleapis.com/v1beta/openai','gemini-2.5-pro'],deepseek:['DeepSeek','https://api.deepseek.com/v1','deepseek-chat'],groq:['Groq','https://api.groq.com/openai/v1','llama-3.3-70b-versatile'],custom:['سفارشی','','']};
var cur='openai',$=function(i){return document.getElementById(i)};
function pick(k,keep){cur=k;document.querySelectorAll('.tile').forEach(function(t){t.classList.toggle('on',t.dataset.k===k)});if(!keep&&k!=='custom'){$('url').value=P[k][1];$('model').value=P[k][2]}}
Object.keys(P).forEach(function(k){var b=document.createElement('button');b.className='tile';b.dataset.k=k;b.textContent=P[k][0];b.onclick=function(){pick(k)};$('tiles').appendChild(b)});
function render(c){pick(P[c.provider]?c.provider:'custom',true);$('url').value=c.baseUrl;$('model').value=c.model;$('key').placeholder=c.hasKey?c.apiKey:'sk-…';
 $('dot').className='dot'+(c.active?' on':'');$('st').textContent=c.active?'فعال':'غیرفعال';$('sP').textContent=(P[c.provider]||P.custom)[0];$('sM').textContent=c.model;$('sK').textContent=c.hasKey?c.apiKey:'وارد نشده';
 $('cmd').textContent='export ANTHROPIC_BASE_URL=http://localhost:'+c.port+'\\nexport ANTHROPIC_AUTH_TOKEN=jaam\\nclaude'}
function load(){fetch('/api/config').then(function(r){return r.json()}).then(render)}
function save(){fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:cur,apiKey:$('key').value,baseUrl:$('url').value,model:$('model').value})})
 .then(function(r){return r.json()}).then(function(d){$('key').value='';$('msg').style.color=d.active?'#4ade80':'#f87171';$('msg').textContent=d.active?'ذخیره شد و فعال است.':'کلید API یا آدرس وارد نشده است.';load()})}
load();
</script></body></html>`;

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(boxen(gold.bold('پنل جام') + '\n' + violet(url), { padding: 1, borderStyle: 'double', borderColor: '#8B6CFF' }));
  open(url).catch(() => {});
}).on('error', e => { console.log(chalk.red(e.code === 'EADDRINUSE' ? `  ✖ پورت ${PORT} اشغال است. در فایل .env پورت دیگری بگذارید.` : e.message)); process.exit(1); });
