/**
 * Per-pantheon transliteration convention engines for the Name Variants system
 * (see docs/name-variants-design.md, Phase 3).
 *
 * A convention engine maps the canonical restoration onto systematic alternate
 * romanizations used in scholarship (Egyptological aleph conventions, Sanskrit
 * IAST simplifications, Japanese Kunrei-shiki). Conventions are COMPUTED —
 * they describe possible systematic spellings, never attestations. Every
 * emitted form must NFC round-trip, differ from the canonical form, and carry
 * the name of the convention that produced it.
 */

/**
 * Egyptian (Egyptological transliteration): aleph/ayin glyphs have convention
 * renderings in Latin publication. Ꜣ (Aleph, U+A722/U+A723) → "A"/"a",
 * Ꜥ (Ayin, U+A724/U+A725) → "ʿ"/"a". The "a" substitution produces the common
 * anglicized convention forms (Rꜥ → "Ra", Ꜣmun → "Amun").
 */
function egyptianConventions(form) {
  const out = [];
  const aleph = form.replace(/Ꜣ/g, 'A').replace(/ꜣ/g, 'a');
  if (aleph !== form) out.push({ form: aleph, convention: 'egyptological-aleph-a' });
  const ayin = form.replace(/Ꜥ/g, 'a').replace(/ꜥ/g, 'a');
  if (ayin !== form) out.push({ form: ayin, convention: 'egyptological-ayin-a' });
  return out;
}

/**
 * Sanskrit (IAST) → common simplified romanizations used in popular and
 * philological publication: ś/ṣ → sh, ṅ → ng, ñ → ny, ṛ → ri, c → ch.
 */
function sanskritConventions(form) {
  let f = form
    .replace(/ś/g, 'sh')
    .replace(/Ś/g, 'Sh')
    .replace(/ṣ/g, 'sh')
    .replace(/Ṣ/g, 'Sh')
    .replace(/ṅ/g, 'ng')
    .replace(/Ṅ/g, 'Ng')
    .replace(/ñ/g, 'ny')
    .replace(/Ñ/g, 'Ny')
    .replace(/ṛ/g, 'ri')
    .replace(/Ṛ/g, 'Ri')
    .replace(/c/g, 'ch')
    .replace(/C/g, 'Ch');
  return f !== form ? [{ form: f, convention: 'iast-simplified' }] : [];
}

/**
 * Japanese (Hepburn → Kunrei-shiki romanization), long vowels untouched:
 * shi→si, chi→ti, tsu→tu, ji→zi, fu→hu, sha→sya, shu→syu, sho→syo,
 * cha→tya, chu→tyu, cho→tyo, ja→zya, ju→zyu, jo→zyo.
 */
function japaneseConventions(form) {
  const TABLE = [
    [/sho/g, 'syo'],
    [/shu/g, 'syu'],
    [/sha/g, 'sya'],
    [/cho/g, 'tyo'],
    [/chu/g, 'tyu'],
    [/cha/g, 'tya'],
    [/jo/g, 'zyo'],
    [/ju/g, 'zyu'],
    [/ja/g, 'zya'],
    [/shi/g, 'si'],
    [/chi/g, 'ti'],
    [/tsu/g, 'tu'],
    [/ji/g, 'zi'],
    [/fu/g, 'hu'],
  ];
  let f = form;
  for (const [from, to] of TABLE) f = f.replace(from, to);
  // Capitalized sentence-initial or name-initial forms.
  const cap = form
    .replace(/^Sho/, 'Syo')
    .replace(/^Shu/, 'Syu')
    .replace(/^Sha/, 'Sya')
    .replace(/^Cho/, 'Tyo')
    .replace(/^Chu/, 'Tyu')
    .replace(/^Cha/, 'Tya')
    .replace(/^Shi/, 'Si')
    .replace(/^Chi/, 'Ti')
    .replace(/^Tsu/, 'Tu')
    .replace(/^Ji/, 'Zi')
    .replace(/^Fu/, 'Hu');
  const out = [];
  if (f !== form) out.push({ form: f, convention: 'kunrei-shiki' });
  if (cap !== form && cap !== f) out.push({ form: cap, convention: 'kunrei-shiki' });
  return out;
}

/**
 * Greek: chi rendered "kh" instead of "ch" (an attested alternate
 * transliteration convention in older Anglophone scholarship).
 */
function greekConventions(form) {
  if (!/ch|Ch/.test(form)) return [];
  const f = form.replace(/ch/g, 'kh').replace(/Ch/g, 'Kh');
  return f !== form ? [{ form: f, convention: 'chi-kh' }] : [];
}

const CONVENTION_ENGINES = {
  egyptian: egyptianConventions,
  sanskrit: sanskritConventions,
  japanese: japaneseConventions,
  greek: greekConventions,
  'greek-location': greekConventions,
};

/**
 * Returns [{ form, convention }] convention forms for an entry, NFC-normalized,
 * de-duplicated, excluding the canonical form itself.
 */
function conventionForms(entry) {
  const engine = CONVENTION_ENGINES[entry.pantheon];
  if (!engine) return [];
  const seen = new Set([entry.unicode.normalize('NFC')]);
  const out = [];
  for (const { form, convention } of engine(entry.unicode)) {
    const nfc = form.normalize('NFC');
    if (seen.has(nfc)) continue;
    seen.add(nfc);
    out.push({ form: nfc, convention });
  }
  return out;
}

module.exports = { conventionForms, CONVENTION_ENGINES };
