const cheerio = require('cheerio');

const GRAMMAR_LABELS = new Set([
  'dor.',
  'att.',
  'att.-ion.',
  'ion.',
  'ep.',
  'adj.',
  'patron.',
  'adv.',
  'prep.',
  'conj.',
  'interj.',
  'phrases',
  'also',
  'constr.,',
  'in',
]);

function isGrammarOnlyDefinition(text) {
  const cleaned = text
    .replace(/^[—\s]+/, '')
    .replace(/^\d+\./, '')
    .trim()
    .toLowerCase();
  if (cleaned.length < 10) return true;
  const firstWord = cleaned.split(/[\s,;:]/)[0];
  if (GRAMMAR_LABELS.has(firstWord)) return true;
  return false;
}

async function extract(id, greek) {
  const morphUrl = `https://www.perseus.tufts.edu/hopper/morph?l=${encodeURIComponent(greek)}&la=greek`;
  const r = await fetch(morphUrl, { headers: { 'User-Agent': 'x' } });
  const html = await r.text();
  const $ = cheerio.load(html);
  const link = $('a')
    .filter((_, el) => $(el).text().trim() === 'LSJ')
    .first();
  const onclick = link.attr('onclick') || '';
  const m = onclick.match(/doc':'(Perseus:text:1999\.04\.0057:entry=[^']+)'/);
  if (!m) {
    console.log(id, 'no LSJ doc');
    return;
  }
  const textUrl = `https://www.perseus.tufts.edu/hopper/text?doc=${encodeURIComponent(m[1])}`;
  const r2 = await fetch(textUrl, { headers: { 'User-Agent': 'x' } });
  const html2 = await r2.text();
  const $2 = cheerio.load(html2);
  let text = $2('div.text').text();
  if (!text) text = $2('body').text();

  const colonDash = text.indexOf(':—');
  const dashIdx = colonDash >= 0 ? colonDash + 1 : text.indexOf('—');
  console.log(id, 'dashIdx', dashIdx, 'textlen', text.length);
  if (dashIdx < 0) return;
  let snippet = text.slice(dashIdx + 1);
  const cut = snippet.search(/[\u0370-\u03FF\u1F00-\u1FFF“"([]/u);
  if (cut >= 0) snippet = snippet.slice(0, cut);
  const cleaned = snippet
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[—\s]+/, '')
    .replace(/[,;:\s]+$/, '');
  console.log(id, 'cleaned', JSON.stringify(cleaned), 'usable', !isGrammarOnlyDefinition(cleaned));
}

(async () => {
  for (const [id, greek] of [
    ['tartaros', 'Τάρταρος'],
    ['atlas', 'Ἄτλας'],
    ['artemis', 'Ἄρτεμις'],
    ['zeus', 'Ζεύς'],
    ['poseidon', 'Ποσειδῶν'],
    ['leto', 'Λητώ'],
    ['sisyphus', 'Σίσυφος'],
  ]) {
    await extract(id, greek);
  }
})();
