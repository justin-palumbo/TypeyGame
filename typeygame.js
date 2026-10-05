// The typing game: a word appears, type it one letter at a time.
// Each letter adds fuel to a craft (a rocket, plane, UFO...), and a finished word flies it off to the next scene.
// All the settings live in config.js; the title screen calls TypingGame.start() and .stop().

const TypingGame = (() => {
  const HOP = [{ transform: "translateY(0)" }, { transform: "translateY(-0.25em)" }, { transform: "translateY(0)" }];

  const words = CONFIG.words.map((w) => w.trim().toLowerCase()).filter(Boolean);
  const fillColors = [].concat(CONFIG.colors.letterFilled);

  const wordEl = document.getElementById("word");

  let scene = 0; // index into CONFIG.scenes
  let word = "";
  let pos = 0; // index of the next letter to type
  let letterEls = [];
  let pictureEl = null;
  let celebrating = false;
  let bag = [];
  let nextWordTimer = 0;

  return { start, stop };

  // Every game begins in the first scene, the one behind the title screen.
  function start() {
    document.body.classList.toggle("no-rocket", !CONFIG.showRocket);
    scene = 0;
    showWord(pickWord());
    window.addEventListener("keydown", onKey);
  }

  // Back to the title screen: clear away the word, the craft's flight, and anything
  // still on its way (the next word, confetti, speech and sounds).
  function stop() {
    window.removeEventListener("keydown", onKey);
    clearTimeout(nextWordTimer);
    wordEl.replaceChildren();
    Craft.stop();
    Page.stopConfetti();
    Sound.stop();
  }

  // Shuffle-bag: every word appears once before any word repeats.
  function pickWord() {
    if (bag.length === 0) {
      bag = Page.shuffle([...words]);
      const last = bag.length - 1;
      if (last > 0 && bag[last] === word) [bag[0], bag[last]] = [bag[last], bag[0]];
    }
    return bag.pop();
  }

  // Each word visits the current scene, with a fresh craft that has one slice of fuel per letter.
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

    pictureEl?.animate(Page.ENTER, { duration: 350, easing: "ease-out" });
    letterEls.forEach((el, i) =>
      el.animate(Page.ENTER, { duration: 350, delay: i * 50, easing: "ease-out", fill: "backwards" }));
    markNext();

    if (CONFIG.showRocket) Craft.visit(scene, w.length);
    else Page.showScene(scene);
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
    Sound.wake();

    const el = letterEls[pos];
    if (e.key.toLowerCase() !== word[pos]) {
      if (CONFIG.wiggleOnMistake) el.animate(Page.WIGGLE, { duration: 400 });
      if (CONFIG.soundOnMistake) Sound.uhOh();
      return;
    }

    el.style.color = fillColors[pos % fillColors.length];
    el.animate(Page.POP, { duration: 300, easing: "ease-out" });
    if (CONFIG.showRocket) Craft.setFuel(pos + 1);
    Sound.chime(Sound.SCALE[pos % Sound.SCALE.length]);
    pos++;

    if (pos === word.length) {
      celebrate();
    } else {
      if (CONFIG.sayLetters) Sound.say(e.key.toUpperCase());
      markNext();
    }
  }

  function celebrate() {
    celebrating = true;
    markNext();
    if (CONFIG.sayWord) Sound.say(word);
    Sound.fanfare();
    Page.confetti(wordEl);
    pictureEl?.animate(Page.POP, { duration: 450, iterations: 2, easing: "ease-in-out" });
    letterEls.forEach((el, i) =>
      el.animate(HOP, { duration: 450, delay: i * 70, iterations: 2, easing: "ease-in-out" }));
    if (CONFIG.showRocket) Craft.launch();
    nextWordTimer = setTimeout(() => {
      // Change scenes while the craft is off screen, so it lands somewhere new.
      scene = (scene + 1) % CONFIG.scenes.length;
      showWord(pickWord());
    }, CONFIG.celebrationMs);
  }
})();
