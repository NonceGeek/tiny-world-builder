  // Worlds MMO — in-world HUD: hearts/energy, resource tallies, the four harvest
  // actions (fish/mine/gather/hunt) with cooldowns, world chat, and a leave button.
  // Pure view layer: it subscribes to the room client's events (47) and calls its
  // harvest/sendChat/leaveRoom API. IIFE-wrapped; no globals leak.
  (function wireWorldsHud() {
    'use strict';
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
    const WS = (window.__tinyworldWorlds = window.__tinyworldWorlds || {});
    function T(k, p) { return typeof window.t === 'function' ? window.t(k, p) : k; }
    function on(ev, cb) { if (typeof WS.on === 'function') WS.on(ev, cb); }
  
    function el(tag, attrs, kids) {
      const n = document.createElement(tag);
      if (attrs) for (const k of Object.keys(attrs)) {
        if (k === 'class') n.className = attrs[k];
        else if (k === 'text') n.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
        else n.setAttribute(k, attrs[k]);
      }
      if (kids) for (const c of [].concat(kids)) if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      return n;
    }
  
    function injectStyles() {
      if (document.getElementById('tw-worlds-hud-style')) return;
      const css = `
  .tw-hud{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:66;display:none;
    align-items:center;gap:12px;background:#0c1424e6;border:1px solid rgba(255,255,255,.18);
    border-radius:14px;padding:10px 14px;color:#eef3ff;font-family:system-ui}
  .tw-hud.open{display:flex}
  .tw-hud .grp{display:flex;align-items:center;gap:6px;font:600 13px system-ui}
  .tw-hud .hearts{letter-spacing:1px;color:#ff6b81;font-size:14px}
  .tw-hud .res span{margin-right:8px}
  .tw-hud .act{border:0;border-radius:9px;padding:9px 12px;cursor:pointer;font:600 12px system-ui;color:#fff;background:#2b59d6}
  .tw-hud .act:disabled{opacity:.4;cursor:not-allowed}
  .tw-hud .leave{background:rgba(255,255,255,.12)}
  .tw-hud .role{font:600 11px system-ui;text-transform:uppercase;letter-spacing:.05em;opacity:.7}
  .tw-chat{position:fixed;right:12px;bottom:14px;z-index:66;display:none;flex-direction:column;width:260px;
    background:#0c1424e6;border:1px solid rgba(255,255,255,.18);border-radius:12px;overflow:hidden;font-family:system-ui}
  .tw-chat.open{display:flex}
  .tw-chat .log{height:140px;overflow:auto;padding:8px;font-size:12px;display:flex;flex-direction:column;gap:3px}
  .tw-chat .log b{color:#9cc0ff}
  .tw-chat .row{display:flex;border-top:1px solid rgba(255,255,255,.12)}
  .tw-chat input{flex:1;border:0;background:transparent;color:#fff;padding:8px;font-size:13px;outline:none}
  .tw-chat button{border:0;background:#2b59d6;color:#fff;padding:0 12px;cursor:pointer;font:600 12px system-ui}
  `;
      document.head.appendChild(el('style', { id: 'tw-worlds-hud-style', text: css }));
    }
  
    let hud = null, chat = null, heartsEl = null, resEl = null, roleEl = null, chatLog = null, chatInput = null;
    const actBtns = {};
    const cooldowns = {};   // action -> timestamp until enabled
  
    function build() {
      if (hud) return;
      injectStyles();
      heartsEl = el('span', { class: 'hearts' });
      resEl = el('span', { class: 'res' });
      roleEl = el('span', { class: 'role' });
      const actGrp = el('div', { class: 'grp' });
      [['fish', 'worlds.actionFish', '🐟'], ['mine', 'worlds.actionMine', '⛏'], ['gather', 'worlds.actionGather', '🌿'], ['hunt', 'worlds.actionHunt', '🥩']]
        .forEach(([action, key, icon]) => {
          const b = el('button', { class: 'act', text: icon + ' ' + T(key), onclick: () => { if (typeof WS.harvest === 'function') WS.harvest(action); } });
          actBtns[action] = b; actGrp.appendChild(b);
        });
      hud = el('div', { class: 'tw-hud' }, [
        el('div', { class: 'grp' }, [el('span', { text: '❤' }), heartsEl]),
        el('div', { class: 'grp' }, [resEl]),
        actGrp,
        roleEl,
        el('button', { class: 'act leave', text: T('worlds.leave'), onclick: () => { if (typeof WS.leaveRoom === 'function') WS.leaveRoom(); } }),
      ]);
      document.body.appendChild(hud);
  
      chatLog = el('div', { class: 'log' });
      chatInput = el('input', { placeholder: T('worlds.chat'), maxlength: '280',
        onkeydown: (e) => { if (e.key === 'Enter') sendChat(); } });
      chat = el('div', { class: 'tw-chat' }, [chatLog, el('div', { class: 'row' }, [chatInput, el('button', { text: T('worlds.send'), onclick: sendChat })])]);
      document.body.appendChild(chat);
    }
  
    function sendChat() {
      const v = chatInput.value.trim();
      if (v && typeof WS.sendChat === 'function') { WS.sendChat(v); chatInput.value = ''; }
    }
  
    function renderHearts(n) {
      const max = 10; const filled = Math.max(0, Math.min(max, Math.round(n || 0)));
      heartsEl.textContent = '×' + filled + ' ' + '♥'.repeat(filled) + '♡'.repeat(max - filled);
    }
    function renderResources(r) {
      r = r || (typeof WS.getResources === 'function' ? WS.getResources() : {});
      resEl.textContent = '';
      [['🐟', r.fish], ['🥩', r.meat], ['🌿', r.plants], ['⛏', r.ore]].forEach(([icon, v]) => {
        resEl.appendChild(el('span', { text: icon + ' ' + (v || 0) }));
      });
    }
    function setRole(role) {
      roleEl.textContent = role === 'play' ? '' : T('worlds.observing');
      const playable = role === 'play';
      for (const a of Object.keys(actBtns)) actBtns[a].disabled = !playable;
    }
  
    function disableDuring(ms, only) {
      const until = Date.now() + ms;
      const targets = only ? [only] : Object.keys(actBtns);
      for (const a of targets) { cooldowns[a] = until; actBtns[a].disabled = true; }
      setTimeout(refreshCooldowns, ms + 30);
    }
    function refreshCooldowns() {
      const now = Date.now();
      for (const a of Object.keys(actBtns)) {
        if ((cooldowns[a] || 0) <= now) {
          const playable = (WS.getState && WS.getState().role) === 'play';
          actBtns[a].disabled = !playable;
        }
      }
    }
  
    function show() { build(); hud.classList.add('open'); chat.classList.add('open'); renderResources(); }
    function hide() { if (hud) hud.classList.remove('open'); if (chat) chat.classList.remove('open'); }
  
    on('enter', () => { show(); });
    on('leave', () => { hide(); });
    on('status', (d) => { if (d && d.role) setRole(d.role); });
    on('state', (s) => { build(); if (s) { renderHearts(s.you && s.you.hearts); setRole(s.role); } renderResources(); });
    on('you', (y) => { if (y) renderHearts(y.hearts); });
    on('resources', (r) => renderResources(r));
    on('progress', (d) => { build(); disableDuring(d && d.durationMs ? d.durationMs : 3000); });
    on('result', (d) => { renderResources(); if (d && d.action) disableDuring(d.cooldownMs || 5000, d.action); });
    on('deny', (d) => {
      const reason = d && d.reason;
      if (reason === 'no-hearts') { if (typeof twToast === 'function') twToast(T('worlds.noHearts')); }
      else if (reason === 'cooldown') { if (typeof twToast === 'function') twToast(T('worlds.cooldown')); }
    });
    on('chat', (d) => {
      if (!chatLog || !d) return;
      chatLog.appendChild(el('div', {}, [el('b', { text: (d.name || 'Player') + ': ' }), document.createTextNode(String(d.text || ''))]));
      chatLog.scrollTop = chatLog.scrollHeight;
    });
  })();
