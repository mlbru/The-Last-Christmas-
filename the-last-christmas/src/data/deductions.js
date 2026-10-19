// Deduction relations, near-misses and confrontations.
// A relation is confirmed when the player links any one of its `pairs` on the board.
// Wrong or unrelated links only produce feedback; nothing here can block progress.

export const RELATIONS = {
  r_report_inventory: {
    id: 'r_report_inventory', core: true, line: 'A',
    label: 'The report and the inventory disagree',
    pairs: [['ev_fire_report', 'ev_inventory'], ['ev_fire_report', 'ev_backdated_slip']],
    conclusion: 'The fire report lists Dossier 0412 as destroyed. The inventory for the day of the fire stops at 0411. Either a dossier burned that was never on the books, or the books were changed afterwards.',
    sets: ['archive_discrepancy_found'], unlocks: ['conf_nora'],
  },
  r_recipe_report: {
    id: 'r_recipe_report', core: true, line: 'A',
    label: 'The baker was in the church that night',
    pairs: [['ev_recipe_book', 'ev_fire_report'], ['ev_receipt', 'ev_fire_report']],
    conclusion: 'The report says the church was locked and empty from 21:00. Margot\'s book and receipt put her, and the Committee, inside the annex until midnight.',
    sets: [], unlocks: ['conf_margot'],
  },
  r_missing_funds: {
    id: 'r_missing_funds', core: true, line: 'A',
    label: 'The lost dossiers were the money',
    pairs: [['ev_missing_list', 'ev_inventory'], ['ev_recipe_key', 'ev_missing_list'], ['ev_missing_list', 'ev_fire_report']],
    conclusion: 'The "lost" dossiers 0405 to 0412 were the Restoration Fund ledgers: 184,000 raised for the roof and the sprinklers. The money never reached the building, and the paper that could show it burned.',
    sets: ['fund_trail_found'], unlocks: [],
  },
  r_payments: {
    id: 'r_payments', core: true, line: 'B',
    label: 'The payments were a system',
    pairs: [['ev_eddie_ledger', 'ev_recipe_book'], ['ev_eddie_ledger', 'ev_receipt'], ['ev_eddie_ledger', 'ev_mayor_speech']],
    conclusion: 'Eddie\'s book and Margot\'s margins show the same yearly sum from the Committee, paid on the same date. Nobody was bribed once. They were kept comfortable for twenty-five years.',
    sets: ['payments_pattern_found'], unlocks: ['conf_eddie'],
  },
  r_statements_copied: {
    id: 'r_statements_copied', core: true, line: 'B',
    label: 'Two witnesses, one sentence',
    pairs: [['ev_silas_statement', 'ev_rowan_statement'], ['ev_silas_statement', 'ev_eddie_testimony']],
    conclusion: 'Silas and a seven-year-old gave the same sentence, down to the comma. Statements this exact were not remembered. They were dictated.',
    sets: ['statements_altered'], unlocks: ['conf_silas'],
  },
  r_speech_script: {
    id: 'r_speech_script', core: false, line: 'B',
    label: 'The mayor\'s speech is a script',
    pairs: [['ev_mayor_speech', 'ev_fire_report'], ['ev_mayor_speech', 'ev_silas_statement']],
    conclusion: 'The mayor\'s yearly speech repeats the report\'s phrasing word for word, and a pencilled line shows what must never be said aloud: the Fund.',
    sets: ['speech_script_found'], unlocks: [],
  },
  r_thomas_plan: {
    id: 'r_thomas_plan', core: false, line: 'B',
    label: 'Thomas planned to speak',
    pairs: [['ev_thomas_diary', 'ev_thomas_letter']],
    conclusion: 'Thomas visited Nora, Silas and Eddie in the days before he vanished, and wrote to Rowan. He planned to expose the truth on Christmas Eve, and he wanted Rowan to find it independently.',
    sets: ['thomas_plan_understood'], unlocks: [],
  },
  r_scarf_statement: {
    id: 'r_scarf_statement', core: false, line: 'C',
    label: 'The scarf was on the boy',
    pairs: [['ev_festival_photo', 'ev_rowan_statement']],
    conclusion: 'At 23:10 the red scarf was wrapped round Rowan. His statement identifies "the man in the red scarf" going into the archive at 23:40. The identification came from the question he was asked, not from what he saw.',
    sets: ['scarf_contradiction_found'], unlocks: [],
  },
  r_twelve_meaning: {
    id: 'r_twelve_meaning', core: false, line: 'C',
    label: 'The twelve means a plate',
    pairs: [['ev_festival_photo', 'ev_note_twelve']],
    conclusion: 'The boy in the photo holds a copper plate stamped 12. Thomas\'s note asks where plate twelve is. It was never lost. It was handed to a child.',
    sets: ['knows_twelve_meaning'], unlocks: [],
  },
  r_star_meaning: {
    id: 'r_star_meaning', core: false, line: 'C',
    label: 'The Star is a lock',
    pairs: [['ev_star_inscription', 'ev_note_twelve']],
    conclusion: 'The cornerstone says how the Star is meant to be kindled, and Thomas counts its plates. The Star has twelve points, and the twelfth is not an ornament.',
    sets: ['star_meaning_understood'], unlocks: [],
  },
  r_dossier_report: {
    id: 'r_dossier_report', core: false, line: 'A', final: true,
    label: 'The twelfth dossier against the report',
    pairs: [['ev_dossier_12', 'ev_fire_report']],
    conclusion: 'The dossier the report says burned is intact, and it is signed. The report was written to hide it.',
    sets: [], unlocks: [],
  },
  r_dossier_statement: {
    id: 'r_dossier_statement', core: false, line: 'C', final: true,
    label: 'The child\'s own words',
    pairs: [['ev_dossier_12', 'ev_rowan_statement'], ['ev_dossier_12', 'ev_silas_statement']],
    conclusion: 'The dossier holds a child\'s handwritten account that says something quite different. Rowan\'s typed statement was built over it. He was a witness the story could not afford to hear.',
    sets: ['rowan_role_understood'], unlocks: [],
  },
  r_elias_dossier: {
    id: 'r_elias_dossier', core: false, line: 'C', final: true,
    label: 'Where Elias hid the proof',
    pairs: [['ev_elias_letter', 'ev_dossier_12']],
    conclusion: 'Elias copied the twelfth ledger and hid it in the Star. What became of him that night, the evidence does not say. Only that he did not do what the report claims.',
    sets: [], unlocks: [],
  },
};

