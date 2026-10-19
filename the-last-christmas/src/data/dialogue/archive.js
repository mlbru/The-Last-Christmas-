// The church and archive: Nora Quill (archivist) and Silas Crane (bell-ringer).

export const nodes = {
  // ===== Nora Quill ===========================================================
  nora_intro: {
    speaker: 'nora', next: 'nora_i2',
    text: "Detective Hale. Mind the box by the door. It contains the entire municipal budget for 1998, and it bites.",
  },
  nora_i2: {
    speaker: 'nora', next: 'nora_i3',
    text: "You're here about Thomas. He sat at that desk on the twentieth and asked for the inventory for Christmas Eve 2001. I showed him. He thanked me, very quietly, and left like a man who'd been handed a bill.",
  },
  nora_i3: {
    speaker: 'nora', next: 'nora_intro_end',
    text: "The inventory is on my desk. Look all you like. I prefer people looking at paper rather than at me.",
  },
  nora_intro_end: {
    speaker: 'rowan', end: true,
    text: "Everyone in this town has something they would prefer I looked at instead of them.",
  },
  nora_hub: {
    speaker: 'nora',
    text: "Anything else, Detective? I can fetch things. It's what I'm for.",
    choices: [
      { text: "Ask about Thomas's visit.", next: 'nora_thomas' },
      { text: "Confront her about the inventory.", confront: 'conf_nora', when: { relation: 'r_report_inventory', notConfronted: 'conf_nora' } },
      { text: "That's all.", end: true },
    ],
  },
  nora_thomas: {
    speaker: 'nora', mood: 'worried', end: true,
    text: "He didn't say much. He asked whether page nine had always been in that typeface. I said yes. I said it very fast.",
  },
  nora_confession: {
    speaker: 'nora', mood: 'sad', next: 'nora_conf_2',
    text: "Page nine. I retyped it, twenty-five years ago. A senior clerk told me it was tidying. Dossier 0412 had a cover slip, and then it had none, and I was twenty-two and holding the only page that said otherwise.",
  },
  nora_conf_2: {
    speaker: 'nora', mood: 'sad', next: 'nora_conf_3',
    text: "I should have kept the original. I should have asked what was in 0412. Thomas wanted me to say it aloud. I couldn't. So he wrote you a letter and left it with me. I'm sorry it took this long to hand over.",
  },
  nora_conf_3: {
    speaker: 'rowan', end: true,
    text: "Thank you for handing it over now, Nora. Late is a lot better than never.",
  },
  nora_done: {
    speaker: 'nora', mood: 'sad', end: true,
    text: "The archive opens at nine tomorrow, whatever happens tonight. Somebody has to put the pages back in the right order.",
  },

  // ===== Silas Crane ==========================================================
  silas_intro: {
    speaker: 'silas', next: 'silas_i2',
    text: "Mm. The detective. The ropes are all in order, if that's why you've come.",
  },
  silas_i2: { speaker: 'rowan', next: 'silas_i3', text: "I'm looking for Thomas Bell." },
  silas_i3: {
    speaker: 'silas', mood: 'worried', next: 'silas_intro_end',
    text: "Thomas. He came on the twenty-first. Asked me what I saw in 2001. I said I'd said it all, in a statement. He asked for a copy. I told him I had none.",
  },
  silas_intro_end: {
    speaker: 'silas', end: true,
    text: "The tower stairs are chained, mind. The Committee says they're unsafe. I ring the bells from the floor, like a sensible man.",
  },
  silas_hub: {
    speaker: 'silas',
    text: "Mm? Something on your mind, Detective?",
    choices: [
      { text: "Ask about his 2001 statement.", next: 'silas_ask' },
      { text: "Confront him with his statement.", confront: 'conf_silas', when: { relation: 'r_statements_copied', notConfronted: 'conf_silas' } },
      { text: "I'll leave you to your ropes.", end: true },
    ],
  },
  silas_ask: {
    speaker: 'silas',
    route: [
      { when: { evidence: 'ev_silas_statement' }, next: 'silas_ask_again' },
      { when: { evidence: 'ev_rowan_statement' }, next: 'silas_give' },
      { next: 'silas_refuse' },
    ],
  },
  silas_refuse: {
    speaker: 'silas', end: true,
    text: "I said what I said. It's in the files. Ask the Sergeant, if you want to read what a man says when he's frightened.",
  },
  silas_give: {
    speaker: 'silas', mood: 'worried', next: 'silas_give_2',
    text: "...You've read your own statement, haven't you. Then you know what it sounds like.",
  },
  silas_give_2: {
    speaker: 'silas', mood: 'worried', next: 'silas_give_3',
    text: "I kept a carbon. Don't ask why a man keeps such a thing. Take it.",
    effects: { evidence: ['ev_silas_statement'] },
  },
  silas_give_3: {
    speaker: 'rowan', end: true,
    text: "The same sentence as mine. Word for word, down to the comma. Whoever wrote it did not write it twice by accident.",
  },
  silas_ask_again: {
    speaker: 'silas', end: true,
    text: "I gave you the copy. It's all I have, and more than I wanted to keep.",
  },
  silas_confession: {
    speaker: 'silas', mood: 'sad', next: 'silas_conf_2',
    text: "I signed what Harold Voss put in front of me. I didn't see a lantern. I saw the Star lights flicker, and a man in a red scarf by the archive door, helping someone. A child, I think. Then the roof lit up.",
  },
  silas_conf_2: {
    speaker: 'silas', mood: 'sad', next: 'silas_conf_3',
    text: "I wrote 'I did not see a lantern' underneath, in pencil, so I would know. Twenty-five years I've rung bells for a story I knew was wrong. The bells don't care. That was the worst of it.",
  },
  silas_conf_3: { speaker: 'rowan', mood: 'shocked', next: 'silas_conf_4', text: "The child was me, Silas." },
  silas_conf_4: {
    speaker: 'silas', mood: 'sad', end: true,
    text: "...Aye. I thought so. You had his scarf.",
  },
  silas_done: {
    speaker: 'silas', end: true,
    text: "The Star has been lit by that story for twenty-five years. Tomorrow, let it be lit by something true. I'll ring the twelve myself.",
  },
};

export const conversations = {
  nora: [
    { when: { confronted: 'conf_nora' }, node: 'nora_done' },
    { when: { seen: 'nora_intro_end' }, node: 'nora_hub' },
    { node: 'nora_intro' },
  ],
  silas: [
    { when: { confronted: 'conf_silas' }, node: 'silas_done' },
    { when: { seen: 'silas_intro_end' }, node: 'silas_hub' },
    { node: 'silas_intro' },
  ],
};
