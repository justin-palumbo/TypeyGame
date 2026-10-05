// The title screen: the game's name over the first scene, with no craft yet, and a button
// for each mode. Arrow keys move the highlight and Enter starts it, or click a button.
// While a mode is playing, Escape stops it and comes back here.
// Each mode is an object with start() and stop(), like TypingGame.
// The page starts with body.on-title, which hides the launch pad until a mode begins.

(() => {
  const COLORS = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];
  const MODES = { typing: TypingGame, "most-least": MostLeast }; // by each button's data-mode

  const titleEl = document.getElementById("title");
  const nameEl = document.getElementById("title-name");
  const modeBtns = [...document.querySelectorAll(".mode")];

  let mode = null; // the mode being played, or null while on the title screen
  let selected = 0; // index into modeBtns

  colorName();
  select(0);
  Page.showScene(0);
  window.addEventListener("keydown", onKey);
  modeBtns.forEach((btn, i) => {
    btn.addEventListener("click", () => play(MODES[btn.dataset.mode]));
    btn.addEventListener("mouseenter", () => select(i));
    btn.addEventListener("focus", () => select(i));
  });

  // Each letter of the name gets its own color and bobs in a slow wave.
  function colorName() {
    let n = 0;
    const parts = [...nameEl.textContent].map((ch) => {
      if (ch === " ") return document.createTextNode(" ");
      const span = document.createElement("span");
      span.className = "letter";
      span.textContent = ch;
      span.style.color = COLORS[n % COLORS.length];
      span.style.animationDelay = `${n * 0.12}s`;
      n++;
      return span;
    });
    nameEl.setAttribute("aria-label", nameEl.textContent);
    nameEl.replaceChildren(...parts);
  }

  // Modes ignore Enter, Escape and the arrow keys, so the title screen can have them.
  function onKey(e) {
    if (mode) {
      if (e.key === "Escape") {
        e.preventDefault();
        backToTitle();
      }
      return;
    }
    if (e.key === "Enter") play(MODES[modeBtns[selected].dataset.mode]);
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") select(selected + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") select(selected - 1);
    else return;
    e.preventDefault();
  }

  // Wraps around at either end.
  function select(i) {
    selected = (i + modeBtns.length) % modeBtns.length;
    modeBtns.forEach((btn, j) => btn.classList.toggle("selected", j === selected));
  }

  function play(game) {
    if (mode) return; // Enter on a focused button also clicks it
    mode = game;
    document.body.classList.remove("on-title");
    game.start();
    fadeTitle([{ opacity: 1 }, { opacity: 0, transform: "scale(1.1)" }]).onfinish = () => (titleEl.hidden = true);
  }

  function backToTitle() {
    mode.stop();
    mode = null;
    document.body.classList.add("on-title");
    Page.showScene(0);
    titleEl.hidden = false;
    fadeTitle([{ opacity: 0, transform: "scale(1.1)" }, { opacity: 1 }]);
  }

  // Cancels any fade still running, so a quick start-then-Escape can't hide the title.
  function fadeTitle(keyframes) {
    titleEl.getAnimations().forEach((a) => a.cancel());
    return titleEl.animate(keyframes, { duration: 400, easing: "ease-in-out" });
  }
})();
