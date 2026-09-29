'use strict';
/* =========================================================
   画面の表示（HUD・会話・店・地図など）
   ========================================================= */
const $ = (id) => document.getElementById(id);
const UI = { modal: null, dialog: null, nums: [], bars: [], minimapT: 0 };

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------- お知らせ ---------- */
function toast(msg, kind = '') {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3800);
}
let bannerTimer = 0;
function banner(title, sub = '') {
  const el = $('banner');
  el.querySelector('.t').textContent = title;
  el.querySelector('.s').textContent = sub;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('show'), 3800);
}
function fadeOut(cb, hold = 350) {
  const f = $('fade');
  f.classList.add('on');
  setTimeout(() => { cb && cb(); setTimeout(() => f.classList.remove('on'), hold); }, 450);
}

/* ---------- 会話 ---------- */
function openDialog(lines, onEnd, choices) {
  cancelCast();
  const el = $('dialog');
  UI.dialog = { lines, i: 0, onEnd, choices, typing: 0, full: '' };
  el.classList.add('show');
  GAME.paused = true;
  setInteractHint(null);
  showLine();
}
function showLine() {
  const D = UI.dialog;
  const L = D.lines[D.i];
  const el = $('dialog');
  el.querySelector('.who').textContent = L.who || '';
  el.querySelector('.role').textContent = L.role || '';
  el.classList.toggle('sys', L.who === SYS);
  D.full = L.t; D.typing = 0;
  el.querySelector('.text').textContent = '';
  el.querySelector('.choices').innerHTML = '';
  el.querySelector('.next').style.visibility = 'hidden';
  SOUND.talk();
}
function updateDialog(dt) {
  const D = UI.dialog;
  if (!D) return;
  if (D.typing < D.full.length) {
    D.typing = Math.min(D.full.length, D.typing + dt * 60);
    $('dialog').querySelector('.text').textContent = D.full.slice(0, Math.floor(D.typing));
    if (D.typing >= D.full.length) finishTyping();
  }
}
function finishTyping() {
  const D = UI.dialog;
  const el = $('dialog');
  D.typing = D.full.length;
  el.querySelector('.text').textContent = D.full;
  const last = D.i === D.lines.length - 1;
  if (last && D.choices) {
    const box = el.querySelector('.choices');
    box.innerHTML = '';
    D.choices.forEach((c, k) => {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.addEventListener('click', (e) => { e.stopPropagation(); closeDialog(); c.fn(); });
      if (k === 0) b.classList.add('primary');
      box.appendChild(b);
    });
  } else el.querySelector('.next').style.visibility = 'visible';
}
function advanceDialog() {
  const D = UI.dialog;
  if (!D) return;
  if (D.typing < D.full.length) { finishTyping(); return; }
  if (D.i === D.lines.length - 1 && D.choices) return;
  D.i++;
  if (D.i >= D.lines.length) { const cb = D.onEnd; closeDialog(); cb && cb(); }
  else showLine();
}
function closeDialog() {
  UI.dialog = null;
  $('dialog').classList.remove('show');
  GAME.paused = !!UI.modal;
}

/* ---------- パネル（店・持ち物・地図） ---------- */
function openPanel(id, render) {
  cancelCast();
  closePanel();
  UI.modal = id;
  GAME.paused = true;
  const p = $('panel');
  p.dataset.kind = id;
  p.classList.add('show');
  UI.render = render;
  render();
}
function closePanel() {
  UI.modal = null;
  $('panel').classList.remove('show');
  GAME.paused = !!UI.dialog;
}
function panelHTML(title, body, foot = '') {
  $('panel').innerHTML = `<div class="ph"><h2>${title}</h2><button class="x" data-act="close" aria-label="閉じる">✕</button></div>
    <div class="pb">${body}</div>${foot ? `<div class="pf">${foot}</div>` : ''}`;
}
$('panel').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act, arg = b.dataset.arg;
  if (act === 'close') closePanel();
  else if (act === 'buy') { buy(arg); UI.render(); }
  else if (act === 'use') { useItem(arg); UI.render(); }
  else if (act === 'equip') { equipItem(arg); UI.render(); }
  else if (act === 'tab') { UI.tab = arg; UI.render(); }
  else if (act === 'warp') { closePanel(); warpTo(arg); }
  else if (act === 'save') { saveGame(); }
  else if (act === 'sound') { SOUND.toggle(); UI.render(); }
  else if (act === 'reset') {
    if (confirm('記録を消して最初からやり直しますか？')) { try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* 無視 */ } location.reload(); }
  }
});

