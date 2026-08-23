// One-off quality pass: rebuild junk-polluted gallery entries from
// hand-verified Commons file titles. Mirrors the entry shape and caption
// logic of scripts/curate-gallery-images.js (src = 960px thumb, alt, caption).
const fs = require('node:fs');

const GALLERY_PATH = 'scripts/gallery-data.json';
const UA = 'PuniCodexGalleryBot/1.0 (https://punicodex.com; contact: punicodex@gmail.com)';
const GOOD_LICENSES =
  /^(public domain|cc0|cc by(-sa)?( \d\.\d)?|cc-by(-sa)?(-\d\.\d)?|pd|cc by-sa \d\.\d)/i;

// Full replacement lists (hand-verified titles, checked for width/license).
const REPLACE = {
  argos: [
    'File:Diego Velázquez - Mercury and Argus - WGA24471.jpg',
    'File:Peter Paul Rubens - Mercury and Argus - WGA20315.jpg',
    'File:Abraham Bloemaert - Mercury, Argus and Io - Google Art Project.jpg',
    'File:Jacob Jordaens - Mercury, Argus and Io.jpg',
    'File:Io Argos Staatliche Antikensammlungen 585.jpg',
    'File:Johann Carl Loth - Mercury Piping to Argus - WGA13647.jpg',
  ],
  iason: [
    'File:Mural paiting Iason Museum Delos Zde102192.jpg',
    'File:Mural paiting Iason, Museum Delos, 177184.jpg',
    'File:Jason and Medea - John William Waterhouse.jpg',
    'File:Moreau - Jason et Médée.jpg',
    'File:Charles André van Loo - Jason and Medea, 1759.jpg',
    'File:Jean-François de Troy - Jason swearing eternal affection to Medea.jpg',
  ],
  nezha: [
    'File:三太子 Third Prince Nezhas - panoramio.jpg',
    'File:Ping Sien Si - 008 Nezha (deity) (15513109434).jpg',
    'File:Piao-se.jpg',
    'File:馬公靈蓮堂 (7)哪吒三太子像.jpg',
    'File:興仁懋靈殿 (20)哪吒太子像.jpg',
    'File:赤崁龍德宮 (31)哪吒三太子主神像.jpg',
  ],
  change: [
    'File:The Moon Goddess Chang E - Unidentified artist, after Tang Yin.jpg',
    'File:Anonymous - The Moon Goddess Chang E - 1981.4.2 - Metropolitan Museum of Art.jpg',
    'File:Chang E, The Moon Goddess.jpg',
    "File:古今百美圖之嫦娥（One hundred beauties Chang'e）.png",
    'File:Long Corridor-嫦娥.JPG',
    'File:Chang-e, the Moon Goddess - Vanderbilt Fine Arts Gallery - 2000.105.TIF',
  ],
  houyi: [
    'File:Qing Dynasty figure of Houyi, V&A London.jpg',
    'File:Statue in Yueyang, Hunan, China.jpg',
    'File:帝鉴图说.Recueil Historique des Principaux Traits de la Vie des Empereurs Chinois.95帧图.彩绘册页.约18世纪 (后羿crop).jpg',
  ],
  longwang: [
    'File:2023-07-06 Qunyi Dragon King Temple, Huzhou 湖州群益龙王庙 01.jpg',
    'File:2023-07-06 Qunyi Dragon King Temple, Huzhou 湖州群益龙王庙 03.jpg',
    'File:20260405 Wangqu Longwang Temple 01.jpg',
    'File:龙王顶&龙王殿.jpg',
    'File:左侧神王，狮子，龙王.jpg',
    'File:龙王塔 - panoramio.jpg',
  ],
  midas: [
    'File:Landscape with the judgment of Midas, by Gillis van Coninxloo.jpg',
    'File:Abraham Janssens - The judgement of Midas.jpg',
    'File:Silenus and king Midas by Giulio Bonasone.jpg',
    'File:The-Golden-Touch.jpg',
    'File:King Midas MET DP811473.jpg',
    'File:Black-figure pottery, Midas, Hermes, Silenos, 500 BC, AM Eleusis, 081188.jpg',
  ],
  iuppiter: [
    'File:Jupiter Smyrna Louvre Ma13.jpg',
    'File:Jupiter Dolichenus Louvre AO7446.jpg',
    'File:KHM - Iupiter Dolichenus Mauer Statuengruppe 1.jpg',
    'File:Iupiter Dolichenus RM Tulln.jpg',
    "File:Plate 94- Jupiter and Ganymede (In aquilam transformatus Iupiter Ganymedem rapit), from Ovid's 'Metamorphoses' MET DP866547.jpg",
    'File:0 Jupiter - Louvre MR 254 - Louvre-Lens (2).JPG',
  ],
  // Post-run quality fixes for the alias-curated entries.
  om: [
    'File:Om-mani-padme-houng-3-ecritures.jpg',
    'File:Hari Om.png',
    'File:Om mani padme hum.jpg',
    'File:HARI OM written in Samrup Rachna Calligraphy.jpg',
    'File:Om mani padme hum 2.jpg',
    'File:Om Mani Padme Hum carved on a stone in Mcleodganj.JPG',
  ],
  eos: [
    'File:Eos Memnon Louvre L42.jpg',
    'File:Tithonos Eos Louvre G438.jpg',
    'File:Etruscan mirror - Eos and Memnon (Chicago, Art Inst 1984.1341).jpg',
    'File:Eos Memnon Louvre G115.jpg',
    'File:Lekythos. Sappho painter. Helios, Nyx and Eos, ca. 500 BCE. The Met.jpg',
    'File:Eos adbucting Tithonos-MAHG MF 140-P6130558-white.jpg',
  ],
  monokeros: [
    'File:The Unicorn is Found (from the Unicorn Tapestries) MET DP118984.jpg',
    'File:The Unicorn Defends Itself (from the Unicorn Tapestries) MET DP101157.jpg',
    'File:The Mystic Capture of the Unicorn (from the Unicorn Tapestries) MET DP155502.jpg',
    'File:The Unicorn is Attacked (from the Unicorn Tapestries) MET DP101090.jpg',
    'File:The Hunt of the Unicorn Tapestry 1.jpg',
    'File:(Toulouse) Mon seul désir (La Dame à la licorne) - Musée de Cluny Paris.jpg',
  ],
  ma: [
    'File:Statuette of ibis and goddess Maat, bronze - Museo Egizio, Turin S 18197 p05.jpg',
    'File:The Goddess Maat in Seti II’s KV15 Tomb.jpg',
    'File:Regno di sethy I, frammento di rilievo con dea maat, da tomba di sethy I, 1289-1279 ac ca.JPG',
    'File:Maat (Goddess).png',
    'File:Figure of the goddess Maat MET LC-59 26 1 EGDP029741.jpg',
    'File:Relief of Maat, KV17, Tomb of Seti I, Museo Archeologico Nazionale Florence, MET Divine Egypt Dec 2025.jpg',
  ],
  iuno: [
    'File:Juno, Rembrandt, 1662-1665, Armand Hammer Museum of Art.jpg',
    'File:Statue of Juno, MFA Boston.jpg',
    'File:Juno Sospita Statue.jpg',
    'File:Juno and Argus - Peter Paul Rubens - Wallraf-Richartz Museum - Cologne - Germany 2017.jpg',
    'File:Juno Moneta denarius 46BC better colours.JPG',
    'File:Giovanni Battista Tiepolo - Juno and Luna - BF.1983.4 - Museum of Fine Arts.jpg',
  ],
  gilgamesh: [
    'File:Gilgamesh and Huwawa Ashmolean.jpg',
    'File:Gilgamesh Dream Tablet.jpg',
    'File:The statue of Gilgamesh.jpg',
    'File:Hero lion Dur-Sharrukin Louvre AO19862.jpg',
    'File:Kazimierz Sichulski - Symbolic Scene, Ishtar with Gilgamesh.jpg',
    'File:Estátua de Gilgamesh e a divindade Lamassu.jpg',
  ],
  // Ḥꜥpy is the Nile flood god; funerary/canopic "Hapy" figures are the Son
  // of Horus (a different god) and were dropped.
  hp: [
    'File:Limestone slab showing the Nile flood god Hapy. 12th Dynasty. From the foundations of the temple of Thutmose III, Koptos, Egypt. The Petrie Museum of Egyptian Archaeology, London.jpg',
    'File:Gravure de Hâpy, incarnation du Nil.jpg',
    'File:Hapy Philae.JPG',
    'File:Egyptian - The Nile God Hapy - Walters 542135.jpg',
    'File:Upper part of a statue of the Nile God Hapi, granite. From Faiyum, Egypt, 12th Dynasty, c. 1800 BCE. Neues Museum.jpg',
    'File:North wall of the Gate of Hadrian with a representation of the Nile god Hapi crouched in his cave and surrounded by a serpent, Philae, Egypt (49812288128).jpg',
  ],
};

