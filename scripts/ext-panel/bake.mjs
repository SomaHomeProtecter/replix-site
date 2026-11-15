// scripts/ext-panel/bake.mjs — 랜딩의 익스텐션 화면(docs/ext)을 굽는다(HP-677).
//
// 랜딩(replix.tv)에 보이는 익스텐션 패널은 손으로 그린 모형이 아니라 익스텐션의 실제 화면을 구워 둔 것이다. 이 스크립트가
//   ① Replix-extension 의 실제 마크업·CSS·모듈을 가짜 서버 응답으로 돌리는 하네스(harness.html)를 크롬 headless 로 열어 장면별 대본을 돌리고
//   ② 그동안의 패널을 '보이는 것만 남긴 HTML' 장면 목록으로 떠서 docs/ext/film-<장면>.js 로 쓰고
//   ③ 익스텐션 styles.css(약 0.7MB)에서 그 장면들이 쓰는 규칙만 남겨 docs/ext/panel.css 로 쓰고
//   ④ 장면에 나오는 글자만 남긴 글꼴을 docs/ext/fonts/ 에 만든다(--python 을 줬을 때 — subset-font.py).
// 익스텐션 화면이 바뀌면(특히 그룹방) 그 버전 태그를 체크아웃해 다시 굽고 결과를 커밋한다. 빌드 단계가 없는 레포라 결과가 곧 배포물이다.
//
// 실행:  node scripts/ext-panel/bake.mjs --ext <Replix-extension 폴더> [--python <fonttools·brotli 가 깔린 python>] [--chrome <크롬 실행 파일>]
//   예:  git -C ../Replix-extension worktree add /tmp/ext-1.6.0 ext-v1.6.0
//        python3 -m venv /tmp/rx-font && /tmp/rx-font/bin/pip install fonttools==4.63.0 brotli
//        node scripts/ext-panel/bake.mjs --ext /tmp/ext-1.6.0 --python /tmp/rx-font/bin/python
// 장면 대본(누가 언제 들어오고 무슨 말을 하는지)은 harness.html 의 SCRIPTS, 장면 크기는 아래 SCENES 다. 자세한 설명은 notes/ext-panel.md.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = resolve(repo, 'docs/ext');
const arg = (name) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const EXT = arg('ext') && resolve(arg('ext'));
if (!EXT || !existsSync(join(EXT, 'styles.css'))) { console.error('--ext <Replix-extension 폴더> 가 필요하다(styles.css 가 있는 곳)'); process.exit(1); }
const CHROME = arg('chrome') || process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PYTHON = arg('python');

// 장면 크기 = 랜딩에서 그 패널이 그려지는 제 크기(iframe 의 폭·높이, css/ext-panel.css · js/ext-panels.js 가 줄여 보인다).
// loop = 스스로 되풀이하는 장면의 한 바퀴(ms). hero 는 랜딩 js/top.js 가 돌린다.
const SCENES = [
  { name: 'hero', w: 360, h: 560 },
  { name: 'friends', w: 360, h: 560 },
  { name: 'discord', w: 300, h: 429 },
  { name: 'solo', w: 360, h: 424 },
  { name: 'live', w: 360, h: 530, loop: 11000 },
  // 스트리머 방(HP-876)
  { name: 'streamlobby', w: 360, h: 560 }, { name: 'streamer', w: 360, h: 560 }, { name: 'streamerlive', w: 360, h: 560 },
  { name: 'streamermenu', w: 360, h: 560 }, { name: 'streamset', w: 360, h: 660 },
  { name: 'viewer', w: 360, h: 560 }, { name: 'viewerlive', w: 360, h: 560 }, { name: 'viewerdelay', w: 360, h: 560 },
];

const version = JSON.parse(readFileSync(join(EXT, 'manifest.json'), 'utf8')).version;
const template = readFileSync(join(EXT, 'content.js'), 'utf8').split('root.innerHTML = `')[1].split('`;')[0];
const harness = readFileSync(join(here, 'harness.html'), 'utf8').replace('@@TEMPLATE@@', () => template);
const FONT_SRC = "chrome-extension://__MSG_@@extension_id__/fonts/";
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2' };
const PURGE_PAGE = '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="./ext/styles.css"><div id="replix-root" class="replix-open"></div>';

