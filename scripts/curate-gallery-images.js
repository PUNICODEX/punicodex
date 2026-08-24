#!/usr/bin/env node
/**
 * PuniCodex — Curate gallery images from Wikimedia Commons for flagship temples.
 *
 * For every flagship archetype that has no curated entry in
 * scripts/gallery-data.json, searches Wikimedia Commons for real
 * art-historical depictions (statues, vase paintings, reliefs, miniatures,
 * temple carvings), filters to freely licensed images (PD / CC0 / CC BY /
 * CC BY-SA), and appends a curated entry with scholarly captions and
 * license attribution.
 *
 * Usage:
 *   node scripts/curate-gallery-images.js                 # all missing flagships
 *   node scripts/curate-gallery-images.js --only id1,id2  # specific ids
 *   node scripts/curate-gallery-images.js --audit         # HEAD-check all curated URLs
 *   node scripts/curate-gallery-images.js --dry-run       # print, do not write
 *
 * Never overwrites an existing curated entry.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GALLERY_PATH = path.join(__dirname, 'gallery-data.json');
const UA = 'PuniCodexGalleryBot/1.0 (https://punicodex.com; contact: punicodex@gmail.com)';
const IMAGES_PER_TEMPLE = 6;
const MIN_WIDTH = 900;
const GOOD_LICENSES = /^(public domain|cc0|cc by(-sa)?( \d\.\d)?|cc-by(-sa)?(-\d\.\d)?|pd|cc by-sa \d\.\d)/i;

// Junk signals in file titles — modern, non-depiction, or off-topic material.
const JUNK =
  /\blogos?\b|\bmaps?\b|diagram|flag|coat of arms|svg|\bicons?\b|tattoo|cosplay|anime|manga|\bgames?\b|screenshot|poster|album|film|movie|dvd|comic|card|meme|clipart|drawing by|sketch by|render|3d model|wedding|football|soccer|basket|volley|rugby|hockey|cricket|olympics 20|miss |pageant|band |album cover|perfume|car |aircraft|ship |locomotive|building in|street in|town in|village in|city in|school|university|hospital|hotel|restaurant|coffee|café|airport|railway|railroad|\btrain\b|viadu|company|factory|bridge in|river in|mountain in|lake in|cartoon|punch|satire|caricature|thumbnail|gillam|discurso|caminhada|feira|evento|entrevista|\bship\b|\bvessel\b|rotterdam|port of|canal|offshore|crane|tugboat|\bboat\b|\btug\b|harbor|harbour|quarters|sundkaj|close-up|aritana|perfil|advertis|\badvert\b|\baward|\bteddy|treffen|wave-gotik|festival|concert|open air|rockharz|yucat[aá]n|\butah\b|town hall|city hall|municipal|\bactor|\bactress|singer|songwriter|politician|journalist|footballer|badminton|quarterfinal|yonex|satellite|orbiter|nasa|spacecraft|coffee|fashion|carnaval|grande arche|\bengine\b|\bgmbh\b|\bltd\b|\binc\b|\bag\b|surname|given name/i;

// Junk signals tested against the free-text description as well as the title
// (descriptions are where "Bifröst University" or "band at Wave-Gotik-Treffen"
// hide when the bare title is just "Bifröst 2004.jpg").
const DESC_JUNK =
  /advertis|universit|town hall|city hall|municipal|yucat[aá]n|\bband\b|treffen|teddy|\baward|football|politician|\bactor|\bactress|singer|footballer|given name|surname|railway|coffee|airport|butterfly|\bmoth\b|octopus|pulpo|vulture|geier|vogelpark|badminton|satellite|open air|fashion|carnaval|nasa|spacecraft|orbiter|cassini|voyager|jpl\b/i;

// Modern-people junk — the only description signals that condemn a location
// temple's photograph (cityscapes and satellite views are legitimate there).
const DESC_JUNK_PEOPLE =
  /\bactor|\bactress|singer|songwriter|politician|footballer|given name|surname|fashion|carnaval|pageant/i;

// Commons categories that prove art-historical / mythological relevance.
const GOOD_CATS =
  /mytholog|deit|god(dess)?(es)?\b|norse|edda|[aæ]sir|vanir|greek|roman|egyptian|hindu|buddh|tao|shinto|painting|sculpture|depiction|artwork|arts\b|art\b|museum|musée|museo|museu|archaeolog|relief|vase|manuscript|illustration|runestone|picture stone|fresco|mosaic|coin|bronze|marble|miniature|woodblock|codex|stele|stela|amulet|pendant|temple|pagoda|busts?|carving|shrine|altar|cosmolog/i;
// Commons categories that prove the file is modern/people/place/brand noise.
const BAD_CATS =
  /photographs of people|people by name|people of |given names?|surnames?|actresses|actors|musical groups|musicians|populated places|municipalities|villages|towns|cities|companies|brands|footballers|politicians|universities|schools|vehicles|automobiles|aircraft|ships\b|locomotives|engines|bearings|award|basketball|baseball|sportspeople|athletes|cuisine|\bfood|drinks?|beef|dishes|restaurants/i;
// Meta categories carry no topicality signal at all (license boilerplate,
// upload batches, "needs categories" queues).
const META_CATS =
  /^cc[- ]|self-published|files (with|from|uploaded|by)|media (needing|lacking)|images? (uploaded|from|without|by)|photographs taken on|flickr|pd[- ]|license|assessment|featured pictures|quality images|author died|extracted images/i;

// Depiction signals in file titles.
const DEPICT =
  /statue|sculpture|vase|kylix|amphora|krater|oinochoe|lekythos|hydria|fresco|relief|bust|painting|mosaic|coin|stele|stela|temple|museum|louvre|british museum|vatican|metropolitan|naples|athens|olympia|delphi|berlin|munich|cairo|bronze|marble|terracotta|ivory|cameo|gem|sarcophagus|tomb|pyxis|plate|cup|bowl|jug|fragment|miniature|manuscript|illuminated|thangka|gandhara|borobudur|ajanta|sanchi|bodhgaya|nara|kyoto|wutai|dunhuang|longmen|yungang|angkor|prambanan|pahari|rajput|kangra|mughal|hieroglyph|papyrus|obelisk|sphinx|pyramid|karnak|luxor|abydos|dendera|edfu|philae|rune|picture stone|gotland|manuscript|eddic|carving|stave|urnes|mammen|jelling|amulet|pendant|figurine|statuette|\bidol|brooch|torc|hoard|viking|artefact|artifact|torshammare|hammer|shrine|altar|woodblock|puja|worship|ritual|yajna|ceremony|museo|museu|musée|antikensammlung|antiken|glyptothek|antiquities|michelangelo|ingres|bouguereau|rackham|pyle\b|doré|dore\b|frølich|doepler|hollar|winge|pogany|pagoda|tiantan|mandir|monastery|ludovisi|farnese|barberini|borghese|altemps|albani/i;

// Per-id search aliases for names whose Commons coverage lives under a
// different spelling or disambiguation (diacritics-stripped ASCII works best).
const ALIASES = {
  hermod: ['Hermóðr', 'Hermod Hel', 'Hermod Baldr', 'Hermodr', 'Hermod'],
  cerberus: ['Herakles Cerberus', 'Heracles Cerberus', 'Cerberus', 'Kerberos'],
  ochosi: ['Oxossi', 'Oxóssi', 'Ochosi'],
  radha: ['Radha'],
  shakyamuni: ['Shakyamuni', 'Buddha Shakyamuni', 'Gautama Buddha'],
  akshobhya: ['Akshobhya'],
  vairocana: ['Vairocana', 'Mahavairocana', 'Dainichi'],
  manjushri: ['Manjushri'],
  vajrapani: ['Vajrapani'],
  ksitigarbha: ['Ksitigarbha', 'Jizo', 'Dizang'],
  mara: ['Mara daughters', 'Mara army', 'Mara demon', 'Temptation of the Buddha', 'Maravijaya', 'Versuchung des Buddha'],
  // Short names need multi-word aliases: the topicality gate only accepts
  // aliases of >= 4 squashed alphanumerics, so bare 'Tyr'/'Om' never match.
  tyr: ['Tyr feeding', 'Tyr and Fenrir', 'Fenrir and Tyr', '4to Tyr', 'Tyr manuscript'],
  eos: ['Eos and', 'Eos Aurora', 'Eos Memnon', 'Tithonos', 'Eos Kephalos'],
  gilgamesh: ['Gilgamesh', 'Gilgamesh lion', 'Gilgamesh Huwawa'],
  iuno: ['Juno', 'Iuno', 'Juno Regina'],
  // Bare 'Maat' would also pass topicality for the Lisbon MAAT museum; the
  // multi-word forms keep the gate on the goddess.
  ma: ['goddess Maat', 'Maat goddess', 'dea Maat', 'Maat relief', 'Maat tomb'],
  hp: ['Hapi Nile', 'Hapi god', 'Hapy'],
  om: ['Om mani padme', 'Hari Om', 'Om symbol', 'Om calligraphy'],
  // Bare 'Mani' is a town in Yucatán and a Tibetan prayer stone — only
  // two-word aliases keep the gate on the Norse moon god.
  mani: ['Sol and Mani', 'Mani moon', 'Mani Norse', 'Máni Mundi', 'Mani god'],
  // 'Pontos' is Portuguese for 'points' — the bare name pulls periodical
  // covers and infographics. The god is the Black Sea personified, so aim at
  // the Greco-Roman sea name instead.
  pontos: ['Pontus', 'Pontos Euxeinos', 'Euxine', 'Pontus Euxinus', 'Black Sea antiquity'],
  // Location temples: the city name is the on-topic signal.
  athenai: ['Athens', 'Athenai', 'Acropolis'],
  // Adamas is the diamond etymon — the stone itself is the on-topic subject.
  adamas: ['Adamas', 'diamond'],
  // Papatūānuku coverage lives under 'Wahine a Tāne' carvings.
  papatuanuku: ['Papatūānuku', 'Papatuanuku', 'Wahine Tane', 'Papa'],
  // Ọrúnmìlà's cult imagery is filed under its priesthood.
  orunmila: ['Orunmila', 'Ọrúnmìlà', 'Babalawo', 'Ifa divination'],
  // 'seth' collides with modern people (Seth Rogen & co.) and 'set' with
  // every generic noun — search the mythic descriptors instead.
  seth: ['Seth Egyptian god', 'Set animal', 'Set god Egypt', 'Sutekh', 'Set deity'],
  monokeros: [
    'Unicorn Tapestries',
    'Hunt of the Unicorn',
    'Lady and the Unicorn',
    'Dame licorne',
    'Monoceros',
  ],
};

// Pantheon-specific query context to keep results on-topic.
const CONTEXT = {
  greek: 'ancient Greek (statue OR vase OR relief OR mosaic OR coin OR fresco)',
  'greek-location': '(ancient OR ruins OR temple OR archaeological)',
  roman: 'Roman (statue OR sculpture OR mosaic OR relief OR coin OR fresco)',
  egyptian: 'Egyptian (statue OR relief OR hieroglyph OR temple OR papyrus OR stela)',
  norse: 'Norse (painting OR manuscript OR carving OR runestone OR illustration)',
  sanskrit: '(sculpture OR temple OR painting OR miniature OR statue)',
  buddhist: '(statue OR sculpture OR thangka OR temple OR gandhara OR painting)',
  chinese: '(statue OR temple OR painting OR sculpture OR porcelain)',
  taoist: '(statue OR temple OR painting OR sculpture)',
  japanese: '(shrine OR statue OR painting OR woodblock OR temple)',
  yoruba: '(sculpture OR shrine OR art OR statue OR carving)',
  nahuatl: '(codex OR sculpture OR stone OR temple OR mural)',
  mesopotamian: '(relief OR stele OR cylinder seal OR statue OR plaque)',
  canaanite: '(relief OR stele OR statue OR figurine OR plaque)',
  phoenician: '(relief OR stele OR statue OR sarcophagus)',
  hittite: '(relief OR orthostat OR statue OR seal)',
  celtic: '(sculpture OR stone OR manuscript OR carving)',
  slavic: '(statue OR idol OR manuscript OR icon OR embroidery)',
  baltic: '(statue OR idol OR folk art OR illustration)',
  polynesian: '(statue OR carving OR tiki OR illustration)',
  incan: '(sculpture OR textile OR ceramic OR ruins)',
  korean: '(statue OR temple OR painting)',
  zoroastrian: '(relief OR fire temple OR manuscript OR carving)',
};

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
  const res = await fetch('https://commons.wikimedia.org/w/api.php?' + q, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  const j = await res.json();
  return Object.values(j.query?.pages || {});
}

// Strong contextual junk: tested against title AND description.
const CONTEXT_JUNK =
  /tugboat|\bvessel\b|\bimo\b|shipyard|seagoing|cargo ship|offshore|\btug\b|harbou?r|ferry|\byacht\b|\btanker\b|bulk carrier/i;

function scorePage(page, aliasSet) {
  const ii = page.imageinfo?.[0];
  if (!ii || !ii.thumburl) return -1;
  const title = page.title.replace(/^File:/, '');
  const license = ii.extmetadata?.LicenseShortName?.value || '';
  if (!GOOD_LICENSES.test(license.trim())) return -1;
  if ((ii.width || 0) < MIN_WIDTH) return -1;
  if (/^(thumbnail|image|img|dsc|img_)/i.test(title)) return -1;
  if (/thumbnail/i.test(title) && (ii.width || 0) < 1200) return -1;
  if (/\.(svg|gif|tif|tiff|pdf|ogv|webm|mp3|wav)$/i.test(ii.url)) return -1;

  // Topicality gate: the deity name must appear in the title or the
  // description — otherwise Commons full-text search returns generic noise.
  // Short aliases (≤6 squashed chars) must match as a whole word: substring
  // matching lets "modi" ride in on "Modigliani" and "ker" on "maker".
  const squash = (s) => ascii(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const words = (s) => ` ${ascii(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
  const titleNorm = words(title);
  const descRaw = stripHtml(ii.extmetadata?.ImageDescription?.value || '');
  const descNorm = words(descRaw);
  // Aliases match on normalized word forms — "Sol and Mani" matches
  // "The Wolves Pursuing Sol and Mani", and bare "modi" never rides in on
  // "Modigliani". The ≥4 squashed-char floor still applies.
  const normAliases = aliasSet
    .map((a) => ({ raw: a, norm: words(a) }))
    .filter((a) => squash(a.raw).length >= 4);
  const aliasInTitle = normAliases.some((a) => titleNorm.includes(a.norm));
  const aliasInDesc = normAliases.some((a) => descNorm.includes(a.norm));
  if (!aliasInTitle && !aliasInDesc) return -1;
  if (CONTEXT_JUNK.test(title) || CONTEXT_JUNK.test(descRaw)) return -1;
  if (DESC_JUNK.test(title) || DESC_JUNK.test(descRaw)) return -1;
  // Modern person/place photos: a bare "Firstname Lastname YYYY" style title
  // (or any recent-year title) with no depiction signal is a contemporary
  // photograph, not an art-historical depiction — e.g. "Skadi Jennicke 2019".
  if (/\b(19|20)\d{2}\b/.test(title) && !DEPICT.test(title)) return -1;

  let score = 0;
  if (aliasInTitle) score += 6;
  if (aliasInDesc) score += 2;
  const depictHits = (title.match(DEPICT) || []).length;
  score += Math.min(depictHits, 3) * 2;
  if (JUNK.test(title)) score -= 20;
  // Theme-park / roadside modern monuments are not gallery material.
  if (/theme park|garden|cemetery|road|100 feet|giant|amusement/i.test(title)) score -= 8;
  // Art-historical dating signals are a plus.
  if (/BCE|\bcentury\b|\b1[0-8][0-9]{2}\b/i.test(title + descRaw)) score += 2;
  if (/public domain|cc0|pd/i.test(license)) score += 2;
  score += Math.min((ii.width || 0) / 4000, 2);
  return score;
}

function buildCaption(page) {
  const ii = page.imageinfo[0];
  const em = ii.extmetadata || {};
  let title = page.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
  const desc = stripHtml(em.ImageDescription?.value || '');
  const artist = stripHtml(em.Artist?.value || '');
  const license = (em.LicenseShortName?.value || '').trim();

  // First sentence of the description, bounded.
  let blurb = desc.split(/(?<=[.!?])\s/)[0] || '';
  if (blurb.length > 180) blurb = `${blurb.slice(0, 177)}…`;
  if (blurb.toLowerCase() === title.toLowerCase()) blurb = '';

  // Over-long catalog-style titles (e.g. Louvre-Lens exhibition files) make
  // poor captions — lead with the description instead.
  if (title.length > 70) {
    if (blurb && blurb.length >= 20) {
      title = blurb;
      blurb = '';
    } else {
      title = `${title.slice(0, 67)}…`;
    }
  }

  let caption = `<strong>${title}</strong>`;
  if (blurb) caption += ` — ${blurb}`;
  const credit = artist ? `Photo/art: ${artist}. ` : '';
  caption += ` <span class="gallery-credit">${credit}${license} via Wikimedia Commons.</span>`;
  return caption;
}

// Hand-verified file titles for ids where search is unreliable (name
// collisions, sparse coverage). These bypass search (still license-checked).
const MANUAL = {
  hermod: [
    'File:SÁM 66, 75r, Hermóðr and Baldr.jpg',
    'File:Hermod before Hela.jpg',
    'File:Hermodr.jpg',
    'File:Treated NKS hermodr.jpg',
    'File:Balder and Nanna with Hermod.jpg',
  ],
  // ʾAṯiratu = Athirat/Asherah. Search is polluted by a ship named Asherah
  // and generic fertility figurines, so use hand-verified Judean pillar /
  // Asherah figurine files from the Israel Museum, Penn Museum and the Met.
  athiratu: [
    'File:Asherah 13th century BC Israel Museum.jpg',
    'File:Judaean female figurines - Israel Museum, Jerusalem.jpg',
    'File:Mother of Twins Pottery Figurine of Fertility Goddess, 13th Century BC (28347811027).jpg',
    'File:Penn Musuem Beit Shemesh Cylindrical Figurines.jpg',
    'File:Nude female figure (Judean pillar figurine) MET DP-42289-001.jpg',
  ],
  // Seth: 'seth' collides with modern people, 'set' with every noun, and the
  // museum pieces are filed under 'Set'/'Seth' with no mythic descriptors —
  // search never reaches them. Hand-picked: Turin softwood statue, Met
  // serpentinite figurine, the Ramesses III crowning relief, the Apep
  // spearing scene, the canonical line drawing.
  seth: [
    'File:Seth.JPG',
    'File:Statue depicting the god Seth, softwood - Museo Egizio, Turin S 1249 p01.jpg',
    'File:Horus and Seth crowning Ramesses III, detail of Seth.JPG',
    'File:Figurine of Seth MET 22.1.736-AC-2.jpg',
    'File:Set speared Apep.jpg',
    'File:Set.svg',
  ],
  // Realms and sparse figures whose depictions never carry the entry name in
  // the file metadata — search can never find these, so they are hand-picked
  // (Surtr for Muspellheimr, the jötnar illustrations for Jötunheimr, the
  // Yggdrasil cosmologies for Miðgarðr, the Malmström/Blommér elf paintings
  // for Álfheimr, Doré's Titans for Tartaros, the Euxine maps for Pontos).
  mani: [
    'File:Máni and Sól by Lorenz Frølich.jpg',
    'File:The Wolves Pursuing Sol and Mani.jpg',
    'File:Far away and long ago by Willy Pogany.png',
  ],
  tartaros: [
    'File:Gustave Doré - Dante Alighieri - Inferno - Plate 65 (Canto XXXI - The Titans).jpg',
    'File:Nekyia Staatliche Antikensammlungen 1494 n2.jpg',
  ],
  midgardr: [
    'File:Yggdrasil.jpg',
    'File:Oluf Olufsen Bagge - Yggdrasil, The Mundane Tree 1847 - full page.jpg',
    'File:The Ash Yggdrasil by Friedrich Wilhelm Heine.jpg',
    'File:Thor, Hymir and the Midgard Serpent.jpg',
    'File:Johann Heinrich Fussli-Tor and Jormundgandr.jpg',
  ],
  muspellheimr: [
    'File:The giant with the flaming sword by Dollman.jpg',
    'File:Freyr and Surtr by Frølich.jpg',
    'File:Odin und Fenriswolf Freyr und Surt.jpg',
    'File:Surtur mit dem Flammenschwerte.jpg',
    'File:Kampf der untergehenden Götter by F. W. Heine.jpg',
  ],
  jotunheimr: [
    "File:Thor's Battle Against the Jötnar (1872) by Mårten Eskil Winge.jpg",
    'File:Louis Huard - Giant Skrymir and Thor.jpg',
    'File:I am the giant Skrymir by Elmer Boyd Smith.jpg',
    'File:Skrýmir by Maydell.jpg',
    "File:Thrym's Wedding-feast.jpg",
    'File:Thor Destroys the Giant Thrym.jpg',
  ],
  alfheimr: [
    'File:Älvalek.jpg',
    'File:August Malmström - Dancing Fairies - Google Art Project.jpg',
    'File:Ängsälvor - Nils Blommér 1850.jpg',
    'File:August Malmström.Sketch for Älvaleken.jpg',
  ],
  pontos: [
    'File:1855 Spruneri Map of the Black Sea or Pontus Euxinus in Ancient Times - Geographicus - PontusEuxinus-spruneri-1855.jpg',
    'File:Pontus Euxinus - Autore N. Sanson Filio ; de la Place sculp. - btv1b53214037t (1 of 2).jpg',
    "File:Mosaïque d'Océan d'Acholla - Tunisia-4752 - Pontus.jpg",
    'File:Sunrise over the Black Sea (AP4P0489) (11194862636).jpg',
  ],
};

async function commonsTitles(titles) {
  const q = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: titles.join('|'),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '960',
  });
  const res = await fetch('https://commons.wikimedia.org/w/api.php?' + q, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  const j = await res.json();
  return Object.values(j.query?.pages || {}).filter((p) => p.imageinfo?.[0]?.thumburl);
}

// Fetch the Commons category membership for a batch of file titles.
// Returns Map<title, string[]>.
async function commonsCategories(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const q = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: batch.join('|'),
      prop: 'categories',
      cllimit: 'max',
    });
    const res = await fetch('https://commons.wikimedia.org/w/api.php?' + q, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) throw new Error(`Commons API ${res.status}`);
    const j = await res.json();
    for (const p of Object.values(j.query?.pages || {})) {
      out.set(p.title, (p.categories || []).map((c) => c.title.replace(/^Category:/, '')));
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

// Place categories that are junk for deity/figure temples but legitimate for
// location temples (a castle photo belongs in the Osaka gallery, a skyscraper
// named Pangu Plaza does not belong in the Pangu gallery).
const BAD_CATS_PLACES = /buildings|skyscrapers|stations|headquarters|metro|plazas|bridges|towers/i;

// Location temples legitimately show modern photographs of the place.
const LOCATION_PANTHEON = /location|realm/;
const LOCATION_IDS =
  /\b(kobe|honshu|kyushu|hokkaido|tokyo|kyoto|osaka|nikko|athenai|sparte|delphoi|korinthos|olympos|troia|delos|pusan|xian)\b/;
function isLocationTemple(id, byId) {
  const a = byId instanceof Map ? byId.get(id) : byId?.[id];
  return LOCATION_PANTHEON.test(a?.pantheon || '') || LOCATION_IDS.test(id);
}

// Category gate: the decisive on-topic check. A candidate passes when its
// Commons categories carry an art-historical/mythological signal (or the
// deity's own eponymous category) and no modern people/place/brand signal.
// Files with no categories at all fall back to the score gates alone.
function passesCategoryGate(cats, squashedAliases, isLocation) {
  if (!cats || cats.length === 0) return true;
  if (cats.some((c) => BAD_CATS.test(c))) return false;
  if (!isLocation && cats.some((c) => BAD_CATS_PLACES.test(c))) return false;
  const squash = (s) => ascii(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliasHit =
    squashedAliases.length > 0 &&
    cats.some((c) => {
      const sc = squash(c);
      return squashedAliases.some((a) => sc.includes(a));
    });
  if (cats.some((c) => GOOD_CATS.test(c)) || aliasHit) return true;
  // No signal either way: files wearing only license/upload-batch meta
  // categories fall back to the title/description gates rather than being
  // condemned for Commons' thin categorization.
  if (cats.every((c) => META_CATS.test(c))) return true;
  return false;
}

async function curateOne(id, archetype, dryRun) {
  // Manual fast-path: hand-verified titles, no search.
  if (MANUAL[id]) {
    const pages = await commonsTitles(MANUAL[id]);
    const images = pages
      .filter((p) => GOOD_LICENSES.test((p.imageinfo[0].extmetadata?.LicenseShortName?.value || '').trim()))
      .slice(0, IMAGES_PER_TEMPLE)
      .map((p) => {
        const ii = p.imageinfo[0];
        const altText = stripHtml(ii.extmetadata?.ImageDescription?.value || '') || p.title.replace(/^File:/, '').replace(/_/g, ' ');
        return {
          src: ii.thumburl,
          alt: altText.length > 220 ? `${altText.slice(0, 217)}…` : altText,
          caption: buildCaption(p),
        };
      });
    if (images.length >= 2) {
      if (dryRun) {
        console.log(`  DRY ${id} (manual): ${images.length} images`);
        images.forEach((im) => console.log(`    - ${im.src.split('/').slice(-2).join('/').slice(0, 80)}`));
      }
      return { images };
    }
  }

  const aliases = ALIASES[id] || [...new Set([archetype.name, ascii(archetype.name), id])];
  const aliasSet = aliases;

  const candidates = new Map();
  const BROAD =
    '(statue OR vase OR painting OR relief OR sculpture OR mosaic OR fresco OR coin OR temple OR thangka OR miniature OR manuscript OR woodblock OR codex OR bust OR bronze OR marble)';
  for (const alias of aliases.slice(0, 5)) {
    const queries = [`File: ${alias} ${BROAD}`, `File: ${alias}`];
    for (const query of queries) {
      let pages = [];
      try {
        pages = await commonsSearch(query, 25);
      } catch (e) {
        console.error(`  ! search failed for ${alias}: ${e.message}`);
      }
      for (const p of pages) {
        const score = scorePage(p, aliasSet);
        if (score > 0 && !candidates.has(p.title)) candidates.set(p.title, { page: p, score });
      }
      // Stop early once this alias has surfaced enough candidates.
      if (candidates.size >= IMAGES_PER_TEMPLE * 2) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    if (candidates.size >= IMAGES_PER_TEMPLE * 2) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);

  // Category gate on the top of the ranking — the decisive on-topic check.
  // Without it, string topicality alone lets modern people/places/brands
  // through (a "Skadi Loist" award photo contains the alias just as well).
  const squashAlias = (s) => ascii(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const squashedAliases = aliasSet.map(squashAlias).filter((a) => a.length >= 4);
  const shortlist = ranked.slice(0, IMAGES_PER_TEMPLE * 3);
  let gated = shortlist;
  try {
    const cats = await commonsCategories(shortlist.map((c) => c.page.title));
    const isLoc =
      LOCATION_PANTHEON.test(archetype?.pantheon || '') || LOCATION_IDS.test(id);
    gated = shortlist.filter((c) =>
      passesCategoryGate(cats.get(c.page.title), squashedAliases, isLoc),
    );
  } catch (e) {
    console.error(`  ! category lookup failed for ${id}, falling back to score gates: ${e.message}`);
  }

  const best = gated
    .filter(({ page }, i, arr) => {
      // Series dedupe: collapse near-identical photo sets (same title stem
      // with trailing numbering or (A)/(B) crop letters) to one representative.
      const squashStem = (s) =>
        ascii(s)
          .toLowerCase()
          .replace(/\([a-z0-9]+\)\s*(\.[a-z0-9]+)?$/i, '')
          .replace(/[^a-z]/g, '')
          .replace(/(0[1-9]|[0-9]{2,4})$/, '');
      return arr.findIndex((x) => squashStem(x.page.title) === squashStem(page.title)) === i;
    })
    .slice(0, IMAGES_PER_TEMPLE);
  if (best.length < 2) {
    console.log(`  ✗ ${id}: only ${best.length} usable image(s) found — skipped`);
    return null;
  }

  const images = best.map(({ page }) => {
    const ii = page.imageinfo[0];
    const caption = buildCaption(page);
    const altText = stripHtml(ii.extmetadata?.ImageDescription?.value || '') || page.title.replace(/^File:/, '').replace(/_/g, ' ');
    return {
      src: ii.thumburl,
      alt: altText.length > 220 ? `${altText.slice(0, 217)}…` : altText,
      caption,
    };
  });

  if (dryRun) {
    console.log(`  DRY ${id}: ${images.length} images`);
    images.forEach((im) => console.log(`    - ${im.src.split('/').pop().slice(0, 72)}`));
  }
  return { images };
}

// Hand-verified keep-list for the offline verifier: files whose two-word
// "Alias Epithet" title looks like a modern person but is legitimate content
// (the Tāne Mahuta tree, the Ardeshir investiture relief, …).
const VERIFY_ALLOW = {
  tane: [/tane mahuta/i],
  sita: [/bhumipravesh/i],
  ahuramazda: [/ardeshir|ardashir/i],
};

// Offline relevance check of every curated entry: applies the same junk
// heuristics as the live scorer to the stored filenames/captions and flags
// suspect images. `--verify` reports; `--verify --purge` strips the flagged
// images (dropping entries left with <2 images so the curator refills them).
function verify(gallery, purge) {
  const { loadArchetypes } = require('./flywheel-utils');
  const { list } = loadArchetypes();
  const byId = Object.fromEntries(list.map((a) => [a.id, a]));
  // Location temples legitimately show modern photographs of the place —
  // the modern-photo heuristics do not apply to them.
  const isLocation = (id) => isLocationTemple(id, byId);
  const aliasBase = (id) => {
    const a = byId[id];
    return (a?.name || id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  const flaggedByImage = [];
  const suspectImages = [];
  const cleanIds = [];
  let flaggedIds = 0;
  for (const id of Object.keys(gallery)) {
    if (id.startsWith('_')) continue;
    const images = gallery[id].images || [];
    const keep = [];
    for (const img of images) {
      let file = '';
      try {
        file = decodeURIComponent(img.src.split('/').pop().split('?')[0]);
      } catch {
        file = img.src.split('/').pop();
      }
      // Strip size prefixes and every extension (.svg.png.webp etc).
      const stem = file
        .replace(/^\d+px-/, '')
        .replace(/(\.[a-z0-9]+)+$/i, '')
        .replace(/_/g, ' ');
      const text = `${stem} ${img.alt || ''} ${img.caption || ''}`;
      const depict = DEPICT.test(stem) || DEPICT.test(img.alt || '') || DEPICT.test(img.caption || '');
      const location = isLocation(id);
      // "Alias Surname" files with no depiction signal are photographs of
      // modern people ("Sigurd Wallén", "Skadi Jennicke"). The strict form:
      // exactly the alias plus one capitalized word (optionally a trailing
      // date/number) — anything longer goes to the review-only suspect tier
      // so "Ares Ludovisi" (a statue) is never auto-condemned.
      const asciiStem = ascii(stem);
      const startsWithAlias = new RegExp(`^${ascii(aliasBase(id))}[\\s(]`, 'i').test(asciiStem);
      const allowed = (VERIFY_ALLOW[id] || []).some((rx) => rx.test(stem));
      const monthWord =
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(asciiStem);
      const person =
        !allowed &&
        !depict &&
        !location &&
        !monthWord &&
        startsWithAlias &&
        /^[\p{L}'’-]+ [\p{Lu}][\p{L}'’-]*( \d.*)?$/u.test(asciiStem) &&
        !/\b(goddess|god|statue|temple|relief|monastery)\b/i.test(asciiStem);
      const personish =
        !allowed &&
        !depict &&
        !person &&
        !location &&
        startsWithAlias &&
        /^[\p{L}'’-]+ [\p{Lu}]/u.test(asciiStem) &&
        !/\b(goddess|god|statue|temple|relief|monastery)\b/i.test(asciiStem);
      const thumb = /^thumbnail$/i.test(stem);
      // Hard-bad: junk signals with no depiction override. Location temples
      // legitimately show modern city/landscape photos, so for them only
      // modern-people signals condemn.
      const hardBad = location
        ? person || thumb || (DESC_JUNK_PEOPLE.test(text) && !depict)
        : (JUNK.test(stem) && !depict) || (DESC_JUNK.test(text) && !depict) || person || thumb;
      // Suspect: recent-year title or alias+Capitalized longer names with no
      // depiction signal. Museum artifact photos are routinely titled with
      // the photo's date, so these are reported for review, never purged.
      const suspect =
        !hardBad &&
        (personish || (!location && /\b(19[5-9]\d|20\d{2})\b/.test(stem) && !depict));
      if (hardBad) flaggedByImage.push(`${id}: ${file}`);
      else if (suspect) suspectImages.push(`${id}: ${file}`);
      if (hardBad) continue;
      keep.push(img);
    }
    if (purge && keep.length !== images.length) {
      if (keep.length >= 2) gallery[id].images = keep;
      else delete gallery[id];
    }
    if (keep.length !== images.length) flaggedIds++;
    else cleanIds.push(id);
  }
  console.log(`Verify: ${flaggedByImage.length} junk image(s) across ${flaggedIds} temple(s):`);
  for (const f of flaggedByImage) console.log(`  ✗ ${f}`);
  if (suspectImages.length) {
    console.log(`\nSuspect (recent-year, no depiction signal — review only, never auto-purged): ${suspectImages.length}`);
    for (const f of suspectImages) console.log(`  ? ${f}`);
  }
  if (purge && flaggedByImage.length) {
    fs.writeFileSync(GALLERY_PATH, `${JSON.stringify(gallery, null, 2)}\n`);
    console.log(`Purged. ${Object.keys(gallery).filter((k) => !k.startsWith('_')).length} curated entries remain.`);
  }
  console.log(`Clean temples: ${cleanIds.length}`);
}

// Reconstruct the original Commons "File:" title from a stored thumbnail URL
// (strips size prefixes and appended .webp / rasterized-svg extensions).
function srcToFileTitle(src) {
  let f = src.split('/').pop().split('?')[0];
  try {
    f = decodeURIComponent(f);
  } catch { /* keep raw */ }
  f = f.replace(/^\d+px-/, '').replace(/\.webp$/i, '');
  f = f.replace(/(\.svg|\.gif|\.tiff?)\.(png|jpe?g)$/i, '$1');
  return `File:${f}`;
}

