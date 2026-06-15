#!/usr/bin/env node
/*
 * build.js — kinetic HTML presentation builder (Node only, no deps)
 * ----------------------------------------------------------------------------
 * รวมทุกอย่าง (CSS / JS / ฟอนต์ woff2 เป็น data URI) ไว้ในไฟล์ HTML เดียว
 * ส่งออก 2 บิลด์ที่ self-contained เปิดออฟไลน์ได้ทั้งคู่:
 *   1) index.html                     — สำหรับ GitHub Pages (เปิดออนไลน์)
 *   2) dist/presentation-offline.html — สำเนาเดียวกัน เปิด file:// ได้ด้วยดับเบิลคลิก
 *
 * ข้อกำหนดความ self-contained (ตรวจอัตโนมัติท้ายไฟล์):
 *   - ห้าม type=module, ห้าม <script src> ภายนอก, ห้าม fetch(), ห้าม url(http...)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

function read(p) { return fs.readFileSync(p, 'utf8'); }

// ── ฟอนต์: ฝัง woff2 เป็น data URI พร้อม unicode-range ───────────────────────
const RANGE_THAI =
  'U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC';
const RANGE_LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, ' +
  'U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, ' +
  'U+2212, U+2215, U+FEFF, U+FFFD';

const FONT_FACES = [
  { w: 400, subset: 'thai',  range: RANGE_THAI },
  { w: 400, subset: 'latin', range: RANGE_LATIN },
  { w: 600, subset: 'thai',  range: RANGE_THAI },
  { w: 600, subset: 'latin', range: RANGE_LATIN },
  { w: 800, subset: 'thai',  range: RANGE_THAI },
  { w: 800, subset: 'latin', range: RANGE_LATIN },
];

function buildFontCss() {
  return FONT_FACES.map(f => {
    const file = path.join(SRC, 'assets', 'fonts', `sarabun-${f.w}-${f.subset}.woff2`);
    const b64 = fs.readFileSync(file).toString('base64');
    return [
      '@font-face{',
      "font-family:'Sarabun';",
      'font-style:normal;',
      `font-weight:${f.w};`,
      'font-display:swap;',
      `src:url(data:font/woff2;base64,${b64}) format('woff2');`,
      `unicode-range:${f.range};`,
      '}',
    ].join('');
  }).join('\n');
}

// ── ลำดับการรวมไฟล์ ─────────────────────────────────────────────────────────
const CSS_FILES = ['css/theme.css', 'css/app.css'];
// data → diagrams → animations → engine → main (ลำดับ dependency)
const JS_FILES  = ['js/data.js', 'js/diagrams.js', 'js/animations.js', 'js/engine.js', 'js/main.js'];

function buildHtml() {
  const fontCss = buildFontCss();
  const css = CSS_FILES.map(f => `/* ===== ${f} ===== */\n` + read(path.join(SRC, f))).join('\n\n');
  const js  = JS_FILES.map(f => `/* ===== ${f} ===== */\n` + read(path.join(SRC, f))).join('\n;\n');

  const styleBlock = `<style>\n${fontCss}\n\n${css}\n</style>`;
  const scriptBlock = `<script>\n${js}\n</script>`;

  let html = read(path.join(SRC, 'template.html'));
  html = html.replace('<!--STYLES-->', styleBlock);
  html = html.replace('<!--SCRIPTS-->', scriptBlock);
  return html;
}

// ── ตรวจสอบความ self-contained ──────────────────────────────────────────────
function validate(html) {
  const problems = [];
  if (/type\s*=\s*["']?module/i.test(html)) problems.push('พบ type=module');
  if (/<script[^>]*\ssrc\s*=/i.test(html)) problems.push('พบ <script src=...> ภายนอก');
  if (/<link[^>]*\bhref\s*=\s*["']https?:/i.test(html)) problems.push('พบ <link href=http...>');
  if (/\bfetch\s*\(/.test(html)) problems.push('พบการเรียก fetch()');
  if (/\bXMLHttpRequest\b/.test(html)) problems.push('พบ XMLHttpRequest');
  if (/\bimport\s*\(/.test(html)) problems.push('พบ dynamic import()');
  if (/url\(\s*["']?https?:/i.test(html)) problems.push('พบ url(http...) ใน CSS');
  return problems;
}

function main() {
  const html = buildHtml();
  const problems = validate(html);

  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'index.html'), html);
  fs.writeFileSync(path.join(ROOT, 'dist', 'presentation-offline.html'), html);
  fs.writeFileSync(path.join(ROOT, '.nojekyll'), '');

  const kb = (html.length / 1024).toFixed(1);
  console.log(`✓ index.html                      (${kb} KB)`);
  console.log(`✓ dist/presentation-offline.html  (${kb} KB)`);
  console.log(`✓ .nojekyll`);

  if (problems.length) {
    console.error('\n✗ ตรวจพบปัญหา self-contained:');
    problems.forEach(p => console.error('  - ' + p));
    process.exit(1);
  } else {
    console.log('\n✓ self-contained ครบ: 0 type=module, 0 external src, 0 fetch, 0 url(http)');
  }
}

main();
