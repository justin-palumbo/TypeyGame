// Everything a grown-up might want to tweak lives here.
// A future settings screen can read and overwrite these values.
const CONFIG = {
  // Words to type, roughly eight letters each. Shown one at a time in random order.
  words: [
    "elephant", "dinosaur", "airplane", "kangaroo", "flamingo",
    "hedgehog", "squirrel", "starfish", "sunshine", "mushroom",
    "sandwich", "pancakes", "backpack", "football", "lollipop",
    "rainbow", "giraffe", "penguin", "dolphin", "octopus",
    "pumpkin", "tractor", "cupcake", "snowman", "unicorn",
    "popcorn", "ladybug", "bulldozer", "firetruck", "blueberry",
    "butterfly", "excavator",
  ],

  // "upper" matches the letters printed on the keyboard; "lower" matches storybooks.
  letterCase: "upper",

  colors: {
    background: "#bde0fe",
    letterEmpty: "#ffffff",
    letterOutline: "#1b1b1b",
    // One color fills every letter. List several to cycle through them (rainbow!).
    letterFilled: ["#8e44ec"],
  },

  font: '"Fredoka", "Arial Rounded MT Bold", "Chalkboard SE", "Comic Sans MS", sans-serif',

  highlightNextLetter: true, // gently bounce the letter to type next
  wiggleOnMistake: true,     // wiggle that letter when the wrong key is pressed

  sounds: true,     // chime on each correct letter, fanfare on each finished word
  sayLetters: true, // speak each letter out loud as it's typed
  sayWord: true,    // speak the whole word when it's finished

  celebrationMs: 2500, // how long the celebration lasts before the next word
};
