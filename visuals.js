/* Cinematic orbital field: 66 points, <=80 links, <=30fps, Canvas2D only. */
(() => {
  const canvas = document.getElementById('orbital-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const weak = (navigator.hardwareConcurrency || 8) <= 4;
  const mobile = matchMedia('(max-width: 640px)').matches;
  const nearCount = weak ? 32 : 48;
  const farCount = weak ? 8 : 18;
  const trailLength = weak ? 2 : 5;
  const maxLinks = mobile ? 60 : 80;
  const points = [];
  for (let i = 0; i < nearCount + farCount; i += 1) {
    const far = i >= nearCount;
    const index = far ? i - nearCount : i;
    const count = far ? farCount : nearCount;
    points.push({
      angle: (index / count) * Math.PI * 2 + (far ? .16 : 0),
      radius: far ? .62 + (index % 3) * .055 : .16 + (index % 7) * .052,
      speed: far ? .000025 : (.00005 + (index % 5) * .000014) * (index % 2 ? 1 : -1),
      size: far ? .65 : .8 + (index % 3) * .42,
      tilt: -.42 + (index % 4) * .12,
      far,
      x: 0, y: 0, history: [],
    });
  }
  let width = 0, height = 0, raf = 0, visible = true, last = 0, frameCost = 16;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, scrollDepth = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(0);
  }
  function draw(time) {
    const started = performance.now();
    pointerX += (targetX - pointerX) * .06;
    pointerY += (targetY - pointerY) * .06;
    ctx.clearRect(0, 0, width, height);
    const cx = width * .53 + pointerX * 10;
    const cy = height * .43 + pointerY * 8 + scrollDepth * 18;
    const unit = Math.min(width, height) * (1 - scrollDepth * .035);
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 7; ring += 1) {
      ctx.beginPath(); ctx.strokeStyle = `rgba(128,220,170,${.02 + ring * .005})`;
      ctx.ellipse(cx, cy, unit * ring * .064, unit * ring * .035, -.42, 0, Math.PI * 2); ctx.stroke();
    }
    for (const p of points) {
      const a = p.angle + (reduced ? 0 : time * p.speed);
      const r = unit * p.radius;
      p.x = cx + Math.cos(a) * r + (p.far ? pointerX * -5 : pointerX * 4);
      p.y = cy + Math.sin(a) * r * .55 + Math.sin(p.tilt) * r * .22 + (p.far ? pointerY * -4 : pointerY * 3);
      if (!reduced) {
        p.history.unshift([p.x, p.y]);
        if (p.history.length > trailLength) p.history.pop();
      } else if (!p.history.length) p.history.push([p.x, p.y]);
    }
    if (!weak && !reduced) {
      let links = 0;
      for (let i = 0; i < nearCount && links < maxLinks; i += 1) {
        const a = points[i];
        const nearest = [];
        for (let j = 0; j < nearCount; j += 1) {
          if (i === j) continue;
          const b = points[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance < unit * .32) nearest.push([distance, j]);
        }
        nearest.sort((a, b) => a[0] - b[0]);
        for (let k = 0; k < Math.min(2, nearest.length) && links < maxLinks; k += 1) {
          const b = points[nearest[k][1]];
          const alpha = .12 * (1 - nearest[k][0] / (unit * .32));
          ctx.beginPath(); ctx.strokeStyle = `rgba(133,242,184,${Math.max(.015, alpha)})`;
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); links += 1;
        }
      }
    }
    for (const p of points) {
      if (!reduced && p.history.length > 1) {
        for (let i = 1; i < p.history.length; i += 1) {
          const from = p.history[i - 1], to = p.history[i];
          ctx.beginPath(); ctx.strokeStyle = `rgba(133,242,184,${.055 * (1 - i / p.history.length)})`;
          ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
        }
      }
      const depth = p.far ? .25 : .35 + (Math.sin(p.angle + time * p.speed) + 1) * .3;
      ctx.beginPath(); ctx.fillStyle = `rgba(153,255,197,${depth})`;
      ctx.arc(p.x, p.y, p.size + (p.far ? 0 : .5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.fillStyle = 'rgba(153,255,197,.85)';
    ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
    frameCost = frameCost * .9 + (performance.now() - started) * .1;
  }
  function frame(time) {
    if (!visible || reduced || saveData) { raf = 0; return; }
    if (time - last >= 33) { draw(time); last = time; }
    raf = requestAnimationFrame(frame);
  }
  function play() { if (!raf && visible && !document.hidden && !reduced && !saveData) raf = requestAnimationFrame(frame); }
  function pause() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : play());
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? play() : pause(); }, { threshold: .02 }).observe(canvas);
  }
  if (!mobile && !reduced) {
    document.querySelector('.hero-visual').addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    }, { passive: true });
  }
  if (!reduced) {
    window.addEventListener('scroll', () => {
      const hero = document.querySelector('.hero').getBoundingClientRect();
      scrollDepth = Math.max(0, Math.min(1, -hero.top / Math.max(hero.height, 1)));
      const pageRange = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
      document.querySelector('.scroll-line').style.width = `${Math.min(scrollY / pageRange, 1) * 100}%`;
    }, { passive: true });
    const features = Array.from(document.querySelectorAll('.feature'));
    features.forEach((feature, index) => { feature.style.transitionDelay = `${(index % 4) * 40}ms`; });
    document.body.classList.add('reveal-ready');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      }), { threshold: .12 });
      features.forEach((feature) => observer.observe(feature));
    } else features.forEach((feature) => feature.classList.add('is-visible'));
  }
  if (!mobile && !reduced) {
    const aura = document.querySelector('.cursor-aura');
    document.addEventListener('pointermove', (event) => {
      aura.style.transform = `translate(${event.clientX - 90}px, ${event.clientY - 90}px)`;
      aura.classList.add('active');
    }, { passive: true });
    document.addEventListener('pointerleave', () => aura.classList.remove('active'));
    document.querySelectorAll('.plan').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.transform = `perspective(900px) rotateX(${-y * 1.5}deg) rotateY(${x * 1.5}deg) translateY(-3px)`;
      }, { passive: true });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
  if (!reduced) {
    document.querySelectorAll('.button-primary, .button-secondary').forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${event.clientX - rect.left - 6}px`;
        ripple.style.top = `${event.clientY - rect.top - 6}px`;
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 280);
      });
    });
  }
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
  resize(); play();
})();
