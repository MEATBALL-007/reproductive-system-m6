/* ============================================================================
   animations.js — widget แอนิเมชันกระบวนการ + กราฟ + quiz
     · chart-testosterone   ฮอร์โมนเพศชายตามอายุ
     · anim-spermatogenesis การสร้างอสุจิ (stepper)
     · anim-fertilization   การเดินทางอสุจิ → ปฏิสนธิ
     · anim-menstrual       รอบประจำเดือน (interactive)
     · anim-oogenesis       การสร้างไข่ + การตกไข่ (stepper)
     · quiz                 แบบทดสอบเลือกตอบ เฉลยทันที
   ============================================================================ */
'use strict';

(function () {
  function motionOn() { return !window.Engine || (Engine.state && Engine.state.motion !== false); }
  const lerp = (a, b, t) => a + (b - a) * t;

  // เส้นโค้งจากชุดค่า (0..1) → polyline points ในกรอบ plot
  function curvePoints(vals, x0, x1, yBase, yTop) {
    const n = vals.length;
    return vals.map((v, i) => {
      const x = lerp(x0, x1, i / (n - 1));
      const y = lerp(yBase, yTop, v);
      return [x, y];
    });
  }
  function toPath(pts) { return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '); }

  // ── อสุจิ (รูปสัญลักษณ์) ───────────────────────────────────────────────
  function spermSVG(x, y, s, color, id) {
    color = color || 'var(--accent-2)';
    return `<g transform="translate(${x},${y}) scale(${s})" ${id ? `data-sp="${id}"` : ''}>
      <ellipse cx="0" cy="0" rx="9" ry="7" fill="${color}"/>
      <path d="M8 0 q14 -8 24 0 q-14 8 -24 0" fill="none" stroke="${color}" stroke-width="2.4"/>
    </g>`;
  }
  function cellSVG(x, y, r, label, fill, stroke) {
    fill = fill || 'var(--theme-tint)'; stroke = stroke || 'var(--accent)';
    return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.4"/>
      <circle cx="${x}" cy="${y}" r="${r * 0.42}" fill="${stroke}" opacity=".35"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="${Math.max(12, r * 0.5)}" font-weight="800" fill="#fff">${label}</text></g>`;
  }

  /* =========================================================================
     1) chart-testosterone
     ========================================================================= */
  window.WIDGETS['chart-testosterone'] = function (host) {
    // ระดับเทสโทสเตอโรนสัมพัทธ์ตามอายุ 0..60 ปี
    function level(age) {
      if (age < 10) return 0.08 + age * 0.005;
      if (age < 18) return 0.13 + (age - 10) * 0.108;      // วัยรุ่นพุ่งสูง
      if (age < 40) return 0.98 - (age - 18) * 0.002;
      return Math.max(0.55, 0.94 - (age - 40) * 0.018);    // ค่อย ๆ ลด
    }
    const X0 = 70, X1 = 540, YB = 250, YT = 40;
    const vals = []; for (let a = 0; a <= 60; a++) vals.push(level(a));
    const pts = vals.map((v, a) => [lerp(X0, X1, a / 60), lerp(YB, YT, v)]);
    const path = toPath(pts);
    const area = path + ` L ${X1} ${YB} L ${X0} ${YB} Z`;

    host.innerHTML = `
      <div class="anim-stage" style="padding:1rem">
        <svg viewBox="0 0 580 300" aria-label="กราฟระดับเทสโทสเตอโรนตามอายุ">
          <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--h-testo)" stop-opacity=".45"/>
            <stop offset="1" stop-color="var(--h-testo)" stop-opacity="0"/></linearGradient></defs>
          <line x1="${X0}" y1="${YB}" x2="${X1}" y2="${YB}" stroke="var(--stroke-strong)"/>
          <line x1="${X0}" y1="${YT}" x2="${X0}" y2="${YB}" stroke="var(--stroke-strong)"/>
          <text x="${X0 - 8}" y="${YT + 6}" text-anchor="end" font-size="12" fill="var(--ink-dim)">สูง</text>
          <text x="${X0 - 8}" y="${YB}" text-anchor="end" font-size="12" fill="var(--ink-dim)">ต่ำ</text>
          <path d="${area}" fill="url(#tg)"/>
          <path class="tline" d="${path}" fill="none" stroke="var(--h-testo)" stroke-width="3.5"
            stroke-linecap="round" stroke-linejoin="round"/>
          <g class="tmark"><line x1="0" y1="${YT}" x2="0" y2="${YB}" stroke="#fff" stroke-dasharray="3 4" opacity=".6"/>
            <circle r="7" fill="#fff" stroke="var(--h-testo)" stroke-width="3"/></g>
          <text x="${X0}" y="278" font-size="12" fill="var(--ink-dim)">0</text>
          <text x="${lerp(X0, X1, 13 / 60)}" y="278" font-size="12" fill="var(--ink-dim)" text-anchor="middle">วัยรุ่น</text>
          <text x="${X1}" y="278" font-size="12" fill="var(--ink-dim)" text-anchor="end">60 ปี</text>
        </svg>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:.4rem">
          <div><span class="stage-title">อายุ <span class="age">14</span> ปี</span>
            <span class="muted lifestage"></span></div>
          <div><b class="lvl" style="color:var(--h-testo)"></b></div>
        </div>
        <input class="range agerange" type="range" min="0" max="60" value="14" step="1" aria-label="เลือกอายุ">
      </div>`;

    const mark = host.querySelector('.tmark');
    const tline = host.querySelector('.tline');
    const update = (age) => {
      const x = lerp(X0, X1, age / 60), y = lerp(YB, YT, level(age));
      mark.setAttribute('transform', `translate(${x},0)`);
      mark.querySelector('circle').setAttribute('cy', y);
      host.querySelector('.age').textContent = age;
      const pct = Math.round(level(age) * 100);
      host.querySelector('.lvl').textContent = 'ระดับ ~' + pct + '%';
      const st = age < 11 ? 'วัยเด็ก — ระดับต่ำ' : age < 18 ? 'วัยรุ่น — เพิ่มขึ้นรวดเร็ว' :
        age < 40 ? 'วัยผู้ใหญ่ — คงระดับสูง' : 'วัยกลางคน — ค่อย ๆ ลดลง';
      host.querySelector('.lifestage').textContent = ' · ' + st;
    };
    host.querySelector('.agerange').addEventListener('input', e => update(+e.target.value));
    update(14);

    if (motionOn()) {
      const len = tline.getTotalLength();
      tline.style.strokeDasharray = len; tline.style.strokeDashoffset = len;
      requestAnimationFrame(() => {
        tline.style.transition = 'stroke-dashoffset 1.6s var(--ease)';
        tline.style.strokeDashoffset = 0;
      });
    }
  };

  /* =========================================================================
     stepper ทั่วไป (ใช้กับ spermatogenesis / oogenesis)
     ========================================================================= */
  function makeStepper(host, cfg) {
    const steps = cfg.steps;
    let idx = 0, timer = null;

    host.innerHTML = `
      <div class="anim-stage" style="padding:1rem 1rem 1.2rem">
        <svg class="stg" viewBox="0 0 760 300" aria-label="${cfg.aria || ''}"></svg>
      </div>
      <div style="margin-top:.7rem">
        <div class="stage-title sub"></div>
        <div class="muted en2" style="font-size:var(--fs-small)"></div>
        <div class="desc" style="margin-top:.3rem"></div>
      </div>
      <div class="anim-controls">
        <button class="btn prev">‹ ก่อนหน้า</button>
        <button class="btn primary play">▶ เล่นทีละขั้น</button>
        <button class="btn next">ถัดไป ›</button>
        <span class="stage-cap dots"></span>
      </div>`;

    const stg = host.querySelector('.stg');
    function render() {
      const s = steps[idx];
      stg.innerHTML = (motionOn() ? '' : '') + s.svg;
      host.querySelector('.sub').innerHTML = `ขั้นที่ ${idx + 1}: ${s.t}`;
      host.querySelector('.en2').textContent = s.sub || '';
      host.querySelector('.desc').textContent = s.desc || '';
      host.querySelector('.dots').innerHTML = steps.map((_, i) =>
        `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin:0 3px;background:${i === idx ? 'var(--accent)' : 'var(--stroke-strong)'}"></span>`).join('');
      host.querySelector('.prev').disabled = idx === 0;
      host.querySelector('.next').disabled = idx === steps.length - 1;
      if (motionOn()) { stg.style.opacity = 0; requestAnimationFrame(() => { stg.style.transition = 'opacity .4s'; stg.style.opacity = 1; }); }
      if (window.Engine && Engine.refit) Engine.refit();
    }
    function go(i) { idx = Math.max(0, Math.min(steps.length - 1, i)); render(); }
    function stopPlay() { if (timer) { clearInterval(timer); timer = null; host.querySelector('.play').innerHTML = '▶ เล่นทีละขั้น'; } }
    function play() {
      if (timer) { stopPlay(); return; }
      if (idx === steps.length - 1) go(0);
      host.querySelector('.play').innerHTML = '⏸ หยุด';
      timer = setInterval(() => { if (idx >= steps.length - 1) { stopPlay(); } else go(idx + 1); }, motionOn() ? 1700 : 700);
    }
    host.querySelector('.prev').addEventListener('click', () => { stopPlay(); go(idx - 1); });
    host.querySelector('.next').addEventListener('click', () => { stopPlay(); go(idx + 1); });
    host.querySelector('.play').addEventListener('click', play);
    render();
  }

  /* =========================================================================
     2) anim-spermatogenesis
     ========================================================================= */
  window.WIDGETS['anim-spermatogenesis'] = function (host) {
    const row = (cells) => cells.join('');
    makeStepper(host, {
      aria: 'แผนผังการสร้างอสุจิอย่างง่าย',
      steps: [
        { t: 'เซลล์ต้นกำเนิดในอัณฑะ', sub: 'ในหลอดสร้างอสุจิ', desc: 'ภายในอัณฑะมีเซลล์ต้นกำเนิดที่คอยแบ่งตัวเพื่อสร้างอสุจิอยู่ตลอดเวลา',
          svg: cellSVG(380, 150, 52, '') },
        { t: 'แบ่งตัวเพิ่มจำนวน', sub: '', desc: 'เซลล์เจริญขึ้นและแบ่งตัวเพิ่มจำนวนหลายเซลล์',
          svg: row([cellSVG(300, 150, 40, ''), cellSVG(460, 150, 40, '')]) },
        { t: 'สร้างส่วนหัวและหาง', sub: '', desc: 'เซลล์เปลี่ยนรูปร่าง สร้างส่วนหัว (เก็บลักษณะทางพันธุกรรมจากพ่อ) และหางไว้ว่ายน้ำ',
          svg: [spermSVG(230, 150, 1.4, 'var(--accent-2)'), spermSVG(330, 150, 1.4), spermSVG(430, 150, 1.4), spermSVG(530, 150, 1.4)].join('') },
        { t: 'อสุจิสมบูรณ์', sub: 'พร้อมเคลื่อนที่', desc: 'ได้ตัวอสุจิที่ว่ายน้ำได้ ร่างกายสร้างใหม่จำนวนมากต่อเนื่องตลอดวัยเจริญพันธุ์',
          svg: [spermSVG(180, 130, 1.6), spermSVG(330, 170, 1.6), spermSVG(470, 120, 1.6), spermSVG(560, 180, 1.6)].join('') +
            `<text x="380" y="270" text-anchor="middle" font-size="15" fill="var(--accent)" font-weight="800">สร้างต่อเนื่อง · นับล้านตัวต่อวัน</text>` },
      ],
    });
  };

  /* =========================================================================
     3) anim-fertilization — การเดินทางของอสุจิ → ปฏิสนธิ
     ========================================================================= */
  window.WIDGETS['anim-fertilization'] = function (host) {
    host.innerHTML = `
      <div class="anim-stage" style="padding:.6rem">
        <svg viewBox="0 0 760 410" aria-label="แผนผังการเดินทางของอสุจิสู่การปฏิสนธิ">
          <text x="380" y="26" text-anchor="middle" font-size="12" fill="var(--ink-dim)">รังไข่มี 2 ข้าง — โดยปกติตกไข่ทีละ 1 ข้างต่อรอบเดือน</text>
          <!-- มดลูก -->
          <path class="organ-soft" d="M300 268 Q300 218 380 213 Q460 218 460 268 L450 318 Q380 338 310 318 Z"/>
          <!-- ปากมดลูก/ช่องคลอด -->
          <rect class="organ-soft" x="362" y="318" width="36" height="40" rx="8"/>
          <path class="organ-soft" d="M352 358 L408 358 L420 404 Q380 416 340 404 Z"/>
          <!-- ท่อนำไข่ + รังไข่ ซ้าย (ไม่ตกไข่รอบนี้) -->
          <path class="organ-line" d="M305 248 Q210 196 150 224" stroke-width="6" opacity=".75"/>
          <ellipse class="organ-soft" cx="120" cy="232" rx="34" ry="24"/>
          <text x="120" y="200" text-anchor="middle" font-size="12" fill="var(--ink-dim)">รังไข่ (ซ้าย)</text>
          <!-- ท่อนำไข่ + รังไข่ ขวา (ตกไข่รอบนี้) -->
          <path id="ftPath" d="M380 378 L380 323 Q380 273 415 250 Q500 203 590 186 Q628 178 648 174"
                fill="none" stroke="var(--accent)" stroke-width="4" stroke-dasharray="5 7" opacity=".5"/>
          <path class="organ-line" d="M455 248 Q545 196 632 180" stroke-width="6" opacity=".85"/>
          <ellipse class="organ-soft" cx="690" cy="168" rx="34" ry="24"/>
          <g class="egg"><circle cx="648" cy="174" r="26" fill="var(--h-estro)" opacity=".25" stroke="var(--h-estro)" stroke-width="2"/>
            <circle cx="648" cy="174" r="13" fill="var(--h-estro)" opacity=".7"/></g>
          <g class="sperms"></g>
          <g class="burst" style="display:none">
            <circle cx="648" cy="174" r="30" fill="none" stroke="var(--good)" stroke-width="4"/>
            <text x="648" y="138" text-anchor="middle" font-size="16" font-weight="800" fill="var(--good)">ปฏิสนธิ!</text>
          </g>
          <text x="380" y="404" text-anchor="middle" font-size="12" fill="var(--ink-dim)">ช่องคลอด</text>
          <text x="690" y="138" text-anchor="middle" font-size="12" fill="var(--h-estro)">รังไข่ (ขวา) · ตกไข่รอบนี้</text>
        </svg>
      </div>
      <div class="stage-cap status" style="margin-top:.5rem">หลังการหลั่ง อสุจินับร้อยล้านตัวเริ่มเดินทางจากช่องคลอดขึ้นสู่ท่อนำไข่</div>
      <div class="anim-controls">
        <button class="btn primary play">▶ เล่นการเดินทาง</button>
        <button class="btn reset">↺ เริ่มใหม่</button>
        <input class="range scrub" type="range" min="0" max="100" value="0" aria-label="ความคืบหน้าการเดินทาง">
      </div>`;

    const ftPath = host.querySelector('#ftPath');
    const len = ftPath.getTotalLength();
    const spermsG = host.querySelector('.sperms');
    const burst = host.querySelector('.burst');
    const status = host.querySelector('.status');
    const scrub = host.querySelector('.scrub');
    const N = 16;
    const seeds = []; for (let i = 0; i < N; i++) seeds.push({ off: Math.sin(i * 1.7) * 18, lag: (i % 5) * 0.06, drop: 0.55 + (i / N) * 0.4 });
    let raf = null, t = 0;

    function frame(progress) {
      t = progress;
      const parts = [];
      seeds.forEach((s, i) => {
        let p = progress - s.lag; if (p < 0) p = 0;
        // อสุจิส่วนใหญ่ร่วงระหว่างทาง เหลือ "ผู้ชนะ" ตัวเดียวไปถึงไข่
        const winner = i === 0;
        const reach = winner ? 0.999 : s.drop;
        const eff = Math.min(p, reach);
        const pt = ftPath.getPointAtLength(eff * len);
        const wob = Math.sin(progress * 20 + i) * (winner ? 4 : s.off * (1 - eff));
        const fade = (!winner && p > reach) ? 0.18 : 1;
        const col = winner ? 'var(--good)' : 'var(--accent-2)';
        parts.push(`<g opacity="${fade}">${spermSVG(pt.x, pt.y + wob, winner ? 1.4 : 1.0, col).replace('<g ', '<g ')}</g>`);
      });
      spermsG.innerHTML = parts.join('');
      scrub.value = Math.round(progress * 100);

      if (progress < 0.3) status.textContent = 'ผ่านปากมดลูก เข้าสู่โพรงมดลูก — อสุจิจำนวนมากเริ่มร่วงระหว่างทาง';
      else if (progress < 0.7) status.textContent = 'เดินทางขึ้นท่อนำไข่ เหลืออสุจิเพียงไม่กี่ร้อยตัว';
      else if (progress < 0.98) status.textContent = 'ใกล้ถึงไข่ที่ท่อนำไข่ — แข่งกันเข้าถึงไข่';
      else { status.textContent = 'อสุจิเพียงตัวเดียวเจาะผ่านเปลือกไข่ → เกิดการปฏิสนธิเป็นเซลล์ตัวอ่อนเริ่มแรก (ไซโกต) แล้วเดินทางไปฝังที่ผนังมดลูก'; }
      burst.style.display = progress >= 0.98 ? '' : 'none';
    }

    function play() {
      if (raf) { cancelAnimationFrame(raf); raf = null; host.querySelector('.play').innerHTML = '▶ เล่นการเดินทาง'; return; }
      if (t >= 1) t = 0;
      host.querySelector('.play').innerHTML = '⏸ หยุด';
      const dur = motionOn() ? 6500 : 400;
      const start = performance.now ? null : 0; // ไม่ใช้ Date.now()
      let last = null;
      const step = (ts) => {
        if (last == null) last = ts;
        t += (ts - last) / dur; last = ts;
        if (t >= 1) { t = 1; frame(1); raf = null; host.querySelector('.play').innerHTML = '▶ เล่นการเดินทาง'; return; }
        frame(t); raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    host.querySelector('.play').addEventListener('click', play);
    host.querySelector('.reset').addEventListener('click', () => { if (raf) cancelAnimationFrame(raf); raf = null; t = 0; frame(0); host.querySelector('.play').innerHTML = '▶ เล่นการเดินทาง'; });
    scrub.addEventListener('input', e => { if (raf) { cancelAnimationFrame(raf); raf = null; host.querySelector('.play').innerHTML = '▶ เล่นการเดินทาง'; } frame(+e.target.value / 100); });
    frame(0);
  };

  /* =========================================================================
     4) anim-menstrual — รอบประจำเดือน (interactive)
     ========================================================================= */
  window.WIDGETS['anim-menstrual'] = function (host) {
    const FSH = [0.45,0.50,0.55,0.52,0.48,0.44,0.40,0.38,0.40,0.46,0.55,0.62,0.70,0.55,0.35,0.30,0.28,0.27,0.26,0.26,0.27,0.28,0.30,0.32,0.35,0.40,0.46,0.50];
    const LH  = [0.20,0.20,0.21,0.21,0.22,0.22,0.23,0.24,0.26,0.30,0.42,0.70,0.98,0.60,0.28,0.24,0.22,0.22,0.21,0.21,0.21,0.21,0.22,0.22,0.23,0.24,0.25,0.26];
    const EST = [0.18,0.18,0.20,0.22,0.25,0.30,0.38,0.48,0.62,0.78,0.92,0.98,0.80,0.50,0.40,0.42,0.50,0.60,0.68,0.72,0.74,0.72,0.66,0.56,0.44,0.34,0.26,0.20];
    const PRG = [0.12,0.12,0.12,0.12,0.13,0.13,0.13,0.14,0.14,0.15,0.16,0.17,0.18,0.22,0.34,0.48,0.62,0.74,0.84,0.92,0.96,0.94,0.86,0.72,0.52,0.34,0.20,0.14];
    const END = [0.40,0.30,0.20,0.16,0.18,0.24,0.30,0.36,0.42,0.48,0.54,0.60,0.64,0.66,0.68,0.70,0.74,0.78,0.82,0.86,0.90,0.92,0.90,0.86,0.78,0.66,0.52,0.42];

    const X0 = 64, X1 = 720, YB = 250, YT = 36;
    const mk = arr => toPath(curvePoints(arr, X0, X1, YB, YT));
    const dayX = d => lerp(X0, X1, (d - 1) / 27);

    function phaseOf(d) {
      if (d <= 5) return { key: 'menses', t: 'ระยะมีประจำเดือน', en: 'Menstruation', c: 'var(--h-prog)' };
      if (d <= 13) return { key: 'foll', t: 'ระยะฟอลลิเคิล (สร้างเยื่อบุ)', en: 'Follicular / Proliferative', c: 'var(--h-fsh)' };
      if (d <= 15) return { key: 'ovul', t: 'ระยะตกไข่', en: 'Ovulation', c: 'var(--h-lh)' };
      return { key: 'lut', t: 'ระยะลูเทียล', en: 'Luteal / Secretory', c: 'var(--h-estro)' };
    }

    host.innerHTML = `
      <div class="anim-stage" style="padding:1rem">
        <svg viewBox="0 0 760 300" aria-label="กราฟฮอร์โมนรอบประจำเดือน">
          <!-- แถบระยะ -->
          <rect x="${X0}" y="${YT}" width="${dayX(5) - X0}" height="${YB - YT}" fill="var(--h-prog)" opacity=".07"/>
          <rect x="${dayX(13)}" y="${YT}" width="${dayX(15) - dayX(13)}" height="${YB - YT}" fill="var(--h-lh)" opacity=".12"/>
          <line x1="${X0}" y1="${YB}" x2="${X1}" y2="${YB}" stroke="var(--stroke-strong)"/>
          <!-- เยื่อบุโพรงมดลูก (พื้นที่ใต้กราฟ) -->
          <path d="${mk(END)} L ${X1} ${YB} L ${X0} ${YB} Z" fill="var(--accent)" opacity=".12"/>
          <path d="${mk(FSH)}" fill="none" stroke="var(--h-fsh)" stroke-width="2.6"/>
          <path d="${mk(LH)}"  fill="none" stroke="var(--h-lh)"  stroke-width="2.6"/>
          <path d="${mk(EST)}" fill="none" stroke="var(--h-estro)" stroke-width="2.6"/>
          <path d="${mk(PRG)}" fill="none" stroke="var(--h-prog)" stroke-width="2.6"/>
          <!-- เส้นวันปัจจุบัน -->
          <g class="dayline"><line x1="0" y1="${YT - 6}" x2="0" y2="${YB}" stroke="#fff" stroke-width="2" stroke-dasharray="3 4"/></g>
          <text x="${X0}" y="272" font-size="11" fill="var(--ink-dim)">วันที่ 1</text>
          <text x="${dayX(14)}" y="272" font-size="11" fill="var(--ink-dim)" text-anchor="middle">14 (ตกไข่)</text>
          <text x="${X1}" y="272" font-size="11" fill="var(--ink-dim)" text-anchor="end">28</text>
        </svg>
        <div style="display:flex;gap:.8rem;flex-wrap:wrap;font-size:var(--fs-small);margin-top:.3rem">
          <span style="color:var(--h-fsh)">▬ FSH</span><span style="color:var(--h-lh)">▬ LH</span>
          <span style="color:var(--h-estro)">▬ เอสโตรเจน</span><span style="color:var(--h-prog)">▬ โปรเจสเตอโรน</span>
          <span style="color:var(--accent)">▣ เยื่อบุโพรงมดลูก</span>
        </div>
      </div>
      <div class="split" style="margin-top:.7rem;align-items:center;grid-template-columns:1fr 1.1fr">
        <div>
          <div><span class="stage-title">วันที่ <span class="d">14</span></span>
            <span class="phase-tag pt"></span></div>
          <div class="muted pen" style="font-size:var(--fs-small)"></div>
          <svg class="ovary" viewBox="0 0 200 90" style="margin-top:.4rem;max-width:220px"></svg>
        </div>
        <div class="bars" style="display:grid;gap:.4rem"></div>
      </div>
      <div class="anim-controls">
        <button class="btn primary play">▶ เล่นทั้งรอบ</button>
        <input class="range dayrange" type="range" min="1" max="28" value="14" step="1" aria-label="เลือกวันของรอบเดือน">
      </div>`;

    const dayline = host.querySelector('.dayline');
    const ovary = host.querySelector('.ovary');
    function bar(name, v, c) {
      return `<div style="display:flex;align-items:center;gap:.5rem">
        <span style="width:8.5rem;font-size:var(--fs-small);color:${c}">${name}</span>
        <span style="flex:1;height:12px;background:var(--surface-2);border-radius:99px;overflow:hidden">
          <span style="display:block;height:100%;width:${Math.round(v * 100)}%;background:${c};border-radius:99px;transition:width .25s"></span></span>
      </div>`;
    }
    function ovaryArt(d) {
      // d1-13 ฟอลลิเคิลโต, d14 ตกไข่, d15-26 คอร์ปัสลูเทียม, d27-28 ฝ่อ
      let inner;
      if (d <= 13) { const r = lerp(8, 26, d / 13); inner = `<circle cx="100" cy="45" r="${r}" fill="var(--h-fsh)" opacity=".3" stroke="var(--h-fsh)" stroke-width="2"/><circle cx="100" cy="45" r="${r * 0.4}" fill="var(--h-estro)"/><text x="100" y="80" text-anchor="middle" font-size="11" fill="var(--ink-dim)">ฟอลลิเคิลกำลังโต</text>`; }
      else if (d <= 15) { inner = `<circle cx="100" cy="45" r="26" fill="none" stroke="var(--h-lh)" stroke-width="2" stroke-dasharray="3 3"/><circle cx="140" cy="40" r="9" fill="var(--h-estro)"/><path d="M126 45 l10 -4 M126 49 l10 4" stroke="var(--h-lh)" stroke-width="2"/><text x="100" y="80" text-anchor="middle" font-size="11" fill="var(--h-lh)">ตกไข่!</text>`; }
      else if (d <= 26) { inner = `<circle cx="100" cy="45" r="24" fill="var(--h-lh)" opacity=".35" stroke="var(--h-lh)" stroke-width="2"/><text x="100" y="49" text-anchor="middle" font-size="10" fill="#fff" font-weight="800">CL</text><text x="100" y="80" text-anchor="middle" font-size="11" fill="var(--ink-dim)">คอร์ปัสลูเทียม</text>`; }
      else { inner = `<circle cx="100" cy="45" r="14" fill="var(--ink-dim)" opacity=".3" stroke="var(--ink-dim)" stroke-width="2" stroke-dasharray="2 3"/><text x="100" y="80" text-anchor="middle" font-size="11" fill="var(--ink-dim)">คอร์ปัสลูเทียมฝ่อ</text>`; }
      return `<ellipse cx="100" cy="45" rx="60" ry="34" fill="rgba(255,255,255,.05)" stroke="var(--stroke-strong)"/>${inner}`;
    }

    function update(d) {
      const i = d - 1, ph = phaseOf(d);
      dayline.setAttribute('transform', `translate(${dayX(d)},0)`);
      host.querySelector('.d').textContent = d;
      const pt = host.querySelector('.pt'); pt.textContent = ph.t + ' · ' + ph.en;
      pt.style.background = 'color-mix(in srgb,' + ph.c + ' 22%, transparent)'; pt.style.color = ph.c;
      const expl = {
        menses: 'ระดับฮอร์โมนต่ำ เยื่อบุโพรงมดลูกลอกตัวออกเป็นประจำเดือน',
        foll: 'FSH กระตุ้นฟอลลิเคิลให้เจริญและสร้างเอสโตรเจน เยื่อบุมดลูกหนาตัวขึ้น',
        ovul: 'เอสโตรเจนสูงกระตุ้น LH ให้พุ่งสูง (LH surge) → ฟอลลิเคิลปล่อยไข่',
        lut: 'คอร์ปัสลูเทียมสร้างโปรเจสเตอโรน รักษาเยื่อบุมดลูก หากไม่ปฏิสนธิจะฝ่อและเริ่มรอบใหม่',
      };
      host.querySelector('.pen').textContent = expl[ph.key];
      host.querySelector('.bars').innerHTML =
        bar('FSH', FSH[i], 'var(--h-fsh)') + bar('LH', LH[i], 'var(--h-lh)') +
        bar('เอสโตรเจน (estrogen)', EST[i], 'var(--h-estro)') +
        bar('โปรเจสเตอโรน', PRG[i], 'var(--h-prog)') +
        bar('เยื่อบุโพรงมดลูก', END[i], 'var(--accent)');
      ovary.innerHTML = ovaryArt(d);
    }
    const range = host.querySelector('.dayrange');
    range.addEventListener('input', e => { stop(); update(+e.target.value); });
    update(14);

    let raf = null, day = 14, acc = 0, last = null;
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; host.querySelector('.play').innerHTML = '▶ เล่นทั้งรอบ'; } }
    host.querySelector('.play').addEventListener('click', () => {
      if (raf) { stop(); return; }
      day = 1; acc = 0; last = null; range.value = 1; update(1);
      host.querySelector('.play').innerHTML = '⏸ หยุด';
      const perDay = motionOn() ? 320 : 60;
      const step = (ts) => {
        if (last == null) last = ts;
        acc += ts - last; last = ts;
        if (acc >= perDay) { acc = 0; day++; if (day > 28) { stop(); return; } range.value = day; update(day); }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
  };

  /* =========================================================================
     5) anim-oogenesis — การสร้างไข่ + การตกไข่
     ========================================================================= */
  window.WIDGETS['anim-oogenesis'] = function (host) {
    const polar = (x, y) => `<circle cx="${x}" cy="${y}" r="11" fill="var(--surface-2)" stroke="var(--ink-dim)" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" fill="var(--ink-dim)">pb</text>`;
    const egg = (x, y, r, label) => `<circle cx="${x}" cy="${y}" r="${r + 7}" fill="var(--h-estro)" opacity=".18" stroke="var(--h-estro)" stroke-width="2"/>` +
      cellSVG(x, y, r, label, 'color-mix(in srgb,var(--h-estro) 30%, transparent)', 'var(--h-estro)');
    makeStepper(host, {
      aria: 'แผนผังการสร้างไข่อย่างง่าย',
      steps: [
        { t: 'มีไข่ตั้งต้นตั้งแต่เกิด', sub: 'ในรังไข่', desc: 'เพศหญิงมีเซลล์ไข่ตั้งต้นจำนวนจำกัดอยู่ในรังไข่ตั้งแต่แรกเกิด',
          svg: egg(380, 150, 44, '') },
        { t: 'ไข่สุกทีละใบในแต่ละรอบเดือน', sub: 'เมื่อถึงวัยเจริญพันธุ์', desc: 'แต่ละรอบประจำเดือนจะมีไข่พัฒนาและสุกประมาณ 1 ใบ',
          svg: egg(380, 150, 54, '') },
        { t: 'การตกไข่ (ovulation)', sub: '', desc: 'ไข่ที่สุกจะถูกปล่อยออกจากรังไข่เข้าสู่ท่อนำไข่ รอการปฏิสนธิ',
          svg: `<ellipse cx="180" cy="150" rx="70" ry="48" fill="rgba(255,255,255,.05)" stroke="var(--stroke-strong)"/>` +
            `<path d="M250 150 q60 -30 130 0" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="5 6"/>` +
            egg(440, 150, 40, '') +
            `<text x="440" y="230" text-anchor="middle" font-size="14" fill="var(--h-lh)" font-weight="800">ปล่อยไข่จากรังไข่ → ท่อนำไข่</text>` },
        { t: 'รอการปฏิสนธิ', sub: '', desc: 'ถ้าพบอสุจิจะเกิดการปฏิสนธิเป็นตัวอ่อน ถ้าไม่พบ ไข่จะสลายไปพร้อมประจำเดือนรอบใหม่',
          svg: egg(320, 150, 44, '') + spermSVG(520, 150, 1.6, 'var(--accent-2)') +
            `<text x="380" y="235" text-anchor="middle" font-size="14" fill="var(--accent)" font-weight="800">ไข่ + อสุจิ → ปฏิสนธิ</text>` },
      ],
    });
  };

  /* =========================================================================
     6) quiz — แบบทดสอบเลือกตอบ เฉลยทันที
     ========================================================================= */
  window.WIDGETS['quiz'] = function (host) {
    const set = host.dataset.set;
    const data = DATA.quizzes[set];
    if (!data) { host.textContent = 'ไม่พบชุดคำถาม'; return; }
    const KEYS = ['ก', 'ข', 'ค', 'ง', 'จ'];
    let answered = 0, correct = 0;

    host.innerHTML = `<div class="quiz">
      ${data.items.map((it, qi) => `
        <div class="quiz__q" data-q="${qi}">
          <div class="qhead"><span class="qnum">${qi + 1}</span><span class="qtext">${it.q}</span></div>
          <div class="quiz__opts">
            ${it.opts.map((o, oi) => `<button class="quiz__opt" data-oi="${oi}">
              <span class="key">${KEYS[oi]}</span><span>${o}</span></button>`).join('')}
          </div>
          <div class="quiz__explain"></div>
        </div>`).join('')}
      <div class="quiz__scorewrap"><span class="quiz__score">คะแนน: <span class="sc">0</span> / ${data.items.length}</span></div>
    </div>`;

    host.querySelectorAll('.quiz__q').forEach(qEl => {
      const qi = +qEl.dataset.q;
      const it = data.items[qi];
      const opts = qEl.querySelectorAll('.quiz__opt');
      let done = false;
      opts.forEach(opt => {
        opt.addEventListener('click', () => {
          if (done) return;
          done = true;
          const oi = +opt.dataset.oi;
          const isRight = oi === it.answer;
          opts.forEach(o => {
            o.disabled = true;
            const i = +o.dataset.oi;
            if (i === it.answer) o.classList.add('correct');
            else if (i === oi) o.classList.add('wrong');
          });
          const ex = qEl.querySelector('.quiz__explain');
          ex.innerHTML = (isRight ? '✅ <b>ถูกต้อง</b> — ' : '❌ <b>ยังไม่ถูก</b> — ') + it.explain;
          ex.classList.add('show');
          answered++; if (isRight) correct++;
          host.querySelector('.sc').textContent = correct;
          if (window.Engine && Engine.refit) setTimeout(Engine.refit, 380);
        });
      });
    });
  };

})();
