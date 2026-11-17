/* ============================================================
   InfoDeportes365 — main.js
   Lógica compartida por todas las páginas del sitio:
   - Nav dinámico al hacer scroll
   - Menú hamburguesa responsive
   - Ticker de resultados (usa window.TICKER_DATA, definido en cada página)
   - Resaltado del link activo según la sección visible (scrollspy)
   - Aviso de cookies
   ============================================================ */

(function () {

  function initNavScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    onScroll();
  }

  function initMobileMenu() {
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobileMenu');
    const scrim = document.getElementById('scrim');
    if (!burger || !mobileMenu || !scrim) return;

    const toggleMenu = (open) => {
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      mobileMenu.classList.toggle('open', open);
      scrim.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };

    burger.addEventListener('click', () => toggleMenu(!mobileMenu.classList.contains('open')));
    burger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMenu(!mobileMenu.classList.contains('open'));
      }
    });
    scrim.addEventListener('click', () => toggleMenu(false));
    mobileMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => toggleMenu(false))
    );
  }

  function initTicker() {
    const track = document.getElementById('tickerTrack');
    const data = window.TICKER_DATA;
    if (!track || !data || !data.length) return;

    const build = (list) => list.map(t => `<span><b>\u25cf</b>${t}</span>`).join('');
    track.innerHTML = build(data) + build(data); // duplicado para el loop infinito
  }

  function renderTickerList(list) {
    const track = document.getElementById('tickerTrack');
    if (!track || !list || !list.length) return;
    const build = (arr) => arr.map(t => `<span><b>\u25cf</b>${t}</span>`).join('');
    track.innerHTML = build(list) + build(list); // duplicado para el loop infinito
  }

  /* ----------------------------------------------------------------
     Resultados en vivo (automático)
     ----------------------------------------------------------------
     Consulta directo desde el navegador la API pública de ESPN
     (site.api.espn.com) — no requiere clave ni servidor propio.
     Es una API NO oficial/no documentada por ESPN: gratuita y sin
     límites publicados, pero puede cambiar sin aviso. Por eso, si
     la consulta falla por cualquier motivo, la sección simplemente
     conserva los resultados que ya estaban escritos en el HTML
     (nunca se rompe ni se queda en blanco).

     Para activarlo en una sección, se le agregan estos atributos
     al <section> que contiene la .result-list:
       data-live-scores="baseball/mlb"   (ruta deporte/liga de ESPN)
       data-update-ticker="true"          (opcional: también
                                            reescribe el ticker de
                                            arriba con estos datos)
  ------------------------------------------------------------------ */

  function horaVenezuela(fechaISO) {
    return new Date(fechaISO).toLocaleTimeString('es-VE', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Caracas'
    }).replace(/\s?([ap])\.?\s?m\.?/i, (_, l) => ' ' + l.toUpperCase() + 'M');
  }

  function fechaCortaVenezuela(fechaISO) {
    return new Date(fechaISO).toLocaleDateString('es-VE', {
      day: '2-digit', month: 'short', timeZone: 'America/Caracas'
    }).toUpperCase().replace('.', '');
  }

  async function cargarSeccionEnVivo(section) {
    const ruta = section.dataset.liveScores; // ej: "baseball/mlb"
    const lista = section.querySelector('.result-list');
    if (!ruta || !lista) return;

    try {
      const resp = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${ruta}/scoreboard`);
      if (!resp.ok) throw new Error('ESPN respondió con error: ' + resp.status);
      const data = await resp.json();
      const eventos = (data.events || []).slice(0, 6);
      if (!eventos.length) return; // sin partidos hoy: se dejan los resultados existentes

      const filas = [];
      const tickerTextos = [];

      eventos.forEach((ev) => {
        const comp = ev.competitions && ev.competitions[0];
        if (!comp || !comp.competitors) return;
        const local = comp.competitors.find(c => c.homeAway === 'home');
        const visita = comp.competitors.find(c => c.homeAway === 'away');
        if (!local || !visita) return;

        const estado = (ev.status && ev.status.type) || {};
        const enVivo = estado.state === 'in';
        const porJugar = estado.state === 'pre';

        let etiquetaHTML;
        let fechaTxt;
        if (enVivo) {
          etiquetaHTML = '<span class="tag" style="color:#3ddc84;">\u25cf EN VIVO</span>';
          fechaTxt = estado.shortDetail || horaVenezuela(ev.date);
        } else if (porJugar) {
          etiquetaHTML = '<span class="tag">' + horaVenezuela(ev.date) + '</span>';
          fechaTxt = fechaCortaVenezuela(ev.date);
        } else {
          etiquetaHTML = '<span class="tag">FINAL</span>';
          fechaTxt = fechaCortaVenezuela(ev.date);
        }

        const nombreVisita = visita.team.shortDisplayName || visita.team.displayName;
        const nombreLocal = local.team.shortDisplayName || local.team.displayName;
        const puntajeVisita = visita.score ?? '-';
        const puntajeLocal = local.score ?? '-';

        filas.push(
          '<div class="result-row">' +
            etiquetaHTML +
            '<span class="team">' + nombreVisita + '</span>' +
            '<span class="score">' + puntajeVisita + ' \u2014 ' + puntajeLocal + '</span>' +
            '<span class="team team-b">' + nombreLocal + '</span>' +
            '<span class="date">' + fechaTxt + '</span>' +
          '</div>'
        );

        if (enVivo) {
          tickerTextos.push('EN VIVO \u2014 ' + nombreVisita.toUpperCase() + ' ' + puntajeVisita + ' - ' + puntajeLocal + ' ' + nombreLocal.toUpperCase());
        } else if (!porJugar) {
          tickerTextos.push('FINAL \u2014 ' + nombreVisita.toUpperCase() + ' ' + puntajeVisita + ' - ' + puntajeLocal + ' ' + nombreLocal.toUpperCase());
        }
      });

      if (filas.length) {
        lista.innerHTML = filas.join('');
        if (section.dataset.updateTicker === 'true' && tickerTextos.length) {
          renderTickerList(tickerTextos);
        }
      }
    } catch (err) {
      // Falla silenciosa: se conservan los resultados ya escritos en el HTML.
      console.warn('No se pudieron cargar resultados en vivo de ESPN, se muestran los resultados guardados.', err);
    }
  }

  function initLiveScores() {
    const secciones = document.querySelectorAll('[data-live-scores]');
    if (!secciones.length) return;
    secciones.forEach(cargarSeccionEnVivo);
    // Vuelve a consultar cada 3 minutos para mantenerlo al día sin recargar la página.
    setInterval(() => secciones.forEach(cargarSeccionEnVivo), 180000);
  }

  function initScrollSpy() {
    const sections = document.querySelectorAll('main section[id], .hero[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    if (!sections.length || !navLinks.length) return;

    const spy = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    sections.forEach(sec => spy.observe(sec));
  }

  function initCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    const btnAccept = document.getElementById('cookieAccept');
    const btnReject = document.getElementById('cookieReject');
    if (!banner || !btnAccept) return;

    if (!localStorage.getItem('cookieChoice')) {
      setTimeout(() => banner.classList.add('show'), 600);
    }
    btnAccept.addEventListener('click', () => {
      localStorage.setItem('cookieChoice', 'accepted');
      banner.classList.remove('show');
    });
    if (btnReject) {
      btnReject.addEventListener('click', () => {
        localStorage.setItem('cookieChoice', 'rejected');
        banner.classList.remove('show');
        // Si en el futuro se agregan AdSense/Analytics, acá es donde
        // se evita cargarlos cuando cookieChoice === 'rejected'.
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNavScroll();
    initMobileMenu();
    initTicker();
    initScrollSpy();
    initCookieBanner();
    initLiveScores();
  });

})();