// Zero-coverage ids: drop the junk entry entirely (honest absence beats
// off-topic content). The id simply stays absent from gallery-data.json.
const REMOVE = ['olodumare'];

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

function buildCaption(page) {
  const ii = page.imageinfo[0];
  const em = ii.extmetadata || {};
  let title = page.title
    .replace(/^File:/, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_/g, ' ');
  const desc = stripHtml(em.ImageDescription?.value || '');
  const artist = stripHtml(em.Artist?.value || '');
  const license = (em.LicenseShortName?.value || '').trim();

  let blurb = desc.split(/(?<=[.!?])\s/)[0] || '';
  if (blurb.length > 180) blurb = `${blurb.slice(0, 177)}…`;
  if (blurb.toLowerCase() === title.toLowerCase()) blurb = '';

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
  return Object.values(j.query?.pages || {});
}

(async () => {
  const gallery = JSON.parse(fs.readFileSync(GALLERY_PATH, 'utf8'));
  for (const id of REMOVE) {
    if (gallery[id]) {
      delete gallery[id];
      console.log(`removed ${id} (zero coverage)`);
    }
  }
  for (const [id, titles] of Object.entries(REPLACE)) {
    const pages = await commonsTitles(titles);
    const byTitle = new Map(pages.map((p) => [p.title, p]));
    const images = [];
    for (const t of titles) {
      const p = byTitle.get(t);
      if (!p || !p.imageinfo?.[0]?.thumburl) {
        console.log(`  ! MISSING ${id}: ${t}`);
        continue;
      }
      const ii = p.imageinfo[0];
      const license = (ii.extmetadata?.LicenseShortName?.value || '').trim();
      if (!GOOD_LICENSES.test(license)) {
        console.log(`  ! BAD LICENSE ${id}: ${t} (${license})`);
        continue;
      }
      const altText =
        stripHtml(ii.extmetadata?.ImageDescription?.value || '') ||
        p.title.replace(/^File:/, '').replace(/_/g, ' ');
      images.push({
        src: ii.thumburl,
        alt: altText.length > 220 ? `${altText.slice(0, 217)}…` : altText,
        caption: buildCaption(p),
      });
    }
    gallery[id] = { images };
    console.log(`rebuilt ${id}: ${images.length} images`);
    await new Promise((r) => setTimeout(r, 300));
  }
  fs.writeFileSync(GALLERY_PATH, `${JSON.stringify(gallery, null, 2)}\n`);
  console.log('written.');
})();
