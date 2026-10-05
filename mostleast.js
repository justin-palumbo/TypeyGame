// Most and Least: three boxes, A, B and C, each hold a different number of the same picture
// (from 1 up to `largestCount`). The question asks which has the most (or the fewest);
// answer with the A, B or C key, or a click.
// Each right answer adds a slice of fuel, and a full tank launches the craft to the next scene.
// Settings are under `mostAndLeast` in config.js; the title screen calls MostLeast.start() and .stop().

const MostLeast = (() => {
  const LABELS = ["A", "B", "C"];
  // Spots in each box's 3×3 grid (row / column), laid out like the dots on dice.
  const DICE = {
    1: ["2 / 2"],
    2: ["1 / 1", "3 / 3"],
    3: ["1 / 1", "2 / 2", "3 / 3"],
    4: ["1 / 1", "1 / 3", "3 / 1", "3 / 3"],
    5: ["1 / 1", "1 / 3", "2 / 2", "3 / 1", "3 / 3"],
    6: ["1 / 1", "2 / 1", "3 / 1", "1 / 3", "2 / 3", "3 / 3"],
  };
  const NEXT_MS = 1200; // after a right answer, the pause before the next question
  const SHOW_RIGHT_MS = 1600; // after a wrong answer, how long the right box glows

  const settings = CONFIG.mostAndLeast;
  const pictures = Object.keys(CONFIG.pictures).filter((name) => !settings.skipPictures.includes(name));
  const counts = Array.from({ length: settings.largestCount }, (_, i) => i + 1); // 1, 2, 3...

  const quizEl = document.getElementById("quiz");
  const promptEl = document.getElementById("quiz-prompt");
  const choicesEl = document.getElementById("quiz-choices");

  let scene = 0; // index into CONFIG.scenes
  let fuel = 0; // right answers since the last launch
  let picture = "";
  let answer = 0; // index of the right box
  let choiceEls = [];
  let waiting = false; // true while showing how an answer went
  let timer = 0;

  return { start, stop };

  // Every game begins in the first scene, the one behind the title screen, with its own
  // special craft (Artemis I) on the pad.
  function start() {
    document.body.classList.remove("no-rocket"); // the craft is the whole reward here
    scene = 0;
    fuel = 0;
    Craft.visit(scene, settings.answersToLaunch, settings.firstCraft);
    quizEl.hidden = false;
    ask();
    window.addEventListener("keydown", onKey);
    choicesEl.addEventListener("click", onClick);
  }

  // Back to the title screen: clear away the question and anything still on its way.
  function stop() {
    window.removeEventListener("keydown", onKey);
    choicesEl.removeEventListener("click", onClick);
    clearTimeout(timer);
    quizEl.hidden = true;
    choicesEl.replaceChildren();
    Craft.stop();
    Page.stopConfetti();
    Sound.stop();
  }

  // A new question: a different picture, and three different counts in a random order.
  function ask() {
    waiting = false;
    picture = pickPicture();
    const shown = Page.shuffle([...counts]).slice(0, 3);
    const most = Math.random() < 0.5;
    answer = shown.indexOf(most ? Math.max(...shown) : Math.min(...shown));

    const keyWord = document.createElement("span");
    keyWord.className = "quiz-word";
    keyWord.textContent = most ? "most" : "fewest";
    promptEl.replaceChildren("Which has ", keyWord, "?");

    choiceEls = shown.map((count, i) => {
      const box = document.createElement("div");
      box.className = "choice-box";
      box.append(...DICE[count].map((spot) => {
        const img = new Image();
        img.src = CONFIG.pictures[picture];
        img.alt = "";
        img.style.gridArea = spot;
        return img;
      }));
      const key = document.createElement("div");
      key.className = "choice-key";
      key.textContent = LABELS[i];
      const choice = document.createElement("div");
      choice.className = "choice";
      choice.dataset.index = i;
      choice.setAttribute("aria-label", `${LABELS[i]}: ${count}`);
      choice.append(box, key);
      return choice;
    });
    choicesEl.replaceChildren(...choiceEls);
    choiceEls.forEach((el, i) =>
      el.animate(Page.ENTER, { duration: 350, delay: i * 80, easing: "ease-out", fill: "backwards" }));
  }

  // Any picture but the last one, so each question looks new.
  function pickPicture() {
    const others = pictures.filter((name) => name !== picture);
    const pool = others.length ? others : pictures;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // leave grown-up shortcuts alone
    e.preventDefault(); // no scrolling, tabbing, etc.
    if (e.repeat) return;
    const i = LABELS.indexOf(e.key.toUpperCase());
    if (i >= 0) choose(i);
  }

  function onClick(e) {
    const choice = e.target.closest(".choice");
    if (choice) choose(Number(choice.dataset.index));
  }

  function choose(i) {
    if (waiting) return;
    waiting = true;
    Sound.wake();
    if (i === answer) right();
    else wrong(i);
  }

  // The right box glows and adds a slice of fuel. A full tank launches the craft, and it
  // lands in the next scene with an empty one.
  function right() {
    const el = choiceEls[answer];
    el.classList.add("right");
    el.animate(Page.POP, { duration: 400, easing: "ease-out" });
    Sound.chime(Sound.SCALE[fuel % Sound.SCALE.length]);
    Sound.chime(Sound.SCALE[(fuel + 2) % Sound.SCALE.length], 0.12);
    fuel++;
    Craft.setFuel(fuel);

    if (fuel < settings.answersToLaunch) {
      timer = setTimeout(ask, NEXT_MS);
      return;
    }
    Sound.fanfare();
    Page.confetti(el);
    Craft.launch();
    timer = setTimeout(() => {
      // Change scenes while the craft is off screen, so it lands somewhere new.
      scene = (scene + 1) % CONFIG.scenes.length;
      fuel = 0;
      Craft.visit(scene, settings.answersToLaunch);
      ask();
    }, CONFIG.celebrationMs);
  }

  // The wrong pick wiggles and fades, then the right box glows before the next question.
  // The fuel stays where it is.
  function wrong(i) {
    choiceEls[i].classList.add("wrong");
    if (CONFIG.wiggleOnMistake) choiceEls[i].animate(Page.WIGGLE, { duration: 400 });
    if (CONFIG.soundOnMistake) Sound.uhOh();
    timer = setTimeout(() => {
      choiceEls[answer].classList.add("right");
      timer = setTimeout(ask, SHOW_RIGHT_MS);
    }, 400);
  }
})();
