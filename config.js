// Everything a grown-up might want to tweak lives here.
// A future settings screen can read and overwrite these values.
const CONFIG = {
  // Words to type, shown one at a time in random order.
  words: [
    "dog",
    "cat",
    "sun",
    "banana",
    "hat",
    "moon",
    "matteo"
  ],

  // A picture shown beside a word while it's typed. Any image file works, even a photo.
  // Words without one here just show the word.
  pictures: {
    dog: "pictures/dog.svg",
    cat: "pictures/cat.svg",
    sun: "pictures/sun.svg",
    banana: "pictures/banana.svg",
    hat: "pictures/hat.svg",
    moon: "pictures/moon.svg",
  },

  // "upper" matches the letters printed on the keyboard; "lower" matches storybooks.
  letterCase: "upper",

  colors: {
    letterEmpty: "#ffffff",
    letterOutline: "#1b1b1b",
    // One color fills every letter. List several to cycle through them (rainbow!).
    letterFilled: ["#8e44ec"],
    rocket: "#ff595e", // nose, fins and stripe
  },

  // Each finished word moves on to the next scene, looping back to the first.
  // `backdrop` floats far off in the sky: "moon", "earth" or "saturn".
  // `craters` is the crater color; leave it (or `stars`, `clouds`, `backdrop`) out for plain ground or sky.
  scenes: [
    { name: "earth", sky: "#bde0fe", ground: "#95d5b2", clouds: true, backdrop: "moon" },
    { name: "moon", sky: "#0b1633", ground: "#c9c9d1", craters: "#9d9daa", stars: true, backdrop: "earth" },
    { name: "mars", sky: "#2b1030", ground: "#d9622b", craters: "#a8461c", stars: true, backdrop: "saturn" },
  ],

  font: '"Fredoka", "Arial Rounded MT Bold", "Chalkboard SE", "Comic Sans MS", sans-serif',

  highlightNextLetter: true, // gently bounce the letter to type next
  wiggleOnMistake: true,     // wiggle that letter when the wrong key is pressed
  showRocket: true,          // each letter fuels the rocket; a finished word blasts it off

  sounds: true,     // chime on each correct letter, fanfare on each finished word
  soundOnMistake: true, // a soft "uh-oh" when the wrong key is pressed
  sayLetters: false, // speak each letter out loud as it's typed
  sayWord: true,    // speak the whole word when it's finished

  celebrationMs: 2500, // how long the celebration lasts before the next word
};
