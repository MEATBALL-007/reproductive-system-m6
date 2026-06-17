/* ============================================================================
   engine.js — kinetic engine
   - เรนเดอร์เด็คจาก DATA.slides
   - โหมด Scroll / Slide สลับกันได้
   - หน้าต่างควบคุมลอย 2 อัน ลากย้าย/ย่อได้ (Pointer Events) สำหรับผู้พูดหลายคน
   - progress bar, ปุ่ม Motion, speaker notes (คีย์ N), overview (คีย์ O)
   - widget registry: window.WIDGETS[name] = (rootEl) => void
   ============================================================================ */
'use strict';

window.WIDGETS = window.WIDGETS || {};

const Engine = (function () {
  const LS = 'rsm6.prefs.v1';
  const state = {
    mode: 'slide',        // 'slide' | 'scroll'
    current: 0,
    motion: true,         // true = เปิด animation
    notesOpen: false,
    overviewOpen: false,
    total: 0,
  };

  let deckEl, slidesEls = [], io = null, lastDir = 1;
  const initialized = new WeakSet();

  // ── utils ──────────────────────────────────────────────────────────────
  // จอเล็ก/มือถือ: เปลี่ยนพฤติกรรมให้เหมาะ (เลื่อนอ่านแทนการย่อ, แผงควบคุมเดียว)
  const SMALL = () => window.matchMedia('(max-width: 700px)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; }
  }
  function savePrefs() {
    try {
      localStorage.setItem(LS, JSON.stringify({ mode: state.mode, motion: state.motion }));
    } catch (e) { /* file:// อาจปิด localStorage — ไม่เป็นไร */ }
  }

  // ── build deck ───────────────────────────────────────────────────────────
  function buildSpeakerBadge(speakers) {
    if (!speakers || !speakers.length) return '';
    const chips = speakers.map(s => {
      const initial = (s.name || '?').trim().charAt(0);
      const meta = `<span><span class="who">${s.name}</span>` +
        (s.no ? ` <span class="muted">#${s.no}</span>` : '') +
        (s.role ? `<br><span class="role">${s.role}</span>` : '') + `</span>`;
      return `<span class="speaker-chip"><span class="avatar">${initial}</span>${meta}</span>`;
    }).join('');
    return `<div class="speaker-badge">${chips}</div>`;
  }

  function render() {
    const app = $('#app');
    app.innerHTML = '';

    app.appendChild(el('div', null, '<div id="progress"></div>').firstChild);

    deckEl = el('main', null);
    deckEl.id = 'deck';

    DATA.slides.forEach((s, i) => {
      const sec = el('section', 'slide');
      sec.id = 'slide-' + (i + 1);
      sec.dataset.index = i;
      sec.setAttribute('data-theme', s.theme || 'overview');
      sec.setAttribute('aria-label', `สไลด์ ${i + 1}: ${s.kicker || ''}`);

      const top = `<div class="slide__top">
          <span class="kicker">${s.kicker || ''}</span>
          <span class="slide__no">${String(i + 1).padStart(2, '0')} / ${DATA.slides.length}</span>
        </div>`;
      const inner = `<div class="slide__inner"><div class="fit">${s.html || ''}</div></div>`;
      const badge = buildSpeakerBadge(s.speakers);

      sec.innerHTML = top + inner + badge;
      deckEl.appendChild(sec);
    });

    app.appendChild(deckEl);
    slidesEls = Array.from(deckEl.querySelectorAll('.slide'));
    state.total = slidesEls.length;

    buildControls();
    buildNotes();
    buildOverview();
    buildToast();
  }

  // ── widgets ────────────────────────────────────────────────────────────
  function initWidgets(scope) {
    scope.querySelectorAll('[data-widget]').forEach(node => {
      if (initialized.has(node)) return;
      const name = node.getAttribute('data-widget');
      const fn = window.WIDGETS[name];
      if (typeof fn === 'function') {
        try { fn(node); } catch (e) { console.error('widget error:', name, e); }
        initialized.add(node);
      }
    });
  }

  // ── reveal ───────────────────────────────────────────────────────────────
  function revealAll(slide) {
    slide.querySelectorAll('.reveal').forEach(r => r.classList.add('in'));
  }
  function resetReveal(slide) {
    if (!state.motion) return;
    slide.querySelectorAll('.reveal').forEach(r => r.classList.remove('in'));
  }

  // ── fit-to-screen: ย่อเนื้อหาสไลด์ให้พอดีจอ (เฉพาะโหมด Slide) ──────────────
  function fitSlide(slide) {
    if (!slide) return;
    const fit = slide.querySelector('.fit');
    const inner = slide.querySelector('.slide__inner');
    if (!fit || !inner) return;
    // จอเล็ก/มือถือ: ไม่ย่อเนื้อหา (จะเล็กเกินอ่าน) — ให้เลื่อนภายในสไลด์แทน
    if (state.mode !== 'slide' || SMALL()) { fit.style.transform = ''; inner.style.justifyContent = 'center'; return; }

    fit.style.transform = 'none';
    inner.style.justifyContent = 'center';

    const avail = inner.clientHeight;       // ความสูงที่ใช้ได้จริง (ถูก cap โดย track)
    const need = fit.scrollHeight;          // ความสูงเนื้อหาจริง

    fit.style.transformOrigin = 'top center';
    if (need > avail + 2 && avail > 0) {
      const s = Math.max(0.3, avail / need);
      inner.style.justifyContent = 'flex-start'; // ชิดบน เพื่อไม่ให้หัวเรื่องโดนตัด
      fit.style.transform = `scale(${s.toFixed(4)})`;
    } else {
      fit.style.transform = 'none';
    }
  }
  function refit() {
    const cur = slidesEls[state.current];
    if (cur) fitSlide(cur);
  }

  // ── current slide tracking ───────────────────────────────────────────────
  function setCurrent(i, opts = {}) {
    i = Math.max(0, Math.min(state.total - 1, i));
    lastDir = i >= state.current ? 1 : -1;
    state.current = i;

    if (state.mode === 'slide') {
      slidesEls.forEach((s, idx) => {
        s.classList.toggle('current', idx === i);
        s.classList.toggle('back', lastDir < 0);
      });
      const cur = slidesEls[i];
      if (state.motion) { resetReveal(cur); requestAnimationFrame(() => revealAll(cur)); }
      else revealAll(cur);
      initWidgets(cur);
      requestAnimationFrame(() => fitSlide(cur));
      setTimeout(() => fitSlide(cur), 260);
    } else if (opts.scroll) {
      // โหมดเลื่อน: บังคับเผยเนื้อหา + เริ่ม widget ของสไลด์เป้าหมายให้ชัวร์ (ไม่รอ IO)
      revealAll(slidesEls[i]);
      initWidgets(slidesEls[i]);
      slidesEls[i].scrollIntoView({ behavior: state.motion ? 'smooth' : 'auto', block: 'start' });
    }
    updateUI();
  }

  function updateUI() {
    const i = state.current, n = state.total;
    const pct = n > 1 ? (i / (n - 1)) * 100 : 100;
    const pb = $('#progress'); if (pb) pb.style.width = pct + '%';

    document.querySelectorAll('.ctl').forEach(p => {
      p.querySelector('.cur').textContent = i + 1;
      p.querySelector('.tot').textContent = n;
      const seek = p.querySelector('.ctl__seek');
      seek.max = n; seek.value = i + 1;
      // ธีมของหน้าต่างควบคุมให้ตามสไลด์ปัจจุบัน
      p.setAttribute('data-theme', DATA.slides[i].theme || 'overview');
    });
    // notes
    if (state.notesOpen) fillNotes();
    // theme bg accent on body for ctl outside slide
    document.body.setAttribute('data-theme', DATA.slides[i].theme || 'overview');
  }

  function next() { setCurrent(state.current + 1, { scroll: true }); }
  function prev() { setCurrent(state.current - 1, { scroll: true }); }
  function goto(i) { setCurrent(i, { scroll: true }); }

  // ── modes ────────────────────────────────────────────────────────────────
  function applyMode() {
    document.body.classList.toggle('mode-slide', state.mode === 'slide');
    document.body.classList.toggle('mode-scroll', state.mode === 'scroll');
    if (state.mode === 'scroll') {
      if (io) io.disconnect();
      io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = +e.target.dataset.index;
            revealAll(e.target);
            initWidgets(e.target);
            // อัปเดต current จากตำแหน่งกึ่งกลาง
            if (e.intersectionRatio > 0.5) { state.current = idx; updateUI(); }
          }
        });
      }, { threshold: [0.12, 0.5, 0.85] });
      slidesEls.forEach(s => io.observe(s));
      // ในโหมด scroll เผยทุกอันที่เห็นแล้ว
      slidesEls.forEach(s => initWidgets(s));
      setCurrent(state.current, { scroll: true });
    } else {
      if (io) { io.disconnect(); io = null; }
      // โหมด scroll: ล้าง transform fit ออก
      slidesEls.forEach(s => { const f = s.querySelector('.fit'); if (f) f.style.transform = ''; });
      slidesEls.forEach(s => s.classList.remove('current', 'back'));
      setCurrent(state.current);
    }
  }
  function toggleMode() {
    state.mode = state.mode === 'slide' ? 'scroll' : 'slide';
    applyMode(); savePrefs();
    toast(state.mode === 'slide' ? 'โหมดสไลด์ (Slide)' : 'โหมดเลื่อน (Scroll)');
    syncToolButtons();
  }

  // ── motion ─────────────────────────────────────────────────────────────
  function toggleMotion() {
    state.motion = !state.motion;
    document.body.classList.toggle('reduce-motion', !state.motion);
    savePrefs();
    toast(state.motion ? 'เปิดแอนิเมชัน' : 'ลดแอนิเมชัน (Reduce motion)');
    syncToolButtons();
    if (!state.motion) slidesEls.forEach(revealAll);
  }

  // ── fullscreen ───────────────────────────────────────────────────────────
  function toggleFullscreen() {
    const d = document;
    if (!d.fullscreenElement) (d.documentElement.requestFullscreen || function(){})();
    else (d.exitFullscreen || function(){}).call(d);
  }

  // ── controls (หน้าต่างลอย 2 อัน) ─────────────────────────────────────────
  function controlMarkup(side, label) {
    return `
      <div class="ctl ${side}" data-theme="overview">
        <div class="ctl__bar" data-drag>
          <span class="ctl__grip">⠿</span>
          <span class="ctl__name">${label}</span>
          <button class="ctl__min" title="ย่อ/ขยาย" aria-label="ย่อหรือขยาย">–</button>
        </div>
        <button class="ctl__resize" title="ลากเพื่อปรับขนาด" aria-label="ปรับขนาดหน้าต่าง">⤡</button>
        <div class="ctl__body">
          <div class="ctl__nav">
            <button class="ctl__btn" data-prev title="ก่อนหน้า (←)" aria-label="สไลด์ก่อนหน้า">‹</button>
            <div class="ctl__counter"><small>สไลด์</small><span><span class="cur">1</span> / <span class="tot">30</span></span></div>
            <button class="ctl__btn big" data-next title="ถัดไป (→)" aria-label="สไลด์ถัดไป">›</button>
          </div>
          <input class="ctl__seek" type="range" min="1" max="30" value="1" step="1" aria-label="เลื่อนไปสไลด์">
          <div class="ctl__tools">
            <button class="ctl__tool" data-tool="mode"><span class="ic">🖥️</span><span class="lbl">โหมด</span></button>
            <button class="ctl__tool" data-tool="notes"><span class="ic">📝</span><span class="lbl">โน้ตผู้พูด</span></button>
            <button class="ctl__tool" data-tool="overview"><span class="ic">▦</span><span class="lbl">ภาพรวม</span></button>
            <button class="ctl__tool" data-tool="motion"><span class="ic">🎬</span><span class="lbl">แอนิเมชัน</span></button>
            <button class="ctl__tool" data-tool="full"><span class="ic">⛶</span><span class="lbl">เต็มจอ</span></button>
            <button class="ctl__tool" data-tool="help"><span class="ic">⌨️</span><span class="lbl">คีย์ลัด</span></button>
          </div>
        </div>
      </div>`;
  }

  function buildControls() {
    const wrap = el('div');
    wrap.innerHTML = controlMarkup('left', 'ผู้ควบคุม • ซ้าย') + controlMarkup('right', 'ผู้ควบคุม • ขวา');
    Array.from(wrap.children).forEach(c => document.body.appendChild(c));

    document.querySelectorAll('.ctl').forEach(panel => {
      panel.querySelector('[data-prev]').addEventListener('click', prev);
      panel.querySelector('[data-next]').addEventListener('click', next);
      panel.querySelector('.ctl__min').addEventListener('click', () => panel.classList.toggle('min'));
      const seek = panel.querySelector('.ctl__seek');
      seek.addEventListener('input', () => goto(+seek.value - 1));
      panel.querySelectorAll('.ctl__tool').forEach(btn => {
        btn.addEventListener('click', () => handleTool(btn.dataset.tool));
      });
      makeDraggable(panel, panel.querySelector('[data-drag]'));
      makeResizable(panel, panel.querySelector('.ctl__resize'));
    });
    syncToolButtons();
  }

  // ── resizable (ปรับขนาดหน้าต่างควบคุม ด้วย zoom) ──────────────────────────
  function makeResizable(panel, handle) {
    let sx = 0, sy = 0, base = 1, active = false;
    handle.addEventListener('pointerdown', e => {
      if (SMALL()) return;                 // มือถือ: ปิดการปรับขนาด
      e.stopPropagation();
      active = true;
      handle.setPointerCapture(e.pointerId);
      sx = e.clientX; sy = e.clientY;
      base = parseFloat(panel.style.zoom || '1') || 1;
      panel.style.transition = 'none';
    });
    handle.addEventListener('pointermove', e => {
      if (!active) return;
      const d = ((e.clientX - sx) + (e.clientY - sy)) / 240;
      const z = Math.max(0.7, Math.min(2.3, base + d));
      panel.style.zoom = z.toFixed(3);
    });
    const end = e => { if (active) { active = false; try { handle.releasePointerCapture(e.pointerId); } catch (x) {} } };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    // ดับเบิลคลิก/แตะสองครั้ง = รีเซ็ตขนาด
    handle.addEventListener('dblclick', () => { panel.style.zoom = '1'; });
  }

  function handleTool(tool) {
    if (tool === 'mode') toggleMode();
    else if (tool === 'notes') toggleNotes();
    else if (tool === 'overview') toggleOverview();
    else if (tool === 'motion') toggleMotion();
    else if (tool === 'full') toggleFullscreen();
    else if (tool === 'help') showHelp();
  }

  function syncToolButtons() {
    document.querySelectorAll('.ctl').forEach(p => {
      const set = (tool, on, lbl) => {
        const b = p.querySelector(`[data-tool="${tool}"]`);
        if (!b) return;
        b.classList.toggle('on', on);
        if (lbl) b.querySelector('.lbl').textContent = lbl;
      };
      set('mode', state.mode === 'scroll', state.mode === 'slide' ? 'โหมดสไลด์' : 'โหมดเลื่อน');
      set('notes', state.notesOpen, 'โน้ตผู้พูด');
      set('motion', !state.motion, state.motion ? 'แอนิเมชัน' : 'ลดภาพ');
      set('overview', state.overviewOpen, 'ภาพรวม');
    });
  }

  // ── draggable (Pointer Events รองรับจอสัมผัส) ─────────────────────────────
  function makeDraggable(panel, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    handle.addEventListener('pointerdown', e => {
      if (SMALL()) return;                 // มือถือ: แผงควบคุมยึดอยู่กับที่ ไม่ลาก
      if (e.target.closest('.ctl__min')) return;
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      const r = panel.getBoundingClientRect();
      // เปลี่ยนมาใช้ left/top เด็ดขาด (ยกเลิก right/bottom)
      panel.style.left = r.left + 'px';
      panel.style.top = r.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.transform = 'none';
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      panel.style.transition = 'none';
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      const nx = ox + (e.clientX - sx);
      const ny = oy + (e.clientY - sy);
      const maxX = window.innerWidth - panel.offsetWidth - 4;
      const maxY = window.innerHeight - 40;
      panel.style.left = Math.max(4, Math.min(maxX, nx)) + 'px';
      panel.style.top = Math.max(4, Math.min(maxY, ny)) + 'px';
    });
    const end = e => { if (dragging) { dragging = false; try { handle.releasePointerCapture(e.pointerId); } catch (x) {} } };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  // ── speaker notes ────────────────────────────────────────────────────────
  function buildNotes() {
    const n = el('div'); n.id = 'notes';
    n.innerHTML = `
      <div class="nhead">
        <span class="ttl">📝 สคริปต์ผู้พูด</span>
        <span class="who"></span>
        <button class="nclose" aria-label="ปิดโน้ต">✕</button>
      </div>
      <div class="nbody"></div>`;
    document.body.appendChild(n);
    n.querySelector('.nclose').addEventListener('click', () => toggleNotes(false));
  }
  function fillNotes() {
    const s = DATA.slides[state.current];
    const n = $('#notes');
    const who = (s.speakers || []).map(x => x.name).join(', ');
    n.querySelector('.who').textContent = `สไลด์ ${state.current + 1} — ${who || '—'}`;
    const body = s.notes ? s.notes.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('') :
      '<p class="muted">— ไม่มีสคริปต์สำหรับสไลด์นี้ —</p>';
    n.querySelector('.nbody').innerHTML = body;
  }
  function toggleNotes(force) {
    state.notesOpen = force == null ? !state.notesOpen : force;
    $('#notes').classList.toggle('show', state.notesOpen);
    if (state.notesOpen) fillNotes();
    syncToolButtons();
  }

  // ── overview grid ────────────────────────────────────────────────────────
  function buildOverview() {
    const o = el('div'); o.id = 'overview';
    const cells = DATA.slides.map((s, i) => {
      const sp = (s.speakers || []).map(x => x.name).join(', ');
      return `<button class="ov-cell" data-goto="${i}" data-theme="${s.theme || 'overview'}">
          <span class="ov-no">สไลด์ ${i + 1}</span>
          <span class="ov-ttl">${s.ovTitle || s.kicker || ''}</span>
          <span class="ov-sp">${sp}</span>
        </button>`;
    }).join('');
    o.innerHTML = `<button class="btn ov-close">✕ ปิด</button>
      <h2>ภาพรวมสไลด์ทั้งหมด (${DATA.slides.length})</h2>
      <div class="ov-grid">${cells}</div>`;
    document.body.appendChild(o);
    o.querySelector('.ov-close').addEventListener('click', () => toggleOverview(false));
    o.querySelectorAll('.ov-cell').forEach(c => {
      c.addEventListener('click', () => { toggleOverview(false); goto(+c.dataset.goto); });
    });
  }
  function toggleOverview(force) {
    state.overviewOpen = force == null ? !state.overviewOpen : force;
    $('#overview').classList.toggle('show', state.overviewOpen);
    syncToolButtons();
  }

  // ── toast / help ─────────────────────────────────────────────────────────
  function buildToast() { document.body.appendChild(Object.assign(el('div'), { id: 'toast' })); }
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1700);
  }
  function showHelp() {
    toast('คีย์ลัด: ← → เลื่อน · N โน้ต · S โหมด · M แอนิเมชัน · O ภาพรวม · F เต็มจอ');
  }

  // ── keyboard ─────────────────────────────────────────────────────────────
  let numBuf = '', numTimer = null;
  function onKey(e) {
    if (e.target.matches('input, textarea, select')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'ArrowDown' && state.mode === 'slide') { e.preventDefault(); next(); }
    else if (k === 'ArrowUp' && state.mode === 'slide') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); goto(0); }
    else if (k === 'End') { e.preventDefault(); goto(state.total - 1); }
    else if (k === 'n' || k === 'N' || k === 'ๆ') toggleNotes();
    else if (k === 's' || k === 'S') toggleMode();
    else if (k === 'm' || k === 'M') toggleMotion();
    else if (k === 'o' || k === 'O') toggleOverview();
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'Escape') { toggleOverview(false); toggleNotes(false); }
    else if (k === '?') showHelp();
    else if (/^[0-9]$/.test(k)) {
      numBuf += k; clearTimeout(numTimer);
      numTimer = setTimeout(() => {
        const n = parseInt(numBuf, 10);
        if (n >= 1 && n <= state.total) goto(n - 1);
        numBuf = '';
      }, 450);
    }
  }

  // ── touch swipe (โหมดสไลด์) ──────────────────────────────────────────────
  function initSwipe() {
    let x0 = null, y0 = null;
    deckEl.addEventListener('pointerdown', e => {
      if (state.mode !== 'slide') return;
      if (e.target.closest('.ctl, .anim-controls, .organ-list, input, button, .hotspot, .diagram')) return;
      if (e.pointerType === 'mouse') return;
      x0 = e.clientX; y0 = e.clientY;
    });
    deckEl.addEventListener('pointerup', e => {
      if (x0 == null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) { dx < 0 ? next() : prev(); }
      x0 = y0 = null;
    });
  }

  // ── boot ─────────────────────────────────────────────────────────────────
  function boot() {
    const prefs = loadPrefs();
    if (prefs.mode) state.mode = prefs.mode;
    else if (SMALL()) state.mode = 'scroll';   // มือถือ: เริ่มที่โหมดเลื่อน (อ่านง่ายกว่า)
    if (prefs.motion === false) state.motion = false;

    const bf = document.getElementById('boot-fallback');
    if (bf) bf.remove();

    render();
    document.body.classList.toggle('reduce-motion', !state.motion);
    applyMode();
    initSwipe();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => { if (state.mode === 'slide') refit(); });
    window.addEventListener('hashchange', routeHash);
    routeHash();
    syncToolButtons();
  }

  function routeHash() {
    const m = (location.hash || '').match(/#(?:slide-)?(\d+)/);
    if (m) { const i = parseInt(m[1], 10) - 1; if (i >= 0 && i < state.total) goto(i); }
  }

  return { boot, next, prev, goto, toggleMode, toggleMotion, refit, get state() { return state; } };
})();
