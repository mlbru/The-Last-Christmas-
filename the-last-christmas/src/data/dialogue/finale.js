// The finale: the ceremony on the square, three proofs, Thomas, and a restrained epilogue.
// The ending is fixed. Only small colours of the epilogue vary with what the player did earlier.
// Elias Wren's last moments stay uncertain on purpose: the evidence proves the fraud and the
// falsified history, not what happened to him.
//
// Scene cues used by FinaleScene (it reads step.nodeId): fin_p1_ok, fin_thomas, fin_star, fin_home, fin_end.

export const nodes = {
  fin_start: {
    speaker: 'narrator', next: 'fin_2',
    effects: { flags: ['finale_started'] },
    text: 'Christmas Eve, dusk. All of Bellwether has come to the square. Children on shoulders, thermoses, a brass band tuning against the cold. Above the fountain, the Christmas Star hangs dark and waits for someone to say the words.',
  },
  fin_2: {
    speaker: 'voss', mood: 'warm', next: 'fin_3',
    text: "Detective Hale! Good. Thomas is still missing, I'm afraid, so I shall have to do his lines as well as mine. You'll stand by the stage? Security, you understand. A little quiet, please. The speech is short.",
  },
  fin_3: {
    speaker: 'rowan', mood: 'neutral', next: 'fin_p1',
    text: "I'm not here for security, Mr Mayor. I'm here about dossier 0412. The one the fire report says burned.",
  },

  // ----- Proof 1: the dossier survived ---------------------------------------
  fin_p1: {
    speaker: 'voss', mood: 'worried',
    text: "Dossier 0412 burned with the rest of the archive. It is in the report. It has been in the report for twenty-five years. Whatever you have heard, Detective, please say what you think you can show.",
    present: {
      prompt: 'Show the town what the report says cannot exist.',
      correct: ['ev_dossier_12'],
      partial: {
        ev_fire_report: "That is the report. It says the dossier burned. It doesn't show that it didn't.",
        ev_inventory: "The inventory stops at 0411. That is a gap. It isn't the dossier itself.",
        ev_recipe_key: "The number is right. A number in a baker's margin is not the book it belongs to.",
        ev_backdated_slip: "A backdated slip proves someone lied about 0412. It doesn't put 0412 in anyone's hand.",
      },
      wrong: 'That is true, as far as it goes. It is not what the report says cannot exist.',
      hints: [
        'The report says one document burned. What did you take from the Star?',
        'The twelfth dossier. It is in your journal, under the first line of enquiry.',
      ],
      next: 'fin_p1_ok',
    },
  },
  fin_p1_ok: {
    speaker: 'rowan', mood: 'neutral', next: 'fin_p1_voss',
    text: "Ledger 0412. The Restoration Fund. Eleven signatures, the Committee's, and yours at the top, Mr Mayor. Not burned. Hidden. Behind the twelfth point of the Star, where it has been since the night of the fire.",
  },
  fin_p1_voss: {
    speaker: 'voss', mood: 'angry', next: 'fin_p2',
    text: "A forgery. Obviously. The sort of thing a clever man might put together for sentiment. And even if it were real, what does a ledger prove? Figures. The history of this town was written by eyewitnesses. A child saw a man in a red scarf carry a lantern into that archive. That child is standing in front of you.",
  },

  // ----- Proof 2: the statement was built, not given ----------------------
  fin_p2: {
    speaker: 'voss', mood: 'neutral',
    text: "Ask the boy what he saw. He said it himself, in his own words, to a police officer, the next morning. Whose words are they, if not his?",
    present: {
      prompt: 'Whose words is the town actually repeating?',
      correct: ['ev_rowan_statement'],
      partial: {
        ev_silas_statement: "Silas's statement says the same thing. That is the point, and not yet the proof. Whose statement did the town build on?",
        ev_mayor_speech: "The speech repeats it. It does not originate it.",
        ev_backdated_slip: "The slip is about the dossier. Not about what was said that morning.",
      },
      wrong: "That doesn't tell the town where the story came from. Think about the child.",
      hints: [
        'The town repeats one sentence about a red scarf. Where did it first get written down?',
        "Your own statement, from the police files. The one with your seven-year-old signature.",
      ],
      next: 'fin_p2_ok',
    },
  },
  fin_p2_ok: {
    speaker: 'rowan', mood: 'sad', next: 'fin_p2_b',
    text: "My statement. Typed. Same wording, down to the comma, as the one Silas Crane signed the same morning. Two witnesses, one sentence. Nobody asked what I saw. They asked what I would agree to.",
  },
  fin_p2_b: {
    speaker: 'rowan', mood: 'sad', next: 'fin_p2_c',
    text: "The dossier has the other version. A child's handwriting, from before anyone typed anything: 'I was cold. A man put his scarf round me and gave me something small and said to keep it safe. Then he went back towards the church. The grown-ups carried boxes out, not in.'",
  },
  fin_p2_c: {
    speaker: 'rowan', mood: 'neutral', next: 'fin_p3',
    text: "The man in the red scarf was not carrying a lantern into the archive. The scarf was on me. I've been the proof of the wrong story for twenty-five years, and I never knew.",
  },

  // ----- Proof 3: what Elias actually did --------------------------------------
  fin_p3: {
    speaker: 'voss', mood: 'worried',
    text: "Elias Wren set that fire, Detective. He took the money and he burned the evidence, and he ran. Whatever you hold, you cannot make that man into something he was not.",
    present: {
      prompt: 'What did Elias Wren do that night?',
      correct: ['ev_elias_letter'],
      partial: {
        ev_dossier_12: "The ledger shows the fraud. It doesn't show what Elias meant to do with it.",
        ev_fire_report: "That is the version Voss is defending. It isn't Elias's own.",
        ev_crayon_drawing: "A child's drawing. It matters to me. It won't carry a whole square.",
      },
      wrong: "That doesn't answer him. You need something Elias wrote himself.",
      hints: [
        'Elias left something behind the Star\'s casing. Something unfinished.',
        "His unfinished letter, from the tower recess.",
      ],
      next: 'fin_p3_ok',
    },
  },
  fin_p3_ok: {
    speaker: 'rowan', mood: 'neutral', next: 'fin_p3_b',
    text: "'The Fund never reached the roof. I have copied the twelfth ledger and I am going to hide it where nobody will think to...' It stops there. A man who means to burn the evidence does not first copy it by hand and hide the copy.",
  },
  fin_p3_b: {
    speaker: 'rowan', mood: 'sad', next: 'fin_p3_c',
    text: "I do not know what happened to Elias after he went back towards the church. The ledger doesn't say. The letter doesn't say. Neither does the report. But the report says he lit the fire, and that, at least, we can all now see is not true.",
  },
  fin_p3_c: {
    speaker: 'voss', mood: 'sad', next: 'fin_voss_end',
    text: "I did not set that fire. I did not. I... we decided what the town would remember. The roof had to be paid for and the money was gone, and a hero was easier than a thief. Every year the story got simpler. It was easier to say it than to stop.",
  },
  fin_voss_end: {
    speaker: 'voss', mood: 'sad', next: 'fin_thomas',
    text: "As to what became of Wren that night, I do not know. I have asked myself every Christmas for twenty-five years. If I knew, Detective, I think I would have been braver.",
  },

  // ----- Thomas, the town, the Star --------------------------------------------
  fin_thomas: {
    speaker: 'thomas', mood: 'warm', next: 'fin_thomas_b',
    text: "You found it yourself. That was the whole point of the games. I couldn't hand it to you, Rowan. You'd have thought it was only my word.",
  },
  fin_thomas_b: {
    speaker: 'rowan', mood: 'warm',
    text: "You could have just told me you were alive. Thomas, I spent two days thinking you were in the river.",
    choices: [
      { text: 'I am angry with you.', next: 'fin_thomas_c1' },
      { text: 'Thank you for trusting me.', next: 'fin_thomas_c2' },
    ],
  },
  fin_thomas_c1: {
    speaker: 'thomas', mood: 'sad', next: 'fin_witness',
    text: "You're allowed. Be angry tomorrow. Tonight there is a square full of people who are, for the first time, listening.",
  },
  fin_thomas_c2: {
    speaker: 'thomas', mood: 'warm', next: 'fin_witness',
    text: "I trusted the seven-year-old, in the end. The one who kept a copper plate for twenty-five years without knowing why.",
  },

  // The witnesses step forward according to who Rowan actually confronted. The ending does not change.
  fin_witness: {
    route: [
      { when: { flag: ['nora_confronted', 'margot_confronted', 'eddie_confronted', 'silas_confronted'] }, next: 'fin_w_all' },
      { when: { any: [{ flag: 'nora_confronted' }, { flag: 'margot_confronted' }, { flag: 'eddie_confronted' }, { flag: 'silas_confronted' }] }, next: 'fin_w_some' },
      { next: 'fin_w_none' },
    ],
  },
  fin_w_all: {
    speaker: 'narrator', next: 'fin_pruitt',
    text: "Nora Quill steps out of the crowd first, her hands shaking round a small notebook. Then Margot, with flour still on her sleeve. Then Eddie. Then Silas Crane, who has not spoken to a crowd in twenty-five years. They stand together beside Rowan and no one tells them to.",
  },
  fin_w_some: {
    speaker: 'narrator', next: 'fin_pruitt',
    text: "A few people in the crowd step forward, one at a time. Some of them Rowan spoke to. They do not say much. They do not need to. The others look at their boots.",
  },
  fin_w_none: {
    speaker: 'narrator', next: 'fin_pruitt',
    text: "Nobody steps forward. Nobody has to. The ledger is in Rowan's hands and the square can read the signatures for itself, and slowly, person by person, it does.",
  },
  fin_pruitt: {
    speaker: 'pruitt', mood: 'neutral', next: 'fin_star_a',
    text: "I'll need that dossier, Hale. In a bag, with a date on it. And a statement. Your real one this time. Mr Mayor, if you'd like to come and sit in the warm for a while.",
  },
  fin_star_a: {
    speaker: 'thomas', mood: 'warm', next: 'fin_star',
    text: "Someone ought to light it. It has twelve points, and it has been lit eleven-twelfths of the way for twenty-five years. Rowan.",
  },
  fin_star: {
    speaker: 'narrator', next: 'fin_home',
    text: "The twelfth plate clicks home. The Star lights point by point, from December around the year, and stands over the square in copper and gold. For a moment the town is entirely silent. Then somebody, small and very serious, starts to clap.",
  },

  // ----- Epilogue ------------------------------------------------------------------
  fin_home: {
    speaker: 'narrator', next: 'fin_epi_2',
    text: "Christmas morning. Fernbrook Lane 12. Snow on the windowsill, tea going cold.",
  },
  fin_epi_2: {
    speaker: 'ruth', mood: 'sad', next: 'fin_epi_3',
    text: "I put that plate in your toy box, Rowan. I never knew what to say. I was told it was best. For you, they said. For the town.",
  },
  fin_epi_3: {
    speaker: 'rowan', mood: 'warm', next: 'fin_epi_route',
    text: "It's all right, Mum. I think it was always going to be found by someone. I'm glad it was me.",
  },
  fin_epi_route: {
    route: [
      { when: { flag: ['nora_confronted', 'margot_confronted', 'eddie_confronted', 'silas_confronted'] }, next: 'fin_epi_full' },
      { next: 'fin_epi_plain' },
    ],
  },
  fin_epi_full: {
    speaker: 'narrator', next: 'fin_epi_end',
    text: "By January, Nora has re-registered dossier 0412 in the correct hand, with the correct date. Margot has put the old margin numbers on the wall of the bakery, 4, 1, 2, and does not take them down. Eddie has stopped polishing the same glass. Silas rings the bells again, slowly, as if learning them.",
  },
  fin_epi_plain: {
    speaker: 'narrator', next: 'fin_epi_end',
    text: "By January the archive is open to anyone who asks. The new records are slow and unfinished and, for the first time in Bellwether, honest. The town argues about it in the pub, which Rowan takes as a good sign.",
  },
  fin_epi_end: {
    speaker: 'rowan', mood: 'sad', next: 'fin_end',
    text: "Elias Wren is still not found. The report no longer says he did it, and for now that is as much as anyone knows. Somewhere there is a man who copied a ledger, handed a boy a copper plate, and went back towards a church. I think of him on Christmas Eve, and the Star is lit.",
  },
  fin_end: {
    speaker: 'narrator', end: true,
    text: 'Merry Christmas, Bellwether.',
    effects: { flags: ['game_completed'] },
  },
};

export const conversations = {};
