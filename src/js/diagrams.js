/* ============================================================================
   diagrams.js — ไดอะแกรมกายวิภาค SVG แบบ interactive (hotspot)
   ไดอะแกรมเชิงวิทยาศาสตร์/แผนผัง (schematic) — ไม่ใช่ภาพสมจริง
   ============================================================================ */
'use strict';

(function () {

  // โรงงานสร้างไดอะแกรม: art = SVG ส่วนกายวิภาค, organs = จุด hotspot
  function makeDiagram(host, cfg) {
    const organs = cfg.organs;
    const hs = organs.map((o, i) => `
      <g class="hotspot" data-id="${o.id}" tabindex="0" role="button" aria-label="${o.name}">
        <circle class="ring" cx="${o.x}" cy="${o.y}" r="9"></circle>
        <circle class="dot" cx="${o.x}" cy="${o.y}" r="7"></circle>
        <text x="${o.x + (o.lx != null ? o.lx : 13)}" y="${o.y + (o.ly != null ? o.ly : 5)}"
          font-size="17" font-weight="800" fill="#fff" paint-order="stroke"
          stroke="rgba(0,0,0,.6)" stroke-width="3">${i + 1}</text>
      </g>`).join('');

    host.innerHTML = `
      <div class="split" style="align-items:start">
        <div class="diagram">
          <svg viewBox="${cfg.viewBox}" role="img" aria-label="${cfg.aria || 'ไดอะแกรมกายวิภาค'}">
            ${cfg.art}
            <g class="hotspots">${hs}</g>
          </svg>
        </div>
        <div>
          <div class="infocard">
            <div class="default"><div class="hint">👆 แตะจุดหมายเลขบนภาพ หรือเลือกจากรายการด้านล่าง เพื่อดูชื่อและหน้าที่</div></div>
            <div class="detail" style="display:none">
              <div class="ttl"></div>
              <div class="fn"></div>
            </div>
          </div>
          <div class="organ-list">
            ${organs.map((o, i) => `<button data-id="${o.id}">${i + 1}. ${o.name}</button>`).join('')}
          </div>
          ${cfg.caption ? `<div class="hint" style="margin-top:.6rem">${cfg.caption}</div>` : ''}
        </div>
      </div>`;

    const svg = host.querySelector('svg');
    const infocard = host.querySelector('.infocard');
    const detail = host.querySelector('.detail');
    const def = host.querySelector('.default');

    function select(id) {
      const o = organs.find(x => x.id === id);
      if (!o) return;
      def.style.display = 'none';
      detail.style.display = '';
      infocard.classList.add('show');
      detail.querySelector('.ttl').innerHTML = `${o.name} <span class="en">(${o.en})</span>`;
      detail.querySelector('.fn').textContent = o.fn;
      host.querySelectorAll('.hotspot').forEach(h => h.classList.toggle('active', h.dataset.id === id));
      host.querySelectorAll('.organ-list button').forEach(b => b.classList.toggle('active', b.dataset.id === id));
    }

    svg.querySelectorAll('.hotspot').forEach(h => {
      h.addEventListener('click', () => select(h.dataset.id));
      h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(h.dataset.id); } });
    });
    host.querySelectorAll('.organ-list button').forEach(b => {
      b.addEventListener('click', () => select(b.dataset.id));
    });
  }

  // ───────────────────────── ชาย: ภายนอก ─────────────────────────────────
  window.WIDGETS['diagram-male-external'] = function (host) {
    makeDiagram(host, {
      viewBox: '0 0 620 600',
      aria: 'อวัยวะสืบพันธุ์ชายภายนอก (แผนผัง)',
      caption: 'ภาพแผนผังเชิงวิทยาศาสตร์ (ไม่ใช่ภาพสมจริง) · เส้นจาง = แนวลำตัว/ต้นขา',
      art: `
        <!-- โครงร่างลำตัว/ต้นขา (จาง) บอกตำแหน่ง -->
        <path d="M150 40 Q310 12 470 40 L478 158 Q310 128 142 158 Z" fill="rgba(255,255,255,.03)" stroke="var(--stroke)" stroke-width="1.5"/>
        <path d="M150 158 Q118 380 150 595 L66 595 Q36 360 86 150 Z" fill="rgba(255,255,255,.03)" stroke="var(--stroke)" stroke-width="1.5"/>
        <path d="M470 158 Q502 380 470 595 L554 595 Q584 360 534 150 Z" fill="rgba(255,255,255,.03)" stroke="var(--stroke)" stroke-width="1.5"/>
        <text x="310" y="34" text-anchor="middle" font-size="12.5" fill="var(--ink-dim)">บริเวณอุ้งเชิงกราน (มุมมองด้านหน้า)</text>
        <text x="96" y="560" font-size="12" fill="var(--ink-dim)">ต้นขา</text>
        <text x="524" y="560" font-size="12" fill="var(--ink-dim)" text-anchor="end">ต้นขา</text>
        <!-- ถุงอัณฑะ (อยู่ด้านหลัง) -->
        <path class="organ-soft" d="M205 252 Q310 224 415 252 Q470 372 405 472 Q360 522 310 522 Q260 522 215 472 Q150 372 205 252 Z"/>
        <ellipse cx="256" cy="404" rx="40" ry="52" fill="rgba(255,255,255,.05)" stroke="var(--stroke-strong)"/>
        <ellipse cx="364" cy="404" rx="40" ry="52" fill="rgba(255,255,255,.05)" stroke="var(--stroke-strong)"/>
        <!-- องคชาต (อยู่ด้านหน้า) -->
        <rect class="organ-soft" x="278" y="150" width="64" height="186" rx="32"/>
        <line class="organ-line" x1="310" y1="176" x2="310" y2="322" stroke-dasharray="4 7" opacity=".5"/>
        <!-- หัวองคชาต -->
        <ellipse class="organ-fill" cx="310" cy="344" rx="42" ry="36"/>
        <circle cx="310" cy="362" r="5" fill="var(--bg-0)" stroke="var(--accent-2)" stroke-width="2"/>
      `,
      organs: [
        { id: 'penis', x: 310, y: 214, lx: -30, name: 'องคชาต', en: 'penis', fn: 'อวัยวะร่วมเพศ และเป็นทางผ่านของทั้งปัสสาวะและน้ำอสุจิออกนอกร่างกาย' },
        { id: 'glans', x: 348, y: 344, name: 'หัวองคชาต', en: 'glans penis', fn: 'ส่วนปลายขององคชาตที่ไวต่อความรู้สึก เป็นที่เปิดของท่อปัสสาวะ' },
        { id: 'scrotum', x: 424, y: 372, name: 'ถุงอัณฑะ', en: 'scrotum', fn: 'ถุงผิวหนังห่อหุ้มอัณฑะไว้ภายนอกช่องท้อง (อยู่ด้านหลังองคชาต) ปรับระยะเพื่อรักษาอุณหภูมิให้เหมาะกับการสร้างอสุจิ' },
      ],
    });
  };

  // ───────────────────────── ชาย: ภายใน ──────────────────────────────────
  window.WIDGETS['diagram-male-internal'] = function (host) {
    makeDiagram(host, {
      viewBox: '0 0 760 620',
      aria: 'อวัยวะสืบพันธุ์ชายภายใน (แผนผังด้านหน้า)',
      caption: 'มุมมองด้านหน้า · เส้นจาง = แนวลำตัว/ต้นขา · เส้นประเขียว = เส้นทางอสุจิ (มีอวัยวะคู่ละ 2 ข้าง)',
      art: `
        <!-- โครงร่างลำตัว + ขา 2 ข้าง (จาง) -->
        <path d="M248 24 L512 24 L524 300 L470 332 L290 332 L236 300 Z"
              fill="rgba(255,255,255,.03)" stroke="var(--stroke)" stroke-width="1.5"/>
        <path d="M248 320 Q224 470 250 606 L338 606 Q352 470 366 372 L394 372 Q408 470 422 606 L510 606 Q536 470 512 320 Z"
              fill="rgba(255,255,255,.025)" stroke="var(--stroke)" stroke-width="1.5"/>
        <text x="380" y="50" text-anchor="middle" font-size="12.5" fill="var(--ink-dim)">ช่องเชิงกราน (มุมมองด้านหน้า)</text>
        <text x="300" y="560" text-anchor="middle" font-size="11" fill="var(--ink-dim)">ขา</text>
        <text x="460" y="560" text-anchor="middle" font-size="11" fill="var(--ink-dim)">ขา</text>
        <!-- กระเพาะปัสสาวะ (บริบท จาง) -->
        <ellipse cx="380" cy="168" rx="82" ry="60" fill="rgba(255,255,255,.04)" stroke="var(--stroke-strong)" stroke-width="1.5"/>
        <text x="380" y="120" text-anchor="middle" font-size="11" fill="var(--ink-dim)">กระเพาะปัสสาวะ</text>
        <!-- เส้นทางอสุจิ 2 ข้าง (จาง) -->
        <path d="M318 506 Q300 380 352 312 L380 300 L380 470" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-dasharray="5 7" opacity=".4"/>
        <path d="M442 506 Q460 380 408 312 L380 300" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-dasharray="5 7" opacity=".4"/>
        <!-- ถุงน้ำเลี้ยงอสุจิ 2 ข้าง -->
        <ellipse class="organ-soft" cx="318" cy="236" rx="28" ry="20" transform="rotate(-22 318 236)"/>
        <ellipse class="organ-soft" cx="442" cy="236" rx="28" ry="20" transform="rotate(22 442 236)"/>
        <!-- ต่อมลูกหมาก (donut รอบท่อปัสสาวะ) -->
        <ellipse class="organ-fill" cx="380" cy="286" rx="46" ry="38"/>
        <circle cx="380" cy="286" r="11" fill="var(--bg-1)" stroke="var(--accent-2)" stroke-width="2"/>
        <!-- ต่อมคาวเปอร์ 2 ข้าง -->
        <circle class="organ-soft" cx="350" cy="334" r="12"/>
        <circle class="organ-soft" cx="410" cy="334" r="12"/>
        <!-- ท่อนำอสุจิ 2 ข้าง -->
        <path class="organ-line" d="M322 488 Q300 380 350 312" stroke-width="4.5"/>
        <path class="organ-line" d="M438 488 Q460 380 410 312" stroke-width="4.5"/>
        <!-- ท่อปัสสาวะ + องคชาต (ลงล่าง ระหว่างขา) -->
        <rect class="organ-soft" x="358" y="328" width="44" height="160" rx="22"/>
        <line x1="380" y1="348" x2="380" y2="478" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="3 5" opacity=".6"/>
        <ellipse class="organ-fill" cx="380" cy="506" rx="30" ry="26"/>
        <!-- อัณฑะ + ท่อพักอสุจิ 2 ข้าง -->
        <ellipse class="organ-fill" cx="316" cy="508" rx="44" ry="40"/>
        <path class="organ-line" d="M348 482 Q372 508 346 534" stroke-width="5"/>
        <ellipse class="organ-fill" cx="444" cy="508" rx="44" ry="40"/>
        <path class="organ-line" d="M412 482 Q388 508 414 534" stroke-width="5"/>
      `,
      organs: [
        { id: 'testis', x: 316, y: 508, lx: -16, name: 'อัณฑะ', en: 'testis', fn: 'สร้างอสุจิในหลอดสร้างอสุจิ และสร้างฮอร์โมนเทสโทสเตอโรน (มี 2 ข้าง)' },
        { id: 'epididymis', x: 350, y: 534, name: 'ท่อพักอสุจิ', en: 'epididymis', fn: 'เก็บอสุจิและทำให้อสุจิเจริญเต็มที่จนเคลื่อนที่ (ว่ายน้ำ) ได้' },
        { id: 'vas', x: 320, y: 408, lx: -28, name: 'ท่อนำอสุจิ', en: 'vas deferens', fn: 'ลำเลียงอสุจิจากท่อพักอสุจิขึ้นไปรวมกับของเหลวจากต่อมต่าง ๆ ก่อนเข้าสู่ท่อปัสสาวะ' },
        { id: 'seminal', x: 318, y: 236, lx: -22, ly: -8, name: 'ถุงน้ำเลี้ยงอสุจิ', en: 'seminal vesicle', fn: 'สร้างของเหลวที่มีน้ำตาลฟรุกโตส เป็นแหล่งพลังงานให้อสุจิ' },
        { id: 'prostate', x: 380, y: 286, name: 'ต่อมลูกหมาก', en: 'prostate gland', fn: 'สร้างของเหลวเป็นด่างอ่อนผสมในน้ำอสุจิ ช่วยลดความเป็นกรดเพื่อให้อสุจิอยู่รอด' },
        { id: 'bulbo', x: 410, y: 334, name: 'ต่อมคาวเปอร์', en: 'bulbourethral gland', fn: 'หลั่งเมือกหล่อลื่นและช่วยทำความสะอาดท่อปัสสาวะก่อนการหลั่ง' },
        { id: 'urethra', x: 380, y: 430, lx: 14, name: 'ท่อปัสสาวะ', en: 'urethra', fn: 'ทางผ่านร่วมของน้ำอสุจิและปัสสาวะออกสู่ภายนอกผ่านองคชาต' },
      ],
    });
  };

  // ───────────────────────── หญิง: ภายนอก ────────────────────────────────
  window.WIDGETS['diagram-female-external'] = function (host) {
    makeDiagram(host, {
      viewBox: '0 0 600 560',
      aria: 'อวัยวะสืบพันธุ์หญิงภายนอก (แผนผัง)',
      caption: 'ภาพแผนผังเชิงวิทยาศาสตร์ (ไม่ใช่ภาพสมจริง) — รวมเรียกอวัยวะภายนอกว่า vulva',
      art: `
        <!-- mons pubis -->
        <ellipse class="organ-soft" cx="300" cy="110" rx="130" ry="66"/>
        <!-- labia majora -->
        <ellipse class="organ-soft" cx="222" cy="330" rx="60" ry="180"/>
        <ellipse class="organ-soft" cx="378" cy="330" rx="60" ry="180"/>
        <!-- labia minora -->
        <ellipse class="organ-fill" cx="262" cy="330" rx="26" ry="140"/>
        <ellipse class="organ-fill" cx="338" cy="330" rx="26" ry="140"/>
        <!-- clitoris -->
        <ellipse class="organ-fill" cx="300" cy="196" rx="18" ry="24"/>
        <!-- urethral opening -->
        <circle cx="300" cy="280" r="8" fill="var(--bg-0)" stroke="var(--accent-2)" stroke-width="2.4"/>
        <!-- vaginal opening -->
        <ellipse cx="300" cy="362" rx="30" ry="50" fill="rgba(0,0,0,.35)" stroke="var(--accent)" stroke-width="2.4"/>
      `,
      organs: [
        { id: 'clitoris', x: 300, y: 196, lx: -28, name: 'คลิตอริส', en: 'clitoris', fn: 'อวัยวะที่ไวต่อความรู้สึก อยู่ส่วนบนสุดของอวัยวะเพศภายนอก' },
        { id: 'majora', x: 378, y: 250, name: 'แคมใหญ่', en: 'labia majora', fn: 'แผ่นผิวหนังชั้นนอก ทำหน้าที่ปกป้องอวัยวะเพศภายในจากการบาดเจ็บและเชื้อโรค' },
        { id: 'minora', x: 338, y: 320, name: 'แคมเล็ก', en: 'labia minora', fn: 'แผ่นชั้นใน ปกป้องรูเปิดท่อปัสสาวะและปากช่องคลอด' },
        { id: 'urethra-o', x: 300, y: 280, lx: 16, name: 'รูเปิดท่อปัสสาวะ', en: 'urethral opening', fn: 'ช่องเปิดสำหรับขับปัสสาวะ แยกจากช่องคลอด' },
        { id: 'vagina-o', x: 300, y: 362, lx: 18, name: 'ปากช่องคลอด', en: 'vaginal opening', fn: 'ทางเข้าสู่ช่องคลอด เป็นทางผ่านของประจำเดือนและช่องทางคลอด' },
      ],
    });
  };

  // ───────────────────────── หญิง: ภายใน ─────────────────────────────────
  window.WIDGETS['diagram-female-internal'] = function (host) {
    makeDiagram(host, {
      viewBox: '0 0 760 560',
      aria: 'อวัยวะสืบพันธุ์หญิงภายใน (แผนผังด้านหน้า)',
      caption: 'มุมมองด้านหน้า: รังไข่ → ท่อนำไข่ → มดลูก → ปากมดลูก → ช่องคลอด',
      art: `
        <!-- uterus body -->
        <path class="organ-fill" d="M285 230 Q280 175 380 172 Q480 175 475 230 L462 320 Q452 360 380 366 Q308 360 298 320 Z"/>
        <!-- endometrium (เยื่อบุด้านใน) -->
        <path d="M320 245 Q380 220 440 245 L432 312 Q420 340 380 344 Q340 340 328 312 Z"
              fill="var(--theme-tint)" stroke="var(--accent-2)" stroke-width="1.6"/>
        <!-- fallopian tubes -->
        <path class="organ-line" d="M292 222 Q210 165 165 200" stroke-width="5"/>
        <path class="organ-line" d="M468 222 Q550 165 595 200" stroke-width="5"/>
        <!-- fimbriae -->
        <path d="M150 195 l-16 -8 M156 205 l-18 0 M152 215 l-16 8" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
        <path d="M610 195 l16 -8 M604 205 l18 0 M608 215 l16 8" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
        <!-- ovaries -->
        <ellipse class="organ-soft" cx="150" cy="210" rx="38" ry="26"/>
        <ellipse class="organ-soft" cx="610" cy="210" rx="38" ry="26"/>
        <!-- cervix -->
        <rect class="organ-soft" x="356" y="366" width="48" height="40" rx="10"/>
        <!-- vagina -->
        <path class="organ-soft" d="M345 406 L415 406 L432 510 Q380 524 328 510 Z"/>
      `,
      organs: [
        { id: 'ovary', x: 150, y: 210, lx: -16, ly: -16, name: 'รังไข่', en: 'ovary', fn: 'สร้างไข่ (ovum) และฮอร์โมนเพศหญิง เอสโตรเจนและโปรเจสเตอโรน มี 2 ข้าง' },
        { id: 'tube', x: 250, y: 188, ly: -10, name: 'ท่อนำไข่', en: 'fallopian tube', fn: 'รับไข่ที่ตกจากรังไข่เข้าสู่มดลูก และเป็นตำแหน่งที่เกิดการปฏิสนธิตามปกติ' },
        { id: 'uterus', x: 380, y: 300, name: 'มดลูก', en: 'uterus', fn: 'อวัยวะกล้ามเนื้อรูปคล้ายลูกแพร์ เป็นที่ฝังตัวและเจริญเติบโตของตัวอ่อนจนคลอด' },
        { id: 'endometrium', x: 380, y: 250, lx: 14, ly: -6, name: 'เยื่อบุโพรงมดลูก', en: 'endometrium', fn: 'เยื่อบุชั้นในของมดลูกที่หนาตัวรองรับการฝังตัว หากไม่ปฏิสนธิจะลอกออกเป็นประจำเดือน' },
        { id: 'cervix', x: 380, y: 386, lx: 26, name: 'ปากมดลูก', en: 'cervix', fn: 'ส่วนล่างของมดลูกที่เชื่อมกับช่องคลอด ผลิตมูกและเป็นด่านป้องกันเชื้อโรค' },
        { id: 'vagina', x: 380, y: 470, name: 'ช่องคลอด', en: 'vagina', fn: 'ช่องทางเชื่อมภายนอกกับมดลูก เป็นทางผ่านของประจำเดือน การร่วมเพศ และช่องทางคลอด' },
      ],
    });
  };

})();
