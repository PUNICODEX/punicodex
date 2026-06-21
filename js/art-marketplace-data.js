(function (root) {
  function tierToRarity(tier, hasAdSite) {
    if (hasAdSite) return 'legendary';
    if (tier === 'dual') return 'epic';
    if (tier === '1') return 'rare';
    return 'common';
  }

  function basePriceCents(entry) {
    if (entry.hasAdSite) return 50000; // $500
    if (entry.tier === 'dual') return 25000;
    if (entry.tier === '1') return 12000;
    return 3000;
  }

  function pantheonColor(pantheon) {
    const map = {
      greek: '#3b82f6',
      norse: '#22c55e',
      egyptian: '#eab308',
      sanskrit: '#f97316',
      celtic: '#14b8a6',
      mesopotamian: '#a855f7',
      japanese: '#ef4444',
      chinese: '#ec4899',
    };
    return map[pantheon] || '#94a3b8';
  }

  function generateArtwork(entry, index) {
    const price = basePriceCents(entry);
    return {
      id: `art-${entry.id}-${index}`,
      entryId: entry.id,
      title: `${entry.unicode || entry.ascii}`,
      artist: `Artist ${(index % 12) + 1}`,
      pantheon: entry.pantheon,
      domain: entry.domain || 'Mythic',
      rarity: tierToRarity(entry.tier, entry.hasAdSite),
      color: pantheonColor(entry.pantheon),
      licenses: {
        personal: { priceCents: price, label: 'Personal' },
        commercial: { priceCents: price * 4, label: 'Commercial' },
        exclusive: { priceCents: price * 20, label: 'Exclusive' },
      },
      status: 'approved',
    };
  }

  function generateGallery(limit = 60) {
    if (typeof LEXICON === 'undefined') {
      throw new Error('LEXICON is not loaded.');
    }
    const entries = [...LEXICON]
      .filter((e) => e.pantheon !== 'greek-location')
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);
    return entries.map((entry, i) => generateArtwork(entry, i));
  }

  function formatPrice(cents) {
    return `$${(cents / 100).toLocaleString()}`;
  }

  root.ArtMarketplaceData = {
    generateGallery,
    formatPrice,
  };
})(typeof window !== 'undefined' ? window : globalThis);
