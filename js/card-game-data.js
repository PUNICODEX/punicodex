(function (root) {
  function tierToRarity(tier) {
    if (tier === 'dual') return 'epic';
    if (tier === '1') return 'rare';
    return 'common';
  }

  function tierBasePower(tier) {
    if (tier === 'dual') return 90 + Math.floor(Math.random() * 11);
    if (tier === '1') return 70 + Math.floor(Math.random() * 16);
    return 40 + Math.floor(Math.random() * 26);
  }

  function tierCost(tier) {
    if (tier === 'dual') return 8;
    if (tier === '1') return 6;
    return 1 + Math.floor(Math.random() * 4);
  }

  function domainHealth(domain) {
    const d = (domain || '').toLowerCase();
    if (d.includes('sea') || d.includes('earth') || d.includes('underworld')) return 80 + Math.floor(Math.random() * 21);
    if (d.includes('war') || d.includes('thunder') || d.includes('king')) return 70 + Math.floor(Math.random() * 21);
    if (d.includes('love') || d.includes('beauty') || d.includes('messenger')) return 50 + Math.floor(Math.random() * 16);
    return 55 + Math.floor(Math.random() * 21);
  }

  function domainAbility(domain, unicode) {
    const d = (domain || '').toLowerCase();
    if (d.includes('thunder') || d.includes('lightning')) return { name: 'Thunderstrike', description: 'Deal bonus damage to Sea or Sky foes.' };
    if (d.includes('war') || d.includes('battle')) return { name: 'Battle Fury', description: 'Gains +5 power when attacking.' };
    if (d.includes('sea') || d.includes('ocean')) return { name: 'Tidal Wave', description: 'Damages all enemy cards when played.' };
    if (d.includes('wisdom') || d.includes('tactical')) return { name: 'Tactical Counsel', description: 'Draw a card when played.' };
    if (d.includes('magic') || d.includes('crossroads')) return { name: 'Crossroads', description: 'Random bonus effect on play.' };
    if (d.includes('love') || d.includes('beauty')) return { name: 'Charm', description: 'Enemy card loses 10 power this turn.' };
    if (d.includes('death') || d.includes('underworld')) return { name: 'Grasp of Shadows', description: 'Drain health from the enemy hero.' };
    if (d.includes('victory')) return { name: 'Triumph', description: 'Inspire ally cards for +3 power.' };
    return { name: 'Divine Presence', description: 'Grant a small blessing to allies.' };
  }

  function generateCard(entry) {
    const power = tierBasePower(entry.tier);
    const health = domainHealth(entry.domain);
    const cost = tierCost(entry.tier);
    const rarity = entry.hasAdSite ? 'legendary' : tierToRarity(entry.tier);
    const ability = domainAbility(entry.domain, entry.unicode);

    return {
      id: `${entry.id}-standard`,
      entryId: entry.id,
      name: entry.unicode || entry.ascii,
      ascii: entry.ascii,
      original: entry.greek || entry.original_script || '—',
      pantheon: entry.pantheon,
      tier: entry.tier,
      tierLabel: entry.tierLabel || (entry.tier === 'dual' ? 'Dual-Tier' : `Tier-${entry.tier}`),
      domain: entry.domain || 'Mythic',
      meaning: entry.meaning || '',
      rarity,
      cost,
      power,
      health,
      maxHealth: health,
      ability,
    };
  }

  function generateAllCards() {
    if (typeof LEXICON === 'undefined') {
      throw new Error('LEXICON is not loaded. Include type/js/lexicon.js before card-game-data.js.');
    }
    return LEXICON.map(generateCard);
  }

  function starterDeck(cards, size = 10) {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size).map((c) => ({ ...c, instanceId: Math.random().toString(36).slice(2) }));
  }

  root.CardGameData = {
    generateCard,
    generateAllCards,
    starterDeck,
  };
})(typeof window !== 'undefined' ? window : globalThis);
