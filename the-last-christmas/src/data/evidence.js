// Every piece of evidence. `essential` items are required for the main story and are always
// obtainable through fixed, repeatable interactions (see interactions.js).

export const EVIDENCE = {
  // ---- Prologue: Thomas Bell's office -------------------------------------
  ev_note_twelve: {
    id: 'ev_note_twelve', name: 'Note: "Twelve points"', type: 'document', icon: 'note',
    foundIn: 'office', source: 'Thomas Bell\'s blotter', essential: true,
    description: 'A torn scrap in Thomas\'s handwriting: "Eleven plates on the Star. Where is twelve? Ask the one who kept the photograph."',
  },
  ev_thomas_diary: {
    id: 'ev_thomas_diary', name: 'Thomas\'s appointment book', type: 'document', icon: 'book',
    foundIn: 'office', source: 'Thomas Bell\'s desk drawer', essential: true,
    description: 'Dec 20: Nora, the inventory. Dec 21: Silas (refused). Dec 22: Eddie, cellar. Dec 23: tower, midnight. Dec 24: the ceremony. "Tell her." The last two words are underlined twice.',
  },
  // ---- Square ---------------------------------------------------------------
  ev_mayor_speech: {
    id: 'ev_mayor_speech', name: 'The mayor\'s speech', type: 'document', icon: 'paper',
    foundIn: 'square', source: 'The ceremony podium', essential: true,
    description: 'Typed pages for this year\'s Christmas Eve speech. The paragraph on the 2001 fire is word for word the same as last year\'s. Pencilled over a crossed-out line: "never mention the Fund".',
  },
  // ---- Holly Inn ------------------------------------------------------------
  ev_eddie_ledger: {
    id: 'ev_eddie_ledger', name: 'Eddie\'s cash book', type: 'document', icon: 'ledger',
    foundIn: 'inn', source: 'Behind the bar at the Holly Inn', essential: true,
    description: 'Every 24 December since 2001 the inn receives "Festival allowance, Committee" of exactly 1,200. Rent, repairs and a new cellar door were all paid from it.',
  },
  ev_festival_photo: {
    id: 'ev_festival_photo', name: 'Photo: the 2001 festival', type: 'photo', icon: 'photo',
    foundIn: 'inn', source: 'The wall of the Holly Inn', essential: true,
    description: 'A man in a red scarf kneels and wraps it round a small boy. The boy holds a copper plate stamped with a 12. Time stamped on the print: 23:10, Christmas Eve 2001. The boy is Rowan.',
  },
  ev_eddie_testimony: {
    id: 'ev_eddie_testimony', name: 'Eddie\'s account', type: 'testimony', icon: 'speech',
    foundIn: 'inn', source: 'Conversation with Eddie Marsh', essential: true,
    description: 'Eddie "saw" Elias carry a lantern into the archive and "heard" the Star lights crackle. When pressed, he cannot say whether he saw it or was told it.',
  },
  // ---- Bakery ---------------------------------------------------------------
  ev_recipe_book: {
    id: 'ev_recipe_book', name: 'Margot\'s recipe book', type: 'document', icon: 'book',
    foundIn: 'bakery', source: 'Under the counter at Margot\'s bakery', essential: true,
    description: 'Gingerbread, stollen, shortbread. The margins carry times, numbers and the initials H.V., E.M., S.C. Some recipes were baked at hours no bakery keeps.',
  },
  ev_receipt: {
    id: 'ev_receipt', name: 'Receipt, 24 Dec 2001', type: 'document', icon: 'receipt',
    foundIn: 'bakery', source: 'Tin box by the till', essential: false,
    description: '"14 trays gingerbread, delivered Church Annex 21:05. Paid: Committee Fund." The annex is the room next to the archive.',
  },
  ev_recipe_key: {
    id: 'ev_recipe_key', name: 'The recipe\'s hidden number', type: 'document', icon: 'key',
    foundIn: 'bakery', source: 'Puzzle: The Baker\'s Recipe', essential: false,
    description: 'The three margin notes that contradict the official timeline read 4, 1, 2: Dossier 0412, the very dossier the fire report says burned.',
  },
  ev_margot_testimony: {
    id: 'ev_margot_testimony', name: 'Margot\'s account', type: 'testimony', icon: 'speech',
    foundIn: 'bakery', source: 'Conversation with Margot Finch', essential: false,
    description: 'Margot remembers the smell of smoke and the Mayor on the church steps in a clean coat. Everything else she "just knows".',
  },
  // ---- Police station -------------------------------------------------------
  ev_fire_report: {
    id: 'ev_fire_report', name: 'Official fire report', type: 'document', icon: 'report',
    foundIn: 'police', source: 'Filing cabinet, police station', essential: true,
    description: 'Dated 26 Dec 2001. Cause: faulty Star lights. Lost: "Restoration Fund dossiers 0401 to 0412". Church "locked and empty from 21:00". Elias Wren "presumed lost in the fire".',
  },
  ev_rowan_statement: {
    id: 'ev_rowan_statement', name: 'Rowan\'s statement, 2001', type: 'document', icon: 'statement',
    foundIn: 'police', source: 'Filing cabinet, police station', essential: true,
    description: 'Witness: R. Hale, age 7. "I saw the man in the red scarf carry the lantern into the archive." Typed, signed with a child\'s block letters. The phrase is not a seven-year-old\'s.',
  },
  // ---- Archive / church -----------------------------------------------------
  ev_inventory: {
    id: 'ev_inventory', name: 'Archive inventory', type: 'document', icon: 'ledger',
    foundIn: 'archive', source: 'Nora\'s desk', essential: true,
    description: 'Inventory "as of 24 Dec 2001". Restoration Fund dossiers are listed 0401 to 0411. There is no 0412. The typeface of the last page differs from the rest.',
  },
  ev_missing_list: {
    id: 'ev_missing_list', name: 'Register of lost financial dossiers', type: 'document', icon: 'paper',
    foundIn: 'archive', source: 'The ledger shelf', essential: true,
    description: 'The financial dossiers lost in the fire are 0405 to 0412. Together they were the Restoration Fund, 184,000 raised for the church roof and the archive sprinklers.',
  },
  ev_star_inscription: {
    id: 'ev_star_inscription', name: 'Rubbing: the Star inscription', type: 'object', icon: 'rubbing',
    foundIn: 'archive', source: 'The church cornerstone', essential: true,
    description: 'Cut into the cornerstone: "From the longest night the Star remembers. Kindle December, then walk the year forward."',
  },
  ev_backdated_slip: {
    id: 'ev_backdated_slip', name: 'Backdated cover slip, Dossier 0412', type: 'document', icon: 'paper',
    foundIn: 'archive', source: 'Puzzle: The Missing Record', essential: false,
    description: 'The cover slip for Dossier 0412 is dated 14 Nov 2001. The dossier was only formally registered on 27 Dec 2001, after the fire. Someone wrote the paperwork afterwards and dated it backwards.',
  },
  ev_silas_statement: {
    id: 'ev_silas_statement', name: 'Silas\'s statement (carbon copy)', type: 'document', icon: 'statement',
    foundIn: 'archive', source: 'Given by Silas Crane', essential: true,
    description: '"I saw the man in the red scarf carry the lantern into the archive." The sentence matches Rowan\'s statement exactly, down to the comma. Beneath the typed text, faint pencil: "I did not see a lantern."',
  },
  ev_thomas_letter: {
    id: 'ev_thomas_letter', name: 'Thomas\'s letter to Rowan', type: 'document', icon: 'letter',
    foundIn: 'archive', source: 'Given by Nora Quill', essential: true,
    description: '"Rowan, you were seven. Nobody asked what you saw; they asked what you agreed with. I will tell the town on Christmas Eve. I need you to find it yourself first, or you will think it is only my word."',
  },
  // ---- Rowan's childhood home ------------------------------------------------
  ev_plaque_12: {
    id: 'ev_plaque_12', name: 'Copper plaque numbered 12', type: 'object', icon: 'plaque',
    foundIn: 'home', source: 'Rowan\'s old toy box', essential: true,
    description: 'A small copper plate stamped 12, the twelfth plate of the Christmas Star. It was pressed into a child\'s hand on the night of the fire.',
  },
  ev_crayon_drawing: {
    id: 'ev_crayon_drawing', name: 'Rowan\'s crayon drawing', type: 'object', icon: 'drawing',
    foundIn: 'home', source: 'Rowan\'s old toy box', essential: false,
    description: 'A child\'s drawing of the church at night. Tall figures carry boxes OUT of a door. One small figure in red stands apart. The sky is orange behind them.',
  },
  // ---- Bell tower -----------------------------------------------------------
  ev_star_mechanism: {
    id: 'ev_star_mechanism', name: 'The Star\'s mechanism', type: 'object', icon: 'star',
    foundIn: 'tower', source: 'The Christmas Star, bell tower', essential: true,
    description: 'Twelve points, each with a press-plate. Eleven plates are fixed. The twelfth point is blank, with a coin-shaped slot. The plates must be pressed in the right order.',
  },
  ev_elias_letter: {
    id: 'ev_elias_letter', name: 'Elias\'s unfinished letter', type: 'document', icon: 'letter',
    foundIn: 'tower', source: 'Behind the Star\'s casing', essential: true,
    description: '"If anyone finds this: the Fund never reached the roof. I have copied the twelfth ledger and I am going to hide it where nobody will think to... " It stops mid-sentence. What happened to him stays unknown.',
  },
  ev_dossier_12: {
    id: 'ev_dossier_12', name: 'The twelfth dossier', type: 'document', icon: 'dossier',
    foundIn: 'tower', source: 'Hidden compartment, twelfth point of the Star', essential: true,
    description: 'The original Restoration Fund ledger 0412 with signatures of the Committee, and the handwritten original of a child\'s account of that night. It proves the fraud and the altered statements. It does not say what happened to Elias.',
  },
};

export const EVIDENCE_IDS = Object.freeze(Object.keys(EVIDENCE));
export const ESSENTIAL_EVIDENCE = Object.freeze(EVIDENCE_IDS.filter((id) => EVIDENCE[id].essential));

export function isValidEvidence(id) {
  return Object.prototype.hasOwnProperty.call(EVIDENCE, id);
}