function openShop(d) {
  const list = SHOPS[d.shop] || [];
  openPanel('shop', () => {
    const rows = list.map(id => {
      const eq = EQUIP[id], it = ITEMS[id];
      const def = eq || it;
      const owned = eq && STATE.owned.includes(id);
      const have = it ? (STATE.items[id] || 0) : 0;
      const equipped = eq && STATE.equip[eq.slot] === id;
      return `<div class="row"><div class="nm">${esc(def.name)}${equipped ? '<span class="tag">装備中</span>' : ''}
        <small>${esc(def.desc)}${it ? `（所持 ${have}）` : ''}</small></div>
        <div class="pr">${fmt(def.price)} G</div>
        <button data-act="buy" data-arg="${id}" ${owned || STATE.gold < def.price ? 'disabled' : ''}>${owned ? '購入済' : '買う'}</button></div>`;
    }).join('');
    panelHTML(esc(d.role), rows, `所持金 <b>${fmt(STATE.gold)} G</b>`);
  });
}

function openMenu(tab) {
  UI.tab = tab || UI.tab || 'items';
  openPanel('menu', () => {
    const tabs = [['items', '持ち物'], ['equip', '装備'], ['people', '人物帳'], ['quest', '冒険の記録'], ['sys', '設定']];
    let body = `<div class="tabs">${tabs.map(([k, n]) => `<button data-act="tab" data-arg="${k}" class="${UI.tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (UI.tab === 'items') {
      const ids = Object.keys(STATE.items);
      body += ids.length ? ids.map(id => `<div class="row"><div class="nm">${esc(ITEMS[id].name)} ×${STATE.items[id]}<small>${esc(ITEMS[id].desc)}</small></div>
        <button data-act="use" data-arg="${id}">使う</button></div>`).join('') : '<p class="empty">道具を持っていない。</p>';
      if (STATE.keys.length) body += '<h3>大切なもの</h3>' + STATE.keys.map(k => `<div class="row"><div class="nm">${esc(KEY_ITEMS[k].name)}<small>${esc(KEY_ITEMS[k].desc)}</small></div></div>`).join('');
    } else if (UI.tab === 'equip') {
      body += `<p class="stat">Lv ${STATE.lvl}　HP ${fmt(STATE.hp)} / ${fmt(STATE.maxHp)}　魔力 ${fmt(STATE.mp)} / ${fmt(STATE.aura)}<br>
        魔法の威力 ×${STATE.staffMult}　守り ${STATE.def}　魔力の結晶 ${STATE.crystals.length} / ${CRYSTALS.length}</p>`;
      body += STATE.owned.map(id => {
        const e = EQUIP[id];
        const on = STATE.equip[e.slot] === id;
        return `<div class="row"><div class="nm">${esc(e.name)}${on ? '<span class="tag">装備中</span>' : ''}<small>${esc(e.desc)}</small></div>
          <button data-act="equip" data-arg="${id}" ${on ? 'disabled' : ''}>装備</button></div>`;
      }).join('');
    } else if (UI.tab === 'people') {
      const met = NPCS.filter(n => STATE.met.includes(n.id));
      body += `<p class="stat">出会った人 ${met.length} / ${NPCS.length}</p>`;
      body += met.length ? met.map(n => `<div class="row person"><div class="nm">${esc(n.name)}<span class="tag">${esc(n.role)}</span><small>${esc(n.persona)}</small></div></div>`).join('')
        : '<p class="empty">まだ誰とも話していない。</p>';
    } else if (UI.tab === 'quest') {
      const s = mainStep();
      body += `<h3>第一章「灯火の魔法使い」</h3><div class="row"><div class="nm">${esc(s.title)}<small>${esc(s.obj)}</small></div></div>`;
      body += MAIN.slice(0, STATE.main).map(m => `<div class="row done"><div class="nm">✓ ${esc(m.title)}</div></div>`).reverse().join('');
      const sides = NPCS.filter(n => n.side && STATE.side[n.side.id]);
      if (sides.length) body += '<h3>依頼</h3>' + sides.map(n => {
        const st = STATE.side[n.side.id];
        const txt = st.state === 2 ? '達成' : st.count >= n.side.n ? `${n.name}に報告しよう` : `${ETYPES[n.side.kill].name} ${st.count} / ${n.side.n}`;
        return `<div class="row ${st.state === 2 ? 'done' : ''}"><div class="nm">${esc(n.name)}の依頼<small>${esc(txt)}</small></div></div>`;
      }).join('');
    } else {
      body += `<div class="row"><div class="nm">記録する<small>今の状態をこのブラウザに保存します（宿屋に泊まっても記録されます）</small></div><button data-act="save">記録</button></div>
        <div class="row"><div class="nm">効果音<small>${SOUND.on ? 'オン' : 'オフ'}</small></div><button data-act="sound">切替</button></div>
        <div class="row"><div class="nm">最初からやり直す<small>記録を消去します</small></div><button data-act="reset">消去</button></div>
        <p class="help">${IS_TOUCH ? '左側をなぞって移動、右側をなぞって視点。詠唱ボタンを長押しで魔力を込め、離して放つ。' :
        'WASD 移動 / Shift 走る / Space ジャンプ / 左クリック長押し・F 詠唱 / 右ドラッグ 視点 / 1・2・3 属性 / Q オートフォーカス / Tab 狙いの切替 / E 話す・調べる / M 地図 / I 持ち物'}</p>`;
    }
    panelHTML('メニュー', body, `所持金 <b>${fmt(STATE.gold)} G</b>　プレイ時間 ${Math.floor(STATE.playTime / 60)}分`);
  });
}

