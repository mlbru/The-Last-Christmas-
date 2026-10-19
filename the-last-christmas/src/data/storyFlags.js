// Central list of every story flag in the game. WorldState refuses unknown flags,
// and SaveSystem drops unknown flags on load, so typos can never silently break progress.

export const FLAGS = {
  // --- Flags named in the design document -----------------------------------
  intro_complete: 'The introduction is over; free exploration begins.',
  thomas_office_searched: 'Thomas Bell\'s office has been searched; the first case clues are available.',
  bakery_ledger_found: 'Margot\'s recipe book has been examined; the first historical deviation is known.',
  eddie_statement_heard: 'Eddie has told his version of Christmas Eve 2001.',
  police_record_found: 'Rowan\'s own 2001 statement has been found; the personal past becomes relevant.',
  archive_discrepancy_found: 'The fire report and the archive inventory contradict each other; Nora can be confronted.',
  committee_history_reconstructed: 'The five core relations are confirmed; the bell tower is unlocked.',
  twelve_point_star_found: 'The mechanism of the Christmas Star has been examined; the tower puzzle is available.',
  plaque_12_found: 'The copper plaque numbered 12 has been recovered.',
  dossier_12_recovered: 'The twelfth dossier has been collected; the finale is available.',
  finale_started: 'Rowan has arrived at the ceremony; the closing scene is running.',
  game_completed: 'The resolution has ended; credits and reload are available.',

  // --- Supporting flags -----------------------------------------------------
  inn_visited: 'Rowan has entered the Holly Inn.',
  bakery_visited: 'Rowan has entered Margot\'s bakery.',
  police_visited: 'Rowan has entered the police station.',
  archive_visited: 'Rowan has entered the church and archive.',
  tower_visited: 'Rowan has entered the bell tower.',
  home_visited: 'Rowan has entered his childhood home.',
  fund_trail_found: 'The lost dossiers are identified as the Restoration Fund ledgers.',
  payments_pattern_found: 'Eddie\'s and Margot\'s books show the same yearly payment from the Committee.',
  statements_altered: 'Two witness statements share the same dictated wording.',
  scarf_contradiction_found: 'The festival photo contradicts the red-scarf identification in Rowan\'s statement.',
  knows_twelve_meaning: 'Rowan understands that the number 12 (a plate of the Star) matters.',
  star_meaning_understood: 'The Star\'s inscription explains how its twelve points are meant to be lit.',
  thomas_plan_understood: 'Rowan understands Thomas planned to expose the truth on Christmas Eve.',
  rowan_role_understood: 'Rowan understands how his own statement became part of the false story.',
  tower_star_open: 'The Star mechanism has been set correctly; the hidden compartment is exposed.',
  nora_confronted: 'Nora has admitted what she retyped.',
  margot_confronted: 'Margot has admitted the Committee supper.',
  eddie_confronted: 'Eddie has admitted the yearly allowance.',
  silas_confronted: 'Silas has admitted his statement was dictated.',
  thomas_hiding_known: 'Rowan knows Thomas was hiding of his own accord.',
  speech_script_found: 'The mayor\'s speech has been shown to be scripted.',
};

export const FLAG_IDS = Object.freeze(Object.keys(FLAGS));

export function isValidFlag(id) {
  return Object.prototype.hasOwnProperty.call(FLAGS, id);
}