const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const send = (body, type) => { res.writeHead(200, { 'content-type': type + (type.startsWith('text') ? '; charset=utf-8' : '') }); res.end(body); };
  if (path === '/harness.html') return send(harness, 'text/html');
  if (path === '/purge.html') return send(PURGE_PAGE, 'text/html');
  if (path.startsWith('/ext/')) {
    const file = normalize(join(EXT, path.slice(5)));
    if (!file.startsWith(EXT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    let body = readFileSync(file);
    if (path === '/ext/styles.css') body = body.toString('utf8').split(FONT_SRC).join('./fonts/');
    return send(body, TYPES[extname(file)] || 'application/octet-stream');
  }
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

// ── 크롬 ──
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + mkdtempSync(join(tmpdir(), 'rx-bake-')),
  '--no-first-run', '--hide-scrollbars', '--force-prefers-reduced-motion=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsRoot = await new Promise((ok, no) => {
  let buf = '';
  chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) ok(m[1]); });
  chrome.on('exit', () => no(new Error('크롬이 뜨지 않았다: ' + CHROME)));
  setTimeout(() => no(new Error('크롬 디버깅 주소를 받지 못했다')), 15000);
});
const port = new URL(wsRoot).port;
async function tab(w, h) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = new Map();
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (e) => { const m = JSON.parse(e.data); const p = m.id && pend.get(m.id); if (p) { pend.delete(m.id); m.error ? p.no(new Error(m.error.message)) : p.ok(m.result); } };
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; pend.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const run = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const open = async (url) => { await send('Page.navigate', { url }); await new Promise((r) => setTimeout(r, 400)); };
  const close = async () => { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`); };
  return { run, open, close };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  // ① ② 장면 굽기
  const films = [];
  for (const sc of SCENES) {
    const t = await tab(sc.w, sc.h);
    await t.open(base + '/harness.html#' + sc.name);
    await t.run('window.__ready');
    await t.run('document.fonts.ready.then(() => true)');
    await sleep(900);   // 방에 들어간 채 시작하는 장면이 머리·명단을 다 그릴 때까지
    const film = await t.run('RX.record()');
    await t.close();
    Object.assign(film, { w: sc.w, h: sc.h, ext: version }, sc.loop ? { loop: sc.loop } : {});
    films.push(film);
    console.log(`${sc.name}: 장면 ${film.frames.length}개, ${(JSON.stringify(film).length / 1024).toFixed(1)}KB`);
  }

  // ③ 쓰는 규칙만 남긴 CSS — 구운 장면을 원본 styles.css 가 걸린 빈 페이지에 하나씩 넣고, 그때 맞는 규칙을 모은다.
  //    마우스·포커스 상태 규칙은 뺀다(랜딩의 패널은 누를 수 없는 그림이다 — pointer-events: none).
  const p = await tab(360, 560);
  await p.open(base + '/purge.html');
  await p.run('document.fonts.ready.then(() => true)');
  await p.run(`(${function () {
    const used = new Set(), STATE = /:(hover|active|focus-visible|focus-within|focus)\b/;
    const each = (rules, fn) => { for (const r of rules) { if (r instanceof CSSStyleRule) fn(r); else if (r.cssRules && !(r instanceof CSSKeyframesRule)) each(r.cssRules, fn); } };
    const hits = (sel) => {
      let s = sel.replace(/:not\(\s*:(hover|active|focus-visible|focus-within|focus)\s*\)/g, '');
      if (STATE.test(s)) return false;
      s = s.replace(/::?(before|after|placeholder|selection|marker|first-line|first-letter|backdrop|-webkit-[a-z-]+|-moz-[a-z-]+)(\([^)]*\))?/g, '').trim() || '*';
      if (/[>+~]$/.test(s)) s += ' *';
      try { return !!document.querySelector(s); } catch (_) { return true; }
    };
    window.__mark = (html, light) => {
      const root = document.getElementById('replix-root');
      if (light) root.setAttribute('data-rx-theme', 'light'); else root.removeAttribute('data-rx-theme');
      root.innerHTML = html;
      for (const sheet of document.styleSheets) each(sheet.cssRules, (r) => { if (!used.has(r) && hits(r.selectorText)) used.add(r); });
    };
    window.__emit = () => {
      const frames = [];
      const walk = (rules) => {
        let s = '';
        for (const r of rules) {
          if (r instanceof CSSStyleRule) { if (used.has(r)) s += r.cssText + '\n'; }
          else if (r instanceof CSSKeyframesRule) frames.push(r);
          else if (r instanceof CSSImportRule) continue;
          else if (r.cssRules) { const inner = walk(r.cssRules); if (inner) s += r.cssText.slice(0, r.cssText.indexOf('{') + 1) + '\n' + inner + '}\n'; }
          else s += r.cssText + '\n';
        }
        return s;
      };
      let css = '';
      for (const sheet of document.styleSheets) css += walk(sheet.cssRules);
      for (const k of frames) if (new RegExp('[\\s:,]' + k.name + '[\\s;,}]').test(css)) css += k.cssText + '\n';
      return css;
    };
  }.toString()})()`);
  for (const film of films) for (const f of film.frames) await p.run(`__mark(${JSON.stringify(f.h)}, ${film.light})`);
  let css = await p.run('__emit()');
  await p.close();
  css = css.replace(/url\("?[^")]*ReplixSans-Variable\.woff2"?\)/g, 'url("fonts/ReplixSans-subset.woff2")');
  const head = `/* 익스텐션 ${version} 의 styles.css 에서 랜딩 장면(film-*.js)이 쓰는 규칙만 남긴 것 — scripts/ext-panel/bake.mjs 가 만든다. 손으로 고치지 않는다. */\n`;
  writeFileSync(join(out, 'panel.css'), head + css);
  console.log(`panel.css: ${(css.length / 1024).toFixed(1)}KB`);

  for (const film of films) {
    const name = film.scene; delete film.scene;
    writeFileSync(join(out, `film-${name}.js`), `/* 익스텐션 ${version} 화면을 구운 장면(${name}) — scripts/ext-panel/bake.mjs 가 만든다. 손으로 고치지 않는다. */\nwindow.RX_FILM = ${JSON.stringify(film)};\n`);
  }

  // ④ 글꼴 — 장면에 나오는 글자(글자·입력칸 안내 글)와 ASCII 만 남긴다
  const chars = new Set();
  for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
  for (const film of films) for (const f of film.frames) for (const ch of f.h.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]*?(placeholder="([^"]*)")?[^>]*>/g, ' $2 ')) chars.add(ch);
  const text = [...chars].join('');
  if (PYTHON) {
    const r = spawnSync(PYTHON, [join(here, 'subset-font.py'), join(EXT, 'fonts'), join(out, 'fonts')], { input: text, encoding: 'utf8' });
    process.stdout.write(r.stdout || ''); if (r.status !== 0) { process.stderr.write(r.stderr || ''); process.exitCode = 1; }
  } else console.log('글꼴은 다시 만들지 않았다(--python 없음) — 장면의 글자가 바뀌었으면 --python 을 주고 다시 돌린다');
} finally {
  chrome.kill(); server.close();
}
