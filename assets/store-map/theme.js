/* The merchant page owns the theme; keep the iframe in sync without reloading it. */
(function () {
  'use strict';
  const root = document.documentElement;
  let source = root;
  try { if (window.parent !== window) source = window.parent.document.documentElement; } catch {}
  const sync = () => {
    const dark = source !== root ? source.classList.contains('dark') : localStorage.getItem('theme') === 'dark';
    root.classList.toggle('dark', dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#0f172a' : '#1c5335';
  };
  sync();
  const observer = new MutationObserver(sync);
  if (source !== root) observer.observe(source, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('storage', sync);
  window.addEventListener('pagehide', () => { observer.disconnect(); window.removeEventListener('storage', sync); }, { once: true });
})();
