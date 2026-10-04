// The typing game: a word appears, type it one letter at a time.
// Each letter adds fuel to a craft (a rocket, plane, UFO...), and a finished word flies it off to the next scene.
// All the settings live in config.js; the title screen calls TypingGame.start() and .stop().

const TypingGame = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  // C major pentatonic, so any run of chimes sounds pleasant.
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

  const ENTER = [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }];
  const POP = [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }];
  const HOP = [{ transform: "translateY(0)" }, { transform: "translateY(-0.25em)" }, { transform: "translateY(0)" }];
  const WIGGLE = [0, -12, 12, -8, 8, 0].map((deg) => ({ transform: `rotate(${deg}deg)` }));
  const SHAKE = [0, -3, 3, -3, 3, -3, 3, 0].map((x) => ({ transform: `translateX(${x}px)` }));
  const SWAY = [0, -6, 6, -6, 6, 0].map((deg) => ({ transform: `rotate(${deg}deg)` }));

  // Where the craft is, relative to sitting on the pad, and how it's tipped.
  const at = (x, y, more) => ({ transform: `translate(${x}, ${y})`, ...more });
  const tilt = (deg, more) => ({ transform: `rotate(${deg}deg)`, ...more });
  const ON_PAD = at(0, 0);
  const IN_SPACE = at(0, "-115vh"); // far enough up to be off screen
  const SOFT = "cubic-bezier(0.2, 0.8, 0.4, 1)"; // fast, then gently settling
  const SPEED_UP = "cubic-bezier(0.32, 0, 0.67, 0)"; // start slow, keep speeding up
  const TAKEOFF_MS = 2200; // every takeoff is off screen before the next word arrives

  // How each craft lands and takes off. Both return the animation that moves #craft;
  // tilts and wobbles go on the ship itself, so the two combine.
  // Left-facing craft (plane, helicopter, blimp) tip their nose up with a positive tilt.
  const FLIGHTS = {
    rocket: {
      land: () => fly([{ ...IN_SPACE, easing: SOFT }, ON_PAD], 1200),
      takeOff: () => {
        rumble();
        puffSmoke();
        ship.animate(SHAKE, { duration: 600 });
        return fly([ON_PAD, { ...ON_PAD, offset: 0.27, easing: SPEED_UP }, IN_SPACE]);
      },
    },
    ufo: {
      land: () => {
        ship.animate(SWAY, { duration: 600, iterations: 2 });
        return fly([{ ...IN_SPACE, easing: SOFT }, ON_PAD], 1200);
      },
      // Hop up, hover a moment, then zoom away.
      takeOff: () => {
        warble();
        ship.animate(SWAY, { duration: 550, iterations: 4 });
        return fly([
          { ...ON_PAD, easing: "ease-out" },
          at(0, "-10vh", { offset: 0.3 }),
          at(0, "-12vh", { offset: 0.55, easing: "cubic-bezier(0.6, 0, 1, 0.4)" }),
          IN_SPACE,
        ]);
      },
    },
    // Glide in nose-down, flare up at touchdown, and roll to a stop.
    airplane: {
      land: () => {
        ship.animate([tilt(-8), tilt(-8, { offset: 0.6 }), tilt(4, { offset: 0.78 }), tilt(0)], { duration: 1600 });
        return fly([at("60vw", "-45vh"), at("8vw", 0, { offset: 0.75, easing: "ease-out" }), ON_PAD], 1600);
      },
      // Roll down the runway, then pull up and climb away.
      takeOff: () => {
        chop(TAKEOFF_MS / 1000, 28);
        ship.animate([tilt(0), tilt(0, { offset: 0.4 }), tilt(14, { offset: 0.6 }), tilt(14)], { duration: TAKEOFF_MS });
        return fly([{ ...ON_PAD, easing: "ease-in" }, at("-25vw", 0, { offset: 0.45 }), at("-110vw", "-80vh")]);
      },
    },
    // Drop straight down, slowing for a gentle touchdown.
    helicopter: {
      land: () => {
        ship.animate([tilt(0), tilt(-4), tilt(3), tilt(0)], { duration: 1600 });
        return fly([{ ...IN_SPACE, easing: "ease-out" }, at(0, "-8vh", { offset: 0.7, easing: "ease-in-out" }), ON_PAD], 1600);
      },
      // Lift straight up, then tip forward and fly off.
      takeOff: () => {
        chop(TAKEOFF_MS / 1000, 11);
        ship.animate([tilt(0), tilt(0, { offset: 0.35 }), tilt(-12, { offset: 0.55 }), tilt(-12)], { duration: TAKEOFF_MS });
        return fly([{ ...ON_PAD, easing: "ease-in-out" }, at(0, "-14vh", { offset: 0.4, easing: "ease-in" }), at("-70vw", "-115vh")]);
      },
    },
    // Float gently down, swaying in the breeze.
    balloon: {
      land: () => {
        ship.animate([tilt(0), tilt(3), tilt(-3), tilt(0)], { duration: 1600 });
        return fly([{ ...IN_SPACE, easing: SOFT }, ON_PAD], 1600);
      },
      // A blast of the burner, then a slow rise that picks up speed.
      takeOff: () => {
        rumble(1.4, 500, 1200);
        ship.animate([tilt(0), tilt(2), tilt(-2), tilt(2), tilt(0)], { duration: TAKEOFF_MS });
        return fly([{ ...ON_PAD, easing: "ease-in" }, at(0, "-6vh", { offset: 0.35, easing: "ease-in" }), IN_SPACE]);
      },
    },
    // Drift down from the sky, leveling off as it lands.
    blimp: {
      land: () => {
        ship.animate([tilt(-5), tilt(0)], { duration: 1600 });
        return fly([{ ...at("40vw", "-60vh"), easing: SOFT }, ON_PAD], 1600);
      },
      // Float up nose-first and putter away.
      takeOff: () => {
        chop(TAKEOFF_MS / 1000, 18);
        ship.animate([tilt(0), tilt(6, { offset: 0.35 }), tilt(6)], { duration: TAKEOFF_MS });
        return fly([{ ...ON_PAD, easing: "ease-in" }, at("-4vw", "-8vh", { offset: 0.35, easing: "ease-in" }), at("-50vw", "-115vh")]);
      },
    },
    // Slow down, hover just above the ground, then set down.
    lander: {
      land: () => fly([{ ...IN_SPACE, easing: "ease-out" }, at(0, "-6vh", { offset: 0.7, easing: "ease-in-out" }), ON_PAD], 1600),
      // No smoke: there's no air on the moon.
      takeOff: () => {
        rumble(TAKEOFF_MS / 1000, 500, 1300);
        ship.animate(SHAKE, { duration: 400 });
        return fly([ON_PAD, { ...ON_PAD, offset: 0.18, easing: SPEED_UP }, IN_SPACE]);
      },
    },
  };

  const words = CONFIG.words.map((w) => w.trim().toLowerCase()).filter(Boolean);
  const fillColors = [].concat(CONFIG.colors.letterFilled);

  const wordEl = document.getElementById("word");
  const canvas = document.getElementById("confetti");
  const launchEl = document.getElementById("launch");
  const craftEl = document.getElementById("craft");
  const shipEls = [...document.querySelectorAll(".ship")];

  let scene = 0; // index into CONFIG.scenes
  let ship = shipEls[0]; // the craft this scene uses
  let word = "";
  let pos = 0; // index of the next letter to type
  let letterEls = [];
  let pictureEl = null;
  let fuelEls = [];
  let celebrating = false;
  let bag = [];
  let audio = null;
  let uhOhUntil = 0; // audio time when the current "uh-oh" finishes
  let nextWordTimer = 0;
  let confettiFrame = 0;

  sizeShips();

  return { start, stop };

  // Every game begins in the first scene, the one behind the title screen.
  function start() {
    document.body.classList.toggle("no-rocket", !CONFIG.showRocket);
    scene = 0;
    showScene();
    showWord(pickWord());
    window.addEventListener("keydown", onKey);
  }

  // Back to the title screen: clear away the word, the craft's flight, and anything
  // still on its way (the next word, confetti, speech and sounds).
  function stop() {
    window.removeEventListener("keydown", onKey);
    clearTimeout(nextWordTimer);
    stopFlying();
    craftEl.classList.remove("lit");
    wordEl.replaceChildren();
    cancelAnimationFrame(confettiFrame);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    // Closing the audio cuts off any sound mid-play; the next key press opens it again.
    audio?.close();
    audio = null;
    uhOhUntil = 0;
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
      if (CONFIG.soundOnMistake) uhOh();
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
    nextWordTimer = setTimeout(() => {
      // Change scenes while the craft is off screen, so it lands somewhere new.
      scene = (scene + 1) % CONFIG.scenes.length;
      showScene();
      showWord(pickWord());
    }, CONFIG.celebrationMs);
  }

  // --- Scenes --------------------------------------------------------------

  // Shows the current scene (see page.js) and picks which of its craft lands there.
  function showScene() {
    const { craft = "rocket" } = Page.showScene(scene);
    const choices = [].concat(craft);
    const pick = choices[Math.floor(Math.random() * choices.length)];
    ship = shipEls.find((el) => el.dataset.name === pick) || shipEls[0];
    shipEls.forEach((el) => el.classList.toggle("shown", el === ship));
  }

  // --- Craft ---------------------------------------------------------------

  // Draw every craft at the rocket's scale, centered over the pad, so their outlines match.
  function sizeShips() {
    const padWidth = shipEls[0].viewBox.baseVal.width; // the rocket, which comes first
    shipEls.forEach((el) => {
      const { width, height } = el.viewBox.baseVal;
      el.style.width = `${(width / padWidth) * 100}%`;
      el.style.marginLeft = `${(1 - width / padWidth) * 50}%`;
      el.style.aspectRatio = `${width} / ${height}`;
    });
  }

  // One slice of fuel per letter, stacked from the bottom of the tank up.
  function emptyTank(slices) {
    const tankEl = ship.querySelector("[data-tank]");
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
    ship.querySelector("[data-fuel]").replaceChildren(...fuelEls);
  }

  function addFuel(i, color) {
    fuelEls[i].style.fill = color;
    fuelEls[i].classList.add("full");
  }

  // Stop any flight in progress, including tilts on the ship itself.
  function stopFlying() {
    [craftEl, ship].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  }

  // Moves the whole craft, and stays where it ends: after a takeoff, that's off screen.
  function fly(keyframes, duration = TAKEOFF_MS) {
    return craftEl.animate(keyframes, { duration, fill: "forwards" });
  }

  // Every new word, the craft flies back in and lands on the pad. While it's
  // "lit", its flame, beam or propellers are going.
  function land() {
    stopFlying();
    craftEl.classList.add("lit");
    const landing = FLIGHTS[ship.dataset.name].land();
    landing.onfinish = () => craftEl.classList.remove("lit");
  }

  function blastOff() {
    stopFlying();
    craftEl.classList.add("lit");
    FLIGHTS[ship.dataset.name].takeOff();
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

  // A gentle "uh-oh": two low notes stepping down. Only one plays at a time,
  // so a toddler mashing several keys at once doesn't make a din.
  function uhOh() {
    if (!audio || audio.currentTime < uhOhUntil) return;
    chime(392, 0, 0.15);
    chime(330, 0.14, 0.3);
    uhOhUntil = audio.currentTime + 0.44;
  }

  // UFO engine: a wobbly "woo-woo-woo" that rises as it flies away.
  function warble(length = 2.2) {
    if (!audio) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + length);

    // A slow second oscillator bends the pitch up and down for the wobble.
    const wobble = audio.createOscillator();
    wobble.frequency.value = 7;
    const depth = audio.createGain();
    depth.gain.value = 80;
    wobble.connect(depth).connect(osc.frequency);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.2);
    gain.gain.setValueAtTime(0.2, t + length - 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    osc.connect(gain).connect(audio.destination);
    [osc, wobble].forEach((o) => {
      o.start(t);
      o.stop(t + length);
    });
  }

  // Engine roar (rockets, the lander, the balloon's burner): filtered white noise
  // that swells, brightens from `from` to `to` Hz, then fades away.
  function rumble(length = 2.4, from = 400, to = 1500) {
    if (!audio) return;
    const t = audio.currentTime;
    const source = noise(length);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    // Laptop speakers barely play deep bass, so keep the roar above ~400 Hz.
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + length);

    source.connect(filter).connect(swell(t, length, 2)).connect(audio.destination);
    source.start(t);
  }

  // Propellers and rotors: engine noise chopped into pulses, `rate` a second and speeding up.
  function chop(length, rate) {
    if (!audio) return;
    const t = audio.currentTime;
    const source = noise(length);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;

    // A square wave flips the volume between 0 and 1.
    const pulse = audio.createGain();
    pulse.gain.value = 0.5;
    const flipper = audio.createOscillator();
    flipper.type = "square";
    flipper.frequency.setValueAtTime(rate, t);
    flipper.frequency.linearRampToValueAtTime(rate * 1.5, t + length);
    const depth = audio.createGain();
    depth.gain.value = 0.5;
    flipper.connect(depth).connect(pulse.gain);

    source.connect(filter).connect(pulse).connect(swell(t, length, 2.5)).connect(audio.destination);
    source.start(t);
    flipper.start(t);
    flipper.stop(t + length);
  }

  function noise(length) {
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * length), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  // A volume that swells up to `peak`, then fades away by the end.
  function swell(t, length, peak) {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + length * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    return gain;
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
})();
