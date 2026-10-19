// Rowan's own voice: discoveries, memories and the quiet moments between conversations.
// These are used by interactions (see data/interactions.js) via `action: { node: '...' }`.

export const nodes = {
  // ----- Thomas Bell's office ------------------------------------------------
  office_enter: {
    speaker: 'narrator', end: true,
    text: "Thomas Bell's office smells of cold tea and pencil shavings. Everything is tidy in the way of a man who tidied for someone else's sake.",
  },
  find_note_twelve: {
    speaker: 'rowan', next: 'find_note_twelve_2',
    text: "A torn scrap on the blotter, in Thomas's hurried hand: 'Eleven plates on the Star. Where is twelve? Ask the one who kept the photograph.'",
    effects: { evidence: ['ev_note_twelve'] },
  },
  find_note_twelve_2: {
    speaker: 'rowan', end: true,
    text: "The Star has twelve points. I've looked at it every Christmas of my life and never once counted.",
  },
  find_diary: {
    speaker: 'rowan', next: 'find_diary_2',
    text: "His appointment book. Dec 20: Nora, the inventory. Dec 21: Silas (refused). Dec 22: Eddie, cellar. Dec 23: tower, midnight. Dec 24: the ceremony. Beneath it, underlined twice: 'Tell her.'",
    effects: { evidence: ['ev_thomas_diary'] },
  },
  find_diary_2: {
    speaker: 'rowan', end: true,
    text: "Tell who? He visited three people and refused himself a fourth. This isn't a man who vanished. It's a man who has a schedule.",
  },

  // ----- Square --------------------------------------------------------------
  find_speech: {
    speaker: 'rowan', next: 'find_speech_2',
    text: "The mayor's speech, typed and waiting on the podium. The paragraph about the fire is word for word what he said last year. Over a crossed-out line, in pencil: 'never mention the Fund'.",
    effects: { evidence: ['ev_mayor_speech'] },
  },
  find_speech_2: {
    speaker: 'rowan', end: true,
    text: "What fund? Nobody has ever mentioned a fund. Which, I'm beginning to think, was the idea.",
  },

  // ----- Holly Inn -----------------------------------------------------------
  find_ledger: {
    speaker: 'rowan', next: 'find_ledger_2',
    text: "Eddie's cash book, behind the bar. Every 24 December since 2001: 'Festival allowance, Committee. 1,200.' Rent, repairs, a new cellar door.",
    effects: { evidence: ['ev_eddie_ledger'] },
  },
  find_ledger_2: {
    speaker: 'rowan', end: true,
    text: "A grant that arrives like clockwork, paid for twenty-five years and never mentioned. That is not a grant. That is a habit.",
  },
  find_photo: {
    speaker: 'rowan', next: 'find_photo_2',
    text: "Among the framed faces on the wall: a photograph from the 2001 festival. A man in a red scarf kneels, winding it around a small boy. The boy holds something to his chest. The print is stamped 23:10.",
    effects: { evidence: ['ev_festival_photo'] },
  },
  find_photo_2: {
    speaker: 'rowan', mood: 'shocked', end: true,
    text: "The boy is me. I'm almost certain. I don't remember the scarf. I don't remember the plate, either, and the number on it is twelve.",
  },

  // ----- Bakery --------------------------------------------------------------
  find_recipe_book: {
    speaker: 'rowan', next: 'find_recipe_book_2',
    text: "Under the counter, between a tin of cloves and a prayer card: a cloth-bound recipe book. The margins are crowded with numbers, times and three sets of initials.",
    effects: { evidence: ['ev_recipe_book'] },
  },
  find_recipe_book_2: {
    speaker: 'rowan', end: true,
    text: "Nobody bakes at 23:40. Nobody writes 'H.V.' next to a gingerbread, either.",
  },
  find_receipt: {
    speaker: 'rowan', end: true,
    text: "A tin by the till, full of old receipts. One from 24 December 2001: '14 trays gingerbread, delivered Church Annex 21:05. Paid: Committee Fund.' The annex is the room next to the archive.",
    effects: { evidence: ['ev_receipt'] },
  },

  // ----- Police station ------------------------------------------------------
  find_fire_report: {
    speaker: 'rowan', next: 'find_fire_report_2',
    text: "The official fire report, dated 26 December 2001. Cause: faulty Star lights. Lost: 'Restoration Fund dossiers 0401 to 0412'. The church 'locked and empty from 21:00'. Elias Wren 'presumed lost in the fire'.",
    effects: { evidence: ['ev_fire_report'] },
  },
  find_fire_report_2: {
    speaker: 'rowan', end: true,
    text: "Efficient, for a disaster. Four lines to end a man's life and a whole financial year.",
  },
  find_rowan_statement: {
    speaker: 'rowan', mood: 'shocked', next: 'find_rowan_statement_2',
    text: "Witness: R. Hale, age 7. 'I saw the man in the red scarf carry the lantern into the archive.' Typed. Signed in a child's careful block letters.",
    effects: { evidence: ['ev_rowan_statement'] },
  },
  find_rowan_statement_2: {
    speaker: 'rowan', mood: 'shocked', end: true,
    text: "I don't remember giving this. And I know that phrasing isn't a seven-year-old's. Somebody typed it, and I signed it.",
  },

  // ----- Church and archive --------------------------------------------------
  find_inventory: {
    speaker: 'rowan', next: 'find_inventory_2',
    text: "The inventory 'as of 24 Dec 2001'. Restoration Fund dossiers 0401 to 0411. There is no 0412. The last page is in a slightly different typeface.",
    effects: { evidence: ['ev_inventory'] },
  },
  find_inventory_2: {
    speaker: 'rowan', end: true,
    text: "One number short, and one page that doesn't match. In a record this orderly that is practically a shout.",
  },
  find_missing_list: {
    speaker: 'rowan', end: true,
    text: "A register of the financial dossiers lost in the fire: 0405 to 0412. Together they were the Restoration Fund, 184,000 raised for the church roof and the archive sprinklers.",
    effects: { evidence: ['ev_missing_list'] },
  },
  find_cornerstone: {
    speaker: 'rowan', end: true,
    text: "A rubbing of the cornerstone's inscription: 'From the longest night the Star remembers. Kindle December, then walk the year forward.'",
    effects: { evidence: ['ev_star_inscription'] },
  },
  tower_chain_cut: {
    speaker: 'rowan', end: true,
    text: "I have enough now to stop pretending this is a safety matter. The chain comes away with a tired clink, and the sign swings quietly against the door.",
    effects: { flags: ['tower_visited'] },
  },

  // ----- Bell tower ----------------------------------------------------------
  tower_enter: {
    speaker: 'narrator', end: true,
    text: "The stairs wind up through the dark. Halfway up, a folded blanket and an empty thermos sit on a step. Somebody has been living up here.",
    effects: { flags: ['thomas_hiding_known'] },
  },
  find_star: {
    speaker: 'rowan', next: 'find_star_2',
    text: "The Christmas Star. Twelve points of copper and glass, bigger than I remembered, and cold. Each point has a small press-plate stamped with a month.",
    effects: { evidence: ['ev_star_mechanism'] },
  },
  find_star_2: {
    speaker: 'rowan', end: true,
    text: "Eleven of the plates are fixed. The twelfth point has a blank face and a coin-shaped slot. It was not built to be pressed with a finger.",
  },
  find_elias_letter: {
    speaker: 'rowan', mood: 'sad', next: 'find_elias_letter_2',
    text: "A recess behind the Star's casing. One folded page. 'If anyone finds this: the Fund never reached the roof. I have copied the twelfth ledger and I am going to hide it where nobody will think to...'",
    effects: { evidence: ['ev_elias_letter'] },
  },
  find_elias_letter_2: {
    speaker: 'rowan', mood: 'sad', end: true,
    text: "It stops mid-sentence. Elias Wren sat here, or somewhere like it, and wrote that down. I don't know what happened next. I'm not sure anyone does.",
  },
  find_dossier: {
    speaker: 'narrator', next: 'find_dossier_2',
    text: "The copper plate fits the twelfth point exactly. The Star turns a quiet quarter turn, and a hidden compartment slides open.",
    effects: { evidence: ['ev_dossier_12'] },
  },
  find_dossier_2: {
    speaker: 'rowan', mood: 'shocked', next: 'find_dossier_3',
    text: "A leather folder. Inside: Restoration Fund ledger 0412, with the Committee's signatures, every one of them. And clipped behind it, a child's handwritten account.",
  },
  find_dossier_3: {
    speaker: 'rowan', mood: 'shocked', next: 'find_dossier_4',
    text: "'The man with the red scarf took me out the front door. He gave me a shiny number and said go and find Mum. Then there was a bang and the sky went orange. I did not see where he went.'",
  },
  find_dossier_4: {
    speaker: 'rowan', mood: 'sad', end: true,
    text: "That is my handwriting at seven. It says something quite different from the statement I signed. It does not say what happened to Elias. It never will. But the story I was given was a lie.",
  },
  tower_thomas_note: {
    speaker: 'rowan', end: true,
    text: "A note tucked under the thermos: 'Rowan, if you are reading this, you found the Star. Do not look for me before dusk. I have to be seen arriving. Bring what you find. T.'",
    effects: { flags: ['thomas_plan_understood', 'thomas_hiding_known'] },
  },

  // ----- Childhood home ------------------------------------------------------
  home_enter: {
    speaker: 'narrator', end: true,
    text: "Fernbrook Lane. The house is exactly as Mum left it, down to the hallway clock, which has been four minutes slow since before I could read it.",
  },
  toybox_memory: {
    speaker: 'rowan', mood: 'sad', next: 'toybox_memory_2',
    text: "The plate is cold and heavier than I expected. I remember a warm hand closing my fingers round it, and a voice. 'Keep this safe for me.' His scarf was around my neck. I remember being warm.",
  },
  toybox_memory_2: {
    speaker: 'rowan', mood: 'sad', end: true,
    text: "Twenty-five years, and I kept it. Without knowing what I was keeping. Mum must have put it back in the box.",
  },
  find_drawing: {
    speaker: 'rowan', end: true,
    text: "At the bottom of the box, a crayon drawing of the church at night. Tall figures carry boxes OUT of a door. One small figure in red stands apart. The sky is orange behind them.",
    effects: { evidence: ['ev_crayon_drawing'] },
  },
};

export const conversations = {};
