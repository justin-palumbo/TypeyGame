// Typey Game: a word appears, type it one letter at a time.
// Each letter adds fuel to the rocket, and a finished word blasts it off to the next scene.
// All the settings live in config.js.

(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  // C major pentatonic, so any run of chimes sounds pleasant.
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

  const ENTER = [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }];
  const POP = [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }];
  const HOP = [{ transform: "translateY(0)" }, { transform: "translateY(-0.25em)" }, { transform: "translateY(0)" }];
  const WIGGLE = [0, -12, 12, -8, 8, 0].map((deg) => ({ transform: `rotate(${deg}deg)` }));
  const SHAKE = [0, -3, 3, -3, 3, -3, 3, 0].map((x) => ({ transform: `translateX(${x}px)` }));
  const ON_PAD = { transform: "translateY(0)" };
  const IN_SPACE = { transform: "translateY(-115vh)" }; // far enough up to be off screen

  const words = CONFIG.words.map((w) => w.trim().toLowerCase()).filter(Boolean);
  const fillColors = [].concat(CONFIG.colors.letterFilled);

  const wordEl = document.getElementById("word");
  const canvas = document.getElementById("confetti");
  const fullscreenBtn = document.getElementById("fullscreen");
  const launchEl = document.getElementById("launch");
  const rocketEl = document.getElementById("rocket");
  const tankEl = document.getElementById("tank");
  const fuelEl = document.getElementById("fuel");
  const starsEl = document.getElementById("stars");
  const backdropEls = document.querySelectorAll(".backdrop");

  let scene = 0; // index into CONFIG.scenes
  let word = "";
  let pos = 0; // index of the next letter to type
  let letterEls = [];
  let pictureEl = null;
  let fuelEls = [];
  let celebrating = false;
  let bag = [];
  let audio = null;

  applyTheme();
  scatterStars();
  showScene();
  showWord(pickWord());

  window.addEventListener("keydown", onKey);
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  function applyTheme() {
    const root = document.documentElement.style;
    root.setProperty("--rocket", CONFIG.colors.rocket);
    root.setProperty("--empty", CONFIG.colors.letterEmpty);
    root.setProperty("--outline", CONFIG.colors.letterOutline);
    root.setProperty("--font", CONFIG.font);
    document.body.classList.toggle("no-rocket", !CONFIG.showRocket);
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
    pictureEl = makePicture(CONFIG.pictures[w]);
    wordEl.style.setProperty("--letters", w.length);
    wordEl.classList.toggle("has-picture", Boolean(pictureEl));
    wordEl.setAttribute("aria-label", w);
    wordEl.replaceChildren(...(pictureEl ? [pictureEl] : []), ...letterEls);

    pictureEl?.animate(ENTER, { duration: 350, easing: "ease-out" });
    letterEls.forEach((el, i) =>
      el.animate(ENTER, { duration: 350, delay: i * 50, easing: "ease-out", fill: "backwards" }));
    markNext();

    if (CONFIG.showRocket) {
      emptyTank(w.length);
      land();
    }
  }

  // A missing or broken image file just leaves the word on its own.
  function makePicture(src) {
    if (!src) return null;
    const img = new Image();
    img.className = "picture";
    img.alt = "";
    img.src = src;
    img.onerror = () => {
      if (!img.isConnected) return; // already moved on to another word
      img.remove();
      wordEl.classList.remove("has-picture");
    };
    return img;
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

    const color = fillColors[pos % fillColors.length];
    el.style.color = color;
    el.animate(POP, { duration: 300, easing: "ease-out" });
    if (CONFIG.showRocket) addFuel(pos, color);
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
    pictureEl?.animate(POP, { duration: 450, iterations: 2, easing: "ease-in-out" });
    letterEls.forEach((el, i) =>
      el.animate(HOP, { duration: 450, delay: i * 70, iterations: 2, easing: "ease-in-out" }));
    if (CONFIG.showRocket) blastOff();
    setTimeout(() => {
      // Change scenes while the rocket is off screen, so it lands somewhere new.
      scene = (scene + 1) % CONFIG.scenes.length;
      showScene();
      showWord(pickWord());
    }, CONFIG.celebrationMs);
  }

  // --- Scenes --------------------------------------------------------------

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

  function showScene() {
    const { sky, ground, craters, stars, clouds, backdrop } = CONFIG.scenes[scene];
    const root = document.documentElement.style;
    root.setProperty("--sky", sky);
    root.setProperty("--ground", ground);
    // Keep the old crater color when leaving a cratered scene, so they fade out in it.
    if (craters) root.setProperty("--crater", craters);
    document.body.classList.toggle("cratered", Boolean(craters));
    document.body.classList.toggle("starry", Boolean(stars));
    document.body.classList.toggle("cloudy", Boolean(clouds));
    backdropEls.forEach((el) => el.classList.toggle("shown", el.dataset.name === backdrop));
  }

  // --- Rocket --------------------------------------------------------------

  // One slice of fuel per letter, stacked from the bottom of the tank up.
  function emptyTank(slices) {
    const x = tankEl.x.baseVal.value;
    const y = tankEl.y.baseVal.value;
    const width = tankEl.width.baseVal.value;
    const height = tankEl.height.baseVal.value;
    const sliceHeight = height / slices;

    fuelEls = Array.from({ length: slices }, (_, i) => {
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("class", "fuel");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y + height - (i + 1) * sliceHeight);
      rect.setAttribute("width", width);
      rect.setAttribute("height", sliceHeight + 1); // overlap the slice below so no seams show
      return rect;
    });
    fuelEl.replaceChildren(...fuelEls);
  }

  function addFuel(i, color) {
    fuelEls[i].style.fill = color;
    fuelEls[i].classList.add("full");
  }

  // Every new word, the rocket flies back down and lands on the pad.
  function land() {
    rocketEl.getAnimations().forEach((a) => a.cancel());
    rocketEl.classList.add("lit");
    const landing = rocketEl.animate([IN_SPACE, ON_PAD], {
      duration: 1200,
      easing: "cubic-bezier(0.2, 0.8, 0.4, 1)",
    });
    landing.onfinish = () => rocketEl.classList.remove("lit");
  }

  function blastOff() {
    rocketEl.getAnimations().forEach((a) => a.cancel());
    rocketEl.classList.add("lit");
    rumble();
    puffSmoke();
    rocketEl.animate(SHAKE, { duration: 600 });
    rocketEl.animate([ON_PAD, IN_SPACE], {
      delay: 600,
      duration: 1600,
      easing: "cubic-bezier(0.32, 0, 0.67, 0)", // start slow, keep speeding up
      fill: "forwards",
    });
  }

  function puffSmoke() {
    for (let i = 0; i < 14; i++) {
      const puff = document.createElement("div");
      puff.className = "puff";
      launchEl.append(puff);

      // Alternate sides so the smoke billows out both ways from the pad.
      const dx = (i % 2 ? 1 : -1) * (40 + Math.random() * 160);
      const dy = -Math.random() * 80;
      const billow = puff.animate(
        [
          { transform: "translate(0, 0) scale(0.2)", opacity: 0.9 },
          { transform: `translate(${dx}%, ${dy}%) scale(1.6)`, opacity: 0 },
        ],
        { duration: 1400 + Math.random() * 800, delay: Math.random() * 500, easing: "ease-out", fill: "backwards" },
      );
      billow.onfinish = () => puff.remove();
    }
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

  // Rocket engine: filtered white noise that swells, brightens, then fades away.
  function rumble(length = 2.4) {
    if (!audio) return;
    const t = audio.currentTime;
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * length), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = audio.createBufferSource();
    noise.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    // Laptop speakers barely play deep bass, so keep the roar above ~400 Hz.
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(1500, t + length);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(2, t + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    noise.connect(filter).connect(gain).connect(audio.destination);
    noise.start(t);
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
    const box = wordEl.getBoundingClientRect();
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
