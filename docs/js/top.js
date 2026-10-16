/* 첫 화면(#top) 재생 화면 연출 — HP-662(2026-10-16 조현빈 결정). 스타일 = css/top.css.
   넷플릭스 기본 플레이어 모양의 영상 칸 옆에 Replix 그룹방 패널이 열리고, 한 바퀴(13.9초) 동안 실제 기능을 차례로 보인다 —
   패널이 닫힌 넷플릭스 화면 → 패널 열림 → 이 회차로 방 만들기 → 초대 링크 복사 → 친구 둘 입장(맞추는 중 → 함께 보는 중) →
   대화·반응 → 내가 멈춤 → 32:30 으로 옮김 → 재생 → 패널 닫힘.
   문구는 익스텐션 새 그룹방(HP-655·656) room.js 의 실제 문구다. 그룹방 기본값이 '방장만 재생 제어'라 멈추고 옮기는 사람은
   방장인 나(지우)다 — 광고의 "내가 멈추면 다 같이 멈춰요"와 맞는다. 움직임 줄이기 설정이면 친구 둘이 들어온 방을 멈춘 채 보인다. */
(function () {
  var STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el = document.querySelector('.ys');
  if (!el) return;
  var $ = function (s, r) { return (r || el).querySelector(s); };
  var feed = $('.yp-feed'), mates = $('.yp-mates'), invite = $('.yp-invite'), toast = $('.yp-toast'), state = $('.yp-state');
  var chip = $('.yp-chip'), make = $('.yp-make'), stage = $('.hv-stage'), track = $('.nf-track');
  var floaters = $('.hv-stage > .floaters'), flash = $('.hx-flash');

  /* 넷플릭스식 플레이어(.nf) — 쉴 때는 영상·자막만, 커서가 영상 위로 오면 조작 막대가 나타났다가 사라진다.
     멈춰 있는 동안은 막대가 남는다. 시간은 넷플릭스처럼 남은 시간(48:12 − 지금)으로 보인다. */
  var nf = $('.nf'), nfLeft = $('.nf-left'), nfFlash = $('.nf-flash'), nfPrev = $('.nf-preview');
  var DUR = 2892, hideT = 0;
  function showCtl(ms) {
    if (!nf) return;
    nf.classList.add('nf-on'); clearTimeout(hideT);
    if (ms) hideT = setTimeout(function () { if (!paused) nf.classList.remove('nf-on'); }, ms);
  }
  function flashNf(isPlay) { if (!nfFlash) return; nfFlash.classList.toggle('is-play', !!isPlay); restart(nfFlash, 'go'); }
  function showPreview(fx, label) {
    if (!nfPrev || !track) return;
    var tr = track.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    nfPrev.style.left = (tr.left - sr.left + tr.width * fx) + 'px';
    nfPrev.querySelector('span').textContent = label;
    nfPrev.classList.add('on'); nf.classList.add('nf-scrub');   // 미리보기가 자막 자리를 덮으므로 그동안 자막은 숨긴다
  }
  function hidePreview() { if (nfPrev) nfPrev.classList.remove('on'); if (nf) nf.classList.remove('nf-scrub'); }

  /* 영상(assets/scene/garden.mp4)의 시각(초)과 장면 — 0~4.6 반딧불(앞으로 옮기면 돌아오는 32:30) · 4.6~9.6 등불 정원(시작 = 32:52) ·
     9.6~ 터널을 걷는 두 사람. 방장이 멈추면 영상도 멈추고, 옮기면 반딧불 장면으로 돌아간다. */
  var vid = $('.ys-video'), sub = $('.ys-sub');
  var V_START = 4.6, V_SEEK = 0;
  // 넷플릭스 자막처럼 두 줄로 끊는다(대사는 지어낸 말)
  var SUBS = [[0, 4.6, '봐, 반딧불이야.<br>아직 남아 있었네.'], [4.6, 9.6, '여기가 네가 말한<br>정원이야?'], [9.6, 99, '응. 밤에만<br>열리는 곳이래.']];
  function vSub() { if (!vid || !sub) return; var t = vid.currentTime, txt = ''; SUBS.forEach(function (c) { if (t >= c[0] && t < c[1]) txt = c[2]; }); if (sub.innerHTML !== txt) sub.innerHTML = txt; }
  function vPlay() { if (!vid) return; var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); }
  function vSeek(t) {
    if (!vid) return;
    if (vid.readyState < 1) {   // 길이를 알기 전에 정한 시각은 무시된다 — 정보가 오면 그때 옮긴다
      vid.addEventListener('loadedmetadata', function once() { vid.removeEventListener('loadedmetadata', once); vSeek(t); });
      return;
    }
    try { vid.currentTime = t; } catch (_) {}
    // 받지 않은 구간으로는 못 옮기는 서버(Range 미지원)도 있다 — 옮겨지지 않았으면 데이터가 더 온 뒤 다시 한 번
    if (Math.abs(vid.currentTime - t) > .5) {
      vid.addEventListener('progress', function again() { vid.removeEventListener('progress', again); try { vid.currentTime = t; } catch (_) {} vSub(); });
    }
    vSub();
  }
  if (vid) { vid.addEventListener('timeupdate', vSub); vid.addEventListener('seeked', vSub); vid.loop = true; }

  function mmss(s) { s = Math.floor(s); var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function ro(t) { return /[036]$/.test(t) ? '으로' : '로'; }   // '32:30으로' · '32:52로' — 영·삼·육만 '으로'(일·칠·팔은 ㄹ받침이라 '로')
  var IC = {
    join: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    seek: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6v12l8-6zM12 6v12l8-6z"/></svg>'
  };
  function av(n, on) { return '<i class="yp-av' + (on ? ' on' : '') + '" data-who="' + n + '">' + n.charAt(0) + '</i>'; }

  /* 재생 시계 — 0.25초씩. 진행 막대는 이동이 눈에 보이도록 1초 = 0.35% */
  var SYNC = 1972, clock = SYNC, paused = false;
  function setClock() {
    if (nfLeft) nfLeft.textContent = mmss(DUR - clock);
    el.style.setProperty('--p', (60 + (clock - SYNC) * 0.35).toFixed(2) + '%');
  }
  setClock();
  if (!STILL) setInterval(function () { if (!paused) { clock += 0.25; if (clock > SYNC + 50) clock = SYNC; setClock(); } }, 250);

  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function restart(node, cls) { if (!node) return; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

  /* ── 커서 — 실제 단추 위치로 움직여 누른다 ── */
  var cur = document.createElement('div');
  cur.className = 'yc';
  cur.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 2.5l15.5 9-6.6 1.6 3.7 6.9-2.8 1.5-3.7-6.9L5.1 19z" fill="#fff" stroke="#101016" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  el.appendChild(cur);
  function aim(target, fx, fy, quiet) {
    if (!target) return;
    var b = el.getBoundingClientRect(), r = target.getBoundingClientRect();
    cur.style.transform = 'translate(' + (r.left - b.left + r.width * (fx == null ? .5 : fx)) + 'px,' + (r.top - b.top + r.height * (fy == null ? .55 : fy)) + 'px)';
    cur.classList.add('on');
    // 영상 위로 오면 조작 막대가 뜬다(quiet = 커서가 처음 놓이는 자리 — 첫 화면은 넷플릭스가 쉴 때처럼 영상·자막만)
    if (!quiet && nf && (target === stage || stage.contains(target))) showCtl(2600);
  }
  function tap(target) { restart(cur, 'tap'); if (target) { target.classList.add('press'); setTimeout(function () { target.classList.remove('press'); }, 160); } }
  function hideCursor() { cur.classList.remove('on'); }

  /* ── 패널 동작 ── */
  function line(html, still) { feed.insertAdjacentHTML('beforeend', html); var n = feed.lastElementChild; if (still) n.classList.add('still'); while (feed.children.length > 12) feed.removeChild(feed.firstChild); return n; }
  function sys(kind, text, still) { return line('<span class="yp-sys">' + IC[kind] + text + '</span>', still); }
  function say(who, text, still) { return line('<div class="yp-msg' + (who === '지우' ? ' mine' : '') + '">' + av(who) + '<div><b>' + who + '</b><p>' + text + '</p></div></div>', still); }
  function mate(n, role, status, cls, still) {
    mates.insertAdjacentHTML('beforeend', '<li class="yp-mate' + (still ? '' : ' join') + '" data-m="' + n + '">' + av(n, true) +
      '<div><b>' + n + (role ? '<small>' + role + '</small>' : '') + '</b><span class="' + (cls || '') + '">' + status + '</span></div></li>');
  }
  function setState(text, ok) { state.textContent = text; state.classList.toggle('ok', !!ok); }
  function showToast(t) { toast.textContent = t; restart(toast, 'on'); later(function () { toast.classList.remove('on'); }, 1500); }
  function copied() { invite.classList.add('copied'); showToast('초대 링크를 복사했어요'); later(function () { invite.classList.remove('copied'); }, 2600); }
  function sync() {
    el.classList.add('syncing'); chip.textContent = '맞추는 중';
    restart(flash, 'go');
    later(function () { el.classList.remove('syncing'); setState('함께 보는 중', true); }, 850);
  }
  function join(n) { mate(n, '', '보는 중'); sys('join', n + '님이 들어왔어요'); sync(); }
  function react(e) {
    if (STILL || !floaters) return;
    var f = document.createElement('span');
    f.className = 'floater'; f.textContent = e;
    f.style.left = (14 + Math.random() * 56) + '%'; f.style.bottom = (40 + Math.random() * 26) + 'px';
    floaters.appendChild(f); setTimeout(function () { f.remove(); }, 2700);
  }
  function pauseBy(n) { paused = true; el.classList.add('is-paused'); if (vid) vid.pause(); flashNf(false); showCtl(0); sys('pause', n + '님이 잠시 멈췄어요'); }
  function playBy(n) { paused = false; el.classList.remove('is-paused'); flashNf(true); showCtl(2200); vPlay(); sys('play', n + '님이 재생했어요'); }
  function seekTo(sec, n) {
    el.classList.add('seeking');
    clock = sec; setClock();
    vSeek(V_SEEK);
    var at = mmss(sec);
    later(function () { el.classList.remove('seeking'); hidePreview(); }, 600);
    sys('seek', n + '님이 ' + at + ro(at) + ' 이동했어요');
  }

  function toLobby() {
    el.classList.remove('in-room', 'syncing', 'is-paused'); paused = false;
    if (nf) { clearTimeout(hideT); nf.classList.remove('nf-on'); } hidePreview();
    mates.innerHTML = ''; mate('지우', '방장', '재생 제어 중', 'ctl', true);
    feed.innerHTML = ''; line('<span class="yp-start">대화의 시작이에요</span>', true);
    setState('혼자 보는 중', false); invite.classList.remove('copied');
    clock = SYNC; setClock();
    if (vid) { vSeek(V_START); if (!STILL) vPlay(); }
  }
  /* 패널 여닫기 — 2번 섹션(#intro)처럼 패널 칸이 0.6초 동안 열리고 닫힌다(css/top.css 의 --open).
     처음 그림은 HTML 의 is-shut(닫힘)이다 — 스크립트가 돌기 전에 열린 패널이 잠깐 보였다 닫히지 않게. instant = 애니메이션 없이 */
  function setShut(on, instant) {
    if (instant) el.classList.add('no-anim');
    el.classList.toggle('is-shut', on);
    if (instant) { void el.offsetWidth; el.classList.remove('no-anim'); }
  }
  function toRoom(instant) { if (instant) el.classList.add('no-anim'); el.classList.add('in-room'); if (instant) { void el.offsetWidth; el.classList.remove('no-anim'); } }

  function run(steps, loopMs) {
    timers.forEach(clearTimeout); timers = [];
    steps.forEach(function (s) { later(s[1], s[0]); });
    later(function () { run(steps, loopMs); }, loopMs);
  }

  /* 움직임 줄이기 — 친구 둘이 들어와 함께 보는 중인 방을 멈춘 채 보인다 */
  if (STILL) {
    setShut(false, true);
    el.classList.add('no-anim'); toLobby(); toRoom(true);
    mate('민지', '', '보는 중', '', true); mate('현우', '', '보는 중', '', true);
    setState('함께 보는 중', true);
    sys('join', '민지님이 들어왔어요', true); say('민지', '오 바로 같은 장면이네', true);
    sys('join', '현우님이 들어왔어요', true); say('현우', '3, 2, 1 안 해도 됨 ㅋㅋ', true);
    say('지우', '다음 화도 같이 보자', true);
    if (vid) { vid.pause(); vSeek(10.4); }
    return;
  }

  var seekX = .523;   // 진행 막대에서 누를 곳 — 32:30 이 그려지는 자리(60% − 22초 × 0.35%)와 맞춰, 누른 곳으로 손잡이가 간다
  run([
    // 패널이 닫힌 넷플릭스 화면으로 시작해 0.35초에 패널이 열린다(첫 사건은 0.3~0.4초 — 광고 방문자의 첫 화면 체류 중앙값 1.3초). 커서는 열린 뒤에 나온다
    [0, function () { toLobby(); setShut(true, true); aim(stage, .72, .52, true); hideCursor(); }],
    [350, function () { setShut(false); }],
    [1050, function () { aim(make); }],
    [1600, function () { tap(make); }],
    [1750, function () { toRoom(false); }],
    [2350, function () { aim(invite); }],
    [2900, function () { tap(invite); copied(); }],
    [3450, function () { hideCursor(); }],
    [3750, function () { join('민지'); }],
    [4450, function () { say('민지', '오 바로 같은 장면이네'); }],
    [5050, function () { join('현우'); }],
    [5750, function () { say('현우', '3, 2, 1 안 해도 됨 ㅋㅋ'); }],
    [6050, function () { react('😂'); }],
    [6550, function () { aim(stage, .5, .45); }],
    [7100, function () { tap(); pauseBy('지우'); }],
    [7750, function () { say('민지', '잠깐 이 장면 다시 보자'); }],
    [8350, function () { aim(track, seekX, .5); showPreview(seekX, '32:30'); }],
    [8900, function () { tap(); seekTo(1950, '지우'); }],
    [9550, function () { aim(stage, .5, .45); }],
    [10050, function () { tap(); playBy('지우'); }],
    [10550, function () { hideCursor(); say('현우', '여기 진짜 명장면'); }],
    [10850, function () { react('❤️'); }],
    [11450, function () { say('지우', '다음 화도 같이 보자'); }],
    [11850, function () { react('🔥'); }],
    [12900, function () { setShut(true); }]   // 한 바퀴 끝에 다시 닫혀 처음(넷플릭스 화면)으로 이어진다
  ], 13900);
})();
