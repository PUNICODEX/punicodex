const { buildPitchEmail, loadTemple, buildResonanceBullets } = require('../platform/api/pitch-email');
const brain = require('../platform/api/sponsor-brain');

const CASES = [
  { name: 'Nike, Inc.', domain: 'nike.com', industry: 'Sports, Fitness & Competition', temple: 'nike' },
  { name: 'Hermès International', domain: 'hermes.com', industry: 'Beauty, Fashion & Cosmetics', temple: 'hermes' },
  { name: 'Mars, Incorporated', domain: 'mars.com', industry: 'Food & Hospitality', temple: 'mars' },
  { name: 'General Electric', domain: 'ge.com', industry: 'Energy & Natural World', temple: 'ge' },
  { name: 'Atlas Freight Lines', domain: 'atlasfreight.com', industry: 'Shipping & Logistics', temple: 'atlas' },
  { name: 'Stellar Estates Winery', domain: 'stellarestates.com', industry: 'Wine, Brewing & Hospitality', keywords: ['wine', 'vineyard', 'celebration'], temple: 'dionysos' },
  { name: 'Prometheus Systems', domain: 'prometheus.io', industry: 'Technology & Innovation', temple: 'prometheus' },
  { name: 'Aegis Cyber Defense', domain: 'aegiscyber.com', industry: 'Defense, Military & Security', keywords: ['protection', 'shield'], temple: null },
  { name: 'Fortuna Capital', domain: 'fortunacap.com', industry: 'Finance, Wealth & Commerce', temple: null },
  { name: 'Acme Corp', domain: 'acme.com', industry: '', temple: 'tyche' },
];

function strip(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

for (const c of CASES) {
  const business = {
    businessName: c.name,
    domain: c.domain,
    industry: c.industry,
    keywords: c.keywords,
  };
  const chosen = c.temple || brain.matchTemplesForBusiness(business, 1)[0].slug;
  const temple = loadTemple(chosen);
  const match = brain.explainMatch(business, chosen);
  const pitch = buildPitchEmail({
    codeRow: { code: 'VERIFY-1', kind: 'percent_off', percent: 100, applies_to: chosen },
    temple,
    businessName: c.name,
    recipientSite: c.domain,
    customNote: null,
    patterns: buildResonanceBullets(chosen, c.name),
    slots: null,
    brain: match,
  });
  const i = pitch.html.indexOf('01 — THE RESONANCE');
  const j = pitch.html.indexOf('02 — THE EXCLUSIVITY');
  console.log('='.repeat(100));
  console.log(`BUSINESS: ${c.name}  →  TEMPLE: ${temple.unicode} (${chosen})  strength=${match.strength}`);
  console.log(`SUBJECT: ${pitch.subject}`);
  console.log(strip(pitch.html.slice(i, j)).slice(0, 1200));
  // Red-flag scan.
  const flags = [];
  if (/&[a-z]+;/.test(strip(pitch.html.slice(i, j)).replace(/&/g, ''))) flags.push('entity-leak');
  if (/undefined|null|NaN|\[object/.test(pitch.html)) flags.push('placeholder-leak');
  if (/\.\s*,/.test(strip(pitch.html))) flags.push('punctuation');
  const textCheck = pitch.text;
  if (/&amp;|&nbsp;|&quot;/.test(textCheck)) flags.push('entity-in-text-part');
  if (flags.length) console.log('FLAGS:', flags.join(', '));
}
