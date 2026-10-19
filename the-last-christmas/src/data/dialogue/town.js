// Prologue and the town: Mayor Voss, Sergeant Pruitt, Eddie (Holly Inn), Margot (bakery).
// Game text is English. Every conversation ends cleanly and can be re-entered.

export const nodes = {
  // ===== PROLOGUE: The Missing Man ===========================================
  intro_1: {
    speaker: 'narrator', mood: 'neutral', next: 'intro_2',
    text: "Bellwether, 23 December, a little before four. The light is already leaving the square, and the Christmas Star hangs dark above the fountain, waiting for tomorrow.",
  },
  intro_2: {
    speaker: 'rowan', next: 'intro_3',
    text: "Thirty-one years in this town and I can't cross the square without being waved at. Today nobody waves. Today everyone is very busy not looking at me.",
  },
  intro_3: {
    speaker: 'voss', mood: 'worried', next: 'intro_4',
    text: "Detective Hale. Good. Walk with me. I have eleven things to do and you are number four.",
  },
  intro_4: {
    speaker: 'voss', mood: 'worried',
    text: "Thomas Bell hasn't been seen since the evening of the twenty-first. His assistant called the station this morning. The ceremony is tomorrow at dusk, and a festival without its organiser is just a lot of lanterns.",
    choices: [
      { text: "Two days, and you're telling me now?", next: 'intro_5a', once: true },
      { text: "Who saw him last?", next: 'intro_5b', once: true },
      { text: "I'll start in his office.", next: 'intro_6' },
    ],
  },
  intro_5a: {
    speaker: 'voss', next: 'intro_4',
    text: "People assumed he was busy. Thomas is always busy. He once organised a festival through a snowstorm and his own appendix.",
  },
  intro_5b: {
    speaker: 'voss', next: 'intro_4',
    text: "Eddie, at the Holly Inn. Thomas ordered soup, ate none of it and left in a hurry. Beyond that the town just shrugs.",
  },
  intro_6: {
    speaker: 'voss', mood: 'worried', next: 'intro_7',
    text: "His office is on the south side of the square, the door with the little star on it. Be discreet, Detective. The Committee would like this to be a misunderstanding by tomorrow evening.",
  },
  intro_7: {
    speaker: 'rowan', end: true, effects: { flags: ['intro_complete'] },
    text: "The Committee. It has chaired every Christmas I can remember. Somewhere in a drawer, I'm sure, there's a minute that says it also chairs me. Office first.",
  },

  // ===== Mayor Voss (hub) ====================================================
  voss_hub: {
    speaker: 'voss', mood: 'worried',
    text: "Detective. Any news? Tell me it's a misunderstanding. I'm fond of misunderstandings.",
    choices: [
      { text: "He's still missing.", next: 'voss_hub_2' },
      { text: "What was the fire in 2001 like, Mr Mayor?", next: 'voss_2001' },
      { text: "Never mind.", end: true },
    ],
  },
  voss_hub_2: {
    speaker: 'voss', end: true,
    text: "Then find him. Page one of the programme says 'Welcome by Thomas Bell' and I am not reprinting two hundred programmes.",
  },
  voss_2001: {
    speaker: 'voss', next: 'voss_2001b',
    text: "The fire? A terrible night. A clerk with a lantern and a bad idea, and half the archive gone. We rebuilt. That is what Bellwether does.",
  },
  voss_2001b: {
    speaker: 'rowan', end: true,
    text: "Same pause after 'lantern' as every Christmas Eve. He doesn't remember it so much as perform it.",
  },
  voss_uneasy: {
    speaker: 'voss', mood: 'angry',
    text: "I hear you've been reading my speech, Detective. It's a speech. People read them.",
    choices: [
      { text: "It's the same every year.", next: 'voss_uneasy_2' },
      { text: "Just checking the spelling.", end: true },
    ],
  },
  voss_uneasy_2: {
    speaker: 'voss', mood: 'angry', end: true,
    text: "Tradition, Detective. Tradition is simply memory that has been kept in good order.",
  },
  voss_cold: {
    speaker: 'voss', mood: 'angry', next: 'voss_cold_2',
    text: "You have the look of someone who has been reading. Be careful what you decide to remember, Detective.",
  },
  voss_cold_2: {
    speaker: 'rowan', end: true,
    text: "I'm trying to remember properly for once, Mr Mayor.",
  },

  // ===== Sergeant Pruitt =====================================================
  pruitt_intro: {
    speaker: 'pruitt', next: 'pruitt_intro_2',
    text: "Rowan. If you're here about Bell, I've had a car round the lake twice. Nothing but ducks.",
  },
  pruitt_intro_2: {
    speaker: 'pruitt', next: 'pruitt_intro_end',
    text: "And if you want the old files, the cabinet's in the back. Key's on my hook. Try not to lose it this time.",
  },
  pruitt_intro_end: {
    speaker: 'rowan', end: true,
    text: "I lost it once, in 2014, and I will never hear the end of it.",
  },
  pruitt_hub: {
    speaker: 'pruitt',
    text: "Anything I can do for you? Besides lunch, which is already in progress.",
    choices: [
      { text: "Any news on Thomas?", next: 'pruitt_news' },
      { text: "What's in the cabinet?", next: 'pruitt_cabinet' },
      { text: "Nothing. Thanks.", end: true },
    ],
  },
  pruitt_news: {
    speaker: 'pruitt',
    route: [
      { when: { flag: 'thomas_hiding_known' }, next: 'pruitt_news_c' },
      { when: { flag: 'thomas_office_searched' }, next: 'pruitt_news_b' },
      { next: 'pruitt_news_a' },
    ],
  },
  pruitt_news_a: {
    speaker: 'pruitt', end: true,
    text: "Nothing. His car's in the garage, his coat is gone. A man who plans to leave takes his coat.",
  },
  pruitt_news_b: {
    speaker: 'pruitt', end: true,
    text: "If he planned it, he planned it well. Everyone says the same thing: 'He seemed fine.' In my experience that means he wasn't.",
  },
  pruitt_news_c: {
    speaker: 'pruitt', end: true,
    text: "Hiding of his own accord? Then he's closer than the lake. Try anywhere with a door that locks from the inside.",
  },
  pruitt_cabinet: {
    speaker: 'pruitt', next: 'pruitt_cabinet_2',
    text: "Fire reports, old statements, a calendar from a pizza place that closed in '03. Your name's in there somewhere, if you go looking.",
  },
  pruitt_cabinet_2: {
    speaker: 'rowan', end: true,
    text: "Any file with my name on it, I've learned, is best read sitting down.",
  },

  // ===== Eddie Marsh, The Holly Inn ==========================================
  eddie_intro: {
    speaker: 'eddie', mood: 'warm', next: 'eddie_i2',
    text: "Rowan! Sit, sit. The soup is mostly soup. You're here about Thomas.",
  },
  eddie_i2: {
    speaker: 'eddie',
    text: "He sat right there on the twenty-first. Ordered the soup, ate none of it, and asked me what I remembered about the night of the fire. I said what everyone says.",
    choices: [
      { text: "What does everyone say?", next: 'eddie_stmt_1' },
      { text: "Did he say where he was going?", next: 'eddie_where', once: true },
    ],
  },
  eddie_where: {
    speaker: 'eddie', next: 'eddie_i2',
    text: "No. He looked at the clock over the door as if it owed him money, and left.",
  },
  eddie_stmt_1: {
    speaker: 'eddie', next: 'eddie_stmt_2',
    text: "Elias Wren. The clerk. He walked into that archive on Christmas Eve with a lantern, and the Star lights crackled, and then the whole east wing went up.",
  },
  eddie_stmt_2: { speaker: 'rowan', next: 'eddie_stmt_3', text: "You saw that?" },
  eddie_stmt_3: {
    speaker: 'eddie', mood: 'worried', next: 'eddie_stmt_4',
    text: "Saw it? I... well. Heard it. Everybody saw it. You hear a thing so often, you get a picture.",
  },
  eddie_stmt_4: {
    speaker: 'narrator', next: 'eddie_stmt_end',
    text: "He frowns, as if the picture has just been taken off the wall and he's looking at the nail.",
    effects: { evidence: ['ev_eddie_testimony'] },
  },
  eddie_stmt_end: { speaker: 'eddie', end: true, text: "Anyway. More soup?", effects: { flags: ['eddie_statement_heard'] } },
  eddie_hub: {
    speaker: 'eddie',
    text: "Back again. The soup hasn't improved, but the company has.",
    choices: [
      { text: "Ask about Thomas.", next: 'eddie_thomas' },
      { text: "Confront him with the cash book.", confront: 'conf_eddie', when: { relation: 'r_payments', notConfronted: 'conf_eddie' } },
      { text: "Leave.", end: true },
    ],
  },
  eddie_thomas: {
    speaker: 'eddie', end: true,
    text: "Haven't seen him since the twenty-first. You think I'd hide him in the cellar? My cellar holds potatoes and regrets, and he'd hate both.",
  },
  eddie_confession: {
    speaker: 'eddie', mood: 'sad', next: 'eddie_conf_2',
    text: "Twelve hundred. Every Christmas Eve, in an envelope marked 'festival allowance'. The first year I thought: lucky. The fifth I thought: odd. By the tenth I had a new cellar door and no questions left.",
  },
  eddie_conf_2: {
    speaker: 'eddie', mood: 'sad', next: 'eddie_conf_3',
    text: "Thomas came on the twenty-second and asked about the envelopes. I told him the truth, which was nothing. Then I gave him a thermos and a blanket. He said he needed somewhere quiet, and high.",
  },
  eddie_conf_3: {
    speaker: 'rowan', end: true,
    text: "Quiet and high. Eddie, he isn't missing. He's hiding. And I think I know what is quiet and high in this town.",
  },
  eddie_done: {
    speaker: 'eddie', mood: 'sad', end: true,
    text: "I'll be at the ceremony. Front row, if I can bear it. Someone should be ashamed where people can see.",
  },

  // ===== Margot Finch, the bakery ===========================================
  margot_intro: {
    speaker: 'margot', mood: 'warm', next: 'margot_i2',
    text: "Rowan Hale! Look at you, thin as a candle. Sit. I've gingerbread going for tomorrow and it won't mind a taste-tester.",
  },
  margot_i2: {
    speaker: 'margot', mood: 'warm', next: 'margot_i3',
    text: "Thomas? Not since Tuesday. He ordered forty gingerbread stars and asked a funny thing. Whether I still kept my old recipe books.",
  },
  margot_i3: { speaker: 'rowan', next: 'margot_i4', text: "Do you?" },
  margot_i4: {
    speaker: 'margot', mood: 'warm', next: 'margot_intro_end',
    text: "Somewhere. Now I must fetch the next tray from the back. Make yourself at home. Touch nothing hot, and nothing that's mine.",
  },
  margot_intro_end: {
    speaker: 'rowan', end: true,
    text: "Which leaves me alone with everything that is hers.",
  },
  margot_hub: {
    speaker: 'margot', mood: 'warm',
    text: "More gingerbread? Or is it the other kind of visit?",
    choices: [
      { text: "Ask about the night of the fire.", next: 'margot_2001' },
      { text: "Confront her with her own pages.", confront: 'conf_margot', when: { relation: 'r_recipe_report', notConfronted: 'conf_margot' } },
      { text: "Just gingerbread.", end: true },
    ],
  },
  margot_2001: {
    speaker: 'margot', mood: 'worried', next: 'margot_2001b',
    text: "That night... I remember the smell. Sugar and smoke, an odd mix. And Harold on the church steps in his good coat, not a mark on it. Funny, that. I put it down to luck.",
    effects: { evidence: ['ev_margot_testimony'] },
  },
  margot_2001b: { speaker: 'rowan', end: true, text: "Luck. Or timing." },
  margot_confession: {
    speaker: 'margot', mood: 'sad', next: 'margot_conf_2',
    text: "I baked fourteen trays for the Committee that night. They were in the annex with the door shut. By the time the fire started they had all gone home. The next morning Harold came by and told me what I had seen. And what I hadn't.",
  },
  margot_conf_2: {
    speaker: 'margot', mood: 'sad', end: true,
    text: "Twenty-five years of gingerbread, and I couldn't tell you which stars were sorry.",
  },
  margot_done: {
    speaker: 'margot', mood: 'sad', end: true,
    text: "Take the stollen, dear. I can't eat this, so someone ought.",
  },
};

export const conversations = {
  voss: [
    { when: { notFlag: 'intro_complete' }, node: 'intro_1' },
    { when: { flag: 'committee_history_reconstructed' }, node: 'voss_cold' },
    { when: { flag: 'speech_script_found' }, node: 'voss_uneasy' },
    { node: 'voss_hub' },
  ],
  pruitt: [
    { when: { notSeen: 'pruitt_intro_end' }, node: 'pruitt_intro' },
    { node: 'pruitt_hub' },
  ],
  eddie: [
    { when: { confronted: 'conf_eddie' }, node: 'eddie_done' },
    { when: { seen: 'eddie_stmt_end' }, node: 'eddie_hub' },
    { node: 'eddie_intro' },
  ],
  margot: [
    { when: { confronted: 'conf_margot' }, node: 'margot_done' },
    { when: { seen: 'margot_intro_end' }, node: 'margot_hub' },
    { node: 'margot_intro' },
  ],
};
