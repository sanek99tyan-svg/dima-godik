/* Анимации без внешних библиотек: открытие, прокрутка, счётчики и конфетти. */
(() => {
  'use strict';
  const body = document.body;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  const dialog = document.querySelector('.cover');
  const openButton = document.getElementById('open-invitation');
  const motionButton = document.getElementById('motion-toggle');
  const celebrateButton = document.getElementById('celebrate');
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  const progress = document.querySelector('.reading-progress');
  const parallax = document.querySelector('.art-parallax');
  const hero = document.querySelector('.hero');
  let opening = false;
  let particles = [];
  let confettiFrame = 0;
  let lastFrame = 0;
  let viewportWidth = innerWidth;
  let viewportHeight = innerHeight;

  function resizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    viewportWidth = innerWidth;
    viewportHeight = innerHeight;
    canvas.width = viewportWidth * dpr;
    canvas.height = viewportHeight * dpr;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function clearConfetti() {
    cancelAnimationFrame(confettiFrame);
    confettiFrame = 0;
    particles = [];
    if (ctx) ctx.clearRect(0, 0, viewportWidth, viewportHeight);
  }
  function paintConfetti(now) {
    if (paused || document.hidden || !ctx) return clearConfetti();
    const step = Math.min((now - lastFrame) / 16.67 || 1, 2);
    lastFrame = now;
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    particles = particles.filter(p => p.life > 0 && p.y < viewportHeight + 30);
    for (const p of particles) {
      p.vy += .075 * step;
      p.vx *= Math.pow(.991, step);
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.rotation += p.spin * step;
      p.life -= step;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 35);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(Math.cos(p.rotation * 1.3), 1);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .55);
      ctx.restore();
    }
    if (particles.length) confettiFrame = requestAnimationFrame(paintConfetti);
    else confettiFrame = 0;
  }
  function confetti(x = viewportWidth / 2, y = viewportHeight * .47) {
    if (paused || !ctx) return;
    const palette = ['#b3d3e8', '#d4b17c', '#f4e5c8', '#6e9fba', '#ffffff'];
    const amount = innerWidth < 700 ? 80 : 125;
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-3,size:4+Math.random()*5,rotation:Math.random()*6.3,spin:(Math.random()-.5)*.14,life:150+Math.random()*60,color:palette[i%palette.length]});
    }
    particles = particles.slice(-220);
    if (!confettiFrame) { lastFrame = performance.now(); confettiFrame = requestAnimationFrame(paintConfetti); }
  }
  function updateMotion() {
    body.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? 'Включить анимации' : 'Приостановить анимации');
    motionButton.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
    if (paused) { clearConfetti(); parallax.style.transform = ''; }
    scheduleScroll();
  }
  motionButton.addEventListener('click', () => { paused = !paused; updateMotion(); });
  reducedMotion.addEventListener('change', event => { paused = event.matches; updateMotion(); });
  function openInvitation() {
    if (opening) return;
    opening = true;
    dialog.classList.add('opening');
    body.classList.add('entered');
    const finish = () => {
      dialog.close();
      body.classList.remove('cover-active');
      const heading = document.getElementById('hero-title');
      heading.tabIndex = -1;
      heading.focus({preventScroll:true});
      if (!paused) confetti(viewportWidth / 2, viewportHeight * .3);
    };
    if (paused) finish();
    else setTimeout(finish, 1250);
  }
  openButton.addEventListener('click', openInvitation);
  dialog.addEventListener('cancel', event => { event.preventDefault(); openInvitation(); });
  celebrateButton.addEventListener('click', () => {
    const bounds = celebrateButton.getBoundingClientRect();
    confetti(bounds.left + bounds.width / 2, bounds.top);
    document.getElementById('celebration-message').textContent = 'Ура! С первым днём рождения, Дима!';
  });

  /* Каждый счётчик проигрывается один раз, без повторов при прокрутке назад. */
  function count(element) {
    const target = Number(element.dataset.count);
    if (paused) return;
    const start = performance.now();
    const draw = now => {
      const t = Math.min((now - start) / 1250, 1);
      element.textContent = paused ? target : Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1 && !paused) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('visible');
        const number = entry.target.querySelector('[data-count]');
        if (number) count(number);
        observer.unobserve(entry.target);
      }
    }, {threshold:.12});
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  } else {
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
  }
  let scrollScheduled = false;
  function updateScroll() {
    scrollScheduled = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
    if (!paused && scrollY < hero.offsetHeight + 150) {
      parallax.style.transform = `translateY(${Math.min(scrollY * .055, 35)}px) scale(1.04)`;
    }
  }
  function scheduleScroll() {
    if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateScroll); }
  }
  addEventListener('scroll', scheduleScroll, {passive:true});
  addEventListener('resize', () => { resizeCanvas(); scheduleScroll(); }, {passive:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearConfetti(); });
  resizeCanvas();
  updateMotion();
  motionButton.hidden = false;
  celebrateButton.hidden = false;
  body.classList.add('motion');
  if (typeof dialog.showModal === 'function' && !location.hash) {
    dialog.showModal();
    body.classList.add('cover-active');
  } else body.classList.add('entered');
})();
