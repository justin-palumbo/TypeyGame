// The craft on the launch pad (rocket, plane, UFO...), shared by every mode: picking one
// for each scene, its fuel tank, and how it lands and takes off. The drawings are in index.html.

const Craft = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const SHAKE = [0, -3, 3, -3, 3, -3, 3, 0].map((x) => ({ transform: `translateX(${x}px)` }));
  const SWAY = [0, -6, 6, -6, 6, 0].map((deg) => ({ transform: `rotate(${deg}deg)` }));

  // Where the craft is, relative to sitting on the pad, and how it's tipped.
  const at = (x, y, more) => ({ transform: `translate(${x}, ${y})`, ...more });
  const tilt = (deg, more) => ({ transform: `rotate(${deg}deg)`, ...more });
  const ON_PAD = at(0, 0);
  const IN_SPACE = at(0, "-115vh"); // far enough up to be off screen
  const SOFT = "cubic-bezier(0.2, 0.8, 0.4, 1)"; // fast, then gently settling
  const SPEED_UP = "cubic-bezier(0.32, 0, 0.67, 0)"; // start slow, keep speeding up
  const TAKEOFF_MS = 2200; // how long most takeoffs take; modes wait for launch() to finish
  const ARTEMIS_MS = 3800; // Artemis I climbs slower, so its boosters' fall is easy to see
  const BOOSTERS_OFF_MS = 2200; // when Artemis I drops its boosters, about a quarter of the way up
  const WOBBLE_MS = 600; // how long a craft shakes before it explodes
  const DEBRIS = ["#ff595e", "#ff8c42", "#ffd23f", "#495057", "#adb5bd", "#ffffff"];

  // How each craft lands and takes off. Both return the animation that moves #craft;
  // tilts and wobbles go on the ship itself, so the two combine.
  // Left-facing craft (plane, helicopter, blimp) tip their nose up with a positive tilt.
  // `rollsIn` craft arrive along the ground with their engines off.
  const FLIGHTS = {
    // Rolls out to the pad (it can't land: its boosters are gone), then lifts off on every
    // engine, climbs slowly, and drops its two side boosters partway up, like the real Artemis I.
    artemis: {
      rollsIn: true,
      land: () => fly([{ ...at("40vw", 0), easing: "ease-out" }, ON_PAD], 2000),
      takeOff: () => {
        Sound.rumble(ARTEMIS_MS / 1000);
        puffSmoke();
        ship.animate(SHAKE, { duration: 600 });
        dropBoosters();
        // A gentler speed-up than the rocket's, so the climb lasts longer on screen.
        const speedUp = "cubic-bezier(0.11, 0, 0.5, 0)";
        return fly([ON_PAD, { ...ON_PAD, offset: 600 / ARTEMIS_MS, easing: speedUp }, IN_SPACE], ARTEMIS_MS);
      },
    },
    rocket: {
      land: () => fly([{ ...IN_SPACE, easing: SOFT }, ON_PAD], 1200),
      takeOff: () => {
        Sound.rumble();
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
        Sound.warble();
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
        Sound.chop(TAKEOFF_MS / 1000, 28);
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
        Sound.chop(TAKEOFF_MS / 1000, 11);
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
        Sound.rumble(1.4, 500, 1200);
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
        Sound.chop(TAKEOFF_MS / 1000, 18);
        ship.animate([tilt(0), tilt(6, { offset: 0.35 }), tilt(6)], { duration: TAKEOFF_MS });
        return fly([{ ...ON_PAD, easing: "ease-in" }, at("-4vw", "-8vh", { offset: 0.35, easing: "ease-in" }), at("-50vw", "-115vh")]);
      },
    },
    // Slow down, hover just above the ground, then set down.
    lander: {
      land: () => fly([{ ...IN_SPACE, easing: "ease-out" }, at(0, "-6vh", { offset: 0.7, easing: "ease-in-out" }), ON_PAD], 1600),
      // No smoke: there's no air on the moon.
      takeOff: () => {
        Sound.rumble(TAKEOFF_MS / 1000, 500, 1300);
        ship.animate(SHAKE, { duration: 400 });
        return fly([ON_PAD, { ...ON_PAD, offset: 0.18, easing: SPEED_UP }, IN_SPACE]);
      },
    },
  };

  const fillColors = [].concat(CONFIG.colors.letterFilled);

  const launchEl = document.getElementById("launch");
  const craftEl = document.getElementById("craft");
  const shipEls = [...document.querySelectorAll(".ship")];
  const boomEl = document.getElementById("boom");

  let ship = shipEls[0]; // the craft on the pad now
  let fuelEls = [];
  let boomTimer = 0;

  sizeShips();

  return { visit, setFuel, launch, explode, stop };

  // Shows scene `index` (see page.js), picks one of its craft (or uses `only`, if given),
  // gives it an empty tank of `slices` slices, and lands it on the pad.
  function visit(index, slices, only) {
    const { craft = "rocket" } = Page.showScene(index);
    const choices = only ? [only] : [].concat(craft);
    const pick = choices[Math.floor(Math.random() * choices.length)];
    ship = shipEls.find((el) => el.dataset.name === pick) || shipEls[0];
    shipEls.forEach((el) => el.classList.toggle("shown", el === ship));
    emptyTank(slices);
    land();
  }

  // Fills the bottom `level` slices of the tank and empties the rest, so the level can
  // go down as well as up. Slice i is the same color as letter i in the typing game.
  function setFuel(level) {
    fuelEls.forEach((el, i) => {
      const full = i < level;
      if (full) el.style.fill = fillColors[i % fillColors.length];
      el.classList.toggle("full", full);
    });
  }

  // Takes off with its own motion and sound, and stays off screen until the next visit.
  // Returns how long the takeoff lasts, in ms, so modes can wait for it to finish.
  function launch() {
    stopFlying();
    craftEl.classList.add("lit");
    return FLIGHTS[ship.dataset.name].takeOff().effect.getComputedTiming().endTime;
  }

  // Shakes for a moment, then blows up in a cartoon burst of smoke and flying debris,
  // leaving the pad empty until the next visit.
  function explode() {
    stopFlying();
    ship.animate(SHAKE, { duration: WOBBLE_MS / 3, iterations: 3 });
    boomTimer = setTimeout(() => {
      Sound.boom();
      puffSmoke();
      Page.confetti(ship, DEBRIS);
      ship.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.3)" }], {
        duration: 150,
        fill: "forwards",
      });

      const box = ship.getBoundingClientRect();
      const size = Math.max(box.width, box.height) * 1.3;
      boomEl.style.width = `${size}px`;
      boomEl.style.left = `${box.left + box.width / 2 - size / 2}px`;
      boomEl.style.top = `${box.top + box.height / 2 - size / 2}px`;
      boomEl.animate(
        [
          { transform: "scale(0) rotate(-20deg)", opacity: 1 },
          { transform: "scale(1) rotate(0deg)", opacity: 1, offset: 0.25 },
          { transform: "scale(1.1) rotate(5deg)", opacity: 1, offset: 0.7 },
          { transform: "scale(1.2) rotate(8deg)", opacity: 0 },
        ],
        { duration: 1200, easing: "ease-out" },
      );
    }, WOBBLE_MS);
  }

  // Stops any flight or explosion, for leaving a mode.
  function stop() {
    clearTimeout(boomTimer);
    boomEl.getAnimations().forEach((a) => a.cancel());
    stopFlying();
    craftEl.classList.remove("lit");
  }

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

  // The tank is cut into `slices` slices, stacked from the bottom up.
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

  // Stop any flight in progress, including tilts on the ship itself, and put back any
  // boosters that fell away.
  function stopFlying() {
    [craftEl, ship, ...ship.querySelectorAll(".booster, .booster .flame")].forEach((el) =>
      el.getAnimations().forEach((a) => a.cancel()));
  }

  // Moves the whole craft, and stays where it ends: after a takeoff, that's off screen.
  function fly(keyframes, duration = TAKEOFF_MS) {
    return craftEl.animate(keyframes, { duration, fill: "forwards" });
  }

  // The craft flies in and lands on the pad. While it's "lit", its flame, beam or
  // propellers are going.
  function land() {
    stopFlying();
    const flight = FLIGHTS[ship.dataset.name];
    craftEl.classList.toggle("lit", !flight.rollsIn);
    flight.land().onfinish = () => craftEl.classList.remove("lit");
  }

  // Each booster's flame goes out, then it peels away sideways and tumbles outward,
  // falling behind the climbing core stage, and fades only near the end.
  function dropBoosters() {
    const timing = { delay: BOOSTERS_OFF_MS, fill: "forwards" };
    ship.querySelectorAll(".booster").forEach((booster) => {
      const side = booster.dataset.side === "left" ? -1 : 1;
      booster.querySelector(".flame").animate([{ transform: "scale(1)" }, { transform: "scale(0)" }], {
        ...timing,
        duration: 200,
      });
      booster.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${side * 40}px, 200px) rotate(${side * 30}deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${side * 70}px, 360px) rotate(${side * 50}deg)`, opacity: 0 },
        ],
        { ...timing, duration: ARTEMIS_MS - BOOSTERS_OFF_MS, easing: "ease-in" },
      );
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
})();
