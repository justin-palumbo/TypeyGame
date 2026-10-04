// The title screen: the game's name over the first scene, with no craft yet.
// For now there's one choice, "Start game", picked with Enter or a click.
// While a mode is playing, Escape stops it and comes back here.
// Each mode is an object with start() and stop(), like TypingGame.
// The page starts with body.on-title, which hides the launch pad until a mode begins.

(() => {
  const COLORS = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];

  const titleEl = document.getElementById("title");
  const nameEl = document.getElementById("title-name");
  const startBtn = document.getElementById("start");

  let mode = null; // the mode being played, or null while on the title screen

  colorName();
  Page.showScene(0);
  window.addEventListener("keydown", onKey);
  startBtn.addEventListener("click", () => play(TypingGame));

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

  // Modes ignore Enter and Escape, so the title screen can have them.
  function onKey(e) {
    if (mode && e.key === "Escape") {
      e.preventDefault();
      backToTitle();
    } else if (!mode && e.key === "Enter") {
      e.preventDefault();
      play(TypingGame);
    }
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
