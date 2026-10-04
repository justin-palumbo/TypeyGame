// Shared by the title screen and every mode: the page's colors and font from config.js,
// the scenery for each scene (sky, ground, stars, clouds, backdrop), and the full-screen button.

const Page = (() => {
  const starsEl = document.getElementById("stars");
  const backdropEls = document.querySelectorAll(".backdrop");
  const fullscreenBtn = document.getElementById("fullscreen");

  applyTheme();
  scatterStars();
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  return { showScene };

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

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
    fullscreenBtn.blur(); // so key presses don't re-trigger the button
  }
})();
