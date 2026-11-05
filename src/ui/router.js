// Shows the view matching the URL hash and highlights the nav item.
const DEFAULT_VIEW = 'q-sessions';

export function initRouter() {
  const views = document.querySelectorAll('.view');
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');

  function show() {
    let name = location.hash.slice(1);
    if (![...views].some(v => v.dataset.view === name)) name = DEFAULT_VIEW;

    views.forEach(v => { v.hidden = v.dataset.view !== name; });
    navItems.forEach(a => {
      const active = a.getAttribute('href') === `#${name}`;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', show);
  show();
}
