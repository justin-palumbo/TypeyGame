// Shared by the title screen and every mode: the page's colors and font from config.js,
// the scenery for each scene (sky, ground, stars, clouds, backdrop), confetti, the
// full-screen button, and a few small motions and helpers.

const Page = (() => {
  // Motions for letters, pictures and answer boxes.
  const ENTER = [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }];
  const POP = [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }];
  const WIGGLE = [0, -12, 12, -8, 8, 0].map((deg) => ({ transform: `rotate(${deg}deg)` }));

  const starsEl = document.getElementById("stars");
  const backdropEls = document.querySelectorAll(".backdrop");
  const canvas = document.getElementById("confetti");
  const fullscreenBtn = document.getElementById("fullscreen");

  let confettiFrame = 0;

  applyTheme();
  scatterStars();
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  return { ENTER, POP, WIGGLE, showScene, confetti, stopConfetti, shuffle };

  function applyTheme() {
    const root = document.documentElement.style;
    root.setProperty("--rocket", CONFIG.colors.rocket);
    root.setProperty("--empty", CONFIG.colors.letterEmpty);
    root.setProperty("--outline", CONFIG.colors.letterOutline);
    root.setProperty("--font", CONFIG.font);
  }

  function scatterStars(count = 100) {
    const stars = Array.from({ length: count }, () => {
      const star = document.createElement("div");
      star.className = "star";
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.width = `${2 + Math.random() ** 3 * 6}px`; // mostly tiny, a few big ones
      star.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      star.style.animationDelay = `${-Math.random() * 3}s`; // so they don't twinkle in step
      return star;
    });
    starsEl.replaceChildren(...stars);
  }

  // Fades the sky, ground and scenery over to CONFIG.scenes[index], and returns that scene.
  function showScene(index) {
    const scene = CONFIG.scenes[index];
    const { sky, ground, craters, stars, clouds, backdrop } = scene;
    const root = document.documentElement.style;
    root.setProperty("--sky", sky);
    root.setProperty("--ground", ground);
    // Keep the old crater color when leaving a cratered scene, so they fade out in it.
    if (craters) root.setProperty("--crater", craters);
    document.body.classList.toggle("cratered", Boolean(craters));
    document.body.classList.toggle("starry", Boolean(stars));
    document.body.classList.toggle("cloudy", Boolean(clouds));
    backdropEls.forEach((el) => el.classList.toggle("shown", el.dataset.name === backdrop));
    return scene;
  }

  // A burst of confetti from the middle of `fromEl`, lasting CONFIG.celebrationMs.
  function confetti(fromEl) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", ...[].concat(CONFIG.colors.letterFilled)];
    const box = fromEl.getBoundingClientRect();
    const pieces = Array.from({ length: 160 }, () => ({
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      vx: (Math.random() - 0.5) * 18,
      vy: -4 - Math.random() * 16,
      size: 10 + Math.random() * 12,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const start = performance.now();
    confettiFrame = requestAnimationFrame(function frame(now) {
      ctx.clearRect(0, 0, w, h);
      if (now - start > CONFIG.celebrationMs) return;
      for (const p of pieces) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      confettiFrame = requestAnimationFrame(frame);
    });
  }

  function stopConfetti() {
    cancelAnimationFrame(confettiFrame);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  // Shuffles in place and returns the array.
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
    fullscreenBtn.blur(); // so key presses don't re-trigger the button
  }
})();