export const RELATION_IDS = Object.freeze(Object.keys(RELATIONS));
export const CORE_RELATIONS = Object.freeze(RELATION_IDS.filter((id) => RELATIONS[id].core));

// Pairs that are topically linked but do not form a confirmed relation yet.
export const NEAR_MISSES = [
  { pair: ['ev_fire_report', 'ev_eddie_testimony'], message: 'Both tell the official version of that night. One is a document, the other is a rumour. Where does each one come from?' },
  { pair: ['ev_eddie_ledger', 'ev_thomas_diary'], message: 'Thomas visited Eddie, and Eddie keeps books. Something is near here, but these two alone do not say why.' },
  { pair: ['ev_rowan_statement', 'ev_eddie_testimony'], message: 'Two accounts of the same night. Read them side by side.' },
  { pair: ['ev_thomas_diary', 'ev_note_twelve'], message: 'Thomas wrote both, but one is a schedule and one is a question. They do not answer each other yet.' },
  { pair: ['ev_inventory', 'ev_recipe_book'], message: 'The archive and the bakery are very different places. What would connect them?' },
];

// Shown when a conclusion cannot be reached yet: which piece of the picture is missing.
export const MISSING_REASONS = {
  r_report_inventory: 'You need both the official account of the fire and a record of what the archive actually held.',
  r_recipe_report: 'You need the baker\'s own records and the official account of that night.',
  r_missing_funds: 'You do not yet know what was in the lost dossiers.',
  r_payments: 'You do not yet know who was being paid, and by whom.',
  r_statements_copied: 'You need two witness statements to compare.',
  r_speech_script: 'You need the mayor\'s speech and a document to check it against.',
  r_thomas_plan: 'You need more of what Thomas left behind.',
  r_scarf_statement: 'You need the photograph and the statement that mentions the scarf.',
  r_twelve_meaning: 'You need the photograph and whatever Thomas wrote about the number twelve.',
  r_star_meaning: 'You need the Star\'s inscription and Thomas\'s counting.',
  r_dossier_report: 'You do not yet have the twelfth dossier.',
  r_dossier_statement: 'You do not yet have the twelfth dossier.',
  r_elias_dossier: 'You do not yet have the twelfth dossier.',
};

