// Typey Game: a word appears, type it one letter at a time.
// All the settings live in config.js.

(() => {
  // C major pentatonic, so any run of chimes sounds pleasant.
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

  const ENTER = [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }];
  const POP = [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }];
  const HOP = [{ transform: "translateY(0)" }, { transform: "translateY(-0.25em)" }, { transform: "translateY(0)" }];
  const WIGGLE = [0, -12, 12, -8, 8, 0].map((deg) => ({ transform: `rotate(${deg}deg)` }));

  const words = CONFIG.words.map((w) => w.trim().toLowerCase()).filter(Boolean);
  const fillColors = [].concat(CONFIG.colors.letterFilled);

  const wordEl = document.getElementById("word");
  const canvas = document.getElementById("confetti");
  const fullscreenBtn = document.getElementById("fullscreen");

  let word = "";
  let pos = 0; // index of the next letter to type
  let letterEls = [];
  let celebrating = false;
  let bag = [];
  let audio = null;

  applyTheme();
  showWord(pickWord());

  window.addEventListener("keydown", onKey);
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  function applyTheme() {
    const root = document.documentElement.style;
    root.setProperty("--bg", CONFIG.colors.background);
    root.setProperty("--empty", CONFIG.colors.letterEmpty);
    root.setProperty("--outline", CONFIG.colors.letterOutline);
    root.setProperty("--font", CONFIG.font);
  }

  // Shuffle-bag: every word appears once before any word repeats.
  function pickWord() {
    if (bag.length === 0) {
      bag = shuffle([...words]);
      const last = bag.length - 1;
      if (last > 0 && bag[last] === word) [bag[0], bag[last]] = [bag[last], bag[0]];
    }
    return bag.pop();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function showWord(w) {
    word = w;
    pos = 0;
    celebrating = false;

    letterEls = [...w].map((ch) => {
      const span = document.createElement("span");
      span.className = "letter";
      span.textContent = CONFIG.letterCase === "lower" ? ch : ch.toUpperCase();
      return span;
    });
    wordEl.style.setProperty("--letters", w.length);
    wordEl.setAttribute("aria-label", w);
    wordEl.replaceChildren(...letterEls);

    letterEls.forEach((el, i) =>
      el.animate(ENTER, { duration: 350, delay: i * 50, easing: "ease-out", fill: "backwards" }));
    markNext();
  }

  function markNext() {
    letterEls.forEach((el, i) =>
      el.classList.toggle("next", CONFIG.highlightNextLetter && !celebrating && i === pos));
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // leave grown-up shortcuts alone
    e.preventDefault(); // no scrolling, tabbing, etc.
    if (celebrating || e.repeat || e.key.length !== 1) return;
    wakeAudio();

    const el = letterEls[pos];
    if (e.key.toLowerCase() !== word[pos]) {
      if (CONFIG.wiggleOnMistake) el.animate(WIGGLE, { duration: 400 });
      return;
    }

    el.style.color = fillColors[pos % fillColors.length];
    el.animate(POP, { duration: 300, easing: "ease-out" });
    chime(SCALE[pos % SCALE.length]);
    pos++;

    if (pos === word.length) {
      celebrate();
    } else {
      if (CONFIG.sayLetters) say(e.key.toUpperCase());
      markNext();
    }
  }

  function celebrate() {
    celebrating = true;
    markNext();
    if (CONFIG.sayWord) say(word);
    fanfare();
    confetti();
    letterEls.forEach((el, i) =>
      el.animate(HOP, { duration: 450, delay: i * 70, iterations: 2, easing: "ease-in-out" }));
    setTimeout(() => showWord(pickWord()), CONFIG.celebrationMs);
  }

  // --- Sound ---------------------------------------------------------------

  // Browsers only allow audio after a key press or click, so start it lazily.
  function wakeAudio() {
    if (!CONFIG.sounds) return;
    if (!audio) audio = new AudioContext();
    if (audio.state === "suspended") audio.resume();
  }

  function chime(freq, delay = 0, length = 0.4) {
    if (!audio) return;
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length);
  }

  function fanfare() {
    [0, 2, 4, 5, 7].forEach((note, i) => chime(SCALE[note], 0.15 + i * 0.1, 0.5));
  }

  function say(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel(); // don't let a fast typist queue up a backlog
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.2;
    speechSynthesis.speak(utterance);
  }

  // --- Confetti ------------------------------------------------------------

  function confetti() {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", ...fillColors];
    const pieces = Array.from({ length: 160 }, () => ({
      x: w / 2,
      y: h / 2,
      vx: (Math.random() - 0.5) * 18,
      vy: -4 - Math.random() * 16,
      size: 10 + Math.random() * 12,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const start = performance.now();
    requestAnimationFrame(function frame(now) {
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
      requestAnimationFrame(frame);
    });
  }

  // --- Full screen ---------------------------------------------------------

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
    fullscreenBtn.blur(); // so key presses don't re-trigger the button
  }
})();
