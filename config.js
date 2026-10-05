// Everything a grown-up might want to tweak lives here.
// A future settings screen can read and overwrite these values.
const CONFIG = {
  // Words to type, shown one at a time in random order.
  words: [
    "dog",
    "cat",
    "sun",
    "boot",
    "pan",
    "pig",
    "star",
    "banana",
    "hat",
    "moon",
    "stop",
    "matteo"
  ],

  // A picture shown beside a word while it's typed. Any image file works, even a photo.
  // Words without one here just show the word. Most and Least counts these pictures too.
  pictures: {
    dog: "pictures/dog.svg",
    cat: "pictures/cat.svg",
    sun: "pictures/sun.svg",
    boot: "pictures/boot.svg",
    pan: "pictures/pan.svg",
    pig: "pictures/pig.svg",
    star: "pictures/star.svg",
    stop: "pictures/stop.svg",
    banana: "pictures/banana.svg",
    hat: "pictures/hat.svg",
    moon: "pictures/moon.svg",
    matteo: "pictures/matteo.svg",
  },

  // "upper" matches the letters printed on the keyboard; "lower" matches storybooks.
  letterCase: "upper",

  colors: {
    letterEmpty: "#ffffff",
    letterOutline: "#1b1b1b",
    // One color fills every letter. List several to cycle through them (rainbow!).
    letterFilled: ["#8e44ec"],
    rocket: "#ff595e", // the rocket's nose, fins and stripe, and the red parts of the other craft
  },

  // Most and Least: boxes A, B and C each hold a different number of the same picture,
  // and the question asks which has the most (or the fewest).
  mostAndLeast: {
    largestCount: 5,          // boxes hold from 1 up to this many pictures (at most 6)
    answersToLaunch: 5,       // right answers that fill the tank and launch the craft
    skipPictures: ["matteo"], // pictures not to use for counting
    firstCraft: "artemis",    // every game starts with Artemis I on the pad; then each scene's own craft
  },

  // Each launch moves on to the next scene, looping back to the first.
  // `backdrop` floats far off in the sky: "moon", "earth" or "saturn".
  // `craters` is the crater color; leave it (or `stars`, `clouds`, `backdrop`) out for plain ground or sky.
  // `craft` lists what can land there, picked at random each visit: "rocket", "airplane",
  // "helicopter", "balloon", "blimp", "lander", "ufo" or "artemis". Leave it out for just the rocket.
  scenes: [
    {
      name: "earth", sky: "#bde0fe", ground: "#95d5b2", clouds: true, backdrop: "moon",
      craft: ["rocket", "airplane", "helicopter", "balloon", "blimp"],
    },
    {
      name: "moon", sky: "#0b1633", ground: "#c9c9d1", craters: "#9d9daa", stars: true, backdrop: "earth",
      craft: ["rocket", "lander"],
    },
    {
      name: "mars", sky: "#2b1030", ground: "#d9622b", craters: "#a8461c", stars: true, backdrop: "saturn",
      craft: ["rocket", "ufo"],
    },
  ],

  font: '"Fredoka", "Arial Rounded MT Bold", "Chalkboard SE", "Comic Sans MS", sans-serif',

  highlightNextLetter: true, // gently bounce the letter to type next
  wiggleOnMistake: true,     // wiggle the letter (or answer box) when the wrong key is pressed
  showRocket: true,          // typing: each letter fuels the rocket (or other craft); a finished word flies it off

  sounds: true,     // chime on each right letter or answer, fanfare on each launch
  soundOnMistake: true, // a soft "uh-oh" when the wrong key is pressed
  sayLetters: false, // speak each letter out loud as it's typed
  sayWord: true,    // speak the whole word when it's finished

  celebrationMs: 2500, // how long the celebration lasts before the next word
};