export const CONFRONTATIONS = {
  conf_nora: {
    id: 'conf_nora', character: 'nora', location: 'archive', requiresRelation: 'r_report_inventory',
    claim: 'Your inventory stops at 0411. The report says 0412 burned. Show her which record proves the books were changed.',
    answers: {
      ev_inventory: { result: 'correct', reply: 'Nora takes it from you and does not argue. "Page nine. I retyped page nine. I was twenty-two."' },
      ev_backdated_slip: { result: 'correct', reply: 'She stares at the dates. "Backdated. Of course it was. I was only ever shown the typing."' },
      ev_fire_report: { result: 'partial', reply: '"That\'s what the report says. It doesn\'t show what I did. Show me my own page."' },
      ev_missing_list: { result: 'partial', reply: '"Yes, things are missing. That\'s a list of what. Not of why."' },
    },
    defaultReply: '"That\'s interesting, but it isn\'t what I\'m being asked about, is it?"',
    hints: ['Think about which document is hers: the one she maintains.', 'The inventory is her page. The report is someone else\'s. Put hers on the table.'],
    reward: { flags: ['nora_confronted'], evidence: ['ev_thomas_letter'], node: 'nora_confession' },
  },
  conf_margot: {
    id: 'conf_margot', character: 'margot', location: 'bakery', requiresRelation: 'r_recipe_report',
    claim: 'The report says the church was empty from 21:00. Margot\'s own pages say she was in the annex. Show her what puts her there.',
    answers: {
      ev_recipe_book: { result: 'correct', reply: 'Margot wipes her hands. "It\'s all in there, isn\'t it. I couldn\'t burn it. It was my mother\'s."' },
      ev_receipt: { result: 'correct', reply: '"Fourteen trays," she says quietly. "Paid from the Fund. I should have known better."' },
      ev_fire_report: { result: 'partial', reply: '"Reports say what they like. Show me what makes it a lie."' },
      ev_recipe_key: { result: 'partial', reply: '"You worked that out? Good for you. But that\'s about the dossier. Not about me."' },
    },
    defaultReply: '"Dear, I\'m not sure what that has to do with my oven."',
    hints: ['Margot trusts what she wrote down herself.', 'Her own book and the receipt in the tin both put her there.'],
    reward: { flags: ['margot_confronted'], evidence: [], node: 'margot_confession' },
  },
  conf_eddie: {
    id: 'conf_eddie', character: 'eddie', location: 'inn', requiresRelation: 'r_payments',
    claim: '1,200 every 24 December since 2001, from the Committee. Show Eddie the page that says it.',
    answers: {
      ev_eddie_ledger: { result: 'correct', reply: 'Eddie closes his eyes. "Cellar door. The new boiler. I never asked who the Committee was paying me for."' },
      ev_recipe_book: { result: 'partial', reply: '"Margot gets paid too? That doesn\'t prove I did anything."' },
      ev_receipt: { result: 'partial', reply: '"That\'s Margot\'s. I want to see mine."' },
      ev_mayor_speech: { result: 'partial', reply: '"Harold\'s speech. I know the speech. Show me the money."' },
    },
    defaultReply: '"I pour pints, Rowan. I don\'t follow that."',
    hints: ['It is Eddie\'s money. Show him Eddie\'s record.', 'The cash book from behind the bar. The one with the allowance.'],
    reward: { flags: ['eddie_confronted', 'thomas_hiding_known'], evidence: [], node: 'eddie_confession' },
  },
  conf_silas: {
    id: 'conf_silas', character: 'silas', location: 'archive', requiresRelation: 'r_statements_copied',
    claim: 'Your statement and Rowan\'s say the same sentence, comma and all. Show Silas the document that is his.',
    answers: {
      ev_silas_statement: { result: 'correct', reply: 'Silas looks at the pencil line under the typing. "I wrote that. At the bottom. I kept it for twenty-five years."' },
      ev_rowan_statement: { result: 'correct', reply: '"You were a child. They put words in your mouth the same as mine."' },
      ev_eddie_testimony: { result: 'partial', reply: '"Eddie says what Eddie was told to say. That doesn\'t make mine."' },
    },
    defaultReply: '"That\'s not what I\'m ashamed of."',
    hints: ['Silas kept something. Think about the carbon copy.', 'His own statement, the one with the pencil note, is the one that moves him.'],
    reward: { flags: ['silas_confronted'], evidence: [], node: 'silas_confession' },
  },
};

export const CONFRONTATION_IDS = Object.freeze(Object.keys(CONFRONTATIONS));
