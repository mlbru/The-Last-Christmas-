// Characters. `look` drives the procedural pixel-art generator (sprites + portraits).
// `journal` entries appear in the Persons tab and grow as the player learns more.

export const CHARACTERS = {
  rowan: {
    id: 'rowan', name: 'Rowan Hale', role: 'Detective', age: 31, home: 'square',
    look: { skin: '#e8b996', hair: '#3b2a20', coat: '#2f4a6b', trim: '#d9d2c0', hat: null, scarf: '#a3302b' },
    journal: [
      { text: 'Local detective. Thirty-one. Grew up in Bellwether and never quite left.' },
      { when: { flag: 'police_record_found' }, text: 'My own statement from 2001 is in the files. I do not remember giving it.' },
      { when: { flag: 'rowan_role_understood' }, text: 'I was seven. Somebody asked me a leading question and wrote down the answer they wanted.' },
    ],
  },
  thomas: {
    id: 'thomas', name: 'Thomas Bell', role: 'Festival organiser (missing)', age: 58, home: 'office',
    look: { skin: '#d9a883', hair: '#8a8a8a', coat: '#6b3a2a', trim: '#e0b24a', hat: 'flat', scarf: '#2d5a3d' },
    journal: [
      { text: 'Organised the Bellwether Christmas Festival for twenty years. Missing since the 21st.' },
      { when: { flag: 'thomas_office_searched' }, text: 'His desk shows a man who was afraid, and organised about it.' },
      { when: { flag: 'thomas_plan_understood' }, text: 'He meant to speak on Christmas Eve, and he wanted me to find the proof first.' },
      { when: { flag: 'thomas_hiding_known' }, text: 'He is not a victim. He hid by choice, and he is close.' },
    ],
  },
  eddie: {
    id: 'eddie', name: 'Eddie Marsh', role: 'Landlord, The Holly Inn', age: 61, home: 'inn',
    look: { skin: '#e2a98a', hair: '#7a4b2a', coat: '#8c2f2f', trim: '#e8d9a8', hat: null, scarf: null, apron: '#e9e4d6' },
    journal: [
      { text: 'Runs the Holly Inn. Knows everyone\'s business and shares most of it.' },
      { when: { flag: 'eddie_statement_heard' }, text: 'Says the whole town "just knows" Elias started the fire. Cannot say who told him.' },
      { when: { flag: 'eddie_confronted' }, text: 'Took a yearly Committee allowance. Called it a festival grant. Never asked why.' },
    ],
  },
  margot: {
    id: 'margot', name: 'Margot Finch', role: 'Baker', age: 64, home: 'bakery',
    look: { skin: '#eab99a', hair: '#cfcfcf', coat: '#c7a46b', trim: '#ffffff', hat: 'cap', scarf: null, apron: '#f2efe6' },
    journal: [
      { text: 'Baker. Her gingerbread is the festival\'s second-most-loved tradition.' },
      { when: { flag: 'bakery_ledger_found' }, text: 'Her recipe book has notes in the margin that are not about baking.' },
      { when: { flag: 'margot_confronted' }, text: 'Catered the Committee in the church annex that night. Delivered fourteen trays and one lie.' },
    ],
  },
  silas: {
    id: 'silas', name: 'Silas Crane', role: 'Bell-ringer, former night watchman', age: 79, home: 'archive',
    look: { skin: '#d9a98a', hair: '#e8e8e8', coat: '#4a4a52', trim: '#7a7a85', hat: 'wool', scarf: '#8a6a3a' },
    journal: [
      { text: 'Rings the church bells. Night watchman in 2001. Speaks slowly and watches the door.' },
      { when: { evidence: 'ev_silas_statement' }, text: 'Kept a carbon copy of his statement. Why would a man keep that?' },
      { when: { flag: 'silas_confronted' }, text: 'Signed what he was handed. Has carried the difference for twenty-five years.' },
    ],
  },
  nora: {
    id: 'nora', name: 'Nora Quill', role: 'Archivist', age: 47, home: 'archive',
    look: { skin: '#f0c4a4', hair: '#5a2f3a', coat: '#44556e', trim: '#d8cfa8', hat: null, scarf: null, glasses: true },
    journal: [
      { text: 'Archivist of Bellwether. Careful, quick, and always three sentences ahead of the question.' },
      { when: { flag: 'archive_discrepancy_found' }, text: 'Her inventory stops at 0411. The report mentions 0412.' },
      { when: { flag: 'nora_confronted' }, text: 'Retyped the inventory at twenty-two, because a senior clerk told her it was tidying.' },
    ],
  },
  voss: {
    id: 'voss', name: 'Mayor Harold Voss', role: 'Mayor, chair of the Christmas Committee', age: 72, home: 'square',
    look: { skin: '#e6b496', hair: '#d8d8d8', coat: '#2e2a3a', trim: '#c9a040', hat: 'top', scarf: '#c9a040' },
    journal: [
      { text: 'Mayor for thirty years. Chairs the Christmas Committee. Gives the same speech every Christmas Eve.' },
      { when: { flag: 'speech_script_found' }, text: 'His speech is not memory. It is a script, and it has been edited.' },
    ],
  },
  pruitt: {
    id: 'pruitt', name: 'Sergeant Dale Pruitt', role: 'Desk sergeant', age: 55, home: 'police',
    look: { skin: '#d7a283', hair: '#3a3a3a', coat: '#27384f', trim: '#c0c0c8', hat: 'cap', scarf: null },
    journal: [
      { text: 'Rowan\'s desk sergeant. Dry, loyal, mostly interested in lunch.' },
    ],
  },
  elias: {
    id: 'elias', name: 'Elias Wren', role: 'Assistant clerk (disappeared 2001)', age: null, home: null,
    look: { skin: '#e1ac8a', hair: '#4b3322', coat: '#3a4a3a', trim: '#cccccc', hat: null, scarf: '#a3302b' },
    journal: [
      { text: 'Assistant clerk at the archive. Officially: the man who started the fire and vanished in it.' },
      { when: { evidence: 'ev_festival_photo' }, text: 'In the photo he is wrapping his red scarf around a child. He does not look like an arsonist.' },
      { when: { evidence: 'ev_elias_letter' }, text: 'He found out about the Fund. His last letter breaks off mid-sentence. What happened next stays uncertain.' },
    ],
  },
  ruth: {
    id: 'ruth', name: 'Ruth Hale', role: 'Rowan\'s mother', age: 68, home: null,
    look: { skin: '#eab99a', hair: '#9a9a9a', coat: '#6b5a7a', trim: '#e0d8c0', hat: null, scarf: null },
    journal: [
      { text: 'Lives at Marlowe Court now. The house on Fernbrook Lane is as she left it. She never wanted to talk about that night.' },
    ],
  },
};

export const CHARACTER_IDS = Object.freeze(Object.keys(CHARACTERS));