/* ---------- 地図 ---------- */
function openMap() {
  openPanel('map', () => {
    const warps = WARPS.filter(w => STATE.warps.includes(w.id));
    const list = warps.map(w => `<button class="warp" data-act="warp" data-arg="${w.id}">✦ ${esc(w.name)}</button>`).join('');
    panelHTML('世界地図', `<canvas id="bigmap"></canvas><div class="warps"><h3>転移石（押すと移動）</h3>${list || '<p class="empty">まだ転移石に触れていない。</p>'}</div>`);
    drawBigMap();
  });
}
function mapColorFor(x, z, S) { return [(x + HALF) / WS * S, (z + HALF) / WS * S]; }
function drawBigMap() {
  const c = $('bigmap');
  if (!c) return;
  const S = Math.min(c.parentElement.clientWidth, 720);
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.drawImage(MAP_CANVAS, 0, 0, S, S);
  g.font = `700 ${Math.max(10, S / 60)}px "Zen Kaku Gothic New", sans-serif`;
  g.textAlign = 'center';
  for (const p of PLACES) {
    const [x, y] = mapColorFor(p.x, p.z, S);
    g.fillStyle = 'rgba(40,24,12,0.85)';
    g.beginPath(); g.arc(x, y, Math.max(3, S / 200), 0, 7); g.fill();
    g.fillStyle = '#fff8e6'; g.strokeStyle = 'rgba(30,20,10,0.9)'; g.lineWidth = 3;
    g.strokeText(p.name, x, y - 8); g.fillText(p.name, x, y - 8);
  }
  for (const w of WARPS) {
    const [x, y] = mapColorFor(w.x, w.z, S);
    const on = STATE.warps.includes(w.id);
    g.fillStyle = on ? '#8fd4ff' : 'rgba(120,130,150,0.7)';
    g.save(); g.translate(x, y + 10); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore();
  }
  const m = questMarker();
  if (m && !GAME.inDungeon) {
    const [x, y] = mapColorFor(m.x, m.z, S);
    g.strokeStyle = '#ffd84a'; g.lineWidth = 3;
    g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke();
  }
  const pp = GAME.inDungeon ? SPOTS.dungeonDoor : player.pos;
  const [px, py] = mapColorFor(pp.x, pp.z, S);
  g.save(); g.translate(px, py); g.rotate(-player.facing + Math.PI);
  g.fillStyle = '#ff5a3a'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke();
  g.restore();
  c.onclick = (e) => {
    const r = c.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width * S, my = (e.clientY - r.top) / r.height * S;
    for (const w of WARPS) {
      if (!STATE.warps.includes(w.id)) continue;
      const [x, y] = mapColorFor(w.x, w.z, S);
      if (Math.hypot(mx - x, my - (y + 10)) < 14) { closePanel(); warpTo(w.id); return; }
    }
  };
}
function drawMinimap() {
  const c = $('minimap');
  const S = c.width;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.clip();
  if (GAME.inDungeon) {
    g.fillStyle = '#15130f'; g.fillRect(0, 0, S, S);
    const k = S / 90;
    for (let r = 0; r < DUNGEON_MAP.length; r++) for (let q = 0; q < DUNGEON_MAP[0].length; q++) {
      if (DUNGEON_MAP[r][q] === '#') continue;
      const [x, z] = dcell(q, r);
      g.fillStyle = DUNGEON_MAP[r][q] === 'B' ? '#6a2a2a' : '#5a5448';
      g.fillRect(S / 2 + (x - player.pos.x - DCELL / 2) * k, S / 2 + (z - player.pos.z - DCELL / 2) * k, DCELL * k + 0.5, DCELL * k + 0.5);
    }
  } else {
    const span = 300;             // 表示範囲（m）
    const k = S / span;
    const src = span / CELL;
    const sx = (player.pos.x + HALF) / CELL - src / 2, sy = (player.pos.z + HALF) / CELL - src / 2;
    g.fillStyle = '#3f86a8'; g.fillRect(0, 0, S, S);
    g.imageSmoothingEnabled = false;
    g.drawImage(MAP_CANVAS, sx, sy, src, src, 0, 0, S, S);
    g.font = '700 10px "Zen Kaku Gothic New", sans-serif'; g.textAlign = 'center';
    for (const p of PLACES) {
      const x = S / 2 + (p.x - player.pos.x) * k, y = S / 2 + (p.z - player.pos.z) * k;
      if (x < -40 || y < -20 || x > S + 40 || y > S + 20) continue;
      g.fillStyle = '#fff8e6'; g.strokeStyle = 'rgba(30,20,10,0.9)'; g.lineWidth = 3;
      g.strokeText(p.name, x, y); g.fillText(p.name, x, y);
    }
    g.fillStyle = '#e8c8ff';
    for (const n of NPC_LIST) {
      const x = S / 2 + (n.pos.x - player.pos.x) * k, y = S / 2 + (n.pos.z - player.pos.z) * k;
      if (x > 0 && y > 0 && x < S && y < S) g.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }
  const k2 = GAME.inDungeon ? S / 90 : S / 300;
  g.fillStyle = '#ff4a3a';
  for (const e of ENEMIES) {
    if (!e.alive || e.dungeon !== GAME.inDungeon) continue;
    const x = S / 2 + (e.pos.x - player.pos.x) * k2, y = S / 2 + (e.pos.z - player.pos.z) * k2;
    if (x > 0 && y > 0 && x < S && y < S) { g.beginPath(); g.arc(x, y, e.T.boss ? 4 : 2, 0, 7); g.fill(); }
  }
  // 目的地
  const m = questMarker();
  if (m) {
    let x = S / 2 + (m.x - player.pos.x) * k2, y = S / 2 + (m.z - player.pos.z) * k2;
    const dx = x - S / 2, dy = y - S / 2, d = Math.hypot(dx, dy), lim = S / 2 - 10;
    if (d > lim) { x = S / 2 + dx / d * lim; y = S / 2 + dy / d * lim; }
    g.fillStyle = '#ffd84a'; g.strokeStyle = '#3a2a0a'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.stroke();
  }
  g.restore();
  // 自分
  g.save(); g.translate(S / 2, S / 2); g.rotate(-player.facing + Math.PI);
  g.fillStyle = '#fff'; g.strokeStyle = '#1f2a33'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill(); g.stroke();
  g.restore();
  // 北
  g.fillStyle = '#fff8e6'; g.font = '700 11px sans-serif'; g.textAlign = 'center';
  g.fillText('N', S / 2, 12);
}

/* ---------- 数字と体力バー ---------- */
function popNumber(x, y, z, text, color, tag, small) {
  const el = document.createElement('div');
  el.className = 'num' + (tag ? ' ' + tag : '') + (small ? ' small' : '');
  el.textContent = tag === 'weak' ? text + '!' : text;
  el.style.color = color;
  $('labels').appendChild(el);
  UI.nums.push({ el, x: x + (Math.random() - 0.5) * 0.6, y, z: z + (Math.random() - 0.5) * 0.6, life: 1.0 });
  if (UI.nums.length > 40) { const o = UI.nums.shift(); o.el.remove(); }
}
function project(x, y, z) {
  tmpV.set(x, y, z).project(camera);
  if (tmpV.z > 1) return null;
  return [(tmpV.x * 0.5 + 0.5) * innerWidth, (-tmpV.y * 0.5 + 0.5) * innerHeight];
}
function updateLabels(dt) {
  for (let i = UI.nums.length - 1; i >= 0; i--) {
    const n = UI.nums[i];
    n.life -= dt; n.y += dt * 1.6;
    const p = project(n.x, n.y, n.z);
    if (n.life <= 0 || !p) { if (n.life <= 0) { n.el.remove(); UI.nums.splice(i, 1); } else n.el.style.display = 'none'; continue; }
    n.el.style.display = '';
    n.el.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -50%) scale(${0.8 + n.life * 0.4})`;
    n.el.style.opacity = Math.min(1, n.life * 2);
  }
  // 敵の体力バー
  const list = ENEMIES.filter(e => e.alive && e.active && (GAME.time - e.lastHit < 6 || e === FOCUS.target) &&
    Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z) < 60).slice(0, 12);
  while (UI.bars.length < list.length) {
    const el = document.createElement('div');
    el.className = 'ebar'; el.innerHTML = '<i></i>';
    $('labels').appendChild(el);
    UI.bars.push(el);
  }
  UI.bars.forEach((el, i) => {
    const e = list[i];
    const p = e && project(e.pos.x, e.pos.y + e.height + 0.5, e.pos.z);
    if (!p) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -50%)`;
    el.firstChild.style.width = (e.hp / e.maxHp * 100) + '%';
  });
  // 照準（狙いがないときは画面の十字、あるときは敵の上の輪）
  const ch = $('crosshair');
  const showCross = !FOCUS.target && GAME.started && !GAME.paused && !GAME.dead;
  ch.style.display = showCross ? 'block' : 'none';
  if (showCross) {
    ch.style.setProperty('--c', ELEM[STATE.element].css);
    ch.classList.toggle('charging', MAGIC.charging);
  }
  const t = FOCUS.target, ret = $('reticle');
  const p = t && project(t.pos.x, t.pos.y + t.height * 0.5, t.pos.z);
  if (p) {
    ret.style.display = 'block';
    const s = clamp(3000 / Math.max(4, Math.hypot(t.pos.x - camera.position.x, t.pos.z - camera.position.z)) * (0.4 + t.radius * 0.5), 34, 140);
    ret.style.width = ret.style.height = s + 'px';
    ret.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -50%)`;
  } else ret.style.display = 'none';
  const tb = $('target');
  const show = t || ENEMIES.find(e => e.T.boss && e.alive && e.aggro && e.active);
  if (show) {
    tb.classList.add('show');
    tb.classList.toggle('boss', !!show.T.boss);
    tb.querySelector('.n').textContent = `${show.T.name}  Lv${show.T.lv}`;
    const wk = show.T.weak ? `弱点：${ELEM[show.T.weak].name}` : '';
    tb.querySelector('.w').textContent = wk;
    tb.querySelector('i').style.width = Math.max(0, show.hp / show.maxHp * 100) + '%';
  } else tb.classList.remove('show');
}

/* ---------- HUD ---------- */
let lastArea = '';
function updateHUD(dt) {
  $('hpbar').style.width = (STATE.hp / STATE.maxHp * 100) + '%';
  $('mpbar').style.width = (STATE.mp / STATE.aura * 100) + '%';
  $('hptxt').textContent = `${fmt(STATE.hp)} / ${fmt(STATE.maxHp)}`;
  $('mptxt').textContent = `${fmt(STATE.mp)} / ${fmt(STATE.aura)}`;
  $('lv').textContent = STATE.lvl;
  $('gold').textContent = fmt(STATE.gold);
  $('expbar').style.width = (STATE.exp / expNeed(STATE.lvl) * 100) + '%';
  const area = areaName(player.pos.x, player.pos.z);
  if (area !== lastArea) {
    $('place').textContent = area;
    if (lastArea) { const el = $('areaname'); el.textContent = area; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
    lastArea = area;
  }
  const s = mainStep();
  $('qtitle').textContent = s.title;
  let obj = s.obj;
  if (s.kill && s.n) obj += `（${STATE.mainKills} / ${s.n}）`;
  $('qobj').textContent = obj;
  const m = questMarker();
  $('qdist').textContent = m ? `目的地まで ${fmt(Math.hypot(m.x - player.pos.x, m.z - player.pos.z))} m` : '';
  UI.minimapT -= dt;
  if (UI.minimapT <= 0) { UI.minimapT = 0.1; drawMinimap(); }
  // チャージ表示
  const ch = $('charge');
  if (MAGIC.charging) {
    ch.classList.add('show');
    ch.querySelector('b').textContent = fmt(MAGIC.chargeE * STATE.staffMult * ELEM[STATE.element].mult);
    ch.querySelector('i').style.width = Math.min(100, STATE.mp / STATE.aura * 100) + '%';
  } else ch.classList.remove('show');
}

function setElementUI() {
  document.querySelectorAll('.elbtn').forEach(b => b.classList.toggle('on', b.dataset.el === STATE.element));
  const e = ELEM[STATE.element];
  $('castBtn').style.setProperty('--c', e.css);
  $('castBtn').querySelector('span').textContent = e.name;
}
function setFocusUI() {
  $('focusBtn').classList.toggle('on', FOCUS.on);
}
function setInteractHint(obj) {
  const el = $('hint'), btn = $('talkBtn');
  if (!obj || GAME.paused) { el.classList.remove('show'); btn.classList.remove('show'); return; }
  const label = obj.npc ? `話す：${obj.npc.name}` : obj.label;
  el.innerHTML = IS_TOUCH ? '' : `<kbd>E</kbd> ${esc(label)}`;
  el.classList.toggle('show', !IS_TOUCH);
  btn.textContent = obj.npc ? '話す' : '調べる';
  btn.classList.add('show');
}
