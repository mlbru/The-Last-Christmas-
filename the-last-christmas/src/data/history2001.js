// The story Bellwether tells about Christmas Eve 2001: the newspaper cold open shown before a new game,
// and the official claims the journal tracks as the player disproves them. Written as the town
// believed it in 2001, so it gives the player the frame without spoiling what the evidence shows.

export const PROLOGUE = {
  masthead: 'The Bellwether Courier',
  dateline: 'Thursday 27 December 2001',
  headline: 'Archive fire on Christmas Eve: clerk blamed',
  paragraphs: [
    'Fire tore through the east wing of the church archive late on Christmas Eve, an hour after the town gathered on the square to see the Christmas Star lit.',
    'The official report, published yesterday, finds that faulty wiring in the Star\'s lights and a lantern carried into the archive started the blaze. The church had been locked and empty since nine o\'clock.',
    'Witnesses saw archive clerk Elias Wren, "the man in the red scarf", carry the lantern inside. Mr Wren has not been found and is presumed lost in the fire.',
    'Twelve dossiers of Restoration Fund records, numbered 0401 to 0412, were destroyed.',
    '"A terrible accident and a careless man," said festival committee chairman Harold Voss. "Bellwether will rebuild. That is what Bellwether does."',
  ],
  after: [
    'Twenty-five years later.',
    'Every Christmas Eve since, the town has repeated that story from the ceremony stage, word for word. Nobody has ever asked to see the file.',
    'Two days ago, the festival organiser, Thomas Bell, went missing.',
  ],
};

/** Each official claim and the deductions (relation ids) that contradict it, with what each one shows. */
export const OFFICIAL_CLAIMS = [
  {
    id: 'claim_locked',
    claim: 'The church was locked and empty from nine o\'clock.',
    disprovedBy: { r_recipe_report: 'Margot delivered fourteen trays to the Church Annex at 21:05, and her margins put people inside long after nine.' },
  },
  {
    id: 'claim_witnesses',
    claim: 'Witnesses saw the man in the red scarf carry a lantern into the archive.',
    disprovedBy: {
      r_statements_copied: 'Two "independent" statements share one sentence, word for word. One witness pencilled underneath that he saw no lantern.',
      r_scarf_statement: 'The festival photograph puts the red scarf around a small boy at 23:10, not on a man with a lantern.',
      r_dossier_statement: 'The child\'s own handwritten account says the man in the red scarf led him out of the church.',
    },
  },
  {
    id: 'claim_dossiers',
    claim: 'Restoration Fund dossiers 0401 to 0412 burned in the fire.',
    disprovedBy: {
      r_report_inventory: 'The archive\'s own inventory never held a dossier 0412, and its paperwork was dated backwards after the fire.',
      r_dossier_report: 'Dossier 0412 did not burn. It was hidden inside the Star.',
    },
  },
  {
    id: 'claim_paper',
    claim: 'Nothing was lost that night but old paper.',
    disprovedBy: { r_missing_funds: 'The lost dossiers were the Restoration Fund itself: the money raised for the church roof and the archive sprinklers.' },
  },
  {
    id: 'claim_committee',
    claim: 'The committee has looked after Bellwether ever since.',
    disprovedBy: {
      r_payments: 'Every Christmas since 2001 the committee has quietly paid the people who remember that night.',
      r_speech_script: 'The mayor\'s speech about the fire is the same script every year, down to the comma.',
    },
  },
  {
    id: 'claim_elias',
    claim: 'Elias Wren started the fire and died in it.',
    disprovedBy: { r_elias_dossier: 'Elias copied the ledger and hid the proof. Nothing shows that he lit the fire. What happened to him is still unknown.' },
  },
];
