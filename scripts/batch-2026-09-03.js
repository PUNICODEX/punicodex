/**
 * PUNICODEX — Lexicon batch addition
 * Four newly acquired flagship domains: ambika, bhudevi, pallas
 * (adonis already present in lexicon)
 */

module.exports = {
  entries: [
    {
      id: 'ambika',
      ascii: 'ambika',
      unicode: 'Ambikā',
      greek: '—',
      pantheon: 'sanskrit',
      tier: '1',
      tierLabel: 'Tier 1',
      domain: 'Divine Mother, Power, Protection',
      meaning: 'Mother; epithet of Pārvatī/Durgā, the multi-armed goddess with lion',
      sources: ['Monier-Williams', 'Shiva Purana', 'Devi Mahatmya'],
      breakdown: [
        { char: 'a', to: 'A', type: 'same', note: 'Initial a, capitalized' },
        { char: 'm', to: 'm', type: 'same', note: 'Ma' },
        { char: 'b', to: 'b', type: 'same', note: 'Ba' },
        { char: 'i', to: 'i', type: 'same', note: 'Short i' },
        { char: 'k', to: 'k', type: 'same', note: 'Ka' },
        { char: 'a', to: 'ā', type: 'length', note: 'Long ā (macron)' },
      ],
    },
    {
      id: 'bhudevi',
      ascii: 'bhudevi',
      unicode: 'Bhūdevī',
      greek: '—',
      pantheon: 'sanskrit',
      tier: '1',
      tierLabel: 'Tier 1',
      domain: 'Earth, Fertility, Sustenance',
      meaning: 'Earth goddess; seated on a lotus, holding a vessel of grain',
      sources: ['Monier-Williams', 'Vishnu Purana', 'Bhagavata Purana'],
      breakdown: [
        { char: 'b', to: 'B', type: 'same', note: 'Bha, capitalized' },
        { char: 'h', to: 'h', type: 'same', note: 'Ha' },
        { char: 'u', to: 'ū', type: 'length', note: 'Long ū (macron)' },
        { char: 'd', to: 'd', type: 'same', note: 'Da' },
        { char: 'e', to: 'e', type: 'same', note: 'Short e' },
        { char: 'v', to: 'v', type: 'same', note: 'Va' },
        { char: 'i', to: 'ī', type: 'length', note: 'Long ī (macron)' },
      ],
    },
    {
      id: 'pallas',
      ascii: 'pallas',
      unicode: 'Pállas',
      greek: 'Πάλλας',
      pantheon: 'greek',
      tier: '1',
      tierLabel: 'Tier 1',
      domain: 'Warcraft, Strategy, Celestial Bronze',
      meaning: 'Titan of warcraft; father of Nike, Kratos, Bia, and Zelos',
      sources: ['Hesiod', 'Apollodorus', 'LSJ', 'Pape-Benseler'],
      breakdown: [
        { char: 'p', to: 'P', type: 'same', note: 'Pi, capitalized' },
        { char: 'a', to: 'á', type: 'stress', note: 'Acute on alpha' },
        { char: 'l', to: 'l', type: 'same', note: 'Lambda' },
        { char: 'l', to: 'l', type: 'same', note: 'Lambda' },
        { char: 'a', to: 'a', type: 'same', note: 'Alpha' },
        { char: 's', to: 's', type: 'same', note: 'Sigma' },
      ],
    },
  ],
};
