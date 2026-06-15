/* ============================================================================
   main.js — bootstrap
   ============================================================================ */
'use strict';
(function () {
  function start() {
    try {
      Engine.boot();
    } catch (e) {
      console.error(e);
      var f = document.getElementById('boot-fallback');
      if (f) f.textContent = 'เกิดข้อผิดพลาดในการโหลด: ' + (e && e.message ? e.message : e);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
