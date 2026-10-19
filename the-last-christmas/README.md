# The Last Christmas

A story-driven 2D detective game for the browser (Phaser 3 + Vite, JavaScript ES modules).
You play Rowan Hale, investigating the disappearance of festival organiser Thomas Bell in Bellwether,
and the twenty-five-year-old story the town tells about the archive fire. About 45 minutes.

## Run it

```bash
npm install        # phaser, vite
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/
npm test           # all automated tests (Node's built-in test runner, no extra packages)
```

Node 18 or newer. Saves go to `localStorage` (falls back to memory when the browser blocks it).

## Controls

| Key | Action |
| --- | --- |
| A / D or arrows | Walk |
| W / S or up / down | Step toward / away from the camera |
| E, Space, Enter | Interact, continue a conversation |
| 1 2 3 | Choose a reply |
| J / B | Journal / Deduction board |
| Esc | Pause, close panels |
| Mouse | Click the ground to walk, click an object to walk there and use it, click any button or card |

## Project layout

- `src/data/` story content as plain data: flags, evidence, relations, confrontations, puzzles, dialogue, interactions, locations, NPCs.
- `src/systems/`, `src/game/` all rules, with no Phaser and no DOM (state, dialogue runner, deductions, puzzles, saving, movement, `GameController`).
- `src/art/` pixel art drawn in code: characters, portraits, 8 backgrounds (parallax layers plus light), icons.
- `src/ui/` the HTML interface (dock, journal, deduction board, puzzles, menus). `src/styles/ui.css`.
- `src/scenes/` Phaser scenes (`BootScene`, `BackdropScene`, `LocationScene`). `src/main.js` starts the game.
- `tests/` automated tests. `tools/` preview renderer and a Phaser-free browser harness for the HTML UI.

## Canon notes

- The brief calls Rowan 31 and says he was seven twenty-five years ago (that adds up to 32). The game says "thirty-one years in this town" and never names the current year.
- The childhood home is described as optional, but the plaque in its toy box is required, so the home is reachable once the twelve-point clue is understood.
- Elias Wren's last moments are deliberately never resolved: the evidence proves the fraud and the falsified history, not his fate.