// Online relevance check: every curated image must pass the same Commons
// category gate used during curation. This is the arbiter that catches what
// title heuristics cannot ("Kobe Bryant" in the kobe gallery, satellite
// passes, brand namesakes). `--cats` reports; `--cats --purge` strips.
async function verifyCats(gallery, purge) {
  const { loadArchetypes } = require('./flywheel-utils');
  const { list } = loadArchetypes();
  const byId = Object.fromEntries(list.map((a) => [a.id, a]));
  const squash = (s) => ascii(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliasesFor = (id) => {
    const a = byId[id];
    return (ALIASES[id] || (a ? [a.name, ascii(a.name), id] : [id]))
      .map(squash)
      .filter((x) => x.length >= 4);
  };
  const refs = [];
  for (const id of Object.keys(gallery)) {
    if (id.startsWith('_')) continue;
    for (const img of gallery[id].images || []) {
      refs.push({ id, img, title: srcToFileTitle(img.src) });
    }
  }
  const catMap = await commonsCategories([...new Set(refs.map((r) => r.title))]);
  const flagged = [];
  const removedById = {};
  for (const r of refs) {
    if (!passesCategoryGate(catMap.get(r.title) || [], aliasesFor(r.id), isLocationTemple(r.id, byId))) {
      flagged.push(`${r.id}: ${r.title.replace(/^File:/, '')} [${(catMap.get(r.title) || []).slice(0, 3).join('; ')}]`);
      (removedById[r.id] = removedById[r.id] || new Set()).add(r.img.src);
    }
  }
  console.log(`\nCategory verify: ${refs.length} image(s) checked, ${flagged.length} failing the category gate:`);
  for (const f of flagged) console.log(`  ✗ ${f}`);
  if (purge && flagged.length) {
    for (const [id, srcs] of Object.entries(removedById)) {
      const e = gallery[id];
      if (!e) continue;
      e.images = (e.images || []).filter((im) => !srcs.has(im.src));
      if (e.images.length < 2) delete gallery[id];
    }
    fs.writeFileSync(GALLERY_PATH, `${JSON.stringify(gallery, null, 2)}\n`);
    console.log('Purged category-gate failures (entries under 2 images dropped for re-curation).');
  }
}

async function audit(gallery) {  const ids = Object.keys(gallery);
  let checked = 0;
  let dead = 0;
  for (const id of ids) {
    for (const img of gallery[id].images || []) {
      const url = img.src.replace(/\.webp$/, '');
      try {
        const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
        if (!res.ok) {
          dead++;
          console.log(`  DEAD ${id}: ${url.slice(-70)} (${res.status})`);
        }
      } catch (e) {
        dead++;
        console.log(`  DEAD ${id}: ${url.slice(-70)} (${e.message})`);
      }
      checked++;
      if (checked % 40 === 0) console.log(`  … ${checked} checked, ${dead} dead`);
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  console.log(`\nAudit complete: ${checked} URLs checked, ${dead} dead.`);
}

async function main() {
  const args = process.argv.slice(2);
  const gallery = JSON.parse(fs.readFileSync(GALLERY_PATH, 'utf8'));

  if (args.includes('--audit')) {
    await audit(gallery);
    return;
  }

  if (args.includes('--verify')) {
    verify(gallery, args.includes('--purge'));
    if (args.includes('--cats')) await verifyCats(gallery, args.includes('--purge'));
    return;
  }

  const { loadArchetypes } = require('./flywheel-utils');
  const { list } = loadArchetypes();
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null;
  const dryRun = args.includes('--dry-run');

  const missing = list.filter(
    (a) => (!gallery[a.id] || !(gallery[a.id].images || []).length) && (!only || only.includes(a.id)),
  );
  console.log(`Flagships without curated gallery: ${missing.length}${only ? ` (filtered to ${only.length})` : ''}`);

  let added = 0;
  for (const a of missing) {
    process.stdout.write(`→ ${a.id} … `);
    const entry = await curateOne(a.id, a, dryRun);
    if (entry) {
      console.log(`${entry.images.length} images`);
      if (!dryRun) {
        gallery[a.id] = entry;
        added++;
        // Write after every temple so a kill/timeout never loses progress.
        fs.writeFileSync(GALLERY_PATH, `${JSON.stringify(gallery, null, 2)}\n`);
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  if (!dryRun && added > 0) {
    console.log(`\nWrote ${added} new curated entries to scripts/gallery-data.json`);
  } else {
    console.log('\nNo changes written.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
