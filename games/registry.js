// Every game in the Playground is listed here.
//
// To add a game:
//   1. Create games/<id>/game.js that exports  mount(container)  and returns
//      { destroy() }  (see games/matching-pairs/game.js for an example).
//   2. Add an entry below.
//
// Games are loaded on demand, so a heavy game (for example one that uses
// Phaser) only downloads its code when someone actually opens it.
export const games = [
  {
    id: "dream-house",
    title: "Dream House",
    blurb:
      "A light-filled home furnished around Phee, chess, coding, and the games you love.",
    load: () => import("./dream-house/game.js"),
  },
  {
    id: "matching-pairs",
    title: "Matching Pairs",
    blurb:
      "Flip the cards, find every matching pair, and see how sharp your memory really is.",
    load: () => import("./matching-pairs/game.js"),
  },
  {
    id: "turbo-tetris",
    title: "Turbo Tetris",
    blurb:
      "Rotate falling blocks, clear lines, and survive the drop all the way to the bottom of the page.",
    load: () => import("./turbo-tetris/game.js"),
  },
  {
    id: "number-guessing",
    title: "Number Guessing Game",
    blurb:
      "Guess the secret number from 1 to 1,000,000 and see if luck is on your side.",
    load: () => import("./number-guessing/game.js"),
  },
  {
    id: "one-player-chess",
    title: "One-Player Chess",
    blurb:
      "Choose your side, set a time control, and put your chess skills to the test.",
    load: () => import("./one-player-chess/game.js"),
  },
];
