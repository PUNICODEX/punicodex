const fs = require('fs');
const path = require('path');
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));

const SITES_DIR = path.join(__dirname, '..', 'sites');

function stripTags(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function extractSection(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  if (start === -1) return '';
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return html.slice(start);
  return html.slice(start, end);
}

function analyzePeakQuality(siteId) {
  const file = path.join(SITES_DIR, siteId, 'lore', 'extended', 'index.html');
  if (!fs.existsSync(file)) return null;

  const html = fs.readFileSync(file, 'utf8');
  const bodyText = stripTags(html);
  const wordCount = countWords(bodyText);

  // Cultural significance cards
  const culturalSection = extractSection(html, 'id="cultural-significance"', '<!-- FAQ -->');
  const culturalCardMatches = culturalSection.match(/class="cultural-card[\s"]/g) || [];
  const culturalCardCount = culturalCardMatches.length;
  const culturalTitles = Array.from(culturalSection.matchAll(/class="cultural-card-title"[^>]*>([^<]+)/g))
    .map(m => m[1].trim());
  const hasOnlyGenericCultural = culturalCardCount === 1 &&
    culturalTitles[0] === 'Unicode Restoration as Cultural Act';
  const hasAncientDomain = culturalTitles.includes('Ancient Domain');
  const hasModernLegacy = culturalTitles.includes('Modern Legacy');
  const hasInLaterTraditions = culturalTitles.some(t => t.includes('in Later Traditions'));

  // FAQ items
  const faqSection = extractSection(html, 'id="faq"', '<!-- Scholarly Sources -->');
  const faqMatches = faqSection.match(/<details class="faq-item/g) || [];
  const faqCount = faqMatches.length;
  const faqAnswerMatches = faqSection.match(/class="faq-answer"[\s\S]*?<\/details>/g) || [];
  let genericFaqAnswers = 0;
  faqAnswerMatches.forEach(ans => {
    const text = stripTags(ans);
    if (text.includes('preserves phonetic distinctions that plain') ||
        (text.includes('means') && text.includes('in the') && text.includes('tradition')) ||
        (text.includes('Plain ASCII') && text.includes('strips the stress, length, and script')) ||
        text.includes('Each is a historically defensible restoration')) {
      genericFaqAnswers++;
    }
  });

  // Sources section quality
  const sourcesSection = extractSection(html, 'id="sources"', '</body>');
  const hasPrimaryTexts = sourcesSection.includes('<h3>Primary Texts</h3>');
  const hasArchaeology = sourcesSection.includes('<h3>Archaeology &amp; Art History</h3>');
  const hasReligiousStudies = sourcesSection.includes('<h3>Religious Studies</h3>');
  const primaryTextItems = (sourcesSection.match(/<h3>Primary Texts<\/h3>[\s\S]*?<\/ul>/)[0] || '')
    .match(/<li>/g) || [];
  const primaryTextCount = primaryTextItems.length;
  const archaeologyItems = (sourcesSection.match(/<h3>Archaeology &amp; Art History<\/h3>[\s\S]*?<\/ul>/)[0] || '')
    .match(/<li>/g) || [];
  const archaeologyCount = archaeologyItems.length;
  const hasSpecificArchaeology = archaeologyCount > 1 || sourcesSection.includes('Telesterion') ||
    sourcesSection.includes('Parthenon') || sourcesSection.includes('Olympia') ||
    sourcesSection.includes('Delphi') || sourcesSection.includes('Heraion');

  // Etymology section
  const etymSection = extractSection(html, 'id="etymology"', '<!-- Unicode Character Breakdown -->');
  const etymNoteMatch = etymSection.match(/class="etymology-note"[^>]*>([\s\S]*?)<\/p>/);
  const etymNoteText = etymNoteMatch ? stripTags(etymNoteMatch[1]) : '';
  const etymNoteWords = countWords(etymNoteText);
  const hasKin = etymSection.includes('Etymological Kin');
  const hasUnicodeVariants = etymSection.includes('Unicode Variants');

  // Pronunciation
  const pronSection = extractSection(html, 'id="pronunciation"', '<!-- Domains');
  const hasIpa = pronSection.includes('ipa-text') || html.includes('Reconstructed Pronunciation');

  return {
    siteId,
    wordCount,
    culturalCardCount,
    hasOnlyGenericCultural,
    hasAncientDomain,
    hasModernLegacy,
    hasInLaterTraditions,
    faqCount,
    genericFaqAnswers,
    primaryTextCount,
    hasSpecificArchaeology,
    etymNoteWords,
    hasKin,
    hasUnicodeVariants,
    hasIpa
  };
}

function main() {
  const greekIds = LEXICON.filter(e => e.hasAdSite && e.pantheon === 'greek').map(e => e.id);
  const results = greekIds.map(analyzePeakQuality).filter(Boolean);

  console.log(`Peak-quality audit of ${results.length} Greek flagship extended lore pages\n`);

  const issues = [];
  results.forEach(r => {
    const problems = [];
    if (r.wordCount < 950) problems.push(`only ${r.wordCount} words`);
    if (r.culturalCardCount < 4) problems.push(`${r.culturalCardCount} cultural cards`);
    if (r.hasOnlyGenericCultural) problems.push('only generic cultural card');
    if (!r.hasAncientDomain) problems.push('missing Ancient Domain card');
    if (!r.hasModernLegacy) problems.push('missing Modern Legacy card');
    if (r.faqCount < 5) problems.push(`${r.faqCount} FAQs`);
    if (r.genericFaqAnswers === r.faqCount && r.faqCount > 0) problems.push('all FAQs generic');
    if (r.primaryTextCount < 2) problems.push(`${r.primaryTextCount} primary text sources`);
    if (!r.hasSpecificArchaeology) problems.push('no specific archaeology note');
    if (r.etymNoteWords < 10) problems.push(`etym note only ${r.etymNoteWords} words`);
    if (!r.hasKin) problems.push('no etymological kin');
    if (!r.hasIpa) problems.push('no IPA pronunciation');

    if (problems.length) {
      issues.push({ id: r.siteId, problems });
    }
  });

  if (issues.length === 0) {
    console.log('✓ All Greek flagships pass peak-quality checks');
  } else {
    console.log(`Issues found on ${issues.length} pages:\n`);
    issues.forEach(i => {
      console.log(`  ${i.id}: ${i.problems.join('; ')}`);
    });
  }

  console.log('\nSummary:');
  console.log(`  Average word count: ${Math.round(results.reduce((s, r) => s + r.wordCount, 0) / results.length)}`);
  console.log(`  Pages with 4+ cultural cards: ${results.filter(r => r.culturalCardCount >= 4).length}/${results.length}`);
  console.log(`  Pages with specific archaeology: ${results.filter(r => r.hasSpecificArchaeology).length}/${results.length}`);
  console.log(`  Pages with 2+ primary text sources: ${results.filter(r => r.primaryTextCount >= 2).length}/${results.length}`);
  console.log(`  Pages with etymological kin: ${results.filter(r => r.hasKin).length}/${results.length}`);
  console.log(`  Pages with IPA: ${results.filter(r => r.hasIpa).length}/${results.length}`);
}

main();
