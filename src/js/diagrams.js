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
      viewBox: '0 0 600 600',
      aria: 'อวัยวะสืบพันธุ์ชายภายนอก (แผนผังอย่างง่าย)',
      caption: 'ภาพแผนผังอย่างง่ายเชิงวิทยาศาสตร์ (ไม่ใช่ภาพสมจริง) เพื่อการศึกษา',
      art: `
        <!-- หัวองคชาต = สามเหลี่ยมมน บนสุด -->
        <path class="organ-fill" d="M311.7 100.6 L360.3 177.4 Q372 196 350 196 L250 196
              Q228 196 239.7 177.4 L288.3 100.6 Q300 82 311.7 100.6 Z"/>
        <!-- องคชาต = ท่อขึ้นตรงกลาง -->
        <rect class="organ-soft" x="266" y="190" width="68" height="232" rx="34"/>
        <line class="organ-line" x1="300" y1="214" x2="300" y2="404" stroke-dasharray="4 8" opacity=".5"/>
        <!-- ถุงอัณฑะ = วงกลม 2 วง ด้านล่าง -->
        <circle class="organ-soft" cx="252" cy="468" r="64"/>
        <circle class="organ-soft" cx="348" cy="468" r="64"/>
        <ellipse cx="252" cy="468" rx="30" ry="40" fill="rgba(255,255,255,.05)" stroke="var(--accent-2)" stroke-width="1.4" opacity=".7"/>
        <ellipse cx="348" cy="468" rx="30" ry="40" fill="rgba(255,255,255,.05)" stroke="var(--accent-2)" stroke-width="1.4" opacity=".7"/>
        <text x="300" y="556" text-anchor="middle" font-size="12.5" fill="var(--ink-dim)">วงกลม 2 วง = อัณฑะภายในถุงอัณฑะ</text>
      `,
      organs: [
        { id: 'glans', x: 300, y: 150, lx: 16, name: 'หัวองคชาต', en: 'glans penis', fn: 'ส่วนปลายขององคชาต (รูปสามเหลี่ยมมนบนสุด) ไวต่อความรู้สึก เป็นที่เปิดของท่อปัสสาวะ' },
        { id: 'penis', x: 300, y: 300, lx: -30, name: 'องคชาต', en: 'penis', fn: 'ส่วนท่อตรงกลาง เป็นอวัยวะร่วมเพศ และทางผ่านของทั้งปัสสาวะและน้ำอสุจิออกนอกร่างกาย' },
        { id: 'scrotum', x: 252, y: 468, name: 'ถุงอัณฑะ', en: 'scrotum', fn: 'ถุงผิวหนัง (วงกลม 2 วงด้านล่าง) ห่อหุ้มอัณฑะไว้ภายนอกช่องท้อง ปรับระยะเพื่อรักษาอุณหภูมิให้เหมาะกับการสร้างอสุจิ' },
      ],
    });
  };

  // ───── ชาย: ภายใน — ใช้ไดอะแกรม Wikimedia (มุมมองด้านข้าง) แปลไทย + ปรับสไตล์ ─────
  window.WIDGETS['diagram-male-internal'] = function (host) {
    const legend = [
      ['อัณฑะ', 'testis'], ['ท่อพักอสุจิ', 'epididymis'], ['ท่อนำอสุจิ', 'vas deferens'],
      ['ถุงน้ำเลี้ยงอสุจิ', 'seminal vesicle'], ['ท่อฉีดอสุจิ', 'ejaculatory duct'],
      ['ต่อมลูกหมาก', 'prostate gland'], ['ต่อมคาวเปอร์', 'bulbourethral gland'],
      ['ท่อปัสสาวะ', 'urethra'], ['หัวองคชาต', 'glans penis'],
      ['รูเปิดท่อปัสสาวะ', 'external urethral orifice'], ['ถุงอัณฑะ', 'scrotum'],
      ['กระเพาะปัสสาวะ', 'urinary bladder'], ['ทวารหนัก', 'anus'], ['กระดูกหัวหน่าว', 'pubic bone'],
      ['คอร์ปัสคาเวอร์โนซัม', 'corpus cavernosum'], ['คอร์ปัสสปอนจิโอซัม', 'corpus spongiosum'],
      ['เอ็นแขวนองคชาต', 'suspensory ligament'], ['ถุงฝีเย็บชั้นลึก', 'deep perineal pouch'],
    ];
    const legendHtml = legend.map(p =>
      `<div><b>${p[0]}</b> <span class="en">(${p[1]})</span></div>`).join('');
    host.innerHTML =
      `<div class="dgm9-card">${window.SVG_MALE_INTERNAL || '<p class=muted>โหลดไดอะแกรมไม่สำเร็จ</p>'}</div>
       <details class="dgm9-legend-wrap" open>
         <summary>คำศัพท์ ไทย–อังกฤษ (18 รายการ)</summary>
         <div class="dgm9-legend">${legendHtml}</div>
       </details>
       <div class="hint dgm9-credit">ที่มา: ดัดแปลงจาก Wikimedia Commons — “Human male reproductive system” โดย Wumingbai (CC BY-SA 4.0) · แปลไทยและปรับสไตล์เพื่อการศึกษา</div>`;
  };

  // (เลิกใช้) ไดอะแกรมชายภายในแบบวาดเอง — เก็บไว้เป็นสำรอง
  window.WIDGETS['diagram-male-internal-drawn'] = function (host) {
    makeDiagram(host, {
      viewBox: '0 0 760 580',
      aria: 'อวัยวะสืบพันธุ์ชายภายใน (มุมมองด้านข้าง)',
      caption: 'มุมมองด้านข้าง (sagittal) · เส้นจาง = แนวลำตัว · เส้นประ = ท่อปัสสาวะ/เส้นทางอสุจิ',
      art: `
        <!-- โครงร่างลำตัวด้านข้าง (จาง): สะโพก/ก้นด้านซ้าย · องคชาตยื่นขวา-ล่าง -->
        <path d="M150 26 L452 26 C452 120 450 150 452 168 C500 178 560 210 575 250
                 C600 300 632 360 612 372 C588 386 560 360 540 346 C516 360 470 300 452 270
                 C436 300 360 312 300 318 C250 322 235 360 235 400 L235 560 L96 560
                 C62 360 60 250 84 180 C100 120 110 60 150 26 Z"
              fill="rgba(255,196,168,.07)" stroke="var(--stroke)" stroke-width="1.5"/>
        <text x="180" y="60" font-size="12" fill="var(--ink-dim)">ลำตัว (ด้านข้าง)</text>
        <!-- ทวารหนัก (บริบท จาง) -->
        <path d="M205 150 L205 330" stroke="var(--stroke-strong)" stroke-width="16" fill="none" stroke-linecap="round" opacity=".35"/>
        <text x="170" y="250" font-size="10.5" fill="var(--ink-dim)" text-anchor="end">ทวารหนัก</text>
        <!-- กระเพาะปัสสาวะ (บริบท จาง) -->
        <ellipse cx="345" cy="180" rx="72" ry="56" fill="rgba(185,140,255,.10)" stroke="var(--stroke-strong)" stroke-width="1.5"/>
        <text x="345" y="135" text-anchor="middle" font-size="11" fill="var(--ink-dim)">กระเพาะปัสสาวะ</text>
        <!-- หัวหน่าว (บริบท) -->
        <ellipse cx="420" cy="270" rx="16" ry="22" fill="rgba(255,255,255,.06)" stroke="var(--stroke)"/>
        <!-- ถุงน้ำเลี้ยงอสุจิ (หลังกระเพาะปัสสาวะ) -->
        <path class="organ-soft" d="M250 232 q22 -22 44 -6 q14 14 0 30 q-10 14 -26 8 q-22 -8 -18 -32 Z"/>
        <!-- ท่อนำอสุจิ: จากอัณฑะวนขึ้นหลังกระเพาะปัสสาวะ -->
        <path class="organ-line" d="M520 408 C470 350 440 312 408 296 C360 272 300 270 282 252" stroke-width="4.5"/>
        <!-- ต่อมลูกหมาก (ล้อมท่อปัสสาวะ ใต้กระเพาะปัสสาวะ) -->
        <ellipse class="organ-fill" cx="372" cy="288" rx="40" ry="34"/>
        <circle cx="372" cy="288" r="10" fill="var(--bg-1)" stroke="var(--accent-2)" stroke-width="2"/>
        <!-- ต่อมคาวเปอร์ (ใต้ต่อมลูกหมาก ใกล้โคนองคชาต) -->
        <circle class="organ-soft" cx="404" cy="330" r="13"/>
        <!-- องคชาต (ยื่นไปขวา-ล่าง) -->
        <path class="organ-soft" d="M404 296 L660 392 Q692 402 690 424 Q686 448 658 440 L410 352 Z"/>
        <ellipse class="organ-fill" cx="676" cy="424" rx="26" ry="24"/>
        <!-- ท่อปัสสาวะ (เส้นประ ผ่านต่อมลูกหมาก → องคชาต → ปลาย) -->
        <path d="M345 232 C360 260 366 280 380 300 C420 330 540 372 666 418"
              fill="none" stroke="var(--accent-2)" stroke-width="2.4" stroke-dasharray="4 6" opacity=".7"/>
        <!-- ถุงอัณฑะ + อัณฑะ + ท่อพักอสุจิ (ห้อยล่าง) -->
        <path class="organ-soft" d="M470 372 C432 392 420 470 472 512 C520 548 580 540 606 498 C632 456 620 388 568 372 Z" opacity=".5"/>
        <ellipse class="organ-fill" cx="528" cy="456" rx="48" ry="56"/>
        <ellipse cx="540" cy="448" rx="20" ry="26" fill="rgba(255,255,255,.10)"/>
        <!-- ท่อพักอสุจิ (epididymis) คลุมด้านหลัง-บนของอัณฑะ -->
        <path class="organ-line" d="M486 412 C474 446 480 486 506 506" stroke-width="6"/>
      `,
      organs: [
        { id: 'testis', x: 528, y: 456, name: 'อัณฑะ', en: 'testis', fn: 'สร้างอสุจิในหลอดสร้างอสุจิ และสร้างฮอร์โมนเทสโทสเตอโรน' },
        { id: 'epididymis', x: 488, y: 458, lx: -20, name: 'ท่อพักอสุจิ', en: 'epididymis', fn: 'อยู่ด้านหลัง-บนของอัณฑะ เก็บอสุจิและทำให้อสุจิเจริญเต็มที่จนเคลื่อนที่ (ว่ายน้ำ) ได้' },
        { id: 'vas', x: 440, y: 318, name: 'ท่อนำอสุจิ', en: 'vas deferens', fn: 'ลำเลียงอสุจิจากท่อพักอสุจิวนขึ้นไปด้านหลังกระเพาะปัสสาวะ ก่อนเข้าสู่ท่อปัสสาวะ' },
        { id: 'seminal', x: 272, y: 238, lx: -22, ly: -6, name: 'ถุงน้ำเลี้ยงอสุจิ', en: 'seminal vesicle', fn: 'อยู่หลังกระเพาะปัสสาวะ สร้างของเหลวที่มีน้ำตาลฟรุกโตส เป็นแหล่งพลังงานให้อสุจิ' },
        { id: 'prostate', x: 372, y: 288, name: 'ต่อมลูกหมาก', en: 'prostate gland', fn: 'อยู่ใต้กระเพาะปัสสาวะ ล้อมรอบท่อปัสสาวะ สร้างของเหลวด่างอ่อนช่วยให้อสุจิอยู่รอด' },
        { id: 'bulbo', x: 404, y: 330, name: 'ต่อมคาวเปอร์', en: 'bulbourethral gland', fn: 'อยู่ใต้ต่อมลูกหมากใกล้โคนองคชาต หลั่งเมือกหล่อลื่นและทำความสะอาดท่อปัสสาวะ' },
        { id: 'urethra', x: 560, y: 392, ly: -10, name: 'ท่อปัสสาวะ', en: 'urethra', fn: 'ทางผ่านร่วมของน้ำอสุจิและปัสสาวะ วิ่งจากกระเพาะปัสสาวะผ่านต่อมลูกหมากไปตามองคชาตสู่ปลาย' },
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
