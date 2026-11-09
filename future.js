/* ARK NEXT: independent, failure-isolated cinematic modules. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const safe = (fn) => { try { fn(); } catch (error) { console.warn('[ARK FX] module skipped', error); } };

  function intro() {
    const curtain = document.querySelector('.fx-curtain');
    if (!curtain || reduced) return;
    let seen = false;
    try { seen = sessionStorage.getItem('ark_next_intro_v1') === '1'; } catch {}
    if (seen) return;
    document.documentElement.classList.add('fx-intro');
    try { sessionStorage.setItem('ark_next_intro_v1', '1'); } catch {}
    setTimeout(() => {
      document.documentElement.classList.remove('fx-intro');
      curtain.remove();
    }, 1300);
  }

  function hud() {
    const zone = document.querySelector('.hero-visual');
    const output = document.querySelector('[data-fx-coord]');
    if (!zone || !output || !finePointer || reduced) return;
    let last = 0;
    zone.addEventListener('pointermove', (event) => {
      const now = performance.now();
      if (now - last < 120) return;
      last = now;
      const rect = zone.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      output.textContent = `X ${x.toFixed(3)} / Y ${y.toFixed(3)}`;
    }, { passive: true });
  }

  function scanReveal() {
    const sections = Array.from(document.querySelectorAll('[data-fx-scan]'));
    if (!sections.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-scanned'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-scanned');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    sections.forEach((section) => observer.observe(section));
  }

  function magneticGlow() {
    if (!finePointer) return;
    let magnetic = null;
    document.addEventListener('pointermove', (event) => {
      const target = event.target.closest && event.target.closest('.btn-glow, .btn-magnetic');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      target.style.setProperty('--mx', `${x}px`);
      target.style.setProperty('--my', `${y}px`);
      if (!reduced && target.classList.contains('btn-magnetic')) {
        if (magnetic && magnetic !== target) magnetic.style.transform = '';
        magnetic = target;
        const dx = Math.max(-6, Math.min(6, (x - rect.width / 2) * .12));
        const dy = Math.max(-6, Math.min(6, (y - rect.height / 2) * .16));
        target.style.transform = `translate3d(${dx}px,${dy}px,0)`;
      }
    }, { passive: true });
    document.addEventListener('pointerout', (event) => {
      if (!magnetic) return;
      if (event.relatedTarget && magnetic.contains(event.relatedTarget)) return;
      if (event.target === magnetic || magnetic.contains(event.target)) {
        magnetic.style.transform = '';
        magnetic = null;
      }
    }, { passive: true });
  }

  function haptics() {
    document.addEventListener('pointerdown', (event) => {
      if (!event.target.closest || !event.target.closest('.btn-glow')) return;
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch {}
    }, { passive: true });
  }

  function miniAppTabs() {
    const preview = document.querySelector('.miniapp-preview');
    if (!preview) return;
    const tabs = Array.from(preview.querySelectorAll('[data-fx-tab]'));
    const panels = Array.from(preview.querySelectorAll('[data-fx-panel]'));
    const activate = (name, focus = false) => {
      tabs.forEach((tab) => {
        const selected = tab.dataset.fxTab === name;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focus) tab.focus();
      });
      panels.forEach((panel) => {
        const selected = panel.dataset.fxPanel === name;
        panel.hidden = !selected;
        panel.classList.toggle('is-active', selected);
      });
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab.dataset.fxTab));
      tab.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        activate(tabs[next].dataset.fxTab, true);
      });
    });
    activate('overview');
  }

  function beam() {
    const canvas = document.getElementById('future-beam');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const mobile = matchMedia('(max-width: 640px)').matches;
    const particles = Array.from({ length: mobile ? 26 : 42 }, (_, index) => ({
      lane: index % 4,
      offset: ((index * 37) % 100) / 100,
      speed: .000018 + (index % 5) * .000003,
      size: .7 + (index % 3) * .45,
    }));
    let width = 1, height = 1, raf = 0, visible = true, last = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(0);
    }
    function yAt(x, lane, time) {
      return height * (.16 + lane * .2) + Math.sin(x * .009 + time * .00035 + lane * 1.4) * (18 + lane * 4);
    }
    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(130,240,180,.035)';
      for (let x = 0; x < width; x += 72) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let lane = 0; lane < 4; lane += 1) {
        ctx.beginPath();
        for (let x = -20; x <= width + 20; x += 20) {
          const y = yAt(x, lane, reduced ? 0 : time);
          if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(130,240,180,${.08 + lane * .018})`;
        ctx.stroke();
      }
      for (const particle of particles) {
        const progress = reduced ? particle.offset : (particle.offset + time * particle.speed) % 1;
        const x = progress * (width + 80) - 40;
        const y = yAt(x, particle.lane, reduced ? 0 : time);
        ctx.beginPath(); ctx.fillStyle = 'rgba(150,255,195,.42)';
        ctx.arc(x, y, particle.size, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.strokeStyle = 'rgba(130,240,180,.1)';
        ctx.moveTo(x - 18, y); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    function frame(time) {
      if (!visible || reduced || saveData) { raf = 0; return; }
      if (time - last >= 33) { draw(time); last = time; }
      raf = requestAnimationFrame(frame);
    }
    function play() { if (!raf && visible && !document.hidden && !reduced && !saveData) raf = requestAnimationFrame(frame); }
    function pause() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        visible ? play() : pause();
      }, { threshold: .02 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => document.hidden ? pause() : play());
    let timer;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(resize, 150); }, { passive: true });
    resize(); play();
  }

  function visibility() {
    document.addEventListener('visibilitychange', () => {
      document.documentElement.classList.toggle('fx-paused', document.hidden);
    });
  }

  safe(intro);
  safe(hud);
  safe(scanReveal);
  safe(magneticGlow);
  safe(haptics);
  safe(miniAppTabs);
  safe(beam);
  safe(visibility);
})();
