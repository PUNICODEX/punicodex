// Probe Commons coverage for candidate aliases using the same scoring as the curation script.
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const UA = 'PuniCodexGalleryBot/1.0 (https://punicodex.com; contact: punicodex@gmail.com)';
const MIN_WIDTH = 900;
const GOOD_LICENSES = /^(public domain|cc0|cc by(-sa)?( \d\.\d)?|cc-by(-sa)?(-\d\.\d)?|pd|cc by-sa \d\.\d)/i;
const JUNK =
  /logo|map|diagram|flag|coat of arms|seal|svg|icon|tattoo|cosplay|anime|manga|game|screenshot|poster|album|film|movie|dvd|comic|card|meme|clipart|drawing by|sketch by|render|3d model|wedding|football|soccer|basket|volley|rugby|hockey|cricket|olympics 20|miss |pageant|band |album cover|perfume|watch|car |aircraft|ship |locomotive|building in|street in|town in|village in|city in|school|university|hospital|hotel|restaurant|company|factory|bridge in|river in|mountain in|lake in|cartoon|punch|satire|caricature|thumbnail|gillam|discurso|caminhada|feira|evento|entrevista|\bship\b|\bvessel\b|rotterdam|port of|canal|offshore|crane|tugboat|\bboat\b|\btug\b|harbor|harbour|quarters|sundkaj|close-up|aritana|perfil/i;
const DEPICT =
  /statue|sculpture|vase|kylix|amphora|krater|oinochoe|lekythos|hydria|fresco|relief|bust|painting|mosaic|coin|stele|stela|temple|museum|louvre|british museum|vatican|metropolitan|naples|athens|olympia|delphi|berlin|munich|cairo|bronze|marble|terracotta|ivory|cameo|gem|sarcophagus|tomb|pyxis|plate|cup|bowl|jug|fragment|miniature|manuscript|illuminated|thangka|gandhara|borobudur|ajanta|sanchi|bodhgaya|nara|kyoto|wutai|dunhuang|longmen|yungang|angkor|prambanan|pahari|rajput|kangra|mughal|hieroglyph|papyrus|obelisk|sphinx|pyramid|karnak|luxor|abydos|dendera|edfu|philae|rune|picture stone|gotland|manuscript|eddic|carving|stave|urnes|mammen|jelling/i;
const CONTEXT_JUNK =
  /tugboat|\bvessel\b|\bimo\b|shipyard|seagoing|cargo ship|offshore|\btug\b|harbou?r|ferry|\byacht\b|\btanker\b|bulk carrier/i;

function ascii(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ðÐ]/g, 'd')
    .replace(/[þÞ]/g, 'th')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe');
}
function stripHtml(s) {
  return (s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
async function commonsSearch(query, limit) {
  const q = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '960',
  });
  const res = await fetch('https://commons.wikimedia.org/w/api.php?' + q, { headers: { 'User-Agent': UA } });
  const j = await res.json();
  return Object.values(j.query?.pages || {});
}
function scorePage(page, aliasSet) {
  const ii = page.imageinfo?.[0];
  if (!ii || !ii.thumburl) return -1;
  const title = page.title.replace(/^File:/, '');
  const license = ii.extmetadata?.LicenseShortName?.value || '';
  if (!GOOD_LICENSES.test(license.trim())) return -1;
  if ((ii.width || 0) < MIN_WIDTH) return -1;
  if (/^(thumbnail|image|img|dsc|img_)/i.test(title)) return -1;
  if (/\.(svg|gif|tif|tiff|pdf|ogv|webm|mp3|wav)$/i.test(ii.url)) return -1;
  const squash = (s) => ascii(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = squash(title);
  const descRaw = stripHtml(ii.extmetadata?.ImageDescription?.value || '');
  const desc = squash(descRaw);
  const squashedAliases = aliasSet.map((a) => squash(a)).filter((a) => a.length >= 4);
  const aliasInTitle = squashedAliases.some((a) => t.includes(a));
  const aliasInDesc = squashedAliases.some((a) => desc.includes(a));
  if (!aliasInTitle && !aliasInDesc) return -1;
  if (CONTEXT_JUNK.test(title) || CONTEXT_JUNK.test(descRaw)) return -1;
  let score = 0;
  if (aliasInTitle) score += 6;
  if (aliasInDesc) score += 2;
  const depictHits = (title.match(DEPICT) || []).length;
  score += Math.min(depictHits, 3) * 2;
  if (JUNK.test(title)) score -= 20;
  if (/theme park|garden|cemetery|road|100 feet|giant|amusement/i.test(title)) score -= 8;
  if (/BCE|\bcentury\b|\b1[0-8][0-9]{2}\b/i.test(title + desc)) score += 2;
  if (/public domain|cc0|pd/i.test(license)) score += 2;
  score += Math.min((ii.width || 0) / 4000, 2);
  return score;
}

const CANDIDATES = {
  tyr: ['Týr', 'Tyr god', 'Tyr Fenrir'],
  eos: ['Eos', 'Eos goddess', 'Eos Aurora'],
  gilgamesh: ['Gilgamesh'],
  iuno: ['Juno', 'Iuno', 'Juno goddess'],
  ma: ['Maat', 'Maat goddess'],
  hp: ['Hapi Nile', 'Hapi god', 'Hapy'],
  om: ['Om symbol', 'Aum symbol', 'Om mantra', 'Om calligraphy'],
  monokeros: ['Monoceros', 'Unicorn'],
  aganju: ['Aganju', 'Agayu'],
  mot: ['Mot god', 'Mot Canaanite', 'Mot Baal'],
  athiratu: ['Athirat', 'Asherah', 'Asherah figurine'],
  ashavahista: ['Asha Vahishta', 'Ashavahishta'],
  tvastr: ['Tvashtri', 'Tvastar', 'Tvashta'],
  oba: ['Oba orisha', 'Oba river', 'Oba Yoruba'],
  ameretat: ['Ameretat', 'Amurdad'],
  haurvatat: ['Haurvatat', 'Khordad'],
  nirmata: ['Nirmata', 'Nirmata Sanskrit'],
  aer: ['Aer goddess', 'Aer Greek'],
  pyr: ['Pyr', 'Pyr Greek fire'],
  he: ['He Orphic', 'He Greek article'],
};

(async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CANDIDATES);
  for (const id of ids) {
    const aliases = CANDIDATES[id];
    if (!aliases) { console.log(`\n### ${id}: no candidates defined`); continue; }
    console.log(`\n### ${id}`);
    const found = new Map();
    for (const alias of aliases) {
      for (const q of [`File: ${alias} (statue OR vase OR painting OR relief OR sculpture OR mosaic OR fresco OR coin OR temple OR thangka OR miniature OR manuscript OR woodblock OR codex OR bust OR bronze OR marble)`, `File: ${alias}`]) {
        let pages = [];
        try { pages = await commonsSearch(q, 15); } catch (e) { console.log('  ! fail', e.message); }
        for (const p of pages) {
          const s = scorePage(p, aliases);
          if (s > 0 && !found.has(p.title)) found.set(p.title, s);
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    const best = [...found.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log(`  usable: ${found.size}`);
    for (const [t, s] of best) console.log(`   [${s}] ${t}`);
  }
})();
