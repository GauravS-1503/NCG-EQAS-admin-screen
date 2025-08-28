// /assets/include.js
(function () {
  function computeBase() {
    // Where did THIS script load from? Works on localhost and GitHub Pages.
    const s = document.querySelector('script[src*="include.js"]');
    if (!s) return '';
    const u = new URL(s.getAttribute('src'), location.href);
    // strip trailing /assets/...
    return u.pathname.replace(/\/assets\/.*$/, '') || '';
  }

  async function inject(sel, rel) {
    const host = document.querySelector(sel);
    if (!host) return;

    const base = computeBase();
    const url  = `${base}/${rel}`.replace(/\/+/g, '/');

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const html = await res.text();

      const tpl = document.createElement('template');
      tpl.innerHTML = html;

      const rewrite = (el, attr) => {
        const v = el.getAttribute(attr);
        if (!v) return;
        if (/^(https?:)?\/\//i.test(v) || v.startsWith('data:') || v.startsWith('#')) return;

        let out = v;
        if (v.startsWith('/')) {
          // root-relative → prefix repo base
          out = `${base}${v}`;
        } else {
          // plain relative → normalize and prefix base
          let cleaned = v.replace(/^(\.\/)+/, '');
          while (cleaned.startsWith('../')) cleaned = cleaned.slice(3);
          out = `${base}/${cleaned}`;
        }
        el.setAttribute(attr, out.replace(/\/+/g, '/'));
      };

      tpl.content.querySelectorAll('[src]').forEach(n => rewrite(n, 'src'));
      tpl.content.querySelectorAll('[href]').forEach(n => rewrite(n, 'href'));

      host.innerHTML = '';
      host.appendChild(tpl.content);
    } catch (err) {
      console.error('[include] failed:', url, err);
    }
}


  function markActive() {
    const segs = location.pathname.split('/').filter(Boolean);

    // Use parent folder when the last segment is a file (has a dot)
    let keySeg = segs[segs.length - 1] || '';
    if (keySeg.includes('.')) keySeg = segs[segs.length - 2] || keySeg;

    const folder = decodeURIComponent(keySeg).toLowerCase();

    document.querySelectorAll('#sidebarMenu a[data-link]').forEach(a => {
      const key = (a.getAttribute('data-link') || '').toLowerCase();
      if (key && (folder === key || folder.includes(key))) {
        a.classList.add('text-primary');
        a.classList.remove('text-white');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await inject('#header',  'components/header.html');
      await inject('#sidebar', 'components/sidebar.html');
      markActive();
      console.log('[include] injected');
    } catch (e) {
      console.error('[include] error', e);
    }
    
    const btn = document.getElementById('menuToggle');
    const sb  = document.getElementById('sidebarMenu');
    if (btn && sb) btn.addEventListener('click', () => sb.classList.toggle('collapsed'));
  });
})();
