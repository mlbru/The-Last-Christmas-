// The four puzzles. Each uses a different skill:
//   1 spot contradictions   2 chronological ordering   3 timed-free sequence   4 recognition
// All puzzles are pure data; PuzzleSystem.js validates answers, tracks attempts and hints.
// There are no timers and no penalties. Wrong answers give feedback and never block progress.

export const PUZZLES = {
  puzzle_recipe: {
    id: 'puzzle_recipe', name: 'The Baker\'s Recipe', type: 'select-contradictions', location: 'bakery',
    requires: { evidence: ['ev_recipe_book', 'ev_fire_report'] },
    lockedMessage: 'I need Margot\'s recipe book and the official fire report side by side before this makes sense.',
    intro: 'Margot\'s margins carry times and numbers. Set them against the fire report\'s timeline. Pick every line that cannot be true if the report is.',
    timeline: [
      '21:00  Church locked and empty (fire report)',
      '23:45  Star lights fault, "crackling" heard (fire report)',
      '23:48  Fire starts. Lantern carried into the archive by E. Wren (fire report)',
      '00:20  Fire brigade arrives (fire report)',
    ],
    lines: [
      { id: 'L1', margin: 7, text: 'Stollen for the Boxing Day market. Baked 06:00, collected 09:00.' },
      { id: 'L2', margin: 4, text: 'Gingerbread, 14 trays. Out of the oven 20:30. Annex door opened for me at 21:05.' },
      { id: 'L3', margin: 9, text: 'Shortbread tin for Mrs Ames. Baked 13:00, collected 15:30.' },
      { id: 'L4', margin: 1, text: 'Tea and mince pies served 22:15 in the annex. H.V. said not to wait for the lights.' },
      { id: 'L5', margin: 2, text: 'Lanterns refilled 23:40. E.M. carried them across to the archive door.' },
      { id: 'L6', margin: 3, text: 'Closing up. Shop dark at 18:30, home by 19:00.' },
    ],
    solution: ['L2', 'L4', 'L5'],
    wrongPickFeedback: {
      L1: 'A market morning is just baking. It says nothing about the night of the fire.',
      L3: 'A shortbread tin collected in the afternoon contradicts nothing in the report.',
      L6: 'Margot went home early that evening. That fits the report. It does not argue with it.',
    },
    feedback: {
      none: 'Pick the lines you think the report cannot explain, then check them.',
      tooFew: 'Those are right, but you are missing something. Read the timeline again.',
      tooMany: 'One of the lines you picked fits the report perfectly. Look again.',
      mixed: 'Some of those fit the report. Compare each line with the timeline.',
    },
    hints: [
      'Start with the first timeline entry: the church was locked from 21:00. Which of Margot\'s lines have her indoors after that?',
      'Look for lines where Margot, or someone with initials in her margin, is inside the church or archive after 21:00, or carries a lantern.',
      'The answer is lines L2, L4 and L5. Their margin numbers read 4, 1, 2.',
    ],
    successText: 'Margin numbers 4, 1, 2. Dossier 0412, the one the report says burned. Margot wrote the number down and never knew why.',
    rewards: { evidence: ['ev_recipe_key'], flags: [] },
  },

  puzzle_archive: {
    id: 'puzzle_archive', name: 'The Missing Record', type: 'chronological-order', location: 'archive',
    requires: { evidence: ['ev_inventory'], anyEvidence: ['ev_silas_statement', 'ev_eddie_testimony', 'ev_margot_testimony', 'ev_rowan_statement'] },
    lockedMessage: 'I should hold the inventory and at least one witness account before I try to put these cards in order.',
    intro: 'Five archive cards were found loose. Put them in date order, oldest first. Then name the one that could not have been written when it says it was.',
    cards: [
      { id: 'A', date: '2001-03-12', label: '12 Mar 2001', text: 'Restoration Fund opened. Dossier 0401 registered.' },
      { id: 'B', date: '2001-09-20', label: '20 Sep 2001', text: 'Dossiers 0405 to 0411 registered.' },
      { id: 'C', date: '2001-11-29', label: '29 Nov 2001', text: 'Committee audit of the Fund scheduled for January.' },
      { id: 'D', date: '2001-11-14', label: '14 Nov 2001', text: 'Cover slip: "Dossier 0412, Restoration Fund. Registered in this archive."' },
      { id: 'E', date: '2001-12-27', label: '27 Dec 2001', text: 'Dossier 0412 formally registered. Entry made by hand, after the fire.' },
    ],
    solutionOrder: ['A', 'B', 'D', 'C', 'E'],
    anomaly: 'D',
    anomalyExplanation: 'The cover slip says it was written on 14 November, but the dossier it belongs to was only registered on 27 December, after the fire.',
    feedback: {
      orderWrong: 'The order is not right yet. Cards earlier than a card that depends on them have to come first.',
      orderRight: 'The order holds. Now: which card cannot be what it claims to be?',
      anomalyWrong: 'That card is consistent with the others. Look for a date that comes before the thing it describes.',
    },
    hints: [
      'Order the cards by the dates printed on them, earliest at the top.',
      'Once ordered, compare card D with card E. One says the dossier is registered, the other says when.',
      'The order is A, B, D, C, E. The anomaly is card D: its slip is dated 14 Nov, but the dossier was only registered on 27 Dec.',
    ],
    successText: 'A cover slip dated six weeks before the dossier existed. Somebody wrote it afterwards and dated it backwards.',
    rewards: { evidence: ['ev_backdated_slip'], flags: [] },
  },

  puzzle_star: {
    id: 'puzzle_star', name: 'Twelve Points', type: 'sequence', location: 'tower',
    requires: { evidence: ['ev_star_mechanism', 'ev_star_inscription'] },
    lockedMessage: 'I have not read the cornerstone inscription yet. The Star has to be set the way it was made to be set.',
    intro: 'Twelve points ring the Star, each marked with a month. Press them in the order the cornerstone inscription describes. A wrong press resets the sequence, nothing more.',
    points: [
      { id: 'p1', month: 1, label: 'JAN' }, { id: 'p2', month: 2, label: 'FEB' }, { id: 'p3', month: 3, label: 'MAR' },
      { id: 'p4', month: 4, label: 'APR' }, { id: 'p5', month: 5, label: 'MAY' }, { id: 'p6', month: 6, label: 'JUN' },
      { id: 'p7', month: 7, label: 'JUL' }, { id: 'p8', month: 8, label: 'AUG' }, { id: 'p9', month: 9, label: 'SEP' },
      { id: 'p10', month: 10, label: 'OCT' }, { id: 'p11', month: 11, label: 'NOV' }, { id: 'p12', month: 12, label: 'DEC' },
    ],
    // "Kindle December, then walk the year forward."
    solution: ['p12', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'],
    feedback: {
      wrong: 'The Star shivers and goes dark. The sequence resets.',
      progress: 'A point takes the press and glows. So far so good.',
    },
    hints: [
      'Reread the cornerstone rubbing in your journal. It says where the Star begins.',
      '"Kindle December, then walk the year forward." So the first point is the longest night.',
      'Press DEC first, then JAN, FEB, MAR and so on through the year, ending at NOV.',
    ],
    successText: 'The twelve points light one by one. The Star turns a quarter turn and a panel slides open at the twelfth point. The panel has a coin-shaped slot.',
    rewards: { evidence: [], flags: ['tower_star_open'] },
  },

  puzzle_toybox: {
    id: 'puzzle_toybox', name: 'The Box at Home', type: 'recognition', location: 'home',
    requires: { flags: ['knows_twelve_meaning'], evidence: ['ev_festival_photo'] },
    lockedMessage: 'There is nothing I know to look for here yet.',
    intro: 'Rowan\'s old toy box. In the photograph a small boy holds a copper plate stamped with a number. Which of these is the same plate?',
    items: [
      { id: 'tin_soldier', name: 'A tin soldier', note: 'Missing an arm. Not a plate.' },
      { id: 'brass_12', name: 'A brass plate stamped 12', note: 'The right number, but this is brass. The photo shows copper, dull and green at the edges.' },
      { id: 'copper_21', name: 'A copper plate stamped 21', note: 'Copper, but the digits are the wrong way round. The photo says 12.' },
      { id: 'copper_12', name: 'A copper plate stamped 12', note: 'Dull green at the edges. The same dent as in the photograph.' },
      { id: 'marbles', name: 'A bag of marbles', note: 'Not a plate.' },
    ],
    solution: 'copper_12',
    feedback: { wrong: 'Not that one. Compare it with the photograph again.' },
    hints: [
      'Look at the photograph in your journal. What is the boy holding?',
      'It is a small plate, not a toy. Check the metal and the number.',
      'The copper plate stamped 12. Not the brass one, and not 21.',
    ],
    successText: 'It is the same plate. A small dent in one corner. Rowan remembers a warm hand closing his fingers round it and a voice saying: "Keep this safe for me."',
    // Played by the puzzle UI right after the player solves it (a short memory scene).
    successNode: 'toybox_memory',
    rewards: { evidence: ['ev_plaque_12'], flags: ['plaque_12_found'] },
  },
};

export const PUZZLE_IDS = Object.freeze(Object.keys(PUZZLES));
